// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Debug logging for production
if (typeof window !== 'undefined') {
  console.log('CLIENT Firebase Config Debug:', {
    apiKey: firebaseConfig.apiKey ? 'SET' : 'MISSING',
    authDomain: firebaseConfig.authDomain ? 'SET' : 'MISSING',
    projectId: firebaseConfig.projectId ? 'SET' : 'MISSING',
    storageBucket: firebaseConfig.storageBucket ? 'SET' : 'MISSING',
    messagingSenderId: firebaseConfig.messagingSenderId ? 'SET' : 'MISSING',
    appId: firebaseConfig.appId ? 'SET' : 'MISSING',
    nodeEnv: process.env.NODE_ENV
  })
} else {
  console.log('SERVER Firebase Config Debug:', {
    apiKey: firebaseConfig.apiKey ? 'SET' : 'MISSING',
    authDomain: firebaseConfig.authDomain ? 'SET' : 'MISSING',
    projectId: firebaseConfig.projectId ? 'SET' : 'MISSING',
    storageBucket: firebaseConfig.storageBucket ? 'SET' : 'MISSING',
    messagingSenderId: firebaseConfig.messagingSenderId ? 'SET' : 'MISSING',
    appId: firebaseConfig.appId ? 'SET' : 'MISSING',
    nodeEnv: process.env.NODE_ENV
  })
}

// Check if we have all required config
const hasRequiredConfig = firebaseConfig.apiKey && 
                         firebaseConfig.authDomain && 
                         firebaseConfig.projectId &&
                         firebaseConfig.storageBucket &&
                         firebaseConfig.messagingSenderId &&
                         firebaseConfig.appId

// Initialize Firebase
function createFirebaseApp() {
  try {
    // Don't initialize Firebase if we don't have the required config or we're on the server during build
    if (!hasRequiredConfig) {
      console.warn('Firebase configuration is incomplete. Some features may not work.')
      console.warn('hasRequiredConfig:', hasRequiredConfig)
      return null
    }
    
    console.log('Initializing Firebase app...')
    const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)
    console.log('Firebase app initialized successfully')
    return app
  } catch (error) {
    console.error('Error initializing Firebase:', error)
    return null
  }
}

const firebaseApp = createFirebaseApp()

// Initialize Firebase Auth (only if app exists)
export const auth = firebaseApp ? getAuth(firebaseApp) : null

// Initialize Cloud Firestore (only if app exists)
export const db = firebaseApp ? getFirestore(firebaseApp) : null

// Connect to emulators in development (only if we have auth and db)
if (process.env.NODE_ENV === 'development' && auth && db && typeof window !== 'undefined') {
  // Only connect if not already connected and we're in the browser
  try {
    if (!auth.app.options.projectId?.includes('demo-')) {
      // connectAuthEmulator(auth, 'http://localhost:9099')
      // connectFirestoreEmulator(db, 'localhost', 8080)
    }
  } catch (error) {
    // Emulators may already be connected
    console.log('Emulators already connected or not available')
  }
}

export default firebaseApp 