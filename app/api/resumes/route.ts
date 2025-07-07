import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { parseFile, validateFile } from '@/lib/file-parser-simple';
import { Resume } from '@/lib/types';
import { initFirebaseAdmin } from '@/lib/firebase-admin-init';

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

// GET /api/resumes - Get all resumes for authenticated user
export async function GET(request: NextRequest) {
  try {
    initFirebaseAdmin();
    console.log('GET /api/resumes - Starting request');
    console.log('Authorization header:', request.headers.get('Authorization')?.substring(0, 20) + '...');
    
    const authResult = await getAuthenticatedUser(request);
    console.log('Auth result:', authResult ? 'Success' : 'Failed');
    if (!authResult) {
      console.log('Authentication failed - no authResult');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User authenticated:', authResult.uid);
    
    const db = getFirestore();
    const resumesRef = db.collection('resumes');
    console.log('Querying resumes for user:', authResult.uid);
    
    const snapshot = await resumesRef
      .where('userId', '==', authResult.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const resumes: Resume[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      resumes.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Resume);
    });

    return NextResponse.json({ resumes });
  } catch (error) {
    console.error('Get resumes error:', error);
    return NextResponse.json({ error: 'Failed to fetch resumes' }, { status: 500 });
  }
}

// POST /api/resumes - Create new resume (handles both file uploads and direct content)
export async function POST(request: NextRequest) {
  try {
    initFirebaseAdmin();
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    let name: string;
    let content: string;
    let makeDefault: boolean;
    let type: 'original' | 'tailored' | 'draft' = 'original';
    let jobTitle: string | undefined;
    let jobId: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
    const formData = await request.formData();
    const file = formData.get('file') as File;
      name = formData.get('name') as string;
      makeDefault = formData.get('makeDefault') === 'true';

    if (!file || !name) {
      return NextResponse.json({ error: 'File and name are required' }, { status: 400 });
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Parse file content
    const buffer = Buffer.from(await file.arrayBuffer());
    const parseResult = await parseFile(buffer, file.name);
    
    if (parseResult.error) {
      return NextResponse.json({ error: parseResult.error }, { status: 400 });
    }

    if (!parseResult.content.trim()) {
      return NextResponse.json({ error: 'File appears to be empty or could not extract text' }, { status: 400 });
      }

      content = parseResult.content;
    } else if (contentType.includes('application/json')) {
      // Handle direct content save
      const body = await request.json();
      name = body.name;
      content = body.content;
      makeDefault = body.isDefault || false;
      type = body.type || 'tailored';
      jobTitle = body.jobTitle;
      jobId = body.jobId;

      if (!name || !content) {
        return NextResponse.json({ error: 'Name and content are required' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Content-Type must be multipart/form-data or application/json' }, { status: 400 });
    }

    const db = getFirestore();

    // If making this the default, unset other defaults first
    if (makeDefault) {
      const existingDefaults = await db.collection('resumes')
        .where('userId', '==', authResult.uid)
        .where('isDefault', '==', true)
        .get();

      const batch = db.batch();
      existingDefaults.forEach((doc) => {
        batch.update(doc.ref, { isDefault: false });
      });
      await batch.commit();

      // Update user's defaultResumeId
      const userRef = db.collection('users').doc(authResult.uid);
      await userRef.update({ defaultResumeId: null });
    }

    // Create new resume
    const resumeData: Omit<Resume, 'id'> = {
      userId: authResult.uid,
      name,
      content,
      isDefault: makeDefault,
      type,
      jobTitle,
      jobId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await db.collection('resumes').add(resumeData);

    // If this is the default resume, update user document
    if (makeDefault) {
      const userRef = db.collection('users').doc(authResult.uid);
      await userRef.update({ defaultResumeId: docRef.id });
    }

    const newResume: Resume = {
      id: docRef.id,
      ...resumeData,
    };

    return NextResponse.json({ 
      message: contentType.includes('multipart/form-data') ? 'Resume uploaded successfully' : 'Resume saved successfully',
      resume: newResume 
    });
  } catch (error) {
    console.error('Resume save/upload error:', error);
    return NextResponse.json({ error: 'Failed to save resume' }, { status: 500 });
  }
}