import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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
    let serviceAccount;
    // Prefer environment variable for production/deployment
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.log('Parsing service account from environment variable...');
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } 
    // Fallback to local file for local development
    else {
      const serviceAccountPath = path.resolve('./service-account-key.json');
      if (fs.existsSync(serviceAccountPath)) {
        console.log('Using local service account file for development...');
        serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      }
    }

    if (!serviceAccount) {
      console.error('Firebase Admin not initialized. No service account key found.');
      return false;
    }

    console.log('Initializing Firebase app...');
    initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    console.log('Firebase Admin initialized.');

    // Configure Firestore to ignore undefined properties
    const db = getFirestore();
    db.settings({
      ignoreUndefinedProperties: true,
    });
    console.log('Firestore `ignoreUndefinedProperties` set to true.');

    return true;

  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
    return false;
  }
}