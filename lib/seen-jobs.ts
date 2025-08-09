import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initFirebaseAdmin } from './firebase-admin-init';
import { JobSearchResult } from './types';

export async function filterExistingJobs(jobs: JobSearchResult[]): Promise<JobSearchResult[]> {
  if (!jobs || jobs.length === 0) {
    return [];
  }

  initFirebaseAdmin();
  const db = getFirestore();

  const jobIdsFromSerp = jobs.map(job => job.id);
  const existingJobIds = new Set<string>();

  // Firestore 'in' query has a limit of 30 elements. Batching the query.
  const CHUNK_SIZE = 30;
  for (let i = 0; i < jobIdsFromSerp.length; i += CHUNK_SIZE) {
    const chunk = jobIdsFromSerp.slice(i, i + CHUNK_SIZE);
    if (chunk.length > 0) {
      const snapshot = await db.collection('jobs').where('job_id', 'in', chunk).get();
      snapshot.forEach(doc => {
        existingJobIds.add(doc.data().job_id);
      });
    }
  }

  const newJobs = jobs.filter(job => !existingJobIds.has(job.id));
  return newJobs;
}

export async function saveJobsIfNotExist(jobs: JobSearchResult[], userId: string): Promise<void> {
  if (!jobs || jobs.length === 0) {
    return;
  }

  initFirebaseAdmin();
  const db = getFirestore();

  const batch = db.batch();

  for (const job of jobs) {
    const docRef = db.collection('jobs').doc(job.id);
    // Save complete job data (excluding score and matching summary which are user-specific)
    const { matchingScore, matchingSummary, ...jobDataWithoutScoring } = job;
    
    batch.set(docRef, {
      ...jobDataWithoutScoring,
      job_id: job.id, // Keep job_id for backward compatibility
      company_name: job.company, // Keep company_name for backward compatibility
      isAvailable: true, // Default to available for new jobs
      userId,
      seenAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  await batch.commit();
}

/**
 * Search for jobs in the database that match the query and location
 * @param query - Search query (e.g., "software developer")
 * @param location - Location string (e.g., "New York, NY")
 * @param limit - Maximum number of jobs to return (default: 50)
 * @returns Array of jobs from the database
 */
export async function searchJobsInDatabase(
  query: string, 
  location?: string, 
  limit: number = 50
): Promise<JobSearchResult[]> {
  if (!query) {
    return [];
  }

  initFirebaseAdmin();
  const db = getFirestore();

  try {
    // Only log in development to avoid response contamination
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DatabaseSearch] Searching database for query: "${query}", location: "${location || 'anywhere'}"`);
    }
    
    // Convert query to lowercase for case-insensitive searching
    const queryLower = query.toLowerCase();
    const locationLower = location?.toLowerCase() || '';
    const isSearchingEverywhere = !location || location === '';

    // Get all jobs from the database (we'll filter in memory for more flexible search)
    // In a production system, you might want to use more sophisticated indexing
    const jobsSnapshot = await db.collection('jobs')
      .limit(500) // Get a reasonable batch size to search through
      .get();

    const allJobs: JobSearchResult[] = [];
    
    jobsSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Skip jobs that are marked as unavailable
      if (data.isAvailable === false) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DatabaseSearch] Skipping unavailable job: ${data.title} at ${data.company_name || data.company}`);
        }
        return;
      }
      
      // Convert database document to JobSearchResult format
      const jobId = data.job_id || doc.id;
      
      // Debug job ID assignment for the problematic job
      if (process.env.NODE_ENV === 'development') {
        const title = data.title || '';
        const company = data.company_name || data.company || '';
        if (title.toLowerCase().includes('advanced analytics') && company.toLowerCase().includes('children')) {
          console.log(`[DatabaseSearch] PROBLEMATIC JOB ID ASSIGNMENT:`);
          console.log(`  - Document ID: ${doc.id}`);
          console.log(`  - job_id field: ${data.job_id}`);
          console.log(`  - Final job ID: ${jobId}`);
          console.log(`  - Title: ${title}`);
          console.log(`  - Company: ${company}`);
        }
      }
      
      const job: JobSearchResult = {
        id: jobId,
        title: data.title || '',
        company: data.company_name || data.company || '',
        location: data.location || '',
        description: data.description || '',
        qualifications: data.qualifications || [],
        responsibilities: data.responsibilities || [],
        benefits: data.benefits || [],
        salary: data.salary || '',
        postedAt: data.postedAt || '',
        applyUrl: data.applyUrl || '',
        source: data.source || 'Database',
        matchingScore: 0,
        matchingSummary: '',
        summary: data.summary || '',
      };
      allJobs.push(job);
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[DatabaseSearch] Found ${allJobs.length} total jobs in database`);
    }

    // Filter jobs based on query matching (title, company, description)
    const matchingJobs = allJobs.filter(job => {
      const titleMatch = job.title.toLowerCase().includes(queryLower);
      const companyMatch = job.company.toLowerCase().includes(queryLower);
      const descriptionMatch = job.description.toLowerCase().includes(queryLower);
      const qualificationsMatch = job.qualifications?.some(q => q.toLowerCase().includes(queryLower)) || false;
      
      // Job matches if query is found in title, company, description, or qualifications
      const queryMatches = titleMatch || companyMatch || descriptionMatch || qualificationsMatch;
      
      // Location filtering
      let locationMatches = true;
      if (isSearchingEverywhere) {
        // When searching everywhere, include all jobs (no location filter)
        locationMatches = true;
      } else if (locationLower) {
        const jobLocationLower = job.location.toLowerCase();
        // Include jobs that match the location, remote jobs, and anywhere jobs
        locationMatches = jobLocationLower.includes(locationLower) ||
                         jobLocationLower.includes('remote') ||
                         jobLocationLower.includes('anywhere') ||
                         jobLocationLower.includes('work from home');
      }
      
      return queryMatches && locationMatches;
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[DatabaseSearch] Found ${matchingJobs.length} matching jobs after filtering`);
    }

    // Sort by relevance (title matches first, then company matches)
    const sortedJobs = matchingJobs.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(queryLower);
      const bTitle = b.title.toLowerCase().includes(queryLower);
      
      if (aTitle && !bTitle) return -1;
      if (!aTitle && bTitle) return 1;
      
      // If both or neither match title, sort by company match
      const aCompany = a.company.toLowerCase().includes(queryLower);
      const bCompany = b.company.toLowerCase().includes(queryLower);
      
      if (aCompany && !bCompany) return -1;
      if (!aCompany && bCompany) return 1;
      
      return 0; // Equal relevance
    });

    // Return limited results
    const finalJobs = sortedJobs.slice(0, limit);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DatabaseSearch] Returning ${finalJobs.length} jobs (limited to ${limit})`);
    }
    
    return finalJobs;

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[DatabaseSearch] Error searching database:`, error);
    }
    return [];
  }
}

/**
 * Filter out jobs that the user has already saved
 * @param jobs - Array of jobs to filter
 * @param userId - User ID to check saved jobs for
 * @returns Array of jobs that are not saved by the user
 */
export async function filterOutSavedJobs(
  jobs: JobSearchResult[], 
  userId: string
): Promise<JobSearchResult[]> {
  if (!jobs || jobs.length === 0 || !userId) {
    return jobs;
  }

  initFirebaseAdmin();
  const db = getFirestore();

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SavedJobsFilter] Filtering ${jobs.length} jobs for user ${userId}`);
    }
    
    // Get all saved jobs for this user (we need full data for content matching)
    const savedJobsSnapshot = await db.collection('savedJobs')
      .where('userId', '==', userId)
      .get();
    
    const savedJobIds = new Set<string>();
    const savedJobsContent: Array<{
      id: string;
      title: string;
      company: string;
      location: string;
      status: string;
    }> = [];
    
    savedJobsSnapshot.forEach(doc => {
      const data = doc.data();
      const jobId = data.jobId;
      if (jobId) {
        savedJobIds.add(jobId);
        
        // Also store content for content-based matching
        savedJobsContent.push({
          id: jobId,
          title: (data.title || "").toLowerCase().trim(),
          company: (data.company || "").toLowerCase().trim(),
          location: (data.location || "").toLowerCase().trim(),
          status: data.status || 'no status'
        });
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[SavedJobsFilter] Found saved job: ${jobId} (status: ${data.status || 'no status'}) - ${data.title} at ${data.company}`);
        }
      }
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[SavedJobsFilter] User has ${savedJobIds.size} saved jobs`);
      console.log(`[SavedJobsFilter] Saved job IDs:`, Array.from(savedJobIds));
    }

    // Filter out jobs that are already saved (by ID or content match)
    const unsavedJobs = jobs.filter(job => {
      // First check for exact job ID match
      const isIdSaved = savedJobIds.has(job.id);
      
      // Then check for content-based match (title + company + location)
      const jobTitle = (job.title || "").toLowerCase().trim();
      const jobCompany = (job.company || "").toLowerCase().trim();
      const jobLocation = (job.location || "").toLowerCase().trim();
      
      const isContentSaved = savedJobsContent.some(savedJob => 
        savedJob.title === jobTitle &&
        savedJob.company === jobCompany &&
        savedJob.location === jobLocation
      );
      
      const isSaved = isIdSaved || isContentSaved;
      
      if (process.env.NODE_ENV === 'development') {
        if (isSaved) {
          const matchType = isIdSaved ? 'ID match' : 'Content match';
          const matchedJob = isIdSaved 
            ? `ID: ${job.id}` 
            : savedJobsContent.find(savedJob => 
                savedJob.title === jobTitle &&
                savedJob.company === jobCompany &&
                savedJob.location === jobLocation
              );
          console.log(`[SavedJobsFilter] FILTERING OUT (${matchType}): ${job.id} - ${job.title} at ${job.company}`);
          if (isContentSaved && !isIdSaved) {
            const matchedSavedJob = savedJobsContent.find(savedJob => 
              savedJob.title === jobTitle &&
              savedJob.company === jobCompany &&
              savedJob.location === jobLocation
            );
            console.log(`[SavedJobsFilter]   → Matched with saved job: ${matchedSavedJob?.id} (${matchedSavedJob?.status})`);
          }
        } else {
          console.log(`[SavedJobsFilter] KEEPING: ${job.id} - ${job.title} at ${job.company}`);
        }
      }
      return !isSaved;
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SavedJobsFilter] After filtering: ${unsavedJobs.length} unsaved jobs (removed ${jobs.length - unsavedJobs.length} saved jobs)`);
    }
    
    return unsavedJobs;

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[SavedJobsFilter] Error filtering saved jobs:`, error);
    }
    return jobs; // Return original jobs if filtering fails
  }
} 