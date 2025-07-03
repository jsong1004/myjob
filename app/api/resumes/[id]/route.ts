import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initFirebaseAdmin } from '@/lib/firebase-admin-init';
import { Resume } from '@/lib/types';

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

// GET /api/resumes/[id] - Get specific resume
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    initFirebaseAdmin();
    const db = getFirestore();
    const resumeDoc = await db.collection('resumes').doc(id).get();

    if (!resumeDoc.exists) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    const resumeData = resumeDoc.data();
    if (resumeData?.userId !== user.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const resume: Resume = {
      id: resumeDoc.id,
      ...resumeData,
      createdAt: resumeData.createdAt?.toDate() || new Date(),
      updatedAt: resumeData.updatedAt?.toDate() || new Date(),
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
    const { id } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, content, isDefault } = await request.json();

    if (!name || !content) {
      return NextResponse.json({ error: 'Name and content are required' }, { status: 400 });
    }

    initFirebaseAdmin();
    const db = getFirestore();
    const resumeDoc = await db.collection('resumes').doc(id).get();

    if (!resumeDoc.exists) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    const resumeData = resumeDoc.data();
    if (resumeData?.userId !== user.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // If making this the default, unset other defaults first
    if (isDefault && !resumeData.isDefault) {
      const existingDefaults = await db.collection('resumes')
        .where('userId', '==', user.uid)
        .where('isDefault', '==', true)
        .get();

      const batch = db.batch();
      existingDefaults.forEach((doc) => {
        batch.update(doc.ref, { isDefault: false });
      });
      await batch.commit();

      // Update user's defaultResumeId
      const userRef = db.collection('users').doc(user.uid);
      await userRef.update({ defaultResumeId: id });
    }

    // Update resume
    await db.collection('resumes').doc(id).update({
      name,
      content,
      isDefault: isDefault || false,
      updatedAt: new Date(),
    });

    return NextResponse.json({ message: 'Resume updated successfully' });
  } catch (error) {
    console.error('Update resume error:', error);
    return NextResponse.json({ error: 'Failed to update resume' }, { status: 500 });
  }
}

// DELETE /api/resumes/[id] - Delete resume
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    initFirebaseAdmin();
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