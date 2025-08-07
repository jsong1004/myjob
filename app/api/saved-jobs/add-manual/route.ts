import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import { SavedJob, JobSearchResult } from "@/lib/types"
import { safeJsonParse } from "@/lib/utils/json-parser"
import { logActivity } from "@/lib/activity-logger"

export async function POST(req: NextRequest) {
  try {
    initFirebaseAdmin()
    const adminAuth = getAuth()
    const adminDb = getFirestore()

    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const userId = decoded.uid
    const body = await req.json()
    const { title, company, location, description, applyUrl, salary } = body

    if (!title || !company) {
      return NextResponse.json({ error: "Title and company are required" }, { status: 400 })
    }

    // Enhanced duplicate prevention: check for content-based duplicates before creating new job
    // Check for content-based duplicates (same title, company, location)
    const existingJobsByContent = await adminDb.collection("savedJobs")
      .where("userId", "==", userId)
      .get() // Get all user's saved jobs to check content similarity

    // Check for content-based duplicates
    const contentDuplicate = existingJobsByContent.docs.find(doc => {
      const data = doc.data()
      const existingTitle = (data.title || "").toLowerCase().trim()
      const existingCompany = (data.company || "").toLowerCase().trim()
      const existingLocation = (data.location || "").toLowerCase().trim()
      
      const newTitle = title.toLowerCase().trim()
      const newCompany = company.toLowerCase().trim()
      const newLocation = (location || "").toLowerCase().trim()
      
      // Consider it a duplicate if title, company, and location all match
      return existingTitle === newTitle && 
             existingCompany === newCompany && 
             existingLocation === newLocation
    })
    
    if (contentDuplicate) {
      const duplicateData = contentDuplicate.data()
      return NextResponse.json({ 
        error: "Similar job already saved",
        duplicate: {
          id: contentDuplicate.id,
          title: duplicateData.title,
          company: duplicateData.company,
          location: duplicateData.location
        }
      }, { status: 409 })
    }

    // Generate a unique jobId for manually added jobs
    const jobId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create original data structure to match existing jobs
    const originalData = {
      id: jobId,
      title,
      company,
      location: location || "",
      description: description || "",
      salary: salary || "",
      postedAt: new Date().toISOString(),
      applyUrl: applyUrl || "",
      source: "manual",
      summary: description || ""
    }

    // Try to get user's default resume for scoring
    let matchingScore = 0
    let matchingSummary = ""
    
    try {
      const resumesSnapshot = await adminDb.collection("resumes")
        .where("userId", "==", userId)
        .where("isDefault", "==", true)
        .limit(1)
        .get()

      let defaultResume = null
      if (!resumesSnapshot.empty) {
        defaultResume = resumesSnapshot.docs[0].data()
      } else {
        // If no default resume, get the first resume
        const anyResumeSnapshot = await adminDb.collection("resumes")
          .where("userId", "==", userId)
          .limit(1)
          .get()
        
        if (!anyResumeSnapshot.empty) {
          defaultResume = anyResumeSnapshot.docs[0].data()
        }
      }

      // If we have a resume, score the job using modern scoring system
      if (defaultResume && defaultResume.content) {
        console.log(`[AddManual] Scoring job against resume for user ${userId} using enhanced scoring`)
        
        const jobToScore: JobSearchResult = {
          id: jobId,
          title,
          company,
          location: location || "",
          description: description || "",
          qualifications: [],
          responsibilities: [],
          benefits: [],
          salary: salary || "",
          postedAt: new Date().toISOString(),
          applyUrl: applyUrl || "",
          source: "manual",
          matchingScore: 0,
          matchingSummary: "",
          summary: description || ""
        }

        // Use the multi-agent scoring system for consistency with "Generate score match"
        const { executeMultiAgentJobScoring } = await import('@/lib/prompts/api-helpers')
        
        const scoringStartTime = Date.now()
        const scoredJobs = await executeMultiAgentJobScoring({
          jobs: [jobToScore],
          resume: defaultResume.content,
          userId
        })
        const scoringExecutionTime = Date.now() - scoringStartTime
        
        if (scoredJobs.length > 0) {
          matchingScore = scoredJobs[0].matchingScore || 0
          matchingSummary = scoredJobs[0].matchingSummary || ""
          
          // Capture enhanced score details for detailed PDF analysis
          const enhancedDetails = scoredJobs[0].enhancedScoreDetails
          if (enhancedDetails) {
            // Store enhanced details in originalData for the saved job
            originalData.enhancedScoreDetails = enhancedDetails
          }
          
          console.log(`[AddManual] Job scored with multi-agent system: ${matchingScore}% - ${matchingSummary}`)
        }

        // Log activity for manual job scoring
        try {
          // Multi-agent logs individual agent activities
          // This is just a summary activity
          let actualTokenUsage = 0
          let actualUsageData = null
          
          if (scoredJobs.length > 0 && scoredJobs[0].enhancedScoreDetails?.usage) {
            actualUsageData = scoredJobs[0].enhancedScoreDetails.usage
            // Set to 0 as individual agents already logged their usage
            actualTokenUsage = 0
          }
          
          await logActivity({
            userId,
            activityType: 'job_scoring_summary',
            tokenUsage: actualTokenUsage, // 0 for summary
            timeTaken: scoringExecutionTime / 1000, // Convert to seconds
            metadata: {
              model: 'multi-agent-system',
              jobs_scored: 1,
              scoring_type: 'multi-agent',
              multi_agent: true,
              triggered_by: 'manual_job_add',
              job_title: title,
              job_company: company,
              execution_time_ms: scoringExecutionTime,
              summary_activity: true,
              agent_count: 9, // 8 scoring agents + 1 orchestration
              total_tokens_used: actualUsageData?.totalTokens || 0,
              note: 'Individual agent activities logged separately',
              user_initiated: true // User manually added job
            }
          })
          console.log(`[AddManual] Job scoring activity logged: ${actualTokenUsage} tokens for ${title} at ${company} (${actualUsageData ? 'actual' : 'estimated'})`)
        } catch (activityError) {
          console.warn('[AddManual] Failed to log job scoring activity:', activityError)
          // Continue without failing the request
        }
      } else {
        console.log(`[AddManual] No resume found for user ${userId}, skipping scoring`)
        matchingSummary = "No resume available for matching analysis."
      }
    } catch (scoringError) {
      console.error("[AddManual] Error during scoring:", scoringError)
      matchingSummary = "Error occurred during scoring analysis."
    }

    const docRef = await adminDb.collection("savedJobs").add({
      userId,
      jobId,
      title,
      company,
      location: location || "",
      summary: description || "",
      salary: salary || "",
      matchingScore,
      matchingSummary,
      scoreDetails: {},
      savedAt: new Date(),
      appliedAt: null,
      status: 'saved',
      notes: null,
      reminderDate: null,
      reminderNote: null,
      originalData: originalData,
    })

    const doc = await docRef.get()
    const savedJob = { id: doc.id, ...doc.data() } as SavedJob

    return NextResponse.json({ savedJob })
  } catch (error) {
    console.error("[SavedJobs][AddManual] Error:", error)
    return NextResponse.json({ error: "Failed to add job manually" }, { status: 500 })
  }
}

// Legacy scoring function removed - now using enhanced scoring from api-helpers