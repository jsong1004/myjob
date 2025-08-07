import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore, Timestamp } from "firebase-admin/firestore"

/**
 * Admin endpoint to clean up duplicate jobs in the saved_jobs collection
 * This identifies and removes duplicate saved jobs based on title, company, and location
 */

export async function GET(req: NextRequest) {
  // Force dry run for GET requests (read-only operation)
  const request = new NextRequest(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify({ dryRun: true })
  })
  return POST(request)
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('[CleanupSavedJobs] Starting saved_jobs duplicate cleanup...')
    
    // Initialize Firebase Admin
    initFirebaseAdmin()
    const db = getFirestore()
    
    const body = await req.json().catch(() => ({}))
    const dryRun = body.dryRun !== false // Default to dry run for safety
    
    // Get all saved jobs from the collection (note: collection is 'savedJobs', not 'saved_jobs')
    const savedJobsSnapshot = await db.collection('savedJobs').get()
    console.log(`[CleanupSavedJobs] Found ${savedJobsSnapshot.size} total saved jobs`)
    
    // Group saved jobs by composite key
    const jobGroups = new Map<string, Array<{id: string, data: any, createdAt: any}>>()
    
    savedJobsSnapshot.forEach(doc => {
      const data = doc.data()
      const title = data.title || ""
      const company = data.company || ""
      const location = data.location || ""
      const userId = data.userId || "" // Include userId to avoid cross-user cleanup
      
      // Create composite key for grouping (include userId to keep user separation)
      const jobKey = `${userId}-${title}-${company}-${location}`.toLowerCase().trim()
      
      if (!jobGroups.has(jobKey)) {
        jobGroups.set(jobKey, [])
      }
      
      jobGroups.get(jobKey)!.push({
        id: doc.id,
        data: data,
        createdAt: data.savedAt || data.createdAt || Timestamp.now()
      })
    })
    
    // Find duplicates
    const duplicatesToDelete: string[] = []
    const duplicateGroups: Array<{key: string, count: number, kept: string, deleted: string[], userId: string}> = []
    
    for (const [jobKey, jobs] of jobGroups.entries()) {
      if (jobs.length > 1) {
        // Sort by creation date (keep the oldest)
        jobs.sort((a, b) => {
          const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0
          const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0
          return aTime - bTime
        })
        
        // Keep the first one, delete the rest
        const toKeep = jobs[0]
        const toDelete = jobs.slice(1)
        
        duplicateGroups.push({
          key: jobKey,
          count: jobs.length,
          kept: toKeep.id,
          deleted: toDelete.map(j => j.id),
          userId: toKeep.data.userId || 'unknown'
        })
        
        toDelete.forEach(job => {
          duplicatesToDelete.push(job.id)
        })
      }
    }
    
    console.log(`[CleanupSavedJobs] Found ${duplicatesToDelete.length} duplicate saved jobs to delete`)
    console.log(`[CleanupSavedJobs] Found ${duplicateGroups.length} groups with duplicates`)
    
    // Delete duplicates (unless dry run)
    let deletedCount = 0
    if (!dryRun && duplicatesToDelete.length > 0) {
      // Batch delete (Firestore limit: 500 operations per batch)
      const BATCH_SIZE = 500
      for (let i = 0; i < duplicatesToDelete.length; i += BATCH_SIZE) {
        const batch = db.batch()
        const chunk = duplicatesToDelete.slice(i, i + BATCH_SIZE)
        
        for (const docId of chunk) {
          const docRef = db.collection('savedJobs').doc(docId)
          batch.delete(docRef)
        }
        
        await batch.commit()
        deletedCount += chunk.length
        console.log(`[CleanupSavedJobs] Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} documents`)
      }
    }
    
    const executionTime = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      message: dryRun ? 'Dry run completed' : 'Saved jobs cleanup completed',
      dryRun,
      collection: 'savedJobs',
      totalSavedJobs: savedJobsSnapshot.size,
      duplicatesFound: duplicatesToDelete.length,
      duplicatesDeleted: deletedCount,
      duplicateGroups: duplicateGroups.slice(0, 10), // Return first 10 groups as examples
      executionTime
    })
    
  } catch (error) {
    console.error('[CleanupSavedJobs] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime: Date.now() - startTime
    }, { status: 500 })
  }
}