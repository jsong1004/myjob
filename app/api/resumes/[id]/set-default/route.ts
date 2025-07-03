import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initFirebaseAdmin } from '@/lib/firebase-admin-init';

// Get authenticated user from request
async function getAuthenticatedUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const idToken = authHeader.split('Bearer ')[1];
    initFirebaseAdmin();
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Auth verification failed:', error);
    return null;
  }
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/resumes/[id]/set-default - Set resume as default
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    initFirebaseAdmin();
    const db = getFirestore();
    
    // Check if resume exists and belongs to user
    const resumeDoc = await db.collection('resumes').doc(id).get();
    if (!resumeDoc.exists) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    const resumeData = resumeDoc.data();
    if (resumeData?.userId !== user.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Unset all other default resumes for this user
    const existingDefaults = await db.collection('resumes')
      .where('userId', '==', user.uid)
      .where('isDefault', '==', true)
      .get();

    const batch = db.batch();
    existingDefaults.forEach((doc) => {
      batch.update(doc.ref, { isDefault: false });
    });

    // Set this resume as default
    batch.update(resumeDoc.ref, { 
      isDefault: true,
      updatedAt: new Date()
    });

    await batch.commit();

    // Update user's defaultResumeId
    const userRef = db.collection('users').doc(user.uid);
    await userRef.update({ defaultResumeId: id });

    return NextResponse.json({ message: 'Resume set as default successfully' });
  } catch (error) {
    console.error('Set default resume error:', error);
    return NextResponse.json({ error: 'Failed to set default resume' }, { status: 500 });
  }
}