import { NextRequest, NextResponse } from "next/server";
import { getJson } from "serpapi";

import { logActivity } from "@/lib/activity-logger";
import { initFirebaseAdmin } from "@/lib/firebase-admin-init";
import { getAuth } from "firebase-admin/auth";
import { filterExistingJobs, saveJobsIfNotExist } from "@/lib/seen-jobs";
import { JobSearchResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { query, location, resume } = await req.json();
    console.log(`\n=== [JobSearch] Starting Job Search ===`);
    console.log(`[JobSearch] Query: "${query}"`);
    console.log(`[JobSearch] Location: "${location}"`);
    console.log(`[JobSearch] Resume provided: ${!!resume}`);
    console.log(`[JobSearch] Resume length: ${resume?.length || 0} characters`);
    
    // Debug environment variables
    console.log(`[JobSearch] Environment check:`);
    console.log(`[JobSearch] - SERPAPI_KEY exists: ${!!process.env.SERPAPI_KEY}`);
    console.log(`[JobSearch] - OPENROUTER_API_KEY exists: ${!!process.env.OPENROUTER_API_KEY}`);
    console.log(`[JobSearch] - NODE_ENV: ${process.env.NODE_ENV}`);
    
    if (resume) {
      console.log(`[JobSearch] Resume preview (first 200 chars):`, resume.substring(0, 200) + '...');
    }
    
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
      console.error('[JobSearch] Missing SERPAPI_KEY');
      return NextResponse.json({ error: "Missing SERPAPI_KEY" }, { status: 500 });
    }

    // Get user ID for deduplication
    const token = req.headers.get('Authorization')?.split('Bearer ')[1];
    let userId = null;
    if (token) {
        initFirebaseAdmin();
        const decodedToken = await getAuth().verifyIdToken(token);
        userId = decodedToken.uid;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[JobSearch] Using SerpAPI key: ${apiKey.substring(0, 10)}...`);

    // Call SerpApi
    const serpApiParams = {
      engine: "google_jobs",
      api_key: apiKey,
      q: query,
      location: location || "United States",
      hl: "en",
      gl: "us",
      timeout: 20000, // 20 seconds timeout
    };
    
    console.log(`[JobSearch] SerpAPI request params:`, serpApiParams);
    console.log(`[JobSearch] Making SerpAPI request...`);
    
    const results = await getJson(serpApiParams);
    
    console.log(`[JobSearch] SerpAPI response received`);
    console.log(`[JobSearch] Raw SerpAPI response keys:`, Object.keys(results || {}));
    console.log(`[JobSearch] Jobs found in response: ${results.jobs_results?.length || 0}`);
    
    if (results.error) {
      console.error(`[JobSearch] SerpAPI error:`, results.error);
      return NextResponse.json({ error: "SerpAPI error: " + results.error }, { status: 500 });
    }

    if (!results.jobs_results || results.jobs_results.length === 0) {
      console.warn(`[JobSearch] No jobs found in SerpAPI response`);
      console.log(`[JobSearch] Full SerpAPI response:`, JSON.stringify(results, null, 2));
      return NextResponse.json({ jobs: [] });
    }

    // Log first job for debugging
    console.log(`[JobSearch] First job sample:`, JSON.stringify(results.jobs_results[0], null, 2));

    // Normalize SerpApi results to JobSearchResult interface
    const unfilteredJobs: JobSearchResult[] = (results.jobs_results || []).map((job: any, index: number) => {
      console.log(`[JobSearch] Processing job ${index + 1}/${results.jobs_results.length}: ${job.title} at ${job.company_name}`);
      
      let qualifications: string[] = [];
      let responsibilities: string[] = [];
      let benefits: string[] = [];
      
      if (Array.isArray(job.job_highlights)) {
        for (const highlight of job.job_highlights) {
          if (highlight.title?.toLowerCase().includes("qualification")) {
            qualifications = highlight.items || [];
          } else if (highlight.title?.toLowerCase().includes("responsibilit")) {
            responsibilities = highlight.items || [];
          } else if (highlight.title?.toLowerCase().includes("benefit")) {
            benefits = highlight.items || [];
          }
        }
      }
      
      // Improved salary extraction
      let salary = job.salary || job.detected_extensions?.salary || "";
      if (!salary && Array.isArray(job.extensions)) {
        const salaryExt = job.extensions.find((ext: string) => /\$|salary|per\s+hour|per\s+year|\d+k|\d+,\d+/i.test(ext));
        if (salaryExt) salary = salaryExt;
      }
      
      // Additional salary extraction from job highlights
      if (!salary && Array.isArray(job.job_highlights)) {
        for (const highlight of job.job_highlights) {
          if (highlight.items && Array.isArray(highlight.items)) {
            const salaryItem = highlight.items.find((item: string) => /\$|salary|per\s+hour|per\s+year|\d+k|\d+,\d+/i.test(item));
            if (salaryItem) {
              salary = salaryItem;
              break;
            }
          }
        }
      }
      
      const processedJob = {
        id: job.job_id, // Use the stable job_id from SerpAPI
        title: job.title || "",
        company: job.company_name || job.company || "",
        location: job.location || "",
        description: job.description || job.snippet || "",
        qualifications,
        responsibilities,
        benefits,
        salary,
        postedAt: job.detected_extensions?.posted_at || job.posted_at || "",
        applyUrl: job.apply_options?.[0]?.link || job.apply_link || job.link || "",
        source: job.source || "Google Jobs",
        matchingScore: 0,
        matchingSummary: "",
        summary: "",
      };
      
      console.log(`[JobSearch] Processed job ${index + 1}:`, {
        id: processedJob.id,
        title: processedJob.title,
        company: processedJob.company,
        descriptionLength: processedJob.description.length,
        qualificationsCount: processedJob.qualifications.length,
        responsibilitiesCount: processedJob.responsibilities.length,
        salary: processedJob.salary
      });
      
      return processedJob;
    });
    
    console.log(`[JobSearch] Processed ${unfilteredJobs.length} jobs from SerpApi`);

    // Filter out jobs that already exist in the jobs collection
    console.log(`[JobSearch] Filtering out existing jobs in database`);
    const newJobs = await filterExistingJobs(unfilteredJobs);
    console.log(`[JobSearch] Found ${newJobs.length} new jobs after filtering.`);

    // Save new jobs to jobs collection with userId
    await saveJobsIfNotExist(newJobs, userId);
    console.log(`[JobSearch] Saved ${newJobs.length} new jobs to jobs collection.`);

    let jobsToReturn: JobSearchResult[] = [];

    if (newJobs.length > 0) {
      if (resume) {
        try {
          console.log(`[JobSearch] Scoring ${newJobs.length} new jobs.`);
          jobsToReturn = await getMatchingScores(newJobs, resume);
        } catch (error) {
          console.error("[JobSearch] Error getting matching scores:", error);
          jobsToReturn = newJobs.map(job => ({
            ...job,
            matchingScore: 0,
            matchingSummary: "AI analysis failed for this job.",
          }));
        }
      } else {
        // No resume, just return new jobs with default empty summary/score
        jobsToReturn = newJobs.map(job => ({
          ...job,
          matchingScore: 0,
          matchingSummary: "Resume not provided for matching.",
        }));
      }
    }

    console.log(`[JobSearch] Returning ${jobsToReturn.length} new jobs to client.`);
    return NextResponse.json({ jobs: jobsToReturn });

  } catch (error) {
    console.error(`[JobSearch] UNEXPECTED ERROR:`, error);
    console.error("SerpApi error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
} 

async function getMatchingScores(jobs: JobSearchResult[], resume: string): Promise<JobSearchResult[]> {
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;
  if (!openrouterApiKey) {
    throw new Error("Missing OpenRouter API key");
  }

  const allScoredJobs: JobSearchResult[] = [];
  const batchSize = 10; // Process 10 jobs at a time

  for (let i = 0; i < jobs.length; i += batchSize) {
    const batchJobs = jobs.slice(i, i + batchSize);
    console.log(`[JobSearch] Scoring batch starting at index ${i}: ${batchJobs.length} jobs`);

    try {
      const jobsForPrompt = batchJobs.map((job: JobSearchResult) => 
        `ID: ${job.id}\nJob Title: ${job.title}\nCompany: ${job.company}\nDescription: ${job.description}`
      ).join("\n---\n");
          
      const prompt = `Please score the following jobs against the provided resume.\n\nResume:\n${resume}\n\nJobs:\n${jobsForPrompt}`;
          
      const openrouterRequestBody = {
        model: "openai/gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: `You are an expert job-matching assistant. Analyze how well a candidate's resume matches each job description.\n\nSCORING CRITERIA (0-100):\n- Skills & Keywords (40%): Match between candidate skills and job requirements\n- Experience & Achievements (40%): Relevance of past roles, years of experience, quantifiable achievements\n- Education & Certifications (10%): Educational background alignment\n- Job Title & Seniority (10%): Career progression and title alignment\n\nIMPORTANT: You must return ONLY a valid JSON array. Do not include any explanatory text, markdown formatting, or code blocks. Your response should start with [ and end with ].\n\nReturn format:\n[\n  {\n    "id": "job_id_here",\n    "title": "Job Title",\n    "company": "Company Name",\n    "score": 85,\n    "summary": "Brief explanation of the match quality and key factors affecting the score."\n  }\n]\n\nAnalyze each job carefully and provide accurate scores based on the resume content.`
          },
          { role: "user", content: prompt },
        ],
      };
          
      const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openrouterApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(openrouterRequestBody),
      });

      if (!openrouterRes.ok) {
        const errorText = await openrouterRes.text();
        console.error("OpenRouter API error:", errorText);
        throw new Error(`OpenRouter API error for batch starting at index ${i}`);
      }

      const data = await openrouterRes.json();
      const aiResponse = data.choices?.[0]?.message?.content || "";
      
      try {
        const matchedJobs: { id: string, score: number, summary: string }[] = JSON.parse(aiResponse);
        const matchedJobsMap = new Map(matchedJobs.map((j: { id: string; score: number; summary: string; }) => [j.id, j]));

        const scoredBatch = batchJobs.map((job) => {
          const matchedJob = matchedJobsMap.get(job.id);
          if (matchedJob) {
            return { ...job, matchingScore: matchedJob.score, matchingSummary: matchedJob.summary };
          }
          return { ...job, matchingScore: 0, matchingSummary: "AI analysis failed for this job." };
        });
        allScoredJobs.push(...scoredBatch);

      } catch (parseError) {
        console.error(`[JobSearch] Failed to parse AI response for batch starting at ${i}:`, parseError);
        console.error("[JobSearch] Raw AI response:", aiResponse);
        const failedBatch = batchJobs.map((job) => ({ ...job, matchingScore: 0, matchingSummary: "Could not parse AI response." }));
        allScoredJobs.push(...failedBatch);
      }
    } catch (batchError) {
      console.error(`[JobSearch] Error processing batch starting at ${i}:`, batchError);
      const failedBatch = batchJobs.map(job => ({ ...job, matchingScore: 0, matchingSummary: "Batch processing failed." }));
      allScoredJobs.push(...failedBatch);
    }
  }

  return allScoredJobs;
} 