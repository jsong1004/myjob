import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore } from "firebase-admin/firestore"

/**
 * Debug endpoint to examine specific job data for duplicate analysis
 */
export async function GET(req: NextRequest) {
  try {
    console.log('[DebugDuplicates] Starting debug analysis...')
    
    // Initialize Firebase Admin
    initFirebaseAdmin()
    const db = getFirestore()
    
    const { searchParams } = new URL(req.url)
    const company = searchParams.get('company') || 'astrana'
    const title = searchParams.get('title') || 'data engineer'
    
    console.log(`[DebugDuplicates] Searching for company: ${company}, title: ${title}`)
    
    // Get all jobs from the collection
    const jobsSnapshot = await db.collection('jobs').get()
    console.log(`[DebugDuplicates] Found ${jobsSnapshot.size} total jobs`)
    
    // Find jobs matching the criteria
    const matchingJobs: any[] = []
    
    jobsSnapshot.forEach(doc => {
      const data = doc.data()
      const jobTitle = (data.title || "").toLowerCase()
      const jobCompany = (data.company || data.company_name || "").toLowerCase()
      
      const titleMatch = jobTitle.includes(title.toLowerCase())
      const companyMatch = jobCompany.includes(company.toLowerCase())
      
      if (titleMatch && companyMatch) {
        matchingJobs.push({
          id: doc.id,
          title: data.title,
          company: data.company || data.company_name,
          location: data.location,
          sourceJobId: data.sourceJobId,
          job_id: data.job_id,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
          scrapedAt: data.scrapedAt ? data.scrapedAt.toDate().toISOString() : null,
          batchId: data.batchId,
          // Generate the composite key used for duplicate detection
          compositeKey: `${data.title || ""}-${data.company || data.company_name || ""}-${data.location || ""}`.toLowerCase()
        })
      }
    })
    
    console.log(`[DebugDuplicates] Found ${matchingJobs.length} matching jobs`)
    
    // Group by composite key to see duplicates
    const groups = new Map<string, any[]>()
    matchingJobs.forEach(job => {
      if (!groups.has(job.compositeKey)) {
        groups.set(job.compositeKey, [])
      }
      groups.get(job.compositeKey)!.push(job)
    })
    
    const duplicateGroups = Array.from(groups.entries())
      .filter(([key, jobs]) => jobs.length > 1)
      .map(([key, jobs]) => ({
        compositeKey: key,
        count: jobs.length,
        jobs: jobs
      }))
    
    return NextResponse.json({
      success: true,
      searchCriteria: { company, title },
      totalJobs: jobsSnapshot.size,
      matchingJobs: matchingJobs.length,
      duplicateGroups,
      allMatchingJobs: matchingJobs,
      message: duplicateGroups.length > 0 ? 
        `Found ${duplicateGroups.length} duplicate groups` : 
        'No duplicates detected with current algorithm'
    })
    
  } catch (error) {
    console.error('[DebugDuplicates] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}