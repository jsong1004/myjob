import { initializeApp, cert, getApps, App } from 'firebase-admin/app'
import { getAuth, Auth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import * as fs from 'fs'
import * as path from 'path'

let firebaseApp: App | null = null
let auth: Auth | null = null

export function initFirebaseAdmin(): boolean {
  // If already initialized, return existing instance
  if (getApps().length > 0) {
    firebaseApp = getApps()[0]
    auth = getAuth(firebaseApp)
    return true
  }

  console.log('Initializing Firebase Admin for MCP server...')
  console.log('Environment check:')
  console.log('- NODE_ENV:', process.env.NODE_ENV)
  console.log('- FIREBASE_SERVICE_ACCOUNT_KEY exists:', !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  console.log('- NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
  
  try {
    let serviceAccount
    
    // Prefer environment variable for production/deployment
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.log('Parsing service account from environment variable...')
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    } 
    // Fallback to local file for local development
    else {
      const serviceAccountPath = path.resolve('../service-account-key.json')
      if (fs.existsSync(serviceAccountPath)) {
        console.log('Using local service account file for development...')
        serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
      }
    }

    if (!serviceAccount) {
      console.error('Firebase Admin not initialized. No service account key found.')
      return false
    }

    console.log('Initializing Firebase app...')
    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    })
    
    auth = getAuth(firebaseApp)
    console.log('Firebase Admin initialized successfully.')

    // Configure Firestore to ignore undefined properties
    const db = getFirestore(firebaseApp)
    db.settings({
      ignoreUndefinedProperties: true,
    })
    console.log('Firestore `ignoreUndefinedProperties` set to true.')

    return true

  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error)
    return false
  }
}

export async function validateAuthToken(token: string): Promise<string> {
  if (!auth) {
    const initialized = initFirebaseAdmin()
    if (!initialized) {
      throw new Error('Firebase Admin not initialized')
    }
  }

  try {
    const decodedToken = await auth!.verifyIdToken(token)
    return decodedToken.uid
  } catch (error) {
    console.error('Token validation error:', error)
    throw new Error('Invalid authentication token')
  }
}

export function getAuthInstance(): Auth {
  if (!auth) {
    const initialized = initFirebaseAdmin()
    if (!initialized) {
      throw new Error('Firebase Admin not initialized')
    }
  }
  return auth!
}