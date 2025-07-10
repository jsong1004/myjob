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
      userId,
      seenAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  await batch.commit();
} 