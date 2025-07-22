// app/api/resume/tailor-multi-agent/route.ts
import { NextRequest, NextResponse } from "next/server"
import { logActivity } from "@/lib/activity-logger"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getAuth } from "firebase-admin/auth"
import { executeMultiAgentResumeTailoring } from "@/lib/prompts/api-helpers"

export async function POST(req: NextRequest) {
  try {
    const { 
      message, 
      resume, 
      jobTitle, 
      company, 
      jobDescription, 
      scoringAnalysis,
      multiAgent = true 
    } = await req.json()
    
    console.log(`[MultiAgentTailoringAPI] Starting multi-agent tailoring request`)
    console.log(`[MultiAgentTailoringAPI] Job: ${jobTitle} at ${company}`)
    console.log(`[MultiAgentTailoringAPI] Resume length: ${resume?.length || 0} characters`)
    console.log(`[MultiAgentTailoringAPI] Has scoring analysis: ${!!scoringAnalysis}`)
    console.log(`[MultiAgentTailoringAPI] User request: ${message}`)
    
    const startTime = Date.now()
    
    // Use multi-agent tailoring system
    const result = await executeMultiAgentResumeTailoring({
      resume,
      jobDescription: jobDescription || `Job Title: ${jobTitle}\nCompany: ${company}`,
      scoringAnalysis,
      userRequest: message
    })

    const timeTaken = (Date.now() - startTime) / 1000
    console.log(`[MultiAgentTailoringAPI] Completed in ${timeTaken}s`)

    // Log activity
    const token = req.headers.get('Authorization')?.split('Bearer ')[1]
    if (token) {
      try {
        initFirebaseAdmin()
        const decodedToken = await getAuth().verifyIdToken(token)
        const userId = decodedToken.uid
        
        await logActivity({
          userId,
          activityType: 'resume_generation',
          tokenUsage: result.usage?.totalTokens || 0,
          timeTaken,
          metadata: { 
            model: 'multi-agent-tailoring',
            mode: 'multi-agent',
            user_prompt: message,
            prompt_system: 'centralized-multi-agent',
            agents_executed: result.executionSummary?.agentsExecuted || 8,
            job_title: jobTitle,
            company: company,
            has_scoring_analysis: !!scoringAnalysis,
            ...(result.usage && {
              prompt_tokens: result.usage.promptTokens,
              completion_tokens: result.usage.completionTokens,
              cached_tokens: result.usage.cachedTokens || 0,
              estimated_cost: result.usage.estimatedCost || 0,
              cost_savings: result.usage.costSavings || 0
            })
          },
        })
      } catch (authError) {
        console.warn('[MultiAgentTailoringAPI] Failed to log activity:', authError)
        // Continue without logging rather than failing the request
      }
    }

    // Return enhanced response with multi-agent insights
    return NextResponse.json({
      reply: result.reply,
      updatedResume: result.updatedResume,
      multiAgent: true,
      agentResults: result.agentResults,
      executionSummary: result.executionSummary,
      processingTime: timeTaken
    })
    
  } catch (err) {
    console.error("[MultiAgentTailoringAPI] Multi-agent tailoring error:", err)
    
    // Return error response
    return NextResponse.json({ 
      error: "Failed to process multi-agent resume tailoring request", 
      details: err instanceof Error ? err.message : String(err),
      multiAgent: false
    }, { status: 500 })
  }
}