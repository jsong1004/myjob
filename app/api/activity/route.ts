import { NextResponse } from 'next/server';
import { initFirebaseAdmin } from '@/lib/firebase-admin-init';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export async function GET(request: Request) {
  try {
    initFirebaseAdmin();
    const auth = getAuth();
    const firestore = getFirestore();

    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { searchParams } = new URL(request.url);
    const activityType = searchParams.get('activityType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query: FirebaseFirestore.Query = firestore
      .collection('user-activities')
      .where('userId', '==', userId);

    if (activityType) {
      query = query.where('activityType', '==', activityType);
    }
    if (startDate) {
      query = query.where('timestamp', '>=', new Date(startDate));
    }
    if (endDate) {
      query = query.where('timestamp', '<=', new Date(endDate));
    }

    const activitiesSnapshot = await query.orderBy('timestamp', 'desc').get();

    const activities = activitiesSnapshot.docs.map(doc => {
      const data = doc.data();
      // Convert Firestore Timestamp to ISO string for proper serialization
      if (data.timestamp && typeof data.timestamp === 'object' && data.timestamp.toDate) {
        data.timestamp = data.timestamp.toDate().toISOString();
      }
      return { id: doc.id, ...data };
    });

    return NextResponse.json({ activities }, { status: 200 });
  } catch (error) {
    console.error('Error fetching activities:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    initFirebaseAdmin();
    const auth = getAuth();
    const firestore = getFirestore();

    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const activityData = await request.json();

    // Basic validation
    if (!activityData.activityType || !activityData.timeTaken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const activity = {
      userId,
      ...activityData,
      timestamp: new Date(), // Use server-side timestamp for accuracy
    };

    await firestore.collection('user-activities').add(activity);

    return NextResponse.json({ message: 'Activity logged successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error logging activity:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
