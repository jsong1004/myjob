const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  try {
    // Use local service account file
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

// Mock user activities data
const mockActivities = [
  {
    userId: 'mock-user-123',
    activityType: 'job_search',
    tokenUsage: 1250,
    timeTaken: 3.2,
    timestamp: Timestamp.fromDate(new Date(Date.now() - 2 * 60 * 60 * 1000)), // 2 hours ago
    metadata: {
      query: 'software engineer',
      jobsFound: 15,
      model: 'openai/gpt-4o-mini'
    }
  },
  {
    userId: 'mock-user-123',
    activityType: 'resume_edit',
    tokenUsage: 2100,
    timeTaken: 5.8,
    timestamp: Timestamp.fromDate(new Date(Date.now() - 4 * 60 * 60 * 1000)), // 4 hours ago
    metadata: {
      mode: 'agent',
      model: 'openai/gpt-4.1-mini',
      resumeId: 'resume-456'
    }
  },
  {
    userId: 'mock-user-123',
    activityType: 'resume_generation',
    tokenUsage: 3200,
    timeTaken: 8.1,
    timestamp: Timestamp.fromDate(new Date(Date.now() - 6 * 60 * 60 * 1000)), // 6 hours ago
    metadata: {
      mode: 'tailor',
      model: 'openai/gpt-4.1-mini',
      jobTitle: 'Senior Frontend Developer',
      company: 'Tech Corp'
    }
  },
  {
    userId: 'mock-user-123',
    activityType: 'job_matching',
    tokenUsage: 850,
    timeTaken: 2.1,
    timestamp: Timestamp.fromDate(new Date(Date.now() - 8 * 60 * 60 * 1000)), // 8 hours ago
    metadata: {
      model: 'openai/gpt-4.1-mini',
      jobsMatched: 8,
      averageScore: 85.5
    }
  },
  {
    userId: 'mock-user-123',
    activityType: 'job_summary',
    tokenUsage: 450,
    timeTaken: 1.3,
    timestamp: Timestamp.fromDate(new Date(Date.now() - 10 * 60 * 60 * 1000)), // 10 hours ago
    metadata: {
      model: 'openai/gpt-4.1-mini',
      jobId: 'job-789',
      company: 'StartupXYZ'
    }
  },
  {
    userId: 'mock-user-123',
    activityType: 'resume_edit',
    tokenUsage: 1800,
    timeTaken: 4.2,
    timestamp: Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)), // 1 day ago
    metadata: {
      mode: 'ask',
      model: 'openai/gpt-4.1-mini',
      resumeId: 'resume-456'
    }
  },
  {
    userId: 'mock-user-123',
    activityType: 'job_search',
    tokenUsage: 1100,
    timeTaken: 2.8,
    timestamp: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)), // 2 days ago
    metadata: {
      query: 'react developer remote',
      jobsFound: 12,
      model: 'openai/gpt-4o-mini'
    }
  }
];

async function addMockActivities() {
  try {
    console.log('Initializing Firebase Admin...');
    initFirebaseAdmin();
    
    const firestore = getFirestore();
    console.log('Connected to Firestore');
    
    console.log('Adding mock activities...');
    
    for (const activity of mockActivities) {
      const docRef = await firestore.collection('user-activities').add(activity);
      console.log(`Added activity: ${activity.activityType} (ID: ${docRef.id})`);
    }
    
    console.log('\n✅ All mock activities added successfully!');
    console.log(`📊 Total activities: ${mockActivities.length}`);
    console.log('🔍 You can now check the user-activities collection in Firestore');
    
  } catch (error) {
    console.error('❌ Error adding mock activities:', error);
    process.exit(1);
  }
}

// Run the script
addMockActivities();