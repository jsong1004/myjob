import { NextRequest, NextResponse } from "next/server";
import { getJson } from "serpapi";

export async function POST(req: NextRequest) {
  try {
    const { query, location, resume } = await req.json();
    console.log(`[JobSearch] Starting search - Query: "${query}", Location: "${location}", Resume length: ${resume?.length || 0}`);
    
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
      console.error('[JobSearch] Missing SERPAPI_KEY');
      return NextResponse.json({ error: "Missing SERPAPI_KEY" }, { status: 500 });
    }

    // Call SerpApi
    const results = await getJson({
      engine: "google_jobs",
      api_key: apiKey,
      q: query,
      location: location || "United States",
      hl: "en",
      gl: "us",
    });

    // Normalize SerpApi results to JobSearchResult interface
    let jobs = (results.jobs_results || []).map((job: any) => {
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
      return {
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
      }
    });
    console.log(`[JobSearch] Fetched ${jobs.length} jobs from SerpApi for query: '${query}'`);

    // If resume is provided, call OpenRouter to get matching scores
    if (resume && jobs.length > 0) {
      try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          console.error('[JobSearch] Missing OpenRouter API key');
          throw new Error("Missing OpenRouter API key");
        }
        console.log(`[JobSearch] Using OpenRouter API key: ${apiKey.substring(0, 10)}...`);
        // Compose a prompt for all jobs (limit to 10 for token safety)
        const jobsForAI = jobs.slice(0, 10).map((job: any) => `ID: ${job.id}\nJob Title: ${job.title}\nCompany: ${job.company}\nDescription: ${job.description}`).join("\n---\n");
        console.log(`[JobSearch] Sending ${jobs.slice(0, 10).length} jobs to OpenRouter for matching...`);
        console.log(`[JobSearch] Resume length: ${resume.length} characters`);
        console.log(`[JobSearch] Jobs for AI:`, jobs.slice(0, 10).map(j => ({id: j.id, title: j.title, company: j.company})));
        
        const prompt = `Given the following resume and a list of jobs, rate how well the resume matches each job on a scale of 0-100. For each job, return a JSON array of objects with id, title, company, score, and a 1-sentence summary.\n\nResume:\n${resume}\n\nJobs:\n${jobsForAI}`;
        console.log(`[JobSearch] Prompt length: ${prompt.length} characters`);
        const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [
              { role: "system", content: "You are an expert job matching assistant. Your task is to evaluate how well a candidate's resume matches a given list of job descriptions. Assess each job against the resume using a structured scoring system based on the following five weighted categories, totaling 100%:\n\n1. Skills Match – 30%\n- Does the resume list the required technical skills?\n- Are relevant tools and platforms (e.g., AWS, Python, Salesforce) mentioned?\n- Do years of experience align with expectations?\n\n2. Experience Alignment – 25%\n- Do past roles reflect the core responsibilities of the job?\n- Are industries, functions, or team sizes relevant or comparable?\n- Is there evidence of role progression or leadership, if required?\n\n3. Job Title Similarity – 15%\n- Are previous titles equivalent or closely related to the job title?\n- Has the candidate operated at a similar seniority level (e.g., Lead, Manager)?\n\n4. Education & Certifications – 10%\n- Does the resume meet the stated educational requirements?\n- Are any required certifications present (e.g., PMP, CPA, AWS Certified)?\n\n5. Language & Keywords Match – 20%\n- How many key terms from the job description appear in the resume?\n- Are keywords used meaningfully and in relevant context?\n\nFor each job, return a JSON array of objects with the following structure: [{\"id\":\"job_id_123\",\"title\":\"Job Title\",\"company\":\"Company Name\",\"score\":87,\"summary\":\"Strong technical alignment and relevant experience, though title mismatch slightly lowers the match score.\"}]" },
              { role: "user", content: prompt },
            ],
          }),
        });
        
        console.log(`[JobSearch] OpenRouter API response status: ${openrouterRes.status}`);
        
        if (openrouterRes.ok) {
          const data = await openrouterRes.json();
          console.log(`[JobSearch] Raw OpenRouter response:`, JSON.stringify(data, null, 2));
          
          const text = data.choices?.[0]?.message?.content || "";
          console.log(`[JobSearch] OpenRouter API response text:`, text);
          console.log(`[JobSearch] Response text length: ${text.length}`);
          
          // Try to parse the JSON array from the AI's response
          let matches: any[] = [];
          try {
            matches = JSON.parse(text);
          } catch {
            const match = text.match(/\[([\s\S]*?)\]/);
            if (match) {
              try {
                matches = JSON.parse(match[0]);
              } catch {}
            }
          }
          // Map scores and summaries back to jobs using id
          jobs = jobs.map((job: any) => {
            const found = matches.find((m: any) => m.id === job.id);
            return {
              ...job,
              matchingScore: found?.score ?? 0,
              matchingSummary: found?.summary ?? "",
            };
          });
          console.log(
            '[JobSearch] Scores after mapping:',
            jobs.map(function (j: any): { id: string; title: string; matchingScore: number } {
              return {
                id: j.id,
                title: j.title,
                matchingScore: j.matchingScore,
              };
            })
          );
        } else {
          console.error(`[JobSearch] OpenRouter API error: ${openrouterRes.status} ${openrouterRes.statusText}`);
          const errorText = await openrouterRes.text();
          console.error(`[JobSearch] Error response body:`, errorText);
        }
      } catch (err) {
        console.error('[JobSearch] OpenRouter API error:', err);
      }
    }

    // Only keep jobs with matchingScore >= 60 (good matches)
    jobs = jobs.filter((job: any) => job.matchingScore >= 60);
    console.log(`[JobSearch] Returning ${jobs.length} jobs with matchingScore >= 60`);
    if (jobs.length === 0) {
      console.warn('[JobSearch] No jobs passed the matchingScore filter. Returning empty result.');
    }

    // Summarize job descriptions for each job (AI call per job, sequential for now)
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
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
        }
      } catch (err) {
        // If AI summary fails, leave summary blank
        console.error(`[JobSearch] OpenRouter summary error for job ${job.id}:`, err);
      }
    }

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("SerpApi error:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
} 