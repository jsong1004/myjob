import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getAuth } from "firebase-admin/auth"
import { logActivity } from "@/lib/activity-logger"
import { JobSearchResult } from "@/lib/types"

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

    console.log(`[JobScoring] Scoring ${jobs.length} jobs for user ${userId}`)

    // Score the jobs using the same logic as job search
    const scoredJobs = await getMatchingScores(jobs, resume, userId)

    return NextResponse.json({ 
      message: `Successfully scored ${scoredJobs.length} jobs`,
      jobs: scoredJobs 
    })

  } catch (error) {
    console.error("[JobScoring] Error:", error)
    return NextResponse.json({ error: "Failed to score jobs" }, { status: 500 })
  }
}

async function getMatchingScores(jobs: JobSearchResult[], resume: string, userId: string): Promise<JobSearchResult[]> {
  const openrouterApiKey = process.env.OPENROUTER_API_KEY
  if (!openrouterApiKey) {
    throw new Error("Missing OpenRouter API key")
  }

  const startTime = Date.now()
  const allScoredJobs: JobSearchResult[] = []
  const batchSize = 10 // Process 10 jobs at a time

  for (let i = 0; i < jobs.length; i += batchSize) {
    const batchJobs = jobs.slice(i, i + batchSize)
    console.log(`[JobScoring] Scoring batch starting at index ${i}: ${batchJobs.length} jobs`)

    try {
      const jobsForPrompt = batchJobs.map((job: JobSearchResult) => 
        `ID: ${job.id}\nJob Title: ${job.title}\nCompany: ${job.company}\nDescription: ${job.description}`
      ).join("\n---\n")
          
      const prompt = `Please score the following jobs against the provided resume.\n\nResume:\n${resume}\n\nJobs:\n${jobsForPrompt}`
          
      const openrouterRequestBody = {
        model: "openai/gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: `You are an expert job-matching assistant. Analyze how well a candidate's resume matches each job description.\n\nSCORING CRITERIA (0-100):\n- Skills & Keywords (40%): Match between candidate skills and job requirements\n- Experience & Achievements (40%): Relevance of past roles, years of experience, quantifiable achievements\n- Education & Certifications (10%): Educational background alignment\n- Job Title & Seniority (10%): Career progression and title alignment\n\nIMPORTANT: You must return ONLY a valid JSON array. Do not include any explanatory text, markdown formatting, or code blocks. Your response should start with [ and end with ].\n\nReturn format:\n[\n  {\n    "id": "job_id_here",\n    "title": "Job Title",\n    "company": "Company Name",\n    "score": 85,\n    "summary": "Brief explanation of the match quality and key factors affecting the score."\n  }\n]\n\nAnalyze each job carefully and provide accurate scores based on the resume content.`
          },
          { role: "user", content: prompt },
        ],
      }
          
      const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openrouterApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(openrouterRequestBody),
      })

      if (!openrouterRes.ok) {
        const errorText = await openrouterRes.text()
        console.error("OpenRouter API error:", errorText)
        throw new Error(`OpenRouter API error for batch starting at index ${i}`)
      }

      const data = await openrouterRes.json()
      const aiResponse = data.choices?.[0]?.message?.content || ""
      
      try {
        const matchedJobs: { id: string, score: number, summary: string }[] = JSON.parse(aiResponse)
        const matchedJobsMap = new Map(matchedJobs.map((j: { id: string; score: number; summary: string; }) => [j.id, j]))

        const scoredBatch = batchJobs.map((job) => {
          const matchedJob = matchedJobsMap.get(job.id)
          if (matchedJob) {
            return { ...job, matchingScore: matchedJob.score, matchingSummary: matchedJob.summary }
          }
          return { ...job, matchingScore: 0, matchingSummary: "AI analysis failed for this job." }
        })
        allScoredJobs.push(...scoredBatch)

      } catch (parseError) {
        console.error(`[JobScoring] Failed to parse AI response for batch starting at ${i}:`, parseError)
        console.error("[JobScoring] Raw AI response:", aiResponse)
        const failedBatch = batchJobs.map((job) => ({ ...job, matchingScore: 0, matchingSummary: "Could not parse AI response." }))
        allScoredJobs.push(...failedBatch)
      }
    } catch (batchError) {
      console.error(`[JobScoring] Error processing batch starting at ${i}:`, batchError)
      const failedBatch = batchJobs.map(job => ({ ...job, matchingScore: 0, matchingSummary: "Batch processing failed." }))
      allScoredJobs.push(...failedBatch)
    }
  }

  // Log the activity
  const timeTaken = (Date.now() - startTime) / 1000
  const totalTokens = allScoredJobs.length * 100 // Rough estimate
  
  await logActivity({
    userId,
    activityType: 'job_scoring',
    tokenUsage: totalTokens,
    timeTaken,
    metadata: { 
      model: 'openai/gpt-4o-mini',
      jobs_scored: allScoredJobs.length,
      scoring_type: 'manual_job_scoring'
    },
  })

  return allScoredJobs
}