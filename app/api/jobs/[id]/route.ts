import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initFirebaseAdmin } from '@/lib/firebase-admin-init';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    initFirebaseAdmin();
    const db = getFirestore();
    const { id } = params;

    console.log(`*************************************************`)
    console.log(`[JobById][GET] Original id: ${id}`);
    const decodedJobId = decodeURIComponent(id);
    console.log(`[JobById][GET] Decoded jobId: ${decodedJobId}`);

    // First, try to get the complete job data from the jobs collection
    const jobDoc = await db.collection('jobs').doc(decodedJobId).get();
    if (jobDoc.exists) {
      const jobData = jobDoc.data();
      console.log(`[JobById][GET] Found job in jobs collection`);
      return NextResponse.json({ job: jobData });
    }

    // Fallback: check savedJobs collection for backward compatibility
    console.log(`[JobById][GET] Job not found in jobs collection, checking savedJobs...`);
    const savedJobSnapshot = await db.collection('savedJobs').where('jobId', '==', decodedJobId).limit(1).get();
    if (savedJobSnapshot.empty) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    const savedJobDoc = savedJobSnapshot.docs[0];
    const savedJobData = savedJobDoc.data();
    
    // Combine the top-level saved job data with the nested original data
    // to ensure all fields, especially the description, are present.
    const jobData = {
      ...(savedJobData.originalData || {}), // a backup
      ...savedJobData,
    };

    console.log(`[JobById][GET] Found job in savedJobs collection (fallback)`);
    return NextResponse.json({ job: jobData });
  } catch (error) {
    console.error('[JobById][GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 });
  }
} 