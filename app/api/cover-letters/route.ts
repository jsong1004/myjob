import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { CoverLetter } from '@/lib/types';
import { initFirebaseAdmin } from '@/lib/firebase-admin-init';
import { logActivity } from '@/lib/activity-logger';

// Get authenticated user from request
async function getAuthenticatedUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('No Authorization header found');
      return null;
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      console.log('No token found in Authorization header');
      return null;
    }

    const adminInitialized = initFirebaseAdmin();
    if (!adminInitialized) {
      console.error('Firebase Admin initialization failed');
      return null;
    }

    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    console.log('Token verified for user:', decodedToken.uid);
    return decodedToken;
  } catch (error) {
    console.error('Auth verification failed:', error);
    return null;
  }
}

// GET /api/cover-letters - Get all cover letters for authenticated user
export async function GET(request: NextRequest) {
  try {
    initFirebaseAdmin();
    console.log('GET /api/cover-letters - Starting request');
    
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      console.log('Authentication failed - no authResult');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User authenticated:', authResult.uid);
    
    const db = getFirestore();
    const coverLettersRef = db.collection('coverLetters');
    console.log('Querying cover letters for user:', authResult.uid);
    
    const snapshot = await coverLettersRef
      .where('userId', '==', authResult.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const coverLetters: CoverLetter[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      coverLetters.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as CoverLetter);
    });

    return NextResponse.json({ coverLetters });
  } catch (error) {
    console.error('Get cover letters error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'Failed to fetch cover letters', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

// POST /api/cover-letters - Create new cover letter
export async function POST(request: NextRequest) {
  try {
    initFirebaseAdmin();
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, content, jobTitle, company, jobId } = body;

    if (!name || !content || !jobTitle || !company || !jobId) {
      return NextResponse.json({ error: 'Name, content, jobTitle, company, and jobId are required' }, { status: 400 });
    }

    const db = getFirestore();

    // Create new cover letter
    const coverLetterData: Omit<CoverLetter, 'id'> = {
      userId: authResult.uid,
      name,
      content,
      jobTitle,
      company,
      jobId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await db.collection('coverLetters').add(coverLetterData);

    const newCoverLetter: CoverLetter = {
      id: docRef.id,
      ...coverLetterData,
    };

    // Log the save activity
    await logActivity({
      userId: authResult.uid,
      activityType: 'cover_letter_save',
      tokenUsage: 0, // No LLM tokens used for saving
      timeTaken: 0,   // Minimal time for database operation
      metadata: {
        cover_letter_id: docRef.id,
        cover_letter_name: name,
        job_title: jobTitle,
        company: company,
        job_id: jobId,
        content_length: content.length
      },
    });

    return NextResponse.json({ 
      message: 'Cover letter saved successfully',
      coverLetter: newCoverLetter 
    });
  } catch (error) {
    console.error('Cover letter save error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'Failed to save cover letter', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 