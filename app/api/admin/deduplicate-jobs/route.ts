import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import {
  generateJobSignature,
  calculateJobSimilarity,
  areJobsSimilar,
  findSimilarJobs
} from "@/lib/utils/job-similarity"

interface DeduplicationResult {
  success: boolean
  totalJobs: number
  duplicatesFound: number
  duplicatesRemoved: number
  executionTime: number
  errors: string[]
  duplicateGroups: Array<{
    keepJob: any
    removedJobs: any[]
    similarity: number
    reason: 'exact_signature' | 'high_similarity'
  }>
  dryRun: boolean
  similarityThreshold: number
}

/**
 * Deduplicate jobs in the jobs collection using similarity detection
 * 
 * Usage:
 * GET /api/admin/deduplicate-jobs?dryRun=true - Preview what would be removed
 * POST /api/admin/deduplicate-jobs - Actually remove duplicates (requires auth)
 */

export async function GET(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('[DeduplicateJobs] Starting job deduplication analysis...')
    
    const { searchParams } = new URL(req.url)
    const dryRun = searchParams.get('dryRun') !== 'false' // Default to true for safety
    const similarityThreshold = parseInt(searchParams.get('similarityThreshold') || '85', 10)
    const batchSize = parseInt(searchParams.get('batchSize') || '1000', 10)
    const onlyRecent = searchParams.get('onlyRecent') === 'true'
    
    // Initialize Firebase Admin
    initFirebaseAdmin()
    const db = getFirestore()
    
    const result: DeduplicationResult = {
      success: false,
      totalJobs: 0,
      duplicatesFound: 0,
      duplicatesRemoved: 0,
      executionTime: 0,
      errors: [],
      duplicateGroups: [],
      dryRun,
      similarityThreshold
    }
    
    console.log(`[DeduplicateJobs] Configuration:`)
    console.log(`  - Dry Run: ${dryRun}`)
    console.log(`  - Similarity Threshold: ${similarityThreshold}%`)
    console.log(`  - Batch Size: ${batchSize}`)
    console.log(`  - Only Recent: ${onlyRecent}`)
    
    // Get jobs from the collection
    let jobsQuery = db.collection('jobs')
    
    if (onlyRecent) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      jobsQuery = jobsQuery.where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo))
    }
    
    const jobsSnapshot = await jobsQuery.get()
    result.totalJobs = jobsSnapshot.size
    
    console.log(`[DeduplicateJobs] Found ${result.totalJobs} jobs to analyze`)
    
    if (jobsSnapshot.empty) {
      return NextResponse.json({
        ...result,
        success: true,
        message: 'No jobs found to analyze',
        executionTime: Date.now() - startTime
      })
    }
    
    // Build job array with necessary data
    const jobs: Array<{
      id: string
      docRef: any
      title: string
      company: string
      location: string
      createdAt: Date | null
      scrapedAt: Date | null
      signature: string
      data: any
    }> = []
    
    jobsSnapshot.forEach(doc => {
      const data = doc.data()
      const title = data.title || ''
      const company = data.company || data.company_name || ''
      const location = data.location || ''
      
      if (title && company) { // Only process jobs with title and company
        jobs.push({
          id: doc.id,
          docRef: doc.ref,
          title,
          company,
          location,
          createdAt: data.createdAt ? data.createdAt.toDate() : null,
          scrapedAt: data.scrapedAt ? data.scrapedAt.toDate() : null,
          signature: generateJobSignature(title, company, location),
          data
        })
      }
    })
    
    console.log(`[DeduplicateJobs] Processing ${jobs.length} valid jobs`)
    
    // Track processed signatures and similar jobs
    const processedSignatures = new Map<string, string>() // signature -> kept job id
    const processedJobIds = new Set<string>()
    const duplicateGroups: Array<{
      keepJob: any
      removedJobs: any[]
      similarity: number
      reason: 'exact_signature' | 'high_similarity'
    }> = []
    
    // Process jobs in order of creation date (keep older jobs when possible)
    jobs.sort((a, b) => {
      const dateA = a.createdAt || a.scrapedAt || new Date(0)
      const dateB = b.createdAt || b.scrapedAt || new Date(0)
      return dateA.getTime() - dateB.getTime()
    })
    
    for (const job of jobs) {
      if (processedJobIds.has(job.id)) {
        continue // Already processed as part of a duplicate group
      }
      
      // Check for exact signature match
      if (processedSignatures.has(job.signature)) {
        const keepJobId = processedSignatures.get(job.signature)!
        const keepJob = jobs.find(j => j.id === keepJobId)
        
        if (keepJob) {
          duplicateGroups.push({
            keepJob: {
              id: keepJob.id,
              title: keepJob.title,
              company: keepJob.company,
              location: keepJob.location,
              createdAt: keepJob.createdAt?.toISOString(),
              signature: keepJob.signature
            },
            removedJobs: [{
              id: job.id,
              title: job.title,
              company: job.company,
              location: job.location,
              createdAt: job.createdAt?.toISOString(),
              signature: job.signature
            }],
            similarity: 100,
            reason: 'exact_signature'
          })
          
          processedJobIds.add(job.id)
          result.duplicatesFound++
          continue
        }
      }
      
      // Find similar jobs among remaining unprocessed jobs
      const remainingJobs = jobs.filter(j => 
        j.id !== job.id && 
        !processedJobIds.has(j.id) &&
        j.signature !== job.signature // Skip exact signature matches (already handled above)
      )
      
      const similarJobs = findSimilarJobs(
        { title: job.title, company: job.company, location: job.location },
        remainingJobs.map(j => ({ 
          id: j.id, 
          title: j.title, 
          company: j.company, 
          location: j.location 
        })),
        similarityThreshold
      )
      
      if (similarJobs.length > 0) {
        // Group this job with its similar jobs
        const removedJobs = []
        let highestSimilarity = 0
        
        for (const { job: similarJob, similarity } of similarJobs) {
          const fullSimilarJob = jobs.find(j => j.id === similarJob.id)
          if (fullSimilarJob) {
            removedJobs.push({
              id: fullSimilarJob.id,
              title: fullSimilarJob.title,
              company: fullSimilarJob.company,
              location: fullSimilarJob.location,
              createdAt: fullSimilarJob.createdAt?.toISOString(),
              signature: fullSimilarJob.signature,
              similarity
            })
            processedJobIds.add(fullSimilarJob.id)
            highestSimilarity = Math.max(highestSimilarity, similarity)
          }
        }
        
        if (removedJobs.length > 0) {
          duplicateGroups.push({
            keepJob: {
              id: job.id,
              title: job.title,
              company: job.company,
              location: job.location,
              createdAt: job.createdAt?.toISOString(),
              signature: job.signature
            },
            removedJobs,
            similarity: highestSimilarity,
            reason: 'high_similarity'
          })
          
          result.duplicatesFound += removedJobs.length
        }
      }
      
      // Mark this job as processed and record its signature
      processedJobIds.add(job.id)
      processedSignatures.set(job.signature, job.id)
    }
    
    result.duplicateGroups = duplicateGroups
    
    console.log(`[DeduplicateJobs] Analysis complete:`)
    console.log(`  - Total jobs analyzed: ${result.totalJobs}`)
    console.log(`  - Duplicate groups found: ${duplicateGroups.length}`)
    console.log(`  - Total duplicates found: ${result.duplicatesFound}`)
    
    // Actually remove duplicates if not dry run
    if (!dryRun && duplicateGroups.length > 0) {
      console.log(`[DeduplicateJobs] Removing duplicates...`)
      
      const jobsToDelete: string[] = []
      for (const group of duplicateGroups) {
        jobsToDelete.push(...group.removedJobs.map(j => j.id))
      }
      
      // Delete in batches to avoid Firestore limits
      const BATCH_SIZE = 500
      for (let i = 0; i < jobsToDelete.length; i += BATCH_SIZE) {
        const batch = db.batch()
        const chunk = jobsToDelete.slice(i, i + BATCH_SIZE)
        
        for (const jobId of chunk) {
          const job = jobs.find(j => j.id === jobId)
          if (job) {
            batch.delete(job.docRef)
          }
        }
        
        await batch.commit()
        result.duplicatesRemoved += chunk.length
        console.log(`[DeduplicateJobs] Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} jobs`)
      }
      
      // Log the deduplication run
      try {
        await db.collection('deduplication_runs').add({
          completedAt: Timestamp.now(),
          totalJobs: result.totalJobs,
          duplicatesFound: result.duplicatesFound,
          duplicatesRemoved: result.duplicatesRemoved,
          similarityThreshold,
          executionTime: Date.now() - startTime,
          duplicateGroups: duplicateGroups.map(g => ({
            keepJobId: g.keepJob.id,
            removedJobIds: g.removedJobs.map(j => j.id),
            similarity: g.similarity,
            reason: g.reason
          }))
        })
      } catch (error) {
        console.error('[DeduplicateJobs] Failed to log deduplication run:', error)
      }
      
      console.log(`[DeduplicateJobs] Successfully removed ${result.duplicatesRemoved} duplicate jobs`)
    }
    
    result.success = true
    result.executionTime = Date.now() - startTime
    
    return NextResponse.json({
      ...result,
      message: dryRun 
        ? `Dry run complete. Found ${result.duplicatesFound} duplicates that would be removed.`
        : `Deduplication complete. Removed ${result.duplicatesRemoved} duplicate jobs.`,
      details: {
        duplicateGroups: duplicateGroups.slice(0, 20), // Limit response size
        totalGroups: duplicateGroups.length
      }
    })
    
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[DeduplicateJobs] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('[DeduplicateJobs] Manual deduplication request')
    
    // Require authentication for POST (actual deduplication)
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }
    
    // Verify the token
    try {
      initFirebaseAdmin()
      const auth = getAuth()
      const token = authHeader.replace('Bearer ', '')
      await auth.verifyIdToken(token)
    } catch (authError) {
      console.error('[DeduplicateJobs] Auth verification failed:', authError)
      return NextResponse.json({ error: 'Invalid authorization' }, { status: 401 })
    }
    
    const body = await req.json().catch(() => ({}))
    
    // Forward to GET with dryRun=false
    const url = new URL(req.url)
    url.searchParams.set('dryRun', 'false')
    if (body.similarityThreshold) url.searchParams.set('similarityThreshold', body.similarityThreshold.toString())
    if (body.batchSize) url.searchParams.set('batchSize', body.batchSize.toString())
    if (body.onlyRecent) url.searchParams.set('onlyRecent', body.onlyRecent.toString())
    
    const getRequest = new NextRequest(url.toString(), {
      method: 'GET',
      headers: req.headers
    })
    
    return GET(getRequest)
    
  } catch (error) {
    console.error('[DeduplicateJobs] POST error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}