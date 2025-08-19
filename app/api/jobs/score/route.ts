import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getAuth } from "firebase-admin/auth"
import { executeJobScoring, executeEnhancedJobScoring, executeMultiAgentJobScoring } from "@/lib/prompts/api-helpers"
import { logActivity } from "@/lib/activity-logger"
import { MODELS } from "@/lib/prompts/constants"

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

    const { jobs, resume, enhanced = false, multiAgent = false } = await req.json()
    
    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json({ error: "Jobs array is required" }, { status: 400 })
    }
    
    if (!resume || resume.trim().length === 0) {
      return NextResponse.json({ error: "Resume content is required" }, { status: 400 })
    }

    console.log(`[JobScoring] Scoring ${jobs.length} jobs for user ${userId} (enhanced: ${enhanced}, multiAgent: ${multiAgent})`)
    const startTime = Date.now()

    // Score the jobs using the appropriate scoring system
    let scoredJobs
    if (multiAgent) {
      scoredJobs = await executeMultiAgentJobScoring({ jobs, resume, userId })
    } else if (enhanced) {
      scoredJobs = await executeEnhancedJobScoring({ jobs, resume, userId })
    } else {
      scoredJobs = await executeJobScoring({ jobs, resume, userId })
    }

    const executionTime = Date.now() - startTime

    // Log activity for job scoring
    try {
      // Determine scoring type and model
      let scoringType = 'basic'
      let model = MODELS.GPT5_MINI
      
      if (multiAgent) {
        scoringType = 'multi-agent'
        model = 'multi-agent-system'
      } else if (enhanced) {
        scoringType = 'enhanced'
      }
      
      // For multi-agent, individual activities are logged separately
      // For enhanced/basic scoring, get actual usage if available
      let actualTokenUsage = 0
      let actualUsageData = null
      
      if (multiAgent) {
        // Multi-agent logs individual agent activities
        // This is just a summary activity
        if (scoredJobs.length > 0 && scoredJobs[0].enhancedScoreDetails?.usage) {
          actualUsageData = scoredJobs[0].enhancedScoreDetails.usage
          actualTokenUsage = 0 // Individual agents already logged their usage
        }
      } else {
        // For enhanced/basic scoring, log the actual usage here
        if (scoredJobs.length > 0 && scoredJobs[0].enhancedScoreDetails?.usage) {
          actualUsageData = scoredJobs[0].enhancedScoreDetails.usage
          actualTokenUsage = actualUsageData.totalTokens || 0
        } else {
          // Fallback to estimates if actual usage not available
          const estimatedTokensPerJob = enhanced ? 600 : 400
          actualTokenUsage = jobs.length * estimatedTokensPerJob
        }
      }
      
      await logActivity({
        userId,
        activityType: multiAgent ? 'job_scoring_summary' : 'job_scoring',
        tokenUsage: actualTokenUsage,
        timeTaken: executionTime / 1000, // Convert to seconds
        metadata: {
          model,
          jobs_scored: jobs.length,
          scoring_type: scoringType,
          enhanced: enhanced,
          multi_agent: multiAgent,
          average_time_per_job: executionTime / jobs.length,
          execution_time_ms: executionTime,
          tokens_per_job: actualTokenUsage > 0 ? Math.round(actualTokenUsage / jobs.length) : 0,
          user_initiated: true, // User clicked "Generate score match"
          ...(multiAgent && {
            summary_activity: true,
            agent_count: 9, // 8 scoring agents + 1 orchestration
            total_tokens_used: actualUsageData?.totalTokens || 0,
            note: 'Individual agent activities logged separately'
          }),
          ...(actualUsageData && !multiAgent && {
            prompt_tokens: actualUsageData.promptTokens,
            completion_tokens: actualUsageData.completionTokens,
            cached_tokens: actualUsageData.cachedTokens || 0,
            cache_hit_rate: actualUsageData.promptTokens > 0 
              ? (actualUsageData.cachedTokens / actualUsageData.promptTokens * 100).toFixed(1) + '%' 
              : '0%',
            estimated_cost: actualUsageData.estimatedCost || 0,
            cost_savings: actualUsageData.costSavings || 0,
            usage_source: 'actual'
          }) || (!multiAgent && { usage_source: 'estimated' })
        }
      })
      console.log(`[JobScoring] Activity logged: ${actualTokenUsage} tokens for ${jobs.length} jobs (${scoringType}, ${actualUsageData ? 'actual' : 'estimated'})`)
    } catch (activityError) {
      console.warn('[JobScoring] Failed to log activity:', activityError)
      // Continue without failing the request
    }

    return NextResponse.json({ 
      message: `Successfully scored ${scoredJobs.length} jobs`,
      jobs: scoredJobs,
      enhanced: enhanced,
      multiAgent: multiAgent,
      scoringSystem: multiAgent ? 'multi-agent' : (enhanced ? 'enhanced' : 'basic')
    })

  } catch (error) {
    console.error("[JobScoring] Error:", error)
    return NextResponse.json({ error: "Failed to score jobs" }, { status: 500 })
  }
}

// Legacy function removed - now using centralized prompt system