import { NextRequest, NextResponse } from "next/server";
import { getJson } from "serpapi";

import { logActivity } from "@/lib/activity-logger";
import { initFirebaseAdmin } from "@/lib/firebase-admin-init";
import { getAuth } from "firebase-admin/auth";

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

    console.log(`[JobSearch] Using SerpAPI key: ${apiKey.substring(0, 10)}...`);

    // Call SerpApi
    const serpApiParams = {
      engine: "google_jobs",
      api_key: apiKey,
      q: query,
      location: location || "United States",
      hl: "en",
      gl: "us",
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
    let jobs = (results.jobs_results || []).map((job: any, index: number) => {
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
        id: Math.random().toString(36).slice(2),
        // id: job.job_id || job.jobkey || job.jobId || job.id || Math.random().toString(36).slice(2),
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
    
    console.log(`[JobSearch] Processed ${jobs.length} jobs from SerpApi`);

    // If resume is provided, call OpenRouter to get matching scores
    if (resume && jobs.length > 0) {
      let totalTokenUsage = 0;
      console.log(`\n=== [JobSearch] Starting OpenRouter Matching Analysis ===`);
      
      try {
        const startTime = Date.now();
        const openrouterApiKey = process.env.OPENROUTER_API_KEY;
        console.log(`[JobSearch] OpenRouter API key check: exists=${!!openrouterApiKey}, length=${openrouterApiKey?.length || 0}`);
        
        if (!openrouterApiKey) {
          console.error('[JobSearch] Missing OpenRouter API key');
          console.error('[JobSearch] Available env vars:', Object.keys(process.env).filter(key => key.includes('ROUTER') || key.includes('API')));
          throw new Error("Missing OpenRouter API key");
        }
        
        console.log(`[JobSearch] Using OpenRouter API key: ${openrouterApiKey.substring(0, 10)}...`);
        
        // Limit to 10 jobs for token safety and cost efficiency
        const jobsForAI = jobs.slice(0, 10);
        console.log(`[JobSearch] Sending ${jobsForAI.length} jobs to OpenRouter for matching analysis`);
        
        const jobsForPrompt = jobsForAI.map((job: any) => 
          `ID: ${job.id}\nJob Title: ${job.title}\nCompany: ${job.company}\nDescription: ${job.description}`
        ).join("\n---\n");
        
        console.log(`[JobSearch] Jobs data for AI (character count: ${jobsForPrompt.length})`);
        console.log(`[JobSearch] Jobs being analyzed:`, jobsForAI.map((j: { id: any; title: any; company: any; description: string | any[]; }) => ({
          id: j.id, 
          title: j.title, 
          company: j.company,
          descriptionLength: j.description.length
        })));
        
        const prompt = `Please score the following jobs against the provided resume.\n\nResume:\n${resume}\n\nJobs:\n${jobsForPrompt}`;
        
        console.log(`[JobSearch] Final prompt length: ${prompt.length} characters`);
        console.log(`[JobSearch] Prompt preview (first 500 chars):`, prompt.substring(0, 500) + '...');
        
        const openrouterRequestBody = {
          model: "openai/gpt-4.1-mini",
          messages: [
            { 
              role: "system", 
              content: `You are an expert job-matching assistant. Analyze how well a candidate's resume matches each job description.\n\nSCORING CRITERIA (0-100):\n- Skills & Keywords (40%): Match between candidate skills and job requirements\n- Experience & Achievements (40%): Relevance of past roles, years of experience, quantifiable achievements\n- Education & Certifications (10%): Educational background alignment\n- Job Title & Seniority (10%): Career progression and title alignment\n\nIMPORTANT: You must return ONLY a valid JSON array. Do not include any explanatory text, markdown formatting, or code blocks. Your response should start with [ and end with ].\n\nReturn format:\n[\n  {\n    "id": "job_id_here",\n    "title": "Job Title",\n    "company": "Company Name",\n    "score": 85,\n    "summary": "Brief explanation of the match quality and key factors affecting the score."\n  }\n]\n\nAnalyze each job carefully and provide accurate scores based on the resume content.`
            },
            { role: "user", content: prompt },
          ],
        };
        
        console.log(`[JobSearch] OpenRouter request body:`, {
          model: openrouterRequestBody.model,
          messagesCount: openrouterRequestBody.messages.length,
          systemPromptLength: openrouterRequestBody.messages[0].content.length,
          userPromptLength: openrouterRequestBody.messages[1].content.length
        });
        
        console.log(`[JobSearch] Making OpenRouter API request...`);
        
        const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(openrouterRequestBody),
        });
        
        console.log(`[JobSearch] OpenRouter API response status: ${openrouterRes.status} ${openrouterRes.statusText}`);
        console.log(`[JobSearch] OpenRouter response headers:`, Object.fromEntries(openrouterRes.headers.entries()));
        
        if (openrouterRes.ok) {
          const data = await openrouterRes.json();
          const tokenUsage = data.usage?.total_tokens || 0;
          totalTokenUsage += tokenUsage;
          const timeTaken = (Date.now() - startTime) / 1000;
          const token = req.headers.get('Authorization')?.split('Bearer ')[1];
          if (token) {
            initFirebaseAdmin();
            const decodedToken = await getAuth().verifyIdToken(token);
            const userId = decodedToken.uid;
            await logActivity({
              userId,
              activityType: 'job_matching',
              tokenUsage,
              timeTaken,
              metadata: { 
                model: openrouterRequestBody.model, 
                num_jobs: jobsForAI.length,
                query: query,
                location: location,
              },
            });
          }

          console.log(`[JobSearch] OpenRouter API response received successfully`);
          console.log(`[JobSearch] Response data keys:`, Object.keys(data));
          console.log(`[JobSearch] Full OpenRouter response:`, JSON.stringify(data, null, 2));
          
          const responseText = data.choices?.[0]?.message?.content || "";
          console.log(`[JobSearch] OpenRouter response text:`, responseText);
          console.log(`[JobSearch] Response text length: ${responseText.length} characters`);
          
          // Usage information
          if (data.usage) {
            console.log(`[JobSearch] Token usage:`, data.usage);
          }
          
          // Try to parse the JSON array from the AI's response
          let matches: any[] = [];
          try {
            console.log(`[JobSearch] Attempting to parse response as JSON...`);
            
            // First try direct parsing
            matches = JSON.parse(responseText);
            console.log(`[JobSearch] Successfully parsed JSON directly, got ${matches.length} matches`);
            
            // Validate that matches is an array
            if (!Array.isArray(matches)) {
              console.warn(`[JobSearch] Response is not an array, wrapping in array`);
              matches = [matches];
            }
            
          } catch (parseError) {
            console.log(`[JobSearch] Direct JSON parse failed, trying multiple extraction methods...`);
            console.log(`[JobSearch] Parse error:`, parseError);
            
            // Try to extract JSON from markdown code blocks
            let jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
              try {
                matches = JSON.parse(jsonMatch[1]);
                console.log(`[JobSearch] Successfully extracted JSON from markdown code block, got ${matches.length} matches`);
              } catch (codeBlockError) {
                console.error(`[JobSearch] Failed to parse JSON from code block:`, codeBlockError);
              }
            }
            
            // Try to extract JSON array with flexible matching
            if (matches.length === 0) {
              jsonMatch = responseText.match(/\[\s*\{[\s\S]*?\}\s*\]/);
              if (jsonMatch) {
                try {
                  matches = JSON.parse(jsonMatch[0]);
                  console.log(`[JobSearch] Successfully extracted JSON array with flexible matching, got ${matches.length} matches`);
                } catch (flexibleError) {
                  console.error(`[JobSearch] Failed to parse flexible JSON:`, flexibleError);
                  console.log(`[JobSearch] Flexible match text:`, jsonMatch[0]);
                }
              }
            }
            
            // If all parsing fails, log the full response for debugging
            if (matches.length === 0) {
              console.error(`[JobSearch] All JSON parsing attempts failed`);
              console.error(`[JobSearch] Full response text:`, responseText);
            }
          }
          
          console.log(`[JobSearch] Parsed matches:`, matches);
          
          // Map scores and summaries back to jobs using id
          if (matches.length > 0) {
            jobs = jobs.map((job: any) => {
              const found = matches.find((m: any) => m.id === job.id);
              const updatedJob = {
                ...job,
                matchingScore: found?.score ?? 0,
                matchingSummary: found?.summary ?? "",
              };
              
              if (found) {
                console.log(`[JobSearch] Matched job ${job.id} (${job.title}): score=${found.score}, summary="${found.summary}"`);
              } else {
                console.log(`[JobSearch] No match found for job ${job.id} (${job.title})`);
              }
              
              return updatedJob;
            });
          } else {
            console.warn(`[JobSearch] No matches found in AI response, keeping original job data`);
          }
          
          console.log(`[JobSearch] Final matching scores:`, jobs.map((j: any) => ({
            id: j.id,
            title: j.title,
            company: j.company,
            matchingScore: j.matchingScore,
            summary: j.matchingSummary?.substring(0, 50) + '...'
          })));
          
        } else {
          const errorText = await openrouterRes.text();
          console.error(`[JobSearch] OpenRouter API error: ${openrouterRes.status} ${openrouterRes.statusText}`);
          console.error(`[JobSearch] Error response body:`, errorText);
          
          // Try to parse error details
          try {
            const errorData = JSON.parse(errorText);
            console.error(`[JobSearch] Parsed error data:`, errorData);
          } catch {
            console.error(`[JobSearch] Could not parse error response as JSON`);
          }
        }
      } catch (err) {
        console.error('[JobSearch] OpenRouter API error:', err);
        console.error('[JobSearch] Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      }
    } else {
      console.log(`[JobSearch] Skipping OpenRouter matching - Resume: ${!!resume}, Jobs: ${jobs.length}`);
    }

    console.log(`\n=== [JobSearch] Filtering Results ===`);
    const originalJobCount = jobs.length;
    
    // Only keep jobs with matchingScore >= 60 (good matches) if we have resume AND successful matching
    if (resume && jobs.some((job: any) => job.matchingScore > 0)) {
      jobs = jobs.filter((job: any) => job.matchingScore >= 60);
      console.log(`[JobSearch] Filtered jobs by score >= 60: ${originalJobCount} -> ${jobs.length}`);
      
      if (jobs.length === 0) {
        console.warn('[JobSearch] No jobs passed the matchingScore filter (>= 60)');
        console.log('[JobSearch] Original scores:', jobs.map((j: any) => ({ id: j.id, title: j.title, score: j.matchingScore })));
      }
    } else if (resume) {
      // If we have resume but no matching scores (API failed), don't filter - return all jobs
      console.log(`[JobSearch] OpenRouter matching failed, returning all ${jobs.length} jobs without filtering`);
      // Don't assign default scores - let the frontend handle display of jobs without scores
    } else {
      console.log(`[JobSearch] No resume provided, returning all ${jobs.length} jobs without filtering`);
    }

    // Summarize job descriptions for each job (AI call per job, sequential for now)
    console.log(`\n=== [JobSearch] Generating Job Summaries ===`);
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      console.log(`[JobSearch] Generating summary for job ${i + 1}/${jobs.length}: ${job.title}`);
      
      try {
        const startTime = Date.now();
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) throw new Error("Missing OpenRouter API key");
        
        const prompt = `Summarize the following job description in 50 words or less, focusing on the key responsibilities, requirements, and benefits.\n\nJob Description:\n${job.description}`;
        
        const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [
              { role: "system", content: "You are an expert job summarizer." },
              { role: "user", content: prompt },
            ],
          }),
        });
        
        if (openrouterRes.ok) {
          const data = await openrouterRes.json();
          const summary = data.choices?.[0]?.message?.content || "";
          jobs[i].summary = summary;
          const tokenUsage = data.usage?.total_tokens || 0;
          const timeTaken = (Date.now() - startTime) / 1000;
          const token = req.headers.get('Authorization')?.split('Bearer ')[1];
          if (token) {
            initFirebaseAdmin();
            const decodedToken = await getAuth().verifyIdToken(token);
            const userId = decodedToken.uid;
            await logActivity({
              userId,
              activityType: 'job_summary',
              tokenUsage,
              timeTaken,
              metadata: { 
                model: "openai/gpt-4o-mini", 
                job_id: job.id,
                query: query,
                location: location,
              },
            });
          }
          console.log(`[JobSearch] Generated summary for ${job.title}: "${summary}"`);
        } else {
          console.error(`[JobSearch] Failed to generate summary for ${job.title}: ${openrouterRes.status}`);
        }
      } catch (err) {
        console.error(`[JobSearch] OpenRouter summary error for job ${job.id}:`, err);
      }
    }

    console.log(`\n=== [JobSearch] Final Results ===`);
    console.log(`[JobSearch] Returning ${jobs.length} jobs`);
    console.log(`[JobSearch] Jobs with scores:`, jobs.map((j: any) => ({
      id: j.id,
      title: j.title,
      company: j.company,
      matchingScore: j.matchingScore,
      hasSummary: !!j.summary
    })));

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("\n=== [JobSearch] FATAL ERROR ===");
    console.error("SerpApi error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
} 