import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import { getJson } from "serpapi"
import { 
  POPULAR_JOB_QUERIES, 
  BATCH_LOCATIONS, 
  enhanceJobForBatch, 
  generateBatchId 
} from "@/lib/batch-job-utils"
import { JobSearchResult, BatchJob } from "@/lib/types"

/**
 * Batch job processing endpoint
 * This endpoint handles the nightly batch processing of popular job searches
 * It can be triggered manually or via cron job
 */

interface BatchProcessRequest {
  dryRun?: boolean
  maxJobsPerQuery?: number
  queries?: string[]
  locations?: string[]
  forceRun?: boolean // Override time-based restrictions
}

interface BatchResult {
  batchId: string
  totalJobs: number
  newJobs: number
  duplicates: number
  errors: string[]
  queriesProcessed: number
  executionTime: number
  dryRun: boolean
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verify admin access or allow system calls
    const authHeader = req.headers.get("authorization")
    let isAuthorized = false
    
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "")
        initFirebaseAdmin()
        const decoded = await getAuth().verifyIdToken(token)
        
        // Check if user is admin (you may want to add admin role checking)
        const db = getFirestore()
        const userDoc = await db.collection('users').doc(decoded.uid).get()
        const userData = userDoc.data()
        
        isAuthorized = userData?.role === 'admin'
      } catch (error) {
        console.error('[BatchProcess] Auth verification failed:', error)
      }
    }
    
    // Allow system calls (for cron jobs) by checking for special header or no auth
    const isSystemCall = req.headers.get('x-system-call') === 'true'
    
    if (!isAuthorized && !isSystemCall) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({})) as BatchProcessRequest
    const {
      dryRun = false,
      maxJobsPerQuery = 50,
      queries = POPULAR_JOB_QUERIES,
      locations = BATCH_LOCATIONS,
      forceRun = false
    } = body

    console.log(`[BatchProcess] Starting batch job processing`)
    console.log(`[BatchProcess] Config: dryRun=${dryRun}, maxJobsPerQuery=${maxJobsPerQuery}`)
    console.log(`[BatchProcess] Queries: ${queries.length}, Locations: ${locations.length}`)

    // Check if batch already ran today (unless forced)
    const batchId = generateBatchId()
    const db = getFirestore()
    
    if (!forceRun) {
      const existingBatch = await db.collection('batch_runs')
        .where('batchId', '==', batchId)
        .limit(1)
        .get()
      
      if (!existingBatch.empty) {
        return NextResponse.json({
          message: "Batch already processed today",
          batchId,
          existingRun: existingBatch.docs[0].data()
        })
      }
    }

    const result: BatchResult = {
      batchId,
      totalJobs: 0,
      newJobs: 0,
      duplicates: 0,
      errors: [],
      queriesProcessed: 0,
      executionTime: 0,
      dryRun
    }

    const serpApiKey = process.env.SERPAPI_KEY
    if (!serpApiKey) {
      throw new Error("Missing SERPAPI_KEY environment variable")
    }

    // Track existing jobs to avoid duplicates
    const existingJobIds = new Set<string>()
    
    // Get existing batch jobs from today to avoid duplicates
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    
    const existingBatchJobs = await db.collection('batch_jobs')
      .where('batchId', '==', batchId)
      .get()
    
    existingBatchJobs.forEach(doc => {
      const jobData = doc.data()
      existingJobIds.add(jobData.sourceJobId || doc.id)
    })
    
    console.log(`[BatchProcess] Found ${existingJobIds.size} existing jobs for today`)

    // Process each query-location combination
    for (const query of queries.slice(0, 20)) { // Limit to prevent excessive API calls
      for (const location of locations.slice(0, 6)) { // Limit locations
        try {
          console.log(`[BatchProcess] Processing: "${query}" in "${location}"`)
          
          const searchParams = {
            engine: "google_jobs",
            api_key: serpApiKey,
            q: query,
            location: location === "Anywhere" ? "United States" : location,
            hl: "en",
            gl: "us",
            num: Math.min(maxJobsPerQuery, 50), // Limit per request
            timeout: 20000
          }

          const serpResponse = await getJson(searchParams)
          
          if (serpResponse.error) {
            const errorMsg = `SerpAPI error for "${query}" in "${location}": ${serpResponse.error}`
            console.error(`[BatchProcess] ${errorMsg}`)
            result.errors.push(errorMsg)
            continue
          }

          const jobs = serpResponse.jobs_results || []
          console.log(`[BatchProcess] Found ${jobs.length} jobs for "${query}" in "${location}"`)
          
          result.totalJobs += jobs.length
          
          // Convert and enhance jobs
          const enhancedJobs: BatchJob[] = []
          
          for (const rawJob of jobs) {
            try {
              // Convert to JobSearchResult format
              const jobResult: JobSearchResult = {
                id: rawJob.job_id || `${rawJob.title}-${rawJob.company_name}-${Date.now()}-${Math.random()}`,
                title: rawJob.title || "",
                company: rawJob.company_name || rawJob.company || "",
                location: rawJob.location || "",
                description: rawJob.description || rawJob.snippet || "",
                qualifications: extractQualifications(rawJob),
                responsibilities: extractResponsibilities(rawJob),
                benefits: rawJob.job_highlights?.benefits || [],
                salary: rawJob.salary || rawJob.detected_extensions?.salary || "",
                postedAt: rawJob.detected_extensions?.posted_at || rawJob.posted_at || "",
                applyUrl: rawJob.apply_options?.[0]?.link || rawJob.apply_link || rawJob.link || "",
                source: "Google Jobs",
                matchingScore: 0
              }

              // Skip if we already have this job
              if (existingJobIds.has(jobResult.id)) {
                result.duplicates++
                continue
              }

              // Enhance with batch metadata
              const batchJob = enhanceJobForBatch(jobResult, query, location, batchId)
              enhancedJobs.push(batchJob)
              existingJobIds.add(jobResult.id)
              result.newJobs++
              
            } catch (jobError) {
              const errorMsg = `Failed to process job: ${jobError instanceof Error ? jobError.message : 'Unknown error'}`
              console.error(`[BatchProcess] ${errorMsg}`)
              result.errors.push(errorMsg)
            }
          }

          // Save jobs to Firestore (unless dry run)
          if (!dryRun && enhancedJobs.length > 0) {
            const batch = db.batch()
            
            for (const job of enhancedJobs) {
              const docRef = db.collection('batch_jobs').doc(job.id)
              batch.set(docRef, job)
            }
            
            await batch.commit()
            console.log(`[BatchProcess] Saved ${enhancedJobs.length} jobs to batch_jobs collection`)
          }
          
          result.queriesProcessed++
          
          // Add delay between requests to be respectful to SerpAPI
          await new Promise(resolve => setTimeout(resolve, 1000))
          
        } catch (queryError) {
          const errorMsg = `Failed to process "${query}" in "${location}": ${queryError instanceof Error ? queryError.message : 'Unknown error'}`
          console.error(`[BatchProcess] ${errorMsg}`)
          result.errors.push(errorMsg)
        }
      }
    }

    result.executionTime = Date.now() - startTime

    // Log batch run for tracking (unless dry run)
    if (!dryRun) {
      try {
        await db.collection('batch_runs').add({
          batchId,
          completedAt: Timestamp.now(),
          ...result
        })
      } catch (error) {
        console.error('[BatchProcess] Failed to log batch run:', error)
      }
    }

    console.log(`[BatchProcess] Batch processing completed:`)
    console.log(`[BatchProcess] - Total jobs found: ${result.totalJobs}`)
    console.log(`[BatchProcess] - New jobs saved: ${result.newJobs}`)
    console.log(`[BatchProcess] - Duplicates skipped: ${result.duplicates}`)
    console.log(`[BatchProcess] - Queries processed: ${result.queriesProcessed}`)
    console.log(`[BatchProcess] - Execution time: ${result.executionTime}ms`)
    console.log(`[BatchProcess] - Errors: ${result.errors.length}`)

    return NextResponse.json({
      success: true,
      message: `Batch processing completed. Processed ${result.newJobs} new jobs.`,
      result
    })

  } catch (error) {
    console.error('[BatchProcess] Fatal error:', error)
    const executionTime = Date.now() - startTime
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      executionTime
    }, { status: 500 })
  }
}

// Helper functions for extracting job details
function extractQualifications(job: any): string[] {
  const qualifications: string[] = []
  
  if (job.job_highlights) {
    for (const highlight of job.job_highlights) {
      if (highlight.title?.toLowerCase().includes("qualification")) {
        qualifications.push(...(highlight.items || []))
      }
    }
  }
  
  return qualifications
}

function extractResponsibilities(job: any): string[] {
  const responsibilities: string[] = []
  
  if (job.job_highlights) {
    for (const highlight of job.job_highlights) {
      if (highlight.title?.toLowerCase().includes("responsibilit")) {
        responsibilities.push(...(highlight.items || []))
      }
    }
  }
  
  return responsibilities
}