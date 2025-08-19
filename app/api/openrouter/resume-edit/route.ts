import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-logger";
import { initFirebaseAdmin } from "@/lib/firebase-admin-init";
import { getAuth } from "firebase-admin/auth";
import { executeResumeEditing } from "@/lib/prompts/api-helpers";
import { MODELS } from "@/lib/prompts/constants";

export async function POST(req: NextRequest) {
  const { message, resume, mode } = await req.json();
  
  try {
    const startTime = Date.now();
    
    // Use the centralized prompt system
    const result = await executeResumeEditing({
      resume,
      userRequest: message,
      mode: mode as 'agent' | 'ask'
    });

    const timeTaken = (Date.now() - startTime) / 1000;

    // Log activity
    const token = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (token) {
      initFirebaseAdmin();
      const decodedToken = await getAuth().verifyIdToken(token);
      const userId = decodedToken.uid;
      await logActivity({
        userId,
        activityType: 'resume_edit',
        tokenUsage: result.usage?.totalTokens || 0,
        timeTaken,
        metadata: { 
          model: MODELS.GPT5_MINI, 
          mode, 
          user_prompt: message,
          prompt_system: 'centralized',
          ...(result.usage && {
            prompt_tokens: result.usage.promptTokens,
            completion_tokens: result.usage.completionTokens,
            cached_tokens: result.usage.cachedTokens || 0,
            estimated_cost: result.usage.estimatedCost || 0,
            cost_savings: result.usage.costSavings || 0
          })
        },
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Resume editing error:", err);
    return NextResponse.json(
      { 
        error: "Failed to process resume editing request", 
        details: err instanceof Error ? err.message : String(err) 
      },
      { status: 500 }
    );
  }
}

// Legacy code removed - now using centralized prompt system
 