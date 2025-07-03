import { NextRequest, NextResponse } from "next/server";
import { getJson } from "serpapi";

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
        id: job.job_id || job.jobkey || job.jobId || job.id || Math.random().toString(36).slice(2),
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
      console.log(`\n=== [JobSearch] Starting OpenRouter Matching Analysis ===`);
      
      try {
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
        console.log(`[JobSearch] Jobs being analyzed:`, jobsForAI.map(j => ({
          id: j.id, 
          title: j.title, 
          company: j.company,
          descriptionLength: j.description.length
        })));
        
        const prompt = `Given the following resume and a list of jobs, rate how well the resume matches each job on a scale of 0-100. For each job, return a JSON array of objects with id, title, company, score, and a 1-sentence summary.\n\nResume:\n${resume}\n\nJobs:\n${jobsForPrompt}`;
        
        console.log(`[JobSearch] Final prompt length: ${prompt.length} characters`);
        console.log(`[JobSearch] Prompt preview (first 500 chars):`, prompt.substring(0, 500) + '...');
        
        const openrouterRequestBody = {
          model: "openai/gpt-4o-mini",
          messages: [
            { 
              role: "system", 
              content: "You are an expert job matching assistant. Your task is to evaluate how well a candidate's resume matches a given list of job descriptions. Assess each job against the resume using a structured scoring system based on the following five weighted categories, totaling 100%:\n\n1. Skills Match – 30%\n- Does the resume list the required technical skills?\n- Are relevant tools and platforms (e.g., AWS, Python, Salesforce) mentioned?\n- Do years of experience align with expectations?\n\n2. Experience Alignment – 25%\n- Do past roles reflect the core responsibilities of the job?\n- Are industries, functions, or team sizes relevant or comparable?\n- Is there evidence of role progression or leadership, if required?\n\n3. Job Title Similarity – 15%\n- Are previous titles equivalent or closely related to the job title?\n- Has the candidate operated at a similar seniority level (e.g., Lead, Manager)?\n\n4. Education & Certifications – 10%\n- Does the resume meet the stated educational requirements?\n- Are any required certifications present (e.g., PMP, CPA, AWS Certified)?\n\n5. Language & Keywords Match – 20%\n- How many key terms from the job description appear in the resume?\n- Are keywords used meaningfully and in relevant context?\n\nFor each job, return a JSON array of objects with the following structure: [{\"id\":\"job_id_123\",\"title\":\"Job Title\",\"company\":\"Company Name\",\"score\":87,\"summary\":\"Strong technical alignment and relevant experience, though title mismatch slightly lowers the match score.\"}]" 
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
            matches = JSON.parse(responseText);
            console.log(`[JobSearch] Successfully parsed JSON, got ${matches.length} matches`);
          } catch (parseError) {
            console.log(`[JobSearch] Direct JSON parse failed, trying to extract JSON array...`);
            const match = responseText.match(/\[([\s\S]*?)\]/);
            if (match) {
              try {
                matches = JSON.parse(match[0]);
                console.log(`[JobSearch] Successfully extracted and parsed JSON array, got ${matches.length} matches`);
              } catch (extractError) {
                console.error(`[JobSearch] Failed to parse extracted JSON:`, extractError);
                console.log(`[JobSearch] Extracted text:`, match[0]);
              }
            } else {
              console.error(`[JobSearch] No JSON array found in response`);
            }
          }
          
          console.log(`[JobSearch] Parsed matches:`, matches);
          
          // Map scores and summaries back to jobs using id
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
      // If we have resume but no matching scores (API failed), assign default scores and return all jobs
      console.log(`[JobSearch] OpenRouter matching failed, assigning default scores to all ${jobs.length} jobs`);
      jobs = jobs.map((job: any) => ({
        ...job,
        matchingScore: 50, // Default score
        matchingSummary: "Matching analysis unavailable - OpenRouter API error"
      }));
      console.log(`[JobSearch] Returning all ${jobs.length} jobs with default scores`);
    } else {
      console.log(`[JobSearch] No resume provided, returning all ${jobs.length} jobs without filtering`);
    }

    // Summarize job descriptions for each job (AI call per job, sequential for now)
    console.log(`\n=== [JobSearch] Generating Job Summaries ===`);
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      console.log(`[JobSearch] Generating summary for job ${i + 1}/${jobs.length}: ${job.title}`);
      
      try {
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