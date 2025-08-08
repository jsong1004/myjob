import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore } from "firebase-admin/firestore"
import {
  normalizeCompanyName,
  normalizeJobTitle,
  generateJobSignature,
  calculateJobSimilarity,
  findSimilarJobs
} from "@/lib/utils/job-similarity"

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
    const similarityThreshold = parseInt(searchParams.get('threshold') || '85', 10)
    
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
          compositeKey: `${data.title || ""}-${data.company || data.company_name || ""}-${data.location || ""}`.toLowerCase(),
          // Add normalization and signatures for similarity analysis
          normalizedTitle: normalizeJobTitle(data.title || ''),
          normalizedCompany: normalizeCompanyName(data.company || data.company_name || ''),
          contentSignature: generateJobSignature(
            data.title || '',
            data.company || data.company_name || '',
            data.location || ''
          )
        })
      }
    })
    
    console.log(`[DebugDuplicates] Found ${matchingJobs.length} matching jobs`)
    console.log(`[DebugDuplicates] Analyzing similarity with threshold: ${similarityThreshold}%`)
    
    // Group by composite key to see exact duplicates
    const exactGroups = new Map<string, any[]>()
    matchingJobs.forEach(job => {
      if (!exactGroups.has(job.compositeKey)) {
        exactGroups.set(job.compositeKey, [])
      }
      exactGroups.get(job.compositeKey)!.push(job)
    })
    
    const exactDuplicateGroups = Array.from(exactGroups.entries())
      .filter(([key, jobs]) => jobs.length > 1)
      .map(([key, jobs]) => ({
        type: 'exact',
        compositeKey: key,
        count: jobs.length,
        jobs: jobs
      }))
    
    // Group by content signature for similarity-based duplicates
    const signatureGroups = new Map<string, any[]>()
    matchingJobs.forEach(job => {
      if (!signatureGroups.has(job.contentSignature)) {
        signatureGroups.set(job.contentSignature, [])
      }
      signatureGroups.get(job.contentSignature)!.push(job)
    })
    
    const signatureDuplicateGroups = Array.from(signatureGroups.entries())
      .filter(([signature, jobs]) => jobs.length > 1)
      .map(([signature, jobs]) => ({
        type: 'signature',
        contentSignature: signature,
        count: jobs.length,
        jobs: jobs
      }))
    
    // Find similar jobs using the similarity algorithm
    const similarityMatches: Array<{
      job1: any
      job2: any
      similarity: number
      wouldBeSkipped: boolean
    }> = []
    
    for (let i = 0; i < matchingJobs.length; i++) {
      for (let j = i + 1; j < matchingJobs.length; j++) {
        const job1 = matchingJobs[i]
        const job2 = matchingJobs[j]
        
        // Skip if they're already exact duplicates
        if (job1.compositeKey === job2.compositeKey) continue
        
        const similarity = calculateJobSimilarity(
          { title: job1.title, company: job1.company, location: job1.location },
          { title: job2.title, company: job2.company, location: job2.location }
        )
        
        if (similarity >= 70) { // Show matches with 70%+ similarity for analysis
          similarityMatches.push({
            job1: job1,
            job2: job2,
            similarity,
            wouldBeSkipped: similarity >= similarityThreshold
          })
        }
      }
    }
    
    // Sort similarity matches by score
    similarityMatches.sort((a, b) => b.similarity - a.similarity)
    
    return NextResponse.json({
      success: true,
      searchCriteria: { company, title, similarityThreshold },
      totalJobs: jobsSnapshot.size,
      matchingJobs: matchingJobs.length,
      analysis: {
        exactDuplicates: {
          count: exactDuplicateGroups.length,
          groups: exactDuplicateGroups
        },
        signatureDuplicates: {
          count: signatureDuplicateGroups.length,
          groups: signatureDuplicateGroups
        },
        similarityMatches: {
          count: similarityMatches.length,
          wouldBeSkipped: similarityMatches.filter(m => m.wouldBeSkipped).length,
          matches: similarityMatches.slice(0, 10) // Top 10 most similar
        }
      },
      allMatchingJobs: matchingJobs,
      summary: {
        exactDuplicates: exactDuplicateGroups.length,
        signatureDuplicates: signatureDuplicateGroups.length,
        similarityMatches: similarityMatches.length,
        wouldBeSkippedBySimilarity: similarityMatches.filter(m => m.wouldBeSkipped).length
      }
    })
    
  } catch (error) {
    console.error('[DebugDuplicates] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}