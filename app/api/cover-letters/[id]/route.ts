import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initFirebaseAdmin } from '@/lib/firebase-admin-init';
import { logActivity } from '@/lib/activity-logger';

interface RouteParams {
  params: { id: string }
}

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

// DELETE /api/cover-letters/[id] - Delete cover letter
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    initFirebaseAdmin();
    const { id } = params;
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getFirestore();
    const coverLetterDoc = await db.collection('coverLetters').doc(id).get();

    if (!coverLetterDoc.exists) {
      return NextResponse.json({ error: 'Cover letter not found' }, { status: 404 });
    }

    const coverLetterData = coverLetterDoc.data();
    if (coverLetterData?.userId !== user.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete the cover letter
    await db.collection('coverLetters').doc(id).delete();

    // Log the delete activity
    await logActivity({
      userId: user.uid,
      activityType: 'cover_letter_delete',
      tokenUsage: 0, // No LLM tokens used for deletion
      timeTaken: 0,   // Minimal time for database operation
      metadata: {
        cover_letter_id: id,
        cover_letter_name: coverLetterData?.name || 'Unknown',
        job_title: coverLetterData?.jobTitle || 'Unknown',
        company: coverLetterData?.company || 'Unknown',
      },
    });

    return NextResponse.json({ message: 'Cover letter deleted successfully' });
  } catch (error) {
    console.error('Delete cover letter error:', error);
    return NextResponse.json({ error: 'Failed to delete cover letter' }, { status: 500 });
  }
} 