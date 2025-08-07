import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore"

/**
 * Cron endpoint for migrating batch_jobs to jobs collection
 * This endpoint is designed to be called by external cron services after batch processing
 * Runs daily at 3 AM PST (after batch processing completes at 2 AM)
 * 
 * NO AUTHENTICATION REQUIRED - accessible by scheduler
 * 
 * For Vercel deployment, add this to vercel.json:
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/migrate-batch-jobs",
 *       "schedule": "0 3 * * 1-5"
 *     }
 *   ]
 * }
 */

interface MigrationResult {
  success: boolean
  migratedCount: number
  duplicatesSkipped: number
  deletedCount: number
  executionTime: number
  errors: string[]
  dryRun: boolean
}

export async function GET(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('[MigrateBatchJobs] Starting batch_jobs to jobs migration...')
    
    // Check for dry run parameter
    const { searchParams } = new URL(req.url)
    const dryRun = searchParams.get('dryRun') === 'true'
    const forceRun = searchParams.get('force') === 'true'
    
    // No authorization required for cron job scheduler calls
    console.log('[MigrateBatchJobs] Processing migration request (no auth required)')
    
    if (dryRun) {
      console.log('[MigrateBatchJobs] DRY RUN MODE - No actual changes will be made')
    }
    
    // Initialize Firebase Admin
    initFirebaseAdmin()
    const db = getFirestore()
    
    const result: MigrationResult = {
      success: false,
      migratedCount: 0,
      duplicatesSkipped: 0,
      deletedCount: 0,
      executionTime: 0,
      errors: [],
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
      
      // Step 2: Get existing job IDs from jobs collection for deduplication
      console.log('[MigrateBatchJobs] Building deduplication index...')
      const existingJobIds = new Set<string>()
      
      // Query jobs collection in batches to avoid memory issues
      const jobsSnapshot = await db.collection('jobs')
        .select('job_id') // Only get job_id field to save memory
        .get()
      
      jobsSnapshot.forEach(doc => {
        const jobId = doc.data().job_id || doc.id
        existingJobIds.add(jobId)
      })
      
      console.log(`[MigrateBatchJobs] Found ${existingJobIds.size} existing jobs in jobs collection`)
      
      // Step 3: Process batch_jobs for migration
      const jobsToMigrate = []
      const jobsToDelete = []
      
      for (const doc of batchJobsSnapshot.docs) {
        const batchJob = doc.data()
        const jobId = batchJob.id || doc.id
        
        jobsToDelete.push(doc.ref)
        
        // Skip if job already exists in jobs collection
        if (existingJobIds.has(jobId)) {
          result.duplicatesSkipped++
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
      console.log(`[MigrateBatchJobs] Skipping ${result.duplicatesSkipped} duplicate jobs`)
      
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
            deletedCount: result.deletedCount,
            executionTime: Date.now() - startTime,
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
      console.log(`[MigrateBatchJobs] Summary: Migrated=${result.migratedCount}, Skipped=${result.duplicatesSkipped}, Deleted=${result.deletedCount}, Time=${result.executionTime}ms`)
      
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