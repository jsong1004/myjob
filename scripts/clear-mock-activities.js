const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
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

async function clearMockActivities() {
  try {
    console.log('Initializing Firebase Admin...');
    initFirebaseAdmin();
    
    const firestore = getFirestore();
    console.log('Connected to Firestore');
    
    console.log('Clearing mock activities...');
    
    // Get all activities for the mock user
    const activitiesRef = firestore.collection('user-activities');
    const snapshot = await activitiesRef.where('userId', '==', 'mock-user-123').get();
    
    const batch = firestore.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log(`✅ Cleared ${snapshot.docs.length} mock activities`);
    
  } catch (error) {
    console.error('❌ Error clearing mock activities:', error);
    process.exit(1);
  }
}

clearMockActivities();