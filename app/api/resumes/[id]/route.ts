import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initFirebaseAdmin } from '@/lib/firebase-admin-init';
import { Resume } from '@/lib/types';

// Get authenticated user from request
async function getAuthenticatedUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) return null;

    initFirebaseAdmin();
    const auth = getAuth();
    return await auth.verifyIdToken(idToken);
  } catch (error) {
    console.error('Auth verification failed:', error);
    return null;
  }
}

interface RouteParams {
  params: { id: string };
}

// GET /api/resumes/[id] - Get specific resume
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    initFirebaseAdmin();
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getFirestore();
    const doc = await db.collection('resumes').doc(params.id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    const data = doc.data();
    if (data?.userId !== authResult.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resume = {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
    } as Resume;

    return NextResponse.json({ resume });
  } catch (error) {
    console.error('Get resume error:', error);
    return NextResponse.json({ error: 'Failed to fetch resume' }, { status: 500 });
  }
}

// PUT /api/resumes/[id] - Update resume
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    initFirebaseAdmin();
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, content, isDefault } = await request.json();

    const db = getFirestore();
    const docRef = db.collection('resumes').doc(params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    const data = doc.data();
    if (data?.userId !== authResult.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await docRef.update({
      name,
      content,
      isDefault,
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({ message: 'Resume updated successfully' });
  } catch (error) {
    console.error('Update resume error:', error);
    return NextResponse.json({ error: 'Failed to update resume' }, { status: 500 });
  }
}

// DELETE /api/resumes/[id] - Delete resume
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    initFirebaseAdmin();
    const { id } = params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getFirestore();
    const resumeDoc = await db.collection('resumes').doc(id).get();

    if (!resumeDoc.exists) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    const resumeData = resumeDoc.data();
    if (resumeData?.userId !== user.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Don't allow deletion of default resume
    if (resumeData.isDefault) {
      return NextResponse.json({ error: 'Cannot delete default resume' }, { status: 400 });
    }

    await db.collection('resumes').doc(id).delete();

    return NextResponse.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Delete resume error:', error);
    return NextResponse.json({ error: 'Failed to delete resume' }, { status: 500 });
  }
}