import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore"
import { 
  normalizeCompanyName, 
  normalizeJobTitle,
  generateJobSignature,
  calculateJobSimilarity,
  areJobsSimilar,
  findSimilarJobs 
} from "@/lib/utils/job-similarity"

interface MigrationResult {
  success: boolean
  migratedCount: number
  duplicatesSkipped: number
  similarJobsSkipped: number
  deletedCount: number
  executionTime: number
  errors: string[]
  similarityDetails: Array<{
    batchJobId: string
    similarTo: string
    similarity: number
    title: string
    company: string
  }>
  dryRun: boolean
}

export async function GET(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('[MigrateBatchJobs] Starting batch_jobs to jobs migration...')
    
    // Check for parameters
    const { searchParams } = new URL(req.url)
    const dryRun = searchParams.get('dryRun') === 'true'
    const forceRun = searchParams.get('force') === 'true'
    const similarityThreshold = parseInt(searchParams.get('similarityThreshold') || '85', 10)
    
    // No authorization required for cron job scheduler calls
    console.log('[MigrateBatchJobs] Processing migration request (no auth required)')
    
    if (dryRun) {
      console.log('[MigrateBatchJobs] DRY RUN MODE - No actual changes will be made')
    }
    console.log(`[MigrateBatchJobs] Similarity threshold: ${similarityThreshold}%`)
    
    // Initialize Firebase Admin
    initFirebaseAdmin()
    const db = getFirestore()
    
    const result: MigrationResult = {
      success: false,
      migratedCount: 0,
      duplicatesSkipped: 0,
      similarJobsSkipped: 0,
      deletedCount: 0,
      executionTime: 0,
      errors: [],
      similarityDetails: [],
      dryRun
    }
    
    try {
      // Step 1: Get all batch_jobs documents
      console.log('[MigrateBatchJobs] Fetching all batch_jobs...')
      const batchJobsSnapshot = await db.collection('batch_jobs').get()
      console.log(`[MigrateBatchJobs] Found ${batchJobsSnapshot.size} batch_jobs to process`)
      
      if (batchJobsSnapshot.empty) {
        console.log('[MigrateBatchJobs] No batch_jobs to migrate')
        return NextResponse.json({
          ...result,
          success: true,
          message: 'No batch_jobs to migrate',
          executionTime: Date.now() - startTime
        })
      }
      
      // Step 2: Get existing jobs from jobs collection for deduplication and similarity checking
      console.log('[MigrateBatchJobs] Building deduplication and similarity index...')
      const existingJobIds = new Set<string>()
      const existingJobs: Array<{ id: string; title: string; company: string; location: string }> = []
      const contentSignatures = new Map<string, string>() // signature -> job_id
      
      // Query jobs collection to get job details for similarity checking
      const jobsSnapshot = await db.collection('jobs')
        .select('job_id', 'title', 'company', 'company_name', 'location') // Get fields needed for similarity
        .get()
      
      jobsSnapshot.forEach(doc => {
        const data = doc.data()
        const jobId = data.job_id || doc.id
        existingJobIds.add(jobId)
        
        // Build similarity index
        const title = data.title || ''
        const company = data.company || data.company_name || ''
        const location = data.location || ''
        
        if (title && company) {
          existingJobs.push({ id: jobId, title, company, location })
          
          // Generate and store content signature
          const signature = generateJobSignature(title, company, location)
          if (signature) {
            contentSignatures.set(signature, jobId)
          }
        }
      })
      
      console.log(`[MigrateBatchJobs] Found ${existingJobIds.size} existing jobs in jobs collection`)
      console.log(`[MigrateBatchJobs] Built similarity index with ${existingJobs.length} jobs`)
      
      // Step 3: Process batch_jobs for migration
      const jobsToMigrate = []
      const jobsToDelete = []
      
      for (const doc of batchJobsSnapshot.docs) {
        const batchJob = doc.data()
        const jobId = batchJob.id || doc.id
        
        jobsToDelete.push(doc.ref)
        
        // Skip if job already exists in jobs collection (exact ID match)
        if (existingJobIds.has(jobId)) {
          result.duplicatesSkipped++
          continue
        }
        
        // Check for similar jobs based on content
        const title = batchJob.title || ''
        const company = batchJob.company || ''
        const location = batchJob.location || ''
        
        // First check exact content signature match
        const signature = generateJobSignature(title, company, location)
        if (contentSignatures.has(signature)) {
          result.similarJobsSkipped++
          const similarJobId = contentSignatures.get(signature)
          if (process.env.NODE_ENV === 'development') {
            console.log(`[MigrateBatchJobs] Skipping job ${jobId} - exact signature match with ${similarJobId}`)
          }
          result.similarityDetails.push({
            batchJobId: jobId,
            similarTo: similarJobId || '',
            similarity: 100,
            title,
            company
          })
          continue
        }
        
        // Check for similar jobs using similarity algorithm
        const similarJobs = findSimilarJobs(
          { title, company, location },
          existingJobs,
          similarityThreshold
        )
        
        if (similarJobs.length > 0) {
          const mostSimilar = similarJobs[0]
          result.similarJobsSkipped++
          if (process.env.NODE_ENV === 'development') {
            console.log(`[MigrateBatchJobs] Skipping job "${title}" at "${company}" - ${mostSimilar.similarity}% similar to existing job ${mostSimilar.job.id}`)
          }
          result.similarityDetails.push({
            batchJobId: jobId,
            similarTo: mostSimilar.job.id || '',
            similarity: mostSimilar.similarity,
            title,
            company
          })
          continue
        }
        
        // Prepare job document for migration
        const jobDocument = {
          // Core job fields
          job_id: jobId,
          title: batchJob.title || '',
          company: batchJob.company || '',
          company_name: batchJob.company || '', // Backward compatibility
          location: batchJob.location || '',
          description: batchJob.description || '',
          
          // Job details
          salary: batchJob.salary || '',
          qualifications: batchJob.qualifications || [],
          responsibilities: batchJob.responsibilities || [],
          benefits: batchJob.benefits || [],
          
          // Batch metadata (preserved from batch_jobs)
          batchId: batchJob.batchId || '',
          searchQuery: batchJob.searchQuery || '',
          searchLocation: batchJob.searchLocation || '',
          scrapedAt: batchJob.scrapedAt || batchJob.batchCreatedAt || Timestamp.now(),
          isFromBatch: true,
          
          // Source information
          source: batchJob.source || 'Google Jobs',
          sourceJobId: batchJob.sourceJobId || '',
          applyUrl: batchJob.applyUrl || '',
          postedAt: batchJob.postedAt || '',
          
          // Enhanced data if available
          summary: batchJob.summary || '',
          enhancedData: batchJob.enhancedData || null,
          
          // Migration metadata
          migratedAt: Timestamp.now(),
          migratedFrom: 'batch_jobs'
        }
        
        jobsToMigrate.push({ id: jobId, data: jobDocument })
      }
      
      console.log(`[MigrateBatchJobs] Ready to migrate ${jobsToMigrate.length} new jobs`)
      console.log(`[MigrateBatchJobs] Skipping ${result.duplicatesSkipped} exact duplicate jobs`)
      console.log(`[MigrateBatchJobs] Skipping ${result.similarJobsSkipped} similar jobs (threshold: ${similarityThreshold}%)`)
      
      // Step 4: Perform migration (unless dry run)
      if (!dryRun && jobsToMigrate.length > 0) {
        console.log('[MigrateBatchJobs] Starting migration to jobs collection...')
        
        // Batch write to jobs collection (Firestore limit: 500 operations per batch)
        const BATCH_SIZE = 500
        for (let i = 0; i < jobsToMigrate.length; i += BATCH_SIZE) {
          const batch = db.batch()
          const chunk = jobsToMigrate.slice(i, i + BATCH_SIZE)
          
          for (const job of chunk) {
            const docRef = db.collection('jobs').doc(job.id)
            batch.set(docRef, job.data, { merge: true })
          }
          
          await batch.commit()
          result.migratedCount += chunk.length
          console.log(`[MigrateBatchJobs] Migrated batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} jobs`)
        }
        
        console.log(`[MigrateBatchJobs] Successfully migrated ${result.migratedCount} jobs`)
      } else if (dryRun) {
        result.migratedCount = jobsToMigrate.length
        console.log(`[MigrateBatchJobs] DRY RUN: Would migrate ${result.migratedCount} jobs`)
      }
      
      // Step 5: Delete all batch_jobs documents (unless dry run)
      if (!dryRun && jobsToDelete.length > 0) {
        console.log('[MigrateBatchJobs] Deleting batch_jobs documents...')
        
        // Batch delete (Firestore limit: 500 operations per batch)
        const BATCH_SIZE = 500
        for (let i = 0; i < jobsToDelete.length; i += BATCH_SIZE) {
          const batch = db.batch()
          const chunk = jobsToDelete.slice(i, i + BATCH_SIZE)
          
          for (const docRef of chunk) {
            batch.delete(docRef)
          }
          
          await batch.commit()
          result.deletedCount += chunk.length
          console.log(`[MigrateBatchJobs] Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} documents`)
        }
        
        console.log(`[MigrateBatchJobs] Successfully deleted ${result.deletedCount} batch_jobs documents`)
      } else if (dryRun) {
        result.deletedCount = jobsToDelete.length
        console.log(`[MigrateBatchJobs] DRY RUN: Would delete ${result.deletedCount} batch_jobs documents`)
      }
      
      // Step 6: Log migration run for tracking
      if (!dryRun) {
        try {
          await db.collection('migration_runs').add({
            type: 'batch_jobs_to_jobs',
            completedAt: Timestamp.now(),
            migratedCount: result.migratedCount,
            duplicatesSkipped: result.duplicatesSkipped,
            similarJobsSkipped: result.similarJobsSkipped,
            deletedCount: result.deletedCount,
            executionTime: Date.now() - startTime,
            similarityThreshold,
            success: true
          })
        } catch (error) {
          console.error('[MigrateBatchJobs] Failed to log migration run:', error)
          // Non-critical error, continue
        }
      }
      
      result.success = true
      result.executionTime = Date.now() - startTime
      
      console.log('[MigrateBatchJobs] Migration completed successfully')
      console.log(`[MigrateBatchJobs] Summary: Migrated=${result.migratedCount}, ExactDuplicates=${result.duplicatesSkipped}, SimilarJobs=${result.similarJobsSkipped}, Deleted=${result.deletedCount}, Time=${result.executionTime}ms`)
      
    } catch (migrationError) {
      const errorMsg = migrationError instanceof Error ? migrationError.message : 'Unknown migration error'
      console.error('[MigrateBatchJobs] Migration failed:', errorMsg)
      result.errors.push(errorMsg)
      result.executionTime = Date.now() - startTime
      
      return NextResponse.json({
        ...result,
        success: false,
        error: 'Migration failed',
        detail: errorMsg
      }, { status: 500 })
    }
    
    // Return success response
    return NextResponse.json({
      ...result,
      message: dryRun ? 'Dry run completed' : 'Migration completed successfully'
    })
    
  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[MigrateBatchJobs] Fatal error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Migration job failed',
      detail: error instanceof Error ? error.message : 'Unknown error',
      executionTime
    }, { status: 500 })
  }
}

// Also support POST for manual triggers with additional options
export async function POST(req: NextRequest) {
  try {
    console.log('[MigrateBatchJobs] Manual migration trigger')
    
    // For manual triggers from admin panel, we might want to check auth
    // But for now, keeping it open for simplicity
    
    const body = await req.json().catch(() => ({}))
    
    // Forward to GET handler with parameters
    const url = new URL(req.url)
    if (body.dryRun) url.searchParams.set('dryRun', 'true')
    if (body.force) url.searchParams.set('force', 'true')
    if (body.similarityThreshold) url.searchParams.set('similarityThreshold', body.similarityThreshold.toString())
    
    const getRequest = new NextRequest(url.toString(), {
      method: 'GET',
      headers: req.headers
    })
    
    return GET(getRequest)
    
  } catch (error) {
    console.error('[MigrateBatchJobs] Manual trigger error:', error)
    return NextResponse.json({
      success: false,
      error: 'Manual trigger failed',
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}