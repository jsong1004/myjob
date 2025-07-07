const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  try {
    const serviceAccountPath = path.resolve('./service-account-key.json');
    if (fs.existsSync(serviceAccountPath)) {
      console.log('Using local service account file...');
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      return initializeApp({
        credential: cert(serviceAccount),
        projectId: 'myresume-457817',
      });
    }
    
    throw new Error('Service account key not found');
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error);
    throw error;
  }
}

async function testActivityApi() {
  try {
    console.log('Initializing Firebase Admin...');
    initFirebaseAdmin();
    
    const auth = getAuth();
    
    // Create a custom token for testing
    const customToken = await auth.createCustomToken('mock-user-123');
    console.log('Created custom token for mock-user-123');
    
    console.log('Custom token:', customToken);
    console.log('\nTo test the API:');
    console.log('1. Start the dev server: pnpm dev');
    console.log('2. Use this token in your requests to /api/activity');
    console.log('3. Or manually test by temporarily modifying the userId in the API route');
    
  } catch (error) {
    console.error('❌ Error testing activity API:', error);
    process.exit(1);
  }
}

testActivityApi();