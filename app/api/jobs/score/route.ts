import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getAuth } from "firebase-admin/auth"
import { executeJobScoring, executeEnhancedJobScoring, executeMultiAgentJobScoring } from "@/lib/prompts/api-helpers"

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

    // Score the jobs using the appropriate scoring system
    let scoredJobs
    if (multiAgent) {
      scoredJobs = await executeMultiAgentJobScoring({ jobs, resume, userId })
    } else if (enhanced) {
      scoredJobs = await executeEnhancedJobScoring({ jobs, resume, userId })
    } else {
      scoredJobs = await executeJobScoring({ jobs, resume, userId })
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