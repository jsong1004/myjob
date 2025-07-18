import { NextRequest, NextResponse } from "next/server"
import { getJson } from "serpapi";

import { initFirebaseAdmin } from "@/lib/firebase-admin-init";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { filterExistingJobs, saveJobsIfNotExist } from "@/lib/seen-jobs";
import { JobSearchResult } from "@/lib/types";

// State name to abbreviation mapping
const STATE_ABBREVIATIONS: { [key: string]: string } = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district of columbia': 'DC', 'washington dc': 'DC', 'washington d.c.': 'DC'
};

// Extract state abbreviation from location string
function extractStateFromLocation(location: string): string | null {
  if (!location) return null;
  
  // First, check if location already contains a state abbreviation (e.g., "Seattle, WA")
  const abbreviationMatch = location.match(/\b([A-Z]{2})\b/);
  if (abbreviationMatch) {
    const abbr = abbreviationMatch[1];
    // Verify it's a valid state abbreviation
    if (Object.values(STATE_ABBREVIATIONS).includes(abbr)) {
      return abbr;
    }
  }
  
  // Check for full state names in the location string
  const locationLower = location.toLowerCase();
  for (const [stateName, stateAbbr] of Object.entries(STATE_ABBREVIATIONS)) {
    if (locationLower.includes(stateName)) {
      return stateAbbr;
    }
  }
  
  return null;
}

// Get expected state from user's search location
function getExpectedState(searchLocation: string): string | null {
  return extractStateFromLocation(searchLocation);
}

export async function POST(req: NextRequest) {
  try {
    const { query, location, resume, useMultiAgent = true, forceLegacyScoring = false } = await req.json();
    console.log(`\n=== [JobSearch] Starting Job Search ===`);
    console.log(`[JobSearch] Query: "${query}"`);
    console.log(`[JobSearch] Location: "${location}"`);
    console.log(`[JobSearch] Resume provided: ${!!resume}`);
    console.log(`[JobSearch] Resume length: ${resume?.length || 0} characters`);
    console.log(`[JobSearch] Multi-agent scoring: ${useMultiAgent}`);
    console.log(`[JobSearch] Force legacy scoring: ${forceLegacyScoring}`);
    
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

    // Get user ID for deduplication (optional for authenticated users)
    const token = req.headers.get('Authorization')?.split('Bearer ')[1];
    let userId = null;
    if (token) {
        try {
            initFirebaseAdmin();
            const decodedToken = await getAuth().verifyIdToken(token);
            userId = decodedToken.uid;
        } catch (error) {
            console.log(`[JobSearch] Token verification failed:`, error);
            // Continue without userId for unauthenticated search
        }
    }

    console.log(`[JobSearch] Using SerpAPI key: ${apiKey.substring(0, 10)}...`);

    // Fetch ALL jobs from SerpApi using pagination loop
    let allSerpApiJobs: any[] = [];
    let pageToken: string | null = null;
    let pageCount = 0;
    const maxPages = 10; // Safety limit to prevent infinite loops
    
    do {
      pageCount++;
      console.log(`[JobSearch] Fetching page ${pageCount}${pageToken ? ` with token: ${pageToken.substring(0, 20)}...` : ' (first page)'}`);
      
      const serpApiParams: any = {
        engine: "google_jobs",
        api_key: apiKey,
        q: query,
        location: location || "United States",
        hl: "en",
        gl: "us",
        timeout: 20000, // 20 seconds timeout
      };
      
      if (pageToken) {
        serpApiParams.next_page_token = pageToken;
      }
      
      console.log(`[JobSearch] SerpAPI request params for page ${pageCount}:`, serpApiParams);
      const pageResults = await getJson(serpApiParams);
      
      console.log(`[JobSearch] Page ${pageCount} response received`);
      console.log(`[JobSearch] Raw SerpAPI response keys:`, Object.keys(pageResults || {}));
      console.log(`[JobSearch] Jobs found in page ${pageCount}: ${pageResults.jobs_results?.length || 0}`);
      
      if (pageResults.error) {
        console.error(`[JobSearch] SerpAPI error on page ${pageCount}:`, pageResults.error);
        return NextResponse.json({ error: "SerpAPI error: " + pageResults.error }, { status: 500 });
      }

      // Add jobs from this page to the total
      if (pageResults.jobs_results && pageResults.jobs_results.length > 0) {
        allSerpApiJobs = [...allSerpApiJobs, ...pageResults.jobs_results];
        console.log(`[JobSearch] Total jobs collected so far: ${allSerpApiJobs.length}`);
      }
      
      // Check for next page token
      pageToken = pageResults.serpapi_pagination?.next_page_token || null;
      console.log(`[JobSearch] Next page token: ${pageToken ? 'Present' : 'None'}`);
      
      if (pageResults.serpapi_pagination) {
        console.log(`[JobSearch] Full pagination object:`, pageResults.serpapi_pagination);
      }
      
      // If no more jobs on this page, stop pagination
      if (!pageResults.jobs_results || pageResults.jobs_results.length === 0) {
        console.log(`[JobSearch] No more jobs found on page ${pageCount}, stopping pagination`);
        break;
      }
      
      // Safety check for infinite loops
      if (pageCount >= maxPages) {
        console.warn(`[JobSearch] Reached maximum page limit (${maxPages}), stopping pagination`);
        break;
      }
      
    } while (pageToken);
    
    console.log(`[JobSearch] Pagination complete. Total pages fetched: ${pageCount}`);
    console.log(`[JobSearch] Total jobs collected: ${allSerpApiJobs.length}`);

    if (allSerpApiJobs.length === 0) {
      console.warn(`[JobSearch] No jobs found across all pages`);
      return NextResponse.json({ jobs: [] });
    }

    // Log first job for debugging
    console.log(`[JobSearch] First job sample:`, JSON.stringify(allSerpApiJobs[0], null, 2));

    // Normalize SerpApi results to JobSearchResult interface
    const unfilteredJobs: JobSearchResult[] = (allSerpApiJobs || []).map((job: any, index: number) => {
      // Processing job silently to reduce console noise
      
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
      
      // Generate a more unique ID if job_id is missing or not unique enough
      let jobId = job.job_id;
      if (!jobId) {
        // Fallback to a combination of title, company, and location for uniqueness
        jobId = `${job.title || 'unknown'}_${job.company_name || job.company || 'unknown'}_${job.location || 'unknown'}`.replace(/[^a-zA-Z0-9]/g, '_');
        console.warn(`[JobSearch] Missing job_id for job, using fallback: ${jobId}`);
      }
      
      const processedJob = {
        id: jobId, // Use the job_id from SerpAPI or fallback
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
      
      // Removed detailed job logging to reduce console noise
      
      return processedJob;
    });
    
    console.log(`[JobSearch] Processed ${unfilteredJobs.length} jobs from SerpApi`);

    // Remove duplicate jobs based on job ID
    const uniqueJobsMap = new Map<string, JobSearchResult>();
    const duplicateIds = new Set<string>();
    
    unfilteredJobs.forEach(job => {
      if (uniqueJobsMap.has(job.id)) {
        duplicateIds.add(job.id);
      } else {
        uniqueJobsMap.set(job.id, job);
      }
    });
    
    const uniqueJobs = Array.from(uniqueJobsMap.values());
    console.log(`[JobSearch] Deduplication summary:`);
    console.log(`[JobSearch] - Total jobs processed: ${unfilteredJobs.length}`);
    console.log(`[JobSearch] - Unique jobs: ${uniqueJobs.length}`);
    console.log(`[JobSearch] - Duplicates removed: ${unfilteredJobs.length - uniqueJobs.length}`);
    console.log(`[JobSearch] - Duplicate IDs found: ${duplicateIds.size}`);
    
    if (duplicateIds.size > 0) {
      console.log(`[JobSearch] Most common duplicate IDs:`, Array.from(duplicateIds).slice(0, 5));
    }

    // Apply location filtering based on state
    const expectedState = getExpectedState(location);
    let locationFilteredJobs = uniqueJobs;
    
    if (expectedState) {
      console.log(`[JobSearch] Filtering jobs for state: ${expectedState} (from search location: ${location})`);
      console.log(`[JobSearch] Note: Jobs with "Anywhere" or "Remote" in location will be included regardless of state`);
      
      let flexibleJobsCount = 0;
      
      locationFilteredJobs = uniqueJobs.filter(job => {
        // Always include jobs with "Anywhere" or "Remote" in location
        if (job.location) {
          const locationLower = job.location.toLowerCase();
          if (locationLower.includes('anywhere') || locationLower.includes('remote')) {
            flexibleJobsCount++;
            return true;
          }
        }
        
        const jobState = extractStateFromLocation(job.location);
        return jobState === expectedState;
      });
      
      console.log(`[JobSearch] Location filtering summary:`);
      console.log(`[JobSearch] - Jobs before filtering: ${uniqueJobs.length}`);
      console.log(`[JobSearch] - Jobs after filtering: ${locationFilteredJobs.length}`);
      console.log(`[JobSearch] - Flexible jobs included (Anywhere/Remote): ${flexibleJobsCount}`);
      console.log(`[JobSearch] - State-specific jobs: ${locationFilteredJobs.length - flexibleJobsCount}`);
      console.log(`[JobSearch] - Jobs removed by location filter: ${uniqueJobs.length - locationFilteredJobs.length}`);
    } else {
      console.log(`[JobSearch] No state detected in search location: "${location}" - skipping location filter`);
    }

    // Conditional filtering logic based on authentication status
    let jobsToReturn: JobSearchResult[];

    if (userId) {
      // SCENARIO 2: AUTHENTICATED USER
      console.log(`[JobSearch] Authenticated user flow for ${userId}`);
      
      // Fetch user's personal saved jobs
      const userSavedJobIds = new Set<string>();
      try {
        const db = getFirestore();
        const savedJobsSnapshot = await db.collection("savedJobs").where("userId", "==", userId).get();
        savedJobsSnapshot.forEach(doc => userSavedJobIds.add(doc.data().jobId));
        console.log(`[JobSearch] User has ${userSavedJobIds.size} saved jobs`);
      } catch (error) {
        console.error(`[JobSearch] Error fetching user saved jobs:`, error);
        // Continue without filtering if there's an error
      }

      // Filter out jobs the user has already saved
      const filteredJobs = locationFilteredJobs.filter(job => !userSavedJobIds.has(job.id));
      console.log(`[JobSearch] After filtering saved jobs: ${filteredJobs.length} jobs (removed ${locationFilteredJobs.length - filteredJobs.length} already saved)`);

      // Perform system-level processing (save new jobs to global 'jobs' collection without summaries)
      console.log(`[JobSearch] Filtering out existing jobs in database`);
      const newJobs = await filterExistingJobs(filteredJobs);
      console.log(`[JobSearch] Found ${newJobs.length} new jobs after filtering existing jobs.`);

      // Save new jobs to jobs collection without summaries for faster performance
      if (newJobs.length > 0) {
        const jobsWithoutSummaries = newJobs.map(job => ({
          ...job,
          summary: "", // No summary for faster search
        }));
        await saveJobsIfNotExist(jobsWithoutSummaries, userId);
        console.log(`[JobSearch] Saved ${jobsWithoutSummaries.length} new jobs to jobs collection (without summaries).`);
      }

      // Return filtered jobs without summaries for faster performance
      jobsToReturn = filteredJobs.map(job => ({
        ...job,
        summary: "", // No summary for faster search
        matchingScore: 0,
        matchingSummary: "",
      }));

    } else {
      // SCENARIO 1: UNAUTHENTICATED USER
      console.log(`[JobSearch] Unauthenticated user flow.`);
      
      // Return all jobs without summaries for faster performance
      jobsToReturn = locationFilteredJobs.map(job => ({
        ...job,
        summary: "", // No summary for faster search
        matchingScore: 0,
        matchingSummary: "",
      }));
    }

    console.log(`[JobSearch] Returning ${jobsToReturn.length} jobs to client.`);
    return NextResponse.json({ jobs: jobsToReturn });

  } catch (error) {
    console.error(`[JobSearch] UNEXPECTED ERROR:`, error);
    console.error("SerpApi error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
} 

// Summary generation removed for faster job search performance 