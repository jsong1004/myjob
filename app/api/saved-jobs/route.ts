import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import { SavedJob, JobSearchResult } from "@/lib/types"
import { executeMultiAgentJobScoring, executeEnhancedJobScoring } from "@/lib/prompts/api-helpers"
import { logActivity } from "@/lib/activity-logger"

export async function GET(req: NextRequest) {
  try {
    initFirebaseAdmin()
    const adminAuth = getAuth()
    const adminDb = getFirestore()

    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const userId = decoded.uid

    const snapshot = await adminDb.collection("savedJobs")
      .where("userId", "==", userId)
      .orderBy("savedAt", "desc")
      .get()
    const savedJobs: SavedJob[] = []
    snapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      savedJobs.push({ id: doc.id, ...doc.data() } as SavedJob)
    })
    return NextResponse.json({ savedJobs })
  } catch (error) {
    console.error("[SavedJobs][GET] Error:", error)
    return NextResponse.json({ error: "Failed to fetch saved jobs" }, { status: 500 })
  }
}

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
    const { jobId, title, company, location, summary, salary, matchingScore, scoreDetails, matchingSummary, originalData, useMultiAgent = true } = body
    if (!jobId || !title || !company) {
      return NextResponse.json({ error: "Missing required job fields" }, { status: 400 })
    }

    // Prevent duplicate saves for the same user and job
    const existing = await adminDb.collection("savedJobs")
      .where("userId", "==", userId)
      .where("jobId", "==", jobId)
      .get()
    if (!existing.empty) {
      return NextResponse.json({ error: "Job already saved" }, { status: 409 })
    }

    // Get user's default resume for scoring
    let calculatedScore = 0
    let calculatedSummary = ""
    let calculatedScoreDetails = {}
    
    try {
      // Fetch user's default resume
      const resumesSnapshot = await adminDb.collection("resumes")
        .where("userId", "==", userId)
        .where("isDefault", "==", true)
        .limit(1)
        .get()
      
      let resume = ""
      if (!resumesSnapshot.empty) {
        resume = resumesSnapshot.docs[0].data().content || ""
      } else {
        // If no default resume, get any resume
        const anyResumeSnapshot = await adminDb.collection("resumes")
          .where("userId", "==", userId)
          .limit(1)
          .get()
        if (!anyResumeSnapshot.empty) {
          resume = anyResumeSnapshot.docs[0].data().content || ""
        }
      }

      // If we have a resume and originalData, perform scoring
      if (resume && originalData) {
        console.log(`[SavedJobs] Performing scoring for job ${jobId} with user's resume`)
        
        // Convert originalData to JobSearchResult format for scoring
        const jobForScoring: JobSearchResult = {
          id: originalData.id || jobId,
          title: originalData.title || title,
          company: originalData.company || company,
          location: originalData.location || location,
          description: originalData.description || "",
          qualifications: originalData.qualifications || [],
          responsibilities: originalData.responsibilities || [],
          benefits: originalData.benefits || [],
          salary: originalData.salary || salary || "",
          postedAt: originalData.postedAt || "",
          applyUrl: originalData.applyUrl || "",
          source: originalData.source || "",
          matchingScore: 0,
          matchingSummary: "",
          summary: originalData.summary || summary || ""
        }

        let scoredJobs: JobSearchResult[] = []
        const scoringStartTime = Date.now()
        
        if (useMultiAgent) {
          scoredJobs = await executeMultiAgentJobScoring({ 
            jobs: [jobForScoring], 
            resume, 
            userId 
          })
        } else {
          scoredJobs = await executeEnhancedJobScoring({ 
            jobs: [jobForScoring], 
            resume, 
            userId 
          })
        }

        const scoringExecutionTime = Date.now() - scoringStartTime

        if (scoredJobs.length > 0) {
          calculatedScore = scoredJobs[0].matchingScore || 0
          calculatedSummary = scoredJobs[0].matchingSummary || ""
          calculatedScoreDetails = scoredJobs[0].scoreDetails || {}
          // Also capture enhanced score details for detailed analysis
          const enhancedDetails = scoredJobs[0].enhancedScoreDetails
          if (enhancedDetails) {
            calculatedScoreDetails.enhancedScoreDetails = enhancedDetails
            // Also store in originalData where the UI expects it
            if (!originalData) originalData = {}
            originalData.enhancedScoreDetails = enhancedDetails
          }
        }

        // Log activity for job scoring during save
        try {
          const scoringType = useMultiAgent ? 'multi-agent' : 'enhanced'
          
          // For multi-agent, individual activities are logged separately
          let actualTokenUsage = 0
          let actualUsageData = null
          
          if (useMultiAgent) {
            // Multi-agent logs individual agent activities
            // This is just a summary activity
            if (scoredJobs.length > 0 && scoredJobs[0].enhancedScoreDetails?.usage) {
              actualUsageData = scoredJobs[0].enhancedScoreDetails.usage
              actualTokenUsage = 0 // Individual agents already logged their usage
            }
          } else {
            // For enhanced scoring, log the actual usage here
            if (scoredJobs.length > 0 && scoredJobs[0].enhancedScoreDetails?.usage) {
              actualUsageData = scoredJobs[0].enhancedScoreDetails.usage
              actualTokenUsage = actualUsageData.totalTokens || 0
            } else {
              // Fallback to estimate if actual usage not available
              actualTokenUsage = 600 // Enhanced scoring estimate
            }
          }
          
          await logActivity({
            userId,
            activityType: useMultiAgent ? 'job_scoring_summary' : 'job_scoring',
            tokenUsage: actualTokenUsage,
            timeTaken: scoringExecutionTime / 1000, // Convert to seconds
            metadata: {
              model: useMultiAgent ? 'multi-agent-system' : 'openai/gpt-4o-mini',
              jobs_scored: 1,
              scoring_type: scoringType,
              multi_agent: useMultiAgent,
              enhanced: !useMultiAgent,
              triggered_by: 'job_save',
              job_title: title,
              job_company: company,
              execution_time_ms: scoringExecutionTime,
              tokens_per_job: actualTokenUsage,
              user_initiated: true, // User clicked "Save Job"
              ...(useMultiAgent && {
                summary_activity: true,
                agent_count: 9, // 8 scoring agents + 1 orchestration
                total_tokens_used: actualUsageData?.totalTokens || 0,
                note: 'Individual agent activities logged separately'
              }),
              ...(actualUsageData && !useMultiAgent && {
                prompt_tokens: actualUsageData.promptTokens,
                completion_tokens: actualUsageData.completionTokens,
                cached_tokens: actualUsageData.cachedTokens || 0,
                cache_hit_rate: actualUsageData.promptTokens > 0 
                  ? (actualUsageData.cachedTokens / actualUsageData.promptTokens * 100).toFixed(1) + '%' 
                  : '0%',
                estimated_cost: actualUsageData.estimatedCost || 0,
                cost_savings: actualUsageData.costSavings || 0,
                usage_source: 'actual'
              }) || (!useMultiAgent && { usage_source: 'estimated' })
            }
          })
          console.log(`[SavedJobs] Job scoring activity logged: ${actualTokenUsage} tokens for ${title} at ${company} (${scoringType}, ${actualUsageData ? 'actual' : 'estimated'})`)
        } catch (activityError) {
          console.warn('[SavedJobs] Failed to log job scoring activity:', activityError)
          // Continue without failing the request
        }
      } else {
        console.log(`[SavedJobs] No resume found or originalData missing, saving without scoring`)
      }
    } catch (scoringError) {
      console.error(`[SavedJobs] Error performing scoring:`, scoringError)
      // Continue with save even if scoring fails
    }

    const docRef = await adminDb.collection("savedJobs").add({
      userId,
      jobId,
      title,
      company,
      location,
      summary: summary || "",
      salary: salary || "",
      matchingScore: calculatedScore || matchingScore || 0,
      matchingSummary: calculatedSummary || matchingSummary || "",
      scoreDetails: calculatedScoreDetails || scoreDetails || {},
      savedAt: new Date(),
      appliedAt: null, // Initialize as null, can be updated later
      // New application tracking fields
      status: 'saved', // Default status
      notes: null,
      reminderDate: null,
      reminderNote: null,
      originalData: originalData || {},
    })
    const doc = await docRef.get()
    return NextResponse.json({ 
      id: doc.id, 
      ...doc.data(),
      matchingScore: calculatedScore || matchingScore || 0,
      matchingSummary: calculatedSummary || matchingSummary || "",
      scoreDetails: calculatedScoreDetails || scoreDetails || {}
    })
  } catch (error) {
    console.error("[SavedJobs][POST] Error:", error)
    return NextResponse.json({ error: "Failed to save job" }, { status: 500 })
  }
} 