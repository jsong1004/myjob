import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-logger";
import { initFirebaseAdmin } from "@/lib/firebase-admin-init";
import { getAuth } from "firebase-admin/auth";
import { executeResumeEditing } from "@/lib/prompts/api-helpers";

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
        activityType: 'resume_generation',
        tokenUsage: 0, // TODO: Get actual token usage from prompt manager
        timeTaken,
        metadata: { 
          model: 'openai/gpt-4o-mini', 
          mode, 
          user_prompt: message,
          prompt_system: 'centralized'
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
 