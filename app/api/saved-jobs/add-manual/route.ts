import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import { SavedJob, JobSearchResult } from "@/lib/types"
import { logActivity } from "@/lib/activity-logger"

export async function POST(req: NextRequest) {
  try {
    initFirebaseAdmin()
    const adminAuth = getAuth()
    const adminDb = getFirestore()

    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const userId = decoded.uid
    const body = await req.json()
    const { title, company, location, description, applyUrl, salary } = body

    if (!title || !company) {
      return NextResponse.json({ error: "Title and company are required" }, { status: 400 })
    }

    // Generate a unique jobId for manually added jobs
    const jobId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create original data structure to match existing jobs
    const originalData = {
      id: jobId,
      title,
      company,
      location: location || "",
      description: description || "",
      salary: salary || "",
      postedAt: new Date().toISOString(),
      applyUrl: applyUrl || "",
      source: "manual",
      summary: description || ""
    }

    // Try to get user's default resume for scoring
    let matchingScore = 0
    let matchingSummary = ""
    
    try {
      const resumesSnapshot = await adminDb.collection("resumes")
        .where("userId", "==", userId)
        .where("isDefault", "==", true)
        .limit(1)
        .get()

      let defaultResume = null
      if (!resumesSnapshot.empty) {
        defaultResume = resumesSnapshot.docs[0].data()
      } else {
        // If no default resume, get the first resume
        const anyResumeSnapshot = await adminDb.collection("resumes")
          .where("userId", "==", userId)
          .limit(1)
          .get()
        
        if (!anyResumeSnapshot.empty) {
          defaultResume = anyResumeSnapshot.docs[0].data()
        }
      }

      // If we have a resume, score the job
      if (defaultResume && defaultResume.content) {
        console.log(`[AddManual] Scoring job against resume for user ${userId}`)
        const jobToScore: JobSearchResult = {
          id: jobId,
          title,
          company,
          location: location || "",
          description: description || "",
          qualifications: [],
          responsibilities: [],
          benefits: [],
          salary: salary || "",
          postedAt: new Date().toISOString(),
          applyUrl: applyUrl || "",
          source: "manual",
          matchingScore: 0,
          matchingSummary: "",
          summary: description || ""
        }

        const scoredJobs = await getMatchingScores([jobToScore], defaultResume.content, userId)
        if (scoredJobs.length > 0) {
          matchingScore = scoredJobs[0].matchingScore || 0
          matchingSummary = scoredJobs[0].matchingSummary || ""
          console.log(`[AddManual] Job scored: ${matchingScore}% - ${matchingSummary}`)
        }
      } else {
        console.log(`[AddManual] No resume found for user ${userId}, skipping scoring`)
        matchingSummary = "No resume available for matching analysis."
      }
    } catch (scoringError) {
      console.error("[AddManual] Error during scoring:", scoringError)
      matchingSummary = "Error occurred during scoring analysis."
    }

    const docRef = await adminDb.collection("savedJobs").add({
      userId,
      jobId,
      title,
      company,
      location: location || "",
      summary: description || "",
      salary: salary || "",
      matchingScore,
      matchingSummary,
      scoreDetails: {},
      savedAt: new Date(),
      appliedAt: null,
      status: 'saved',
      notes: null,
      reminderDate: null,
      reminderNote: null,
      originalData: originalData,
    })

    const doc = await docRef.get()
    const savedJob = { id: doc.id, ...doc.data() } as SavedJob

    return NextResponse.json({ savedJob })
  } catch (error) {
    console.error("[SavedJobs][AddManual] Error:", error)
    return NextResponse.json({ error: "Failed to add job manually" }, { status: 500 })
  }
}

async function getMatchingScores(jobs: JobSearchResult[], resume: string, userId: string): Promise<JobSearchResult[]> {
  const openrouterApiKey = process.env.OPENROUTER_API_KEY
  if (!openrouterApiKey) {
    console.warn("[AddManual] Missing OpenRouter API key, skipping scoring")
    return jobs
  }

  const startTime = Date.now()
  const allScoredJobs: JobSearchResult[] = []

  try {
    const jobsForPrompt = jobs.map((job: JobSearchResult) => 
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
      throw new Error("OpenRouter API error during manual job scoring")
    }

    const data = await openrouterRes.json()
    const aiResponse = data.choices?.[0]?.message?.content || ""
    
    try {
      const matchedJobs: { id: string, score: number, summary: string }[] = JSON.parse(aiResponse)
      const matchedJobsMap = new Map(matchedJobs.map((j: { id: string; score: number; summary: string; }) => [j.id, j]))

      const scoredJobs = jobs.map((job) => {
        const matchedJob = matchedJobsMap.get(job.id)
        if (matchedJob) {
          return { ...job, matchingScore: matchedJob.score, matchingSummary: matchedJob.summary }
        }
        return { ...job, matchingScore: 0, matchingSummary: "AI analysis failed for this job." }
      })
      allScoredJobs.push(...scoredJobs)

      // Log the activity
      const timeTaken = (Date.now() - startTime) / 1000
      const totalTokens = data.usage?.total_tokens || jobs.length * 100 // Rough estimate
      
      await logActivity({
        userId,
        activityType: 'job_scoring',
        tokenUsage: totalTokens,
        timeTaken,
        metadata: { 
          model: 'openai/gpt-4o-mini',
          jobs_scored: jobs.length,
          scoring_type: 'manual_job_addition'
        },
      })

    } catch (parseError) {
      console.error("[AddManual] Failed to parse AI response:", parseError)
      console.error("[AddManual] Raw AI response:", aiResponse)
      return jobs.map((job) => ({ ...job, matchingScore: 0, matchingSummary: "Could not parse AI response." }))
    }
  } catch (error) {
    console.error("[AddManual] Error during scoring:", error)
    return jobs.map(job => ({ ...job, matchingScore: 0, matchingSummary: "Scoring failed." }))
  }

  return allScoredJobs
}