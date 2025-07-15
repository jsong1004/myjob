import { NextRequest, NextResponse } from "next/server"
import { logActivity } from "@/lib/activity-logger";
import { initFirebaseAdmin } from "@/lib/firebase-admin-init";
import { getAuth } from "firebase-admin/auth";
import { executeResumeTailoring, executeMultiAgentResumeTailoring } from "@/lib/prompts/api-helpers";

export async function POST(req: NextRequest) {
  const { 
    message, 
    resume, 
    jobTitle, 
    company, 
    jobDescription, 
    mode = 'agent',
    multiAgent = false,
    scoringAnalysis 
  } = await req.json()
  
  // Debug logging
  console.log('[TailoringAPI] Request parameters:', {
    hasMessage: !!message,
    hasResume: !!resume,
    resumeLength: resume?.length || 0,
    hasJobTitle: !!jobTitle,
    hasCompany: !!company,
    hasJobDescription: !!jobDescription,
    mode,
    multiAgent,
    hasScoring: !!scoringAnalysis
  });
  
  if (!resume || !resume.trim()) {
    console.error('[TailoringAPI] Resume is missing or empty');
    return NextResponse.json({ 
      error: "Resume content is required for tailoring", 
      details: "The resume field is missing or empty" 
    }, { status: 400 });
  }
  
  try {
    const startTime = Date.now();
    
    // Choose between multi-agent and legacy tailoring
    let result;
    if (multiAgent) {
      console.log('[TailoringAPI] Using multi-agent tailoring system');
      result = await executeMultiAgentResumeTailoring({
        resume,
        jobDescription: jobDescription || `Job Title: ${jobTitle}\nCompany: ${company}`,
        scoringAnalysis,
        userRequest: message
      });
    } else {
      console.log('[TailoringAPI] Using legacy tailoring system');
      result = await executeResumeTailoring({
        resume,
        jobTitle,
        company,
        jobDescription,
        userRequest: message,
        mode: mode as 'agent' | 'ask'
      });
    }

    const timeTaken = (Date.now() - startTime) / 1000;

    // Log activity
    const token = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (token) {
      initFirebaseAdmin();
      const decodedToken = await getAuth().verifyIdToken(token);
      const userId = decodedToken.uid;
      await logActivity({
        userId,
        activityType: 'resume_generation',
        tokenUsage: 0, // TODO: Get actual token usage from prompt manager
        timeTaken,
        metadata: { 
          model: multiAgent ? 'multi-agent-tailoring' : 'openai/gpt-4o-mini', 
          mode: multiAgent ? 'multi-agent' : mode, 
          user_prompt: message,
          prompt_system: multiAgent ? 'centralized-multi-agent' : 'centralized',
          multi_agent: multiAgent,
          agents_executed: multiAgent ? (result.executionSummary?.agentsExecuted || 8) : 1,
          has_scoring_analysis: !!scoringAnalysis
        },
      });
    }

    // Add multi-agent metadata to response
    const enhancedResult = {
      ...result,
      multiAgent,
      ...(multiAgent && {
        agentResults: result.agentResults,
        executionSummary: result.executionSummary
      })
    };

    return NextResponse.json(enhancedResult);
  } catch (err) {
    console.error("Resume tailoring error:", err)
    return NextResponse.json({ 
      error: "Failed to process resume tailoring request", 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 })
  }
}

// Legacy code removed - now using centralized prompt system 