import { getFirestore } from 'firebase-admin/firestore';
import { initFirebaseAdmin } from './firebase-admin-init';

interface LogActivityProps {
  userId: string;
  activityType: string;
  tokenUsage: number;
  timeTaken: number;
  metadata?: Record<string, any>;
}

export async function logActivity(props: LogActivityProps) {
  try {
    // Initialize Firebase Admin if not already initialized
    const initialized = initFirebaseAdmin();
    if (!initialized) {
      console.error('Firebase Admin not initialized, skipping activity logging');
      return;
    }

    const firestore = getFirestore();
    await firestore.collection('user-activities').add({
      ...props,
      timestamp: new Date(),
    });
    console.log('Activity logged successfully:', props.activityType, 'for user:', props.userId);
  } catch (error) {
    console.error('Failed to log user activity:', error);
    // We don't re-throw the error because logging should not block the main operation.
  }
}
