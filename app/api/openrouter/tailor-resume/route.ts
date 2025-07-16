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
    
    // Generate scoring analysis if not present (for better tailoring context)
    let scoringContext = null;
    if (mode === 'agent' && !scoringAnalysis && (jobDescription || (jobTitle && company))) {
      console.log('[TailoringAPI] No scoring analysis found, generating for better tailoring context');
      
      try {
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
          scoringContext = scoredJobs[0].enhancedScoreDetails;
          console.log('[TailoringAPI] Generated scoring analysis for tailoring context');
        }
      } catch (scoringError) {
        console.warn('[TailoringAPI] Failed to generate scoring analysis, proceeding without it:', scoringError);
      }
    }
    
    // Get user ID for cache optimization
    let userId = 'anonymous';
    const token = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (token) {
      try {
        initFirebaseAdmin();
        const decodedToken = await getAuth().verifyIdToken(token);
        userId = decodedToken.uid;
      } catch (error) {
        console.warn('[TailoringAPI] Failed to decode token for cache optimization:', error);
      }
    }

    // Always use legacy tailoring system for resumes (better results than multi-agent)
    console.log('[TailoringAPI] Using legacy tailoring system with cache optimization');
    const result = await executeResumeTailoring({
      resume: finalResume,
      jobTitle,
      company,
      jobDescription,
      userRequest: message,
      mode: mode as 'agent' | 'ask',
      userId
    });

    const timeTaken = (Date.now() - startTime) / 1000;

    // Log activity (userId already extracted above)
    if (userId !== 'anonymous') {
      await logActivity({
        userId,
        activityType: 'resume_generation',
        tokenUsage: 0, // TODO: Get actual token usage from prompt manager
        timeTaken,
        metadata: { 
          model: 'openai/gpt-4o-mini', 
          mode: mode, 
          user_prompt: message,
          prompt_system: 'centralized-legacy',
          multi_agent: false,
          agents_executed: 1,
          resume_loaded_from_db: !resume && !!finalResume,
          scoring_generated: !scoringAnalysis && !!scoringContext,
          cache_enabled: true,
          ...(result.usage && {
            cached_tokens: result.usage.cachedTokens || 0,
            cache_hit_rate: result.usage.cachedTokens && result.usage.promptTokens 
              ? (result.usage.cachedTokens / result.usage.promptTokens * 100).toFixed(1) + '%'
              : '0%',
            estimated_cost: result.usage.estimatedCost || 0,
            cost_savings: result.usage.costSavings || 0
          })
        },
      });
    }

    // Add metadata to response
    const enhancedResult = {
      ...result,
      multiAgent: false,
      resumeLoadedFromDb: !resume && !!finalResume,
      scoringGenerated: !scoringAnalysis && !!scoringContext,
      tailoringMode: 'legacy',
      cacheOptimized: true,
      userId: userId !== 'anonymous' ? userId : undefined
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