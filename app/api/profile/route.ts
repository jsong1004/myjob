import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initFirebaseAdmin } from '@/lib/firebase-admin-init';

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

// GET /api/profile - Get user profile
export async function GET(request: NextRequest) {
  try {
    initFirebaseAdmin();
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getFirestore();
    const doc = await db.collection('users').doc(authResult.uid).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profile = doc.data();
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// POST /api/profile - Create or update user profile
export async function POST(request: NextRequest) {
  try {
    initFirebaseAdmin();
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profileData = await request.json();
    
    // Validate required fields
    if (!profileData.displayName || !profileData.email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const db = getFirestore();
    const userRef = db.collection('users').doc(authResult.uid);
    
    const profileToSave = {
      ...profileData,
      userId: authResult.uid,
      updatedAt: new Date(),
    };

    // Check if document exists
    const doc = await userRef.get();
    if (!doc.exists) {
      profileToSave.createdAt = new Date();
    }

    await userRef.set(profileToSave, { merge: true });

    return NextResponse.json({ 
      message: 'Profile saved successfully',
      profile: profileToSave 
    });
  } catch (error) {
    console.error('Save profile error:', error);
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
} 