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
  
  // If resume is missing or empty, try to load default resume
  let finalResume = resume;
  if (!finalResume || !finalResume.trim()) {
    console.log('[TailoringAPI] Resume is missing, attempting to load default resume');
    
    try {
      const token = req.headers.get('Authorization')?.split('Bearer ')[1];
      if (!token) {
        return NextResponse.json({ 
          error: "Resume content is required and user authentication is missing", 
          details: "Cannot load default resume without authentication" 
        }, { status: 401 });
      }

      // Initialize Firebase Admin and get user ID
      initFirebaseAdmin();
      const decodedToken = await getAuth().verifyIdToken(token);
      const userId = decodedToken.uid;

      // Fetch user's default resume from Firestore
      const { getFirestore } = await import('firebase-admin/firestore');
      const db = getFirestore();
      
      // Query the resumes collection with userId filter (not subcollection)
      const resumesRef = db.collection('resumes');
      const snapshot = await resumesRef
        .where('userId', '==', userId)
        .where('isDefault', '==', true)
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        const defaultResumeDoc = snapshot.docs[0];
        const defaultResumeData = defaultResumeDoc.data();
        finalResume = defaultResumeData.content || '';
        console.log('[TailoringAPI] Loaded default resume, length:', finalResume.length);
      } else {
        // Try to get any resume if no default is set
        const allResumesSnapshot = await resumesRef
          .where('userId', '==', userId)
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();
        if (!allResumesSnapshot.empty) {
          const anyResumeDoc = allResumesSnapshot.docs[0];
          const anyResumeData = anyResumeDoc.data();
          finalResume = anyResumeData.content || '';
          console.log('[TailoringAPI] Loaded first available resume, length:', finalResume.length);
        }
      }
    } catch (error) {
      console.error('[TailoringAPI] Error loading default resume:', error);
    }
    
    // Final check - if still no resume, return error
    if (!finalResume || !finalResume.trim()) {
      console.error('[TailoringAPI] No resume available after trying to load default');
      return NextResponse.json({ 
        error: "No resume content available", 
        details: "Please upload a resume first or ensure resume content is provided" 
      }, { status: 400 });
    }
  }
  
  try {
    const startTime = Date.now();
    
    // Check if we should use multi-agent tailoring
    let shouldUseMultiAgent = multiAgent;
    let finalScoringAnalysis = scoringAnalysis;
    
    // If mode is 'agent' and we don't have scoring analysis, generate it on-demand
    if (mode === 'agent' && !scoringAnalysis && (jobDescription || (jobTitle && company))) {
      console.log('[TailoringAPI] No scoring analysis found, generating on-demand for multi-agent tailoring');
      
      try {
        // Generate scoring analysis using the enhanced scoring system
        const { executeEnhancedJobScoring } = await import('@/lib/prompts/api-helpers');
        
        // Create a mock job object for scoring
        const mockJob = {
          id: 'temp-for-scoring',
          title: jobTitle || 'Position',
          company: company || 'Company',
          location: '',
          description: jobDescription || `Job Title: ${jobTitle}\nCompany: ${company}`,
          url: '',
          postedDate: '',
          salary: '',
          snippet: ''
        };
        
        const scoringRequest = {
          jobs: [mockJob],
          resume: finalResume,
          userId: 'temp-user'
        };
        
        const scoredJobs = await executeEnhancedJobScoring(scoringRequest);
        if (scoredJobs.length > 0 && scoredJobs[0].enhancedScoreDetails) {
          finalScoringAnalysis = scoredJobs[0].enhancedScoreDetails;
          shouldUseMultiAgent = true;
          console.log('[TailoringAPI] Generated scoring analysis, enabling multi-agent mode');
        }
      } catch (scoringError) {
        console.warn('[TailoringAPI] Failed to generate on-demand scoring, falling back to legacy mode:', scoringError);
      }
    }
    
    // Choose between multi-agent and legacy tailoring
    let result;
    if (shouldUseMultiAgent) {
      console.log('[TailoringAPI] Using multi-agent tailoring system');
      result = await executeMultiAgentResumeTailoring({
        resume: finalResume,
        jobDescription: jobDescription || `Job Title: ${jobTitle}\nCompany: ${company}`,
        scoringAnalysis: finalScoringAnalysis,
        userRequest: message
      });
    } else {
      console.log('[TailoringAPI] Using legacy tailoring system');
      result = await executeResumeTailoring({
        resume: finalResume,
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
          model: shouldUseMultiAgent ? 'multi-agent-tailoring' : 'openai/gpt-4o-mini', 
          mode: shouldUseMultiAgent ? 'multi-agent' : mode, 
          user_prompt: message,
          prompt_system: shouldUseMultiAgent ? 'centralized-multi-agent' : 'centralized',
          multi_agent: shouldUseMultiAgent,
          agents_executed: shouldUseMultiAgent ? (result.executionSummary?.agentsExecuted || 8) : 1,
          has_scoring_analysis: !!finalScoringAnalysis,
          scoring_generated_on_demand: !scoringAnalysis && !!finalScoringAnalysis
        },
      });
    }

    // Add multi-agent metadata to response
    const enhancedResult = {
      ...result,
      multiAgent: shouldUseMultiAgent,
      scoringGeneratedOnDemand: !scoringAnalysis && !!finalScoringAnalysis,
      ...(shouldUseMultiAgent && {
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