import { getApps, initializeApp, cert } from 'firebase-admin/app';

let adminInitialized = false;

export function initFirebaseAdmin() {
  // Check if Firebase is already initialized - this is the key fix
  if (getApps().length > 0) {
    console.log('Firebase Admin already initialized');
    adminInitialized = true;
    return true;
  }

  try {
    console.log('Initializing Firebase Admin...');
    
    // Check if we have required environment variables
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      console.error('Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID');
      return false;
    }
    
    // Try to read service account from environment variable first
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.log('Using Firebase service account from environment variable');
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({
          credential: cert(serviceAccount),
          projectId: projectId,
        });
        console.log('Firebase Admin initialized with environment variable');
        adminInitialized = true;
        return true;
      } catch (parseError) {
        console.error('Failed to parse service account JSON:', parseError);
        return false;
      }
    } else {
      // Try to read from local file (development)
      console.log('Trying to read Firebase service account from local file');
      try {
        const serviceAccount = require('@/service-account-key.json');
        initializeApp({
          credential: cert(serviceAccount),
          projectId: projectId,
        });
        console.log('Firebase Admin initialized with local file');
        adminInitialized = true;
        return true;
      } catch (fileError) {
        console.error('Failed to read service account file:', fileError);
        console.warn('Firebase Admin initialization failed - no service account found');
        return false;
      }
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    return false;
  }
}