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

  
    const snapshot = await db.collection('savedJobs').where('jobId', '==', decodedJobId).limit(1).get();
    if (snapshot.empty) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    const doc = snapshot.docs[0];
    return NextResponse.json({ job: doc.data() });
  } catch (error) {
    console.error('[JobById][GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 });
  }
} 