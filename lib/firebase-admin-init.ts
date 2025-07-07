import { initializeApp, cert, getApps } from 'firebase-admin/app';
import * as fs from 'fs';
import * as path from 'path';

export function initFirebaseAdmin() {
  // If already initialized, no need to do anything
  if (getApps().length > 0) {
    return true;
  }

  // Check for the build-time environment variable from Docker
  if (process.env.IS_BUILDING === 'true') {
    console.log("Skipping Firebase Admin initialization during Docker build.");
      return false;
    }
    
  console.log('Attempting to initialize Firebase Admin...');
  console.log('Environment check:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- FIREBASE_SERVICE_ACCOUNT_KEY exists:', !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  console.log('- NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  
  try {
    // Prefer environment variable for production/deployment (injected by Cloud Run from Secret Manager)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.log('Parsing service account from environment variable (Secret Manager)...');
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      console.log('Service account parsed successfully, initializing app...');
        initializeApp({
          credential: cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      console.log('Firebase Admin initialized with Secret Manager (via environment variable).');
        return true;
    }

    // Fallback to local file for local development
    const serviceAccountPath = path.resolve('./service-account-key.json');
        if (fs.existsSync(serviceAccountPath)) {
      console.log('Using local service account file for development...');
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
          initializeApp({
            credential: cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          });
      console.log('Firebase Admin initialized with local file.');
          return true;
    }

    console.error('Firebase Admin not initialized. No service account key found.');
    console.error('Expected: FIREBASE_SERVICE_ACCOUNT_KEY environment variable (from Secret Manager)');
    console.error('Or: service-account-key.json file (for local development)');
        return false;

  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('This might be due to:');
    console.error('1. Invalid JSON in Secret Manager');
    console.error('2. Missing Secret Manager permissions');
    console.error('3. Incorrect environment variable name');
    console.error('4. Missing required Firebase project configuration');
    return false;
  }
}