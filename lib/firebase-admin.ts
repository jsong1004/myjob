import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

let firebaseAdminConfig: any

if (process.env.NODE_ENV === 'development') {
  // Local development: use service-account-key.json
  try {
    const serviceAccount = require('../service-account-key.json')
    firebaseAdminConfig = {
      credential: cert(serviceAccount),
    }
  } catch (error) {
    console.error('service-account-key.json not found. Please add your Firebase service account key.')
    // Fallback to environment variables for local development
    firebaseAdminConfig = {
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    }
  }
} else {
  // Production: use Google Cloud Secret Manager or environment variables
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // If running on Google Cloud with default credentials
    firebaseAdminConfig = {
      // No credential needed when using Google Cloud default credentials
    }
  } else {
    // Fallback to environment variables
    firebaseAdminConfig = {
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    }
  }
}

function createFirebaseAdminApp() {
  try {
    return getApps().find(app => app.name === 'admin') || 
           initializeApp(firebaseAdminConfig, 'admin')
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error)
    throw error
  }
}

const firebaseAdminApp = createFirebaseAdminApp()

// Initialize Firebase Admin Auth
export const adminAuth = getAuth(firebaseAdminApp)

// Initialize Firebase Admin Firestore
export const adminDb = getFirestore(firebaseAdminApp)

export default firebaseAdminApp 