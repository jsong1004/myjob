import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore, Timestamp } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

/**
 * Admin endpoint to clean up duplicate jobs in the jobs collection
 * This identifies and removes duplicate jobs based on title, company, and location
 */

// GET method for checking duplicates (dry run only)
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
    // Skip authorization for local development and testing
    // In production, you may want to re-enable auth checks
    console.log('[CleanupDuplicates] Running without authorization (development mode)')
    
    console.log('[CleanupDuplicates] Starting duplicate cleanup...')
    
    // Initialize Firebase Admin
    initFirebaseAdmin()
    const db = getFirestore()
    
    const body = await req.json().catch(() => ({}))
    const dryRun = body.dryRun !== false // Default to dry run for safety
    
    // Get all jobs from the collection
    const jobsSnapshot = await db.collection('jobs').get()
    console.log(`[CleanupDuplicates] Found ${jobsSnapshot.size} total jobs`)
    
    // Group jobs by composite key
    const jobGroups = new Map<string, Array<{id: string, data: any, createdAt: any}>>()
    
    jobsSnapshot.forEach(doc => {
      const data = doc.data()
      const title = data.title || ""
      const company = data.company || data.company_name || ""
      const location = data.location || ""
      
      // Create composite key for grouping
      const jobKey = `${title}-${company}-${location}`.toLowerCase().trim()
      
      if (!jobGroups.has(jobKey)) {
        jobGroups.set(jobKey, [])
      }
      
      jobGroups.get(jobKey)!.push({
        id: doc.id,
        data: data,
        createdAt: data.createdAt || data.scrapedAt || Timestamp.now()
      })
    })
    
    // Find duplicates
    const duplicatesToDelete: string[] = []
    const duplicateGroups: Array<{key: string, count: number, kept: string, deleted: string[]}> = []
    
    for (const [jobKey, jobs] of jobGroups.entries()) {
      if (jobs.length > 1) {
        // Sort by creation date (keep the oldest) and by whether it has a sourceJobId
        jobs.sort((a, b) => {
          // Prefer jobs with sourceJobId
          const aHasSourceId = !!a.data.sourceJobId || !!a.data.job_id
          const bHasSourceId = !!b.data.sourceJobId || !!b.data.job_id
          
          if (aHasSourceId && !bHasSourceId) return -1
          if (!aHasSourceId && bHasSourceId) return 1
          
          // Then sort by creation date (keep oldest)
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
          deleted: toDelete.map(j => j.id)
        })
        
        toDelete.forEach(job => {
          duplicatesToDelete.push(job.id)
        })
      }
    }
    
    console.log(`[CleanupDuplicates] Found ${duplicatesToDelete.length} duplicate jobs to delete`)
    console.log(`[CleanupDuplicates] Found ${duplicateGroups.length} groups with duplicates`)
    
    // Delete duplicates (unless dry run)
    let deletedCount = 0
    if (!dryRun && duplicatesToDelete.length > 0) {
      // Batch delete (Firestore limit: 500 operations per batch)
      const BATCH_SIZE = 500
      for (let i = 0; i < duplicatesToDelete.length; i += BATCH_SIZE) {
        const batch = db.batch()
        const chunk = duplicatesToDelete.slice(i, i + BATCH_SIZE)
        
        for (const docId of chunk) {
          const docRef = db.collection('jobs').doc(docId)
          batch.delete(docRef)
        }
        
        await batch.commit()
        deletedCount += chunk.length
        console.log(`[CleanupDuplicates] Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} documents`)
      }
    }
    
    const executionTime = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      message: dryRun ? 'Dry run completed' : 'Cleanup completed',
      dryRun,
      totalJobs: jobsSnapshot.size,
      duplicatesFound: duplicatesToDelete.length,
      duplicatesDeleted: deletedCount,
      duplicateGroups: duplicateGroups.slice(0, 10), // Return first 10 groups as examples
      executionTime
    })
    
  } catch (error) {
    console.error('[CleanupDuplicates] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime: Date.now() - startTime
    }, { status: 500 })
  }
}