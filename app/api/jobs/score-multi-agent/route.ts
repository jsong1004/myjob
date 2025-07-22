import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getAuth } from "firebase-admin/auth"
import { executeMultiAgentJobScoring } from "@/lib/prompts/api-helpers"
import { logActivity } from "@/lib/activity-logger"

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    initFirebaseAdmin()
    const adminAuth = getAuth()
    const decoded = await adminAuth.verifyIdToken(token)
    const userId = decoded.uid

    const { jobs, resume } = await req.json()
    
    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json({ error: "Jobs array is required" }, { status: 400 })
    }
    
    if (!resume || resume.trim().length === 0) {
      return NextResponse.json({ error: "Resume content is required" }, { status: 400 })
    }

    console.log(`[MultiAgentAPI] Scoring ${jobs.length} jobs for user ${userId}`)
    const startTime = Date.now()

    // Execute multi-agent scoring
    const scoredJobs = await executeMultiAgentJobScoring({ jobs, resume, userId })
    
    const executionTime = Date.now() - startTime
    console.log(`[MultiAgentAPI] Multi-agent scoring completed in ${executionTime}ms`)

    // Log summary activity for multi-agent job scoring
    // Note: Individual agent activities are logged within the multi-agent engine
    try {
      // Extract actual token usage from multi-agent results for summary logging
      let totalTokenUsage = 0
      let actualUsageData = null
      
      if (scoredJobs.length > 0 && scoredJobs[0].enhancedScoreDetails?.usage) {
        actualUsageData = scoredJobs[0].enhancedScoreDetails.usage
        totalTokenUsage = actualUsageData.totalTokens || 0
      }
      
      await logActivity({
        userId,
        activityType: 'job_scoring_summary',
        tokenUsage: 0, // Set to 0 as individual activities track actual usage
        timeTaken: executionTime / 1000, // Convert to seconds
        metadata: {
          model: 'multi-agent-system',
          jobs_scored: jobs.length,
          scoring_type: 'multi-agent',
          scoring_version: '3.0-multi-agent',
          average_time_per_job: executionTime / jobs.length,
          execution_time_ms: executionTime,
          total_tokens_used: totalTokenUsage,
          user_initiated: true, // User clicked "Generate score match"
          summary_activity: true,
          agent_count: 9, // 8 scoring agents + 1 orchestration
          note: 'Individual agent activities logged separately'
        }
      })
      console.log(`[MultiAgentAPI] Summary activity logged for ${jobs.length} jobs (${totalTokenUsage} total tokens across all agents)`)
    } catch (activityError) {
      console.warn('[MultiAgentAPI] Failed to log summary activity:', activityError)
      // Continue without failing the request
    }

    return NextResponse.json({ 
      message: `Successfully scored ${scoredJobs.length} jobs using multi-agent system`,
      jobs: scoredJobs,
      multiAgent: true,
      executionTime,
      performance: {
        averageTimePerJob: executionTime / jobs.length,
        totalJobs: jobs.length,
        scoringVersion: "3.0-multi-agent"
      }
    })

  } catch (error) {
    console.error("[MultiAgentAPI] Error:", error)
    return NextResponse.json({ 
      error: "Failed to score jobs using multi-agent system",
      fallback: "Consider using standard scoring endpoint"
    }, { status: 500 })
  }
}