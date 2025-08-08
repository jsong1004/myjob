import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore } from "firebase-admin/firestore"
import {
  normalizeCompanyName,
  normalizeJobTitle,
  normalizeLocation,
  generateJobSignature,
  calculateJobSimilarity,
  areJobsSimilar,
  findSimilarJobs
} from "@/lib/utils/job-similarity"

/**
 * Test endpoint for job similarity detection
 * 
 * Usage:
 * GET /api/admin/test-similarity - Test with default examples
 * POST /api/admin/test-similarity - Test with custom job pairs
 */

// Default test cases
const DEFAULT_TEST_CASES = [
  {
    name: "Children's Health variations",
    job1: { 
      title: "Advanced Analytics - Data Engineer", 
      company: "Children's Health", 
      location: "Dallas, TX" 
    },
    job2: { 
      title: "Advanced Analytics - Data Engineer", 
      company: "Children's Medical Center", 
      location: "Dallas, TX" 
    }
  },
  {
    name: "Company suffix variations",
    job1: { 
      title: "Software Engineer", 
      company: "Tech Solutions Inc", 
      location: "San Francisco, CA" 
    },
    job2: { 
      title: "Software Engineer", 
      company: "Tech Solutions Corporation", 
      location: "San Francisco" 
    }
  },
  {
    name: "Title level variations",
    job1: { 
      title: "Senior Data Scientist", 
      company: "Meta", 
      location: "Menlo Park" 
    },
    job2: { 
      title: "Data Scientist III", 
      company: "Meta Platforms", 
      location: "Menlo Park, CA" 
    }
  },
  {
    name: "Remote location variations",
    job1: { 
      title: "DevOps Engineer", 
      company: "Startup Co", 
      location: "Remote" 
    },
    job2: { 
      title: "DevOps Engineer", 
      company: "Startup Company", 
      location: "Anywhere" 
    }
  }
]

export async function GET(req: NextRequest) {
  try {
    console.log('[TestSimilarity] Running similarity tests...')
    
    const { searchParams } = new URL(req.url)
    const threshold = parseInt(searchParams.get('threshold') || '85', 10)
    const testDb = searchParams.get('testDb') === 'true'
    
    const results = {
      threshold,
      testCases: [] as any[],
      databaseTests: null as any
    }
    
    // Test default cases
    for (const testCase of DEFAULT_TEST_CASES) {
      const job1Normalized = {
        title: normalizeJobTitle(testCase.job1.title),
        company: normalizeCompanyName(testCase.job1.company),
        location: normalizeLocation(testCase.job1.location)
      }
      
      const job2Normalized = {
        title: normalizeJobTitle(testCase.job2.title),
        company: normalizeCompanyName(testCase.job2.company),
        location: normalizeLocation(testCase.job2.location)
      }
      
      const signature1 = generateJobSignature(
        testCase.job1.title,
        testCase.job1.company,
        testCase.job1.location
      )
      
      const signature2 = generateJobSignature(
        testCase.job2.title,
        testCase.job2.company,
        testCase.job2.location
      )
      
      const similarity = calculateJobSimilarity(testCase.job1, testCase.job2)
      const isDuplicate = areJobsSimilar(testCase.job1, testCase.job2, threshold)
      
      results.testCases.push({
        name: testCase.name,
        job1: {
          original: testCase.job1,
          normalized: job1Normalized,
          signature: signature1
        },
        job2: {
          original: testCase.job2,
          normalized: job2Normalized,
          signature: signature2
        },
        similarity: similarity,
        isDuplicate: isDuplicate,
        wouldBeSkipped: similarity >= threshold
      })
    }
    
    // Test against real database if requested
    if (testDb) {
      initFirebaseAdmin()
      const db = getFirestore()
      
      console.log('[TestSimilarity] Testing against real database...')
      
      // Get a sample of jobs from the database
      const jobsSnapshot = await db.collection('jobs')
        .limit(100)
        .get()
      
      const jobs = jobsSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || '',
          company: data.company || data.company_name || '',
          location: data.location || ''
        }
      })
      
      // Find potential duplicates in the sample
      const potentialDuplicates: any[] = []
      
      for (let i = 0; i < jobs.length; i++) {
        for (let j = i + 1; j < jobs.length; j++) {
          const similarity = calculateJobSimilarity(jobs[i], jobs[j])
          if (similarity >= 70) { // Lower threshold to find more potential matches
            potentialDuplicates.push({
              job1: jobs[i],
              job2: jobs[j],
              similarity,
              wouldBeSkipped: similarity >= threshold
            })
          }
        }
      }
      
      // Sort by similarity score
      potentialDuplicates.sort((a, b) => b.similarity - a.similarity)
      
      results.databaseTests = {
        totalJobs: jobs.length,
        potentialDuplicates: potentialDuplicates.slice(0, 10), // Top 10 matches
        duplicatesFound: potentialDuplicates.filter(d => d.similarity >= threshold).length
      }
    }
    
    return NextResponse.json({
      success: true,
      results
    })
    
  } catch (error) {
    console.error('[TestSimilarity] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { job1, job2, threshold = 85 } = body
    
    if (!job1 || !job2) {
      return NextResponse.json({
        success: false,
        error: 'Please provide job1 and job2 objects with title, company, and location'
      }, { status: 400 })
    }
    
    // Normalize both jobs
    const job1Normalized = {
      title: normalizeJobTitle(job1.title || ''),
      company: normalizeCompanyName(job1.company || ''),
      location: normalizeLocation(job1.location || '')
    }
    
    const job2Normalized = {
      title: normalizeJobTitle(job2.title || ''),
      company: normalizeCompanyName(job2.company || ''),
      location: normalizeLocation(job2.location || '')
    }
    
    // Generate signatures
    const signature1 = generateJobSignature(
      job1.title || '',
      job1.company || '',
      job1.location || ''
    )
    
    const signature2 = generateJobSignature(
      job2.title || '',
      job2.company || '',
      job2.location || ''
    )
    
    // Calculate similarity
    const similarity = calculateJobSimilarity(job1, job2)
    const isDuplicate = areJobsSimilar(job1, job2, threshold)
    
    // Calculate individual component similarities for debugging
    const titleSimilarity = calculateJobSimilarity(
      { title: job1.title, company: '', location: '' },
      { title: job2.title, company: '', location: '' }
    )
    
    const companySimilarity = calculateJobSimilarity(
      { title: '', company: job1.company, location: '' },
      { title: '', company: job2.company, location: '' }
    )
    
    const locationSimilarity = calculateJobSimilarity(
      { title: '', company: '', location: job1.location },
      { title: '', company: '', location: job2.location }
    )
    
    return NextResponse.json({
      success: true,
      result: {
        job1: {
          original: job1,
          normalized: job1Normalized,
          signature: signature1
        },
        job2: {
          original: job2,
          normalized: job2Normalized,
          signature: signature2
        },
        similarity: {
          overall: similarity,
          breakdown: {
            title: titleSimilarity,
            company: companySimilarity,
            location: locationSimilarity
          }
        },
        isDuplicate,
        wouldBeSkipped: similarity >= threshold,
        threshold
      }
    })
    
  } catch (error) {
    console.error('[TestSimilarity] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}