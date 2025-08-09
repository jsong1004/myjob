import { NextRequest, NextResponse } from "next/server"
import { getJson } from "serpapi";

import { initFirebaseAdmin } from "@/lib/firebase-admin-init";
import { getAuth } from "firebase-admin/auth";
import { filterExistingJobs, saveJobsIfNotExist, searchJobsInDatabase, filterOutSavedJobs } from "@/lib/seen-jobs";
import { JobSearchResult } from "@/lib/types";
import { processLocation, isAnywhereLocation } from "@/lib/utils/location-correction";

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
    const body = await req.json();
    const { query, resume, useMultiAgent = true, forceLegacyScoring = false } = body;
    
    // Process location with spelling corrections and handle undefined
    const rawLocation = body.location;
    const location = processLocation(rawLocation);
    const isSearchingEverywhere = isAnywhereLocation(location);
    
    // Use server-side logging to avoid contaminating response
    if (process.env.NODE_ENV === 'development') {
      console.log(`\n=== [JobSearch] Starting Job Search ===`);
      console.log(`[JobSearch] Query: "${query}"`);
      console.log(`[JobSearch] Raw Location: "${rawLocation}"`);
      console.log(`[JobSearch] Processed Location: "${location}"`);
      console.log(`[JobSearch] Search Everywhere: ${isSearchingEverywhere}`);
      console.log(`[JobSearch] Resume provided: ${!!resume}`);
      console.log(`[JobSearch] Resume length: ${resume?.length || 0} characters`);
      console.log(`[JobSearch] Multi-agent scoring: ${useMultiAgent}`);
      console.log(`[JobSearch] Force legacy scoring: ${forceLegacyScoring}`);
    }
    
    // Debug environment variables (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[JobSearch] Environment check:`);
      console.log(`[JobSearch] - SERPAPI_KEY exists: ${!!process.env.SERPAPI_KEY}`);
      console.log(`[JobSearch] - OPENROUTER_API_KEY exists: ${!!process.env.OPENROUTER_API_KEY}`);
      console.log(`[JobSearch] - NODE_ENV: ${process.env.NODE_ENV}`);
      
      if (resume) {
        console.log(`[JobSearch] Resume preview (first 200 chars):`, resume.substring(0, 200) + '...');
      }
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
            if (process.env.NODE_ENV === 'development') {
              console.log(`[JobSearch] Authenticated user ID: ${userId}`);
            }
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`[JobSearch] Token verification failed:`, error);
            }
            // Continue without userId for unauthenticated search
        }
    } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[JobSearch] No authorization token provided - unauthenticated search`);
        }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[JobSearch] Using SerpAPI key: ${apiKey.substring(0, 10)}...`);
    }

    // STEP 1: Search database first for existing jobs
    if (process.env.NODE_ENV === 'development') {
      console.log(`[JobSearch] === STEP 1: Searching Database First ===`);
    }
    // Pass processed location to database search, or undefined for "anywhere" searches
    const searchLocation = isSearchingEverywhere ? undefined : location;
    const databaseJobs = await searchJobsInDatabase(query, searchLocation, 100); // Get up to 100 jobs from database
    if (process.env.NODE_ENV === 'development') {
      console.log(`[JobSearch] Found ${databaseJobs.length} jobs in database`);
      // Check specifically for the problematic job
      const problematicJob = databaseJobs.find(job => 
        job.title.toLowerCase().includes('advanced analytics') && 
        job.company.toLowerCase().includes('children')
      );
      if (problematicJob) {
        console.log(`[JobSearch] FOUND PROBLEMATIC JOB IN DATABASE: ${problematicJob.id} - ${problematicJob.title} at ${problematicJob.company}`);
      }
    }

    let jobsToReturn: JobSearchResult[] = databaseJobs;
    let needsSerpApiCall = false;
    const MIN_JOBS_THRESHOLD = 10; // Minimum jobs needed before falling back to SerpAPI

    // STEP 2: Filter out saved jobs for authenticated users
    if (userId && databaseJobs.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[JobSearch] === STEP 2: Filtering Saved Jobs ===`);
      }
      const unsavedDatabaseJobs = await filterOutSavedJobs(databaseJobs, userId);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[JobSearch] After filtering saved jobs: ${unsavedDatabaseJobs.length} unsaved jobs from database`);
        // Check if the problematic job was filtered out
        const problematicJobAfterFilter = unsavedDatabaseJobs.find(job => 
          job.title.toLowerCase().includes('advanced analytics') && 
          job.company.toLowerCase().includes('children')
        );
        if (problematicJobAfterFilter) {
          console.log(`[JobSearch] PROBLEMATIC JOB STILL PRESENT AFTER FILTERING: ${problematicJobAfterFilter.id} - ${problematicJobAfterFilter.title} at ${problematicJobAfterFilter.company}`);
        } else {
          console.log(`[JobSearch] Problematic job was successfully filtered out`);
        }
      }
      
      jobsToReturn = unsavedDatabaseJobs;
      
      // Check if we have enough jobs from database
      if (unsavedDatabaseJobs.length < MIN_JOBS_THRESHOLD) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[JobSearch] Not enough new jobs from database (${unsavedDatabaseJobs.length} < ${MIN_JOBS_THRESHOLD}), will fetch from SerpAPI`);
        }
        needsSerpApiCall = true;
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[JobSearch] Sufficient jobs found in database (${unsavedDatabaseJobs.length} >= ${MIN_JOBS_THRESHOLD}), skipping SerpAPI call`);
        }
      }
    } else if (!userId && databaseJobs.length < MIN_JOBS_THRESHOLD) {
      // For unauthenticated users, also check if we have enough jobs
      if (process.env.NODE_ENV === 'development') {
        console.log(`[JobSearch] Unauthenticated user: not enough jobs from database (${databaseJobs.length} < ${MIN_JOBS_THRESHOLD}), will fetch from SerpAPI`);
      }
      needsSerpApiCall = true;
    } else if (!userId) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[JobSearch] Unauthenticated user: sufficient jobs found in database (${databaseJobs.length} >= ${MIN_JOBS_THRESHOLD}), skipping SerpAPI call`);
      }
    }

    // STEP 3: Fallback to SerpAPI if needed
    let allSerpApiJobs: Record<string, unknown>[] = [];
    if (needsSerpApiCall) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[JobSearch] === STEP 3: Fetching from SerpAPI (Fallback) ===`);
      }
      
      let pageToken: string | null = null;
      let pageCount = 0;
      const maxPages = 10; // Safety limit to prevent infinite loops
      
      do {
        pageCount++;
        if (process.env.NODE_ENV === 'development') {
          console.log(`[JobSearch] Fetching SerpAPI page ${pageCount}${pageToken ? ` with token: ${pageToken.substring(0, 20)}...` : ' (first page)'}`);
        }
        
        const serpApiParams: Record<string, unknown> = {
          engine: "google_jobs",
          api_key: apiKey,
          q: query,
          // For remote/anywhere searches, use "United States" as the location
          // but append "remote" to the query to find remote jobs
          location: isSearchingEverywhere ? "United States" : (location || "United States"),
          hl: "en",
          gl: "us",
          timeout: 20000, // 20 seconds timeout
        };
        
        // If searching everywhere, add "remote" to the query
        if (isSearchingEverywhere) {
          serpApiParams.q = `${query} remote`;
        }
        
        if (pageToken) {
          serpApiParams.next_page_token = pageToken;
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[JobSearch] SerpAPI request params for page ${pageCount}:`, serpApiParams);
        }
        const pageResults = await getJson(serpApiParams);
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[JobSearch] Page ${pageCount} response received`);
          console.log(`[JobSearch] Raw SerpAPI response keys:`, Object.keys(pageResults || {}));
          console.log(`[JobSearch] Jobs found in page ${pageCount}: ${pageResults.jobs_results?.length || 0}`);
        }
        
        if (pageResults.error) {
          console.error(`[JobSearch] SerpAPI error on page ${pageCount}:`, pageResults.error);
          return NextResponse.json({ error: "SerpAPI error: " + pageResults.error }, { status: 500 });
        }

        // Add jobs from this page to the total
        if (pageResults.jobs_results && pageResults.jobs_results.length > 0) {
          allSerpApiJobs = [...allSerpApiJobs, ...pageResults.jobs_results];
          if (process.env.NODE_ENV === 'development') {
            console.log(`[JobSearch] Total SerpAPI jobs collected so far: ${allSerpApiJobs.length}`);
          }
        }
        
        // Check for next page token
        pageToken = pageResults.serpapi_pagination?.next_page_token || null;
        if (process.env.NODE_ENV === 'development') {
          console.log(`[JobSearch] Next page token: ${pageToken ? 'Present' : 'None'}`);
        }
        
        if (pageResults.serpapi_pagination && process.env.NODE_ENV === 'development') {
          console.log(`[JobSearch] Full pagination object:`, pageResults.serpapi_pagination);
        }
        
        // If no more jobs on this page, stop pagination
        if (!pageResults.jobs_results || pageResults.jobs_results.length === 0) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[JobSearch] No more jobs found on page ${pageCount}, stopping pagination`);
          }
          break;
        }
        
        // Safety check for infinite loops
        if (pageCount >= maxPages) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[JobSearch] Reached maximum page limit (${maxPages}), stopping pagination`);
          }
          break;
        }
        
      } while (pageToken);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[JobSearch] SerpAPI pagination complete. Total pages fetched: ${pageCount}`);
        console.log(`[JobSearch] Total SerpAPI jobs collected: ${allSerpApiJobs.length}`);
      }

      // Log first job for debugging if we have jobs
      if (allSerpApiJobs.length > 0 && process.env.NODE_ENV === 'development') {
        console.log(`[JobSearch] First SerpAPI job sample:`, JSON.stringify(allSerpApiJobs[0], null, 2));
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[JobSearch] Skipping SerpAPI call - sufficient jobs found in database`);
      }
    }

    // STEP 4: Process SerpAPI jobs if we fetched any
    let processedSerpApiJobs: JobSearchResult[] = [];
    if (allSerpApiJobs.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[JobSearch] === STEP 4: Processing SerpAPI Jobs ===`);
      }
      
      // Normalize SerpApi results to JobSearchResult interface
      processedSerpApiJobs = (allSerpApiJobs || []).map((job: Record<string, unknown>) => {
        // Processing job silently to reduce console noise
        
        let qualifications: string[] = [];
        let responsibilities: string[] = [];
        let benefits: string[] = [];
        
        // Safely access job_highlights with type checking
        const jobHighlights = job.job_highlights as Array<{title?: string, items?: string[]}> | undefined;
        if (Array.isArray(jobHighlights)) {
          for (const highlight of jobHighlights) {
            if (highlight.title?.toLowerCase().includes("qualification")) {
              qualifications = highlight.items || [];
            } else if (highlight.title?.toLowerCase().includes("responsibilit")) {
              responsibilities = highlight.items || [];
            } else if (highlight.title?.toLowerCase().includes("benefit")) {
              benefits = highlight.items || [];
            }
          }
        }
        
        // Improved salary extraction with type safety
        const detectedExtensions = job.detected_extensions as {salary?: string, posted_at?: string} | undefined;
        let salary = (job.salary as string) || detectedExtensions?.salary || "";
        
        const extensions = job.extensions as string[] | undefined;
        if (!salary && Array.isArray(extensions)) {
          const salaryExt = extensions.find((ext: string) => /\$|salary|per\s+hour|per\s+year|\d+k|\d+,\d+/i.test(ext));
          if (salaryExt) salary = salaryExt;
        }
        
        // Additional salary extraction from job highlights
        if (!salary && Array.isArray(jobHighlights)) {
          for (const highlight of jobHighlights) {
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
        let jobId = job.job_id as string;
        if (!jobId) {
          // Fallback to a combination of title, company, and location for uniqueness
          const title = job.title as string || 'unknown';
          const company = (job.company_name as string) || (job.company as string) || 'unknown';
          const location = job.location as string || 'unknown';
          jobId = `${title}_${company}_${location}`.replace(/[^a-zA-Z0-9]/g, '_');
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[JobSearch] Missing job_id for job, using fallback: ${jobId}`);
          }
        }
        
        // Safely access apply_options and detected_extensions
        const applyOptions = job.apply_options as Array<{link?: string}> | undefined;
        const applyUrl = applyOptions?.[0]?.link || (job.apply_link as string) || (job.link as string) || "";
        const postedAt = detectedExtensions?.posted_at || (job.posted_at as string) || "";
        
        const processedJob: JobSearchResult = {
          id: jobId,
          title: (job.title as string) || "",
          company: (job.company_name as string) || (job.company as string) || "",
          location: (job.location as string) || "",
          description: (job.description as string) || (job.snippet as string) || "",
          qualifications,
          responsibilities,
          benefits,
          salary,
          postedAt,
          applyUrl,
          source: (job.source as string) || "Google Jobs",
          matchingScore: 0,
          matchingSummary: "",
          summary: "",
        };
        
        // Removed detailed job logging to reduce console noise
        
        return processedJob;
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[JobSearch] Processed ${processedSerpApiJobs.length} jobs from SerpApi`);
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[JobSearch] No SerpAPI jobs to process`);
      }
    }

    // STEP 5: Combine database jobs with SerpAPI jobs (if any)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[JobSearch] === STEP 5: Combining Results ===`);
    }
    let allCombinedJobs: JobSearchResult[] = [];
    
    if (needsSerpApiCall && processedSerpApiJobs.length > 0) {
      // If we fetched SerpAPI jobs, we need to combine them with database jobs
      // First, remove duplicates between database and SerpAPI jobs
      const serpApiJobIds = new Set(processedSerpApiJobs.map(job => job.id));
      const uniqueDatabaseJobs = jobsToReturn.filter(job => !serpApiJobIds.has(job.id));
      
      // Combine unique database jobs with SerpAPI jobs
      allCombinedJobs = [...uniqueDatabaseJobs, ...processedSerpApiJobs];
      if (process.env.NODE_ENV === 'development') {
        console.log(`[JobSearch] Combined ${uniqueDatabaseJobs.length} database jobs + ${processedSerpApiJobs.length} SerpAPI jobs = ${allCombinedJobs.length} total jobs`);
      }
      
      // Apply location filtering to SerpAPI jobs
      const expectedState = getExpectedState(location);
      if (expectedState) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[JobSearch] Applying location filtering to combined results for state: ${expectedState}`);
        }
        
        allCombinedJobs = allCombinedJobs.filter(job => {
          // Always include jobs with "Anywhere" or "Remote" in location
          if (job.location) {
            const locationLower = job.location.toLowerCase();
            if (locationLower.includes('anywhere') || locationLower.includes('remote')) {
              return true;
            }
          }
          
          const jobState = extractStateFromLocation(job.location);
          return jobState === expectedState;
        });
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[JobSearch] After location filtering: ${allCombinedJobs.length} jobs`);
        }
      }
      
      // Filter out saved jobs for authenticated users (for SerpAPI jobs)
      if (userId) {
        const finalFilteredJobs = await filterOutSavedJobs(allCombinedJobs, userId);
        if (process.env.NODE_ENV === 'development') {
          console.log(`[JobSearch] After filtering saved jobs from combined results: ${finalFilteredJobs.length} jobs`);
        }
        
        // Save new SerpAPI jobs to database
        if (processedSerpApiJobs.length > 0) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[JobSearch] Saving new SerpAPI jobs to database`);
          }
          const newSerpApiJobs = await filterExistingJobs(processedSerpApiJobs);
          if (newSerpApiJobs.length > 0) {
            const jobsWithoutSummaries = newSerpApiJobs.map(job => ({
              ...job,
              summary: "", // No summary for faster search
            }));
            await saveJobsIfNotExist(jobsWithoutSummaries, userId);
            if (process.env.NODE_ENV === 'development') {
              console.log(`[JobSearch] Saved ${jobsWithoutSummaries.length} new SerpAPI jobs to database`);
            }
          }
        }
        
        jobsToReturn = finalFilteredJobs;
      } else {
        jobsToReturn = allCombinedJobs;
      }
    } else {
      // We're using only database jobs
      if (process.env.NODE_ENV === 'development') {
        console.log(`[JobSearch] Using only database jobs: ${jobsToReturn.length} jobs`);
      }
    }

    // STEP 6: Final result preparation
    if (process.env.NODE_ENV === 'development') {
      console.log(`[JobSearch] === STEP 6: Preparing Final Results ===`);
    }
    
    // Deduplicate jobs based on job ID (in case there are any duplicates)
    const uniqueJobsMap = new Map<string, JobSearchResult>();
    for (const job of jobsToReturn) {
      // Only add if we haven't seen this job ID before
      if (!uniqueJobsMap.has(job.id)) {
        uniqueJobsMap.set(job.id, job);
      } else if (process.env.NODE_ENV === 'development') {
        console.log(`[JobSearch] Duplicate job found and removed: ${job.id} - ${job.title} at ${job.company}`);
      }
    }
    
    // Convert map back to array
    const uniqueJobs = Array.from(uniqueJobsMap.values());
    
    if (process.env.NODE_ENV === 'development' && uniqueJobs.length !== jobsToReturn.length) {
      console.log(`[JobSearch] Deduplication removed ${jobsToReturn.length - uniqueJobs.length} duplicate jobs`);
    }
    
    // Ensure jobs don't have scoring data for faster performance
    const finalJobsToReturn = uniqueJobs.map(job => ({
      ...job,
      summary: "", // No summary for faster search
      matchingScore: 0,
      matchingSummary: "",
    }));

    if (process.env.NODE_ENV === 'development') {
      console.log(`[JobSearch] Returning ${finalJobsToReturn.length} unique jobs to client.`);
      // Final check for the problematic job
      const finalProblematicJob = finalJobsToReturn.find(job => 
        job.title.toLowerCase().includes('advanced analytics') && 
        job.company.toLowerCase().includes('children')
      );
      if (finalProblematicJob) {
        console.log(`[JobSearch] ❌ PROBLEMATIC JOB STILL IN FINAL RESULTS: ${finalProblematicJob.id} - ${finalProblematicJob.title} at ${finalProblematicJob.company}`);
      } else {
        console.log(`[JobSearch] ✅ Problematic job successfully excluded from final results`);
      }
    }
    return NextResponse.json({ jobs: finalJobsToReturn });

  } catch (error) {
    console.error(`[JobSearch] UNEXPECTED ERROR:`, error);
    console.error("SerpApi error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
} 

// Summary generation removed for faster job search performance 