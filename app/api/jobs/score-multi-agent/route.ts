import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getAuth } from "firebase-admin/auth"
import { executeMultiAgentJobScoring } from "@/lib/prompts/api-helpers"

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