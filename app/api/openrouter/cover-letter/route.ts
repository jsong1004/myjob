import { NextRequest, NextResponse } from "next/server"
import { logActivity } from "@/lib/activity-logger";
import { initFirebaseAdmin } from "@/lib/firebase-admin-init";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { executeCoverLetterGeneration } from "@/lib/prompts/api-helpers";

// Helper function to extract applicant info from resume or profile
async function getApplicantInfo(resume: string, token?: string) {
  const applicantInfo = {
    name: '[Your Name]',
    email: '[Your Email]',
    phone: '[Your Phone]',
    address: '[Your Address]'
  };

  // Try to extract from resume first
  if (resume) {
    // Extract name (usually in first few lines)
    const nameMatch = resume.match(/^([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/m);
    if (nameMatch) {
      applicantInfo.name = nameMatch[1];
    }

    // Extract email
    const emailMatch = resume.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      applicantInfo.email = emailMatch[1];
    }

    // Extract phone
    const phoneMatch = resume.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
    if (phoneMatch) {
      applicantInfo.phone = phoneMatch[1];
    }

    // Extract address (look for patterns like "City, State" or full addresses)
    const addressMatch = resume.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}(?:\s+\d{5})?)/);
    if (addressMatch) {
      applicantInfo.address = addressMatch[1];
    }
  }

  // If essential info is missing and we have a token, try to get from profile
  if (token && (applicantInfo.name === '[Your Name]' || applicantInfo.email === '[Your Email]')) {
    try {
      initFirebaseAdmin();
      const decodedToken = await getAuth().verifyIdToken(token);
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      
      if (userDoc.exists) {
        const profile = userDoc.data();
        if (applicantInfo.name === '[Your Name]' && profile?.displayName) {
          applicantInfo.name = profile.displayName;
        }
        if (applicantInfo.email === '[Your Email]' && profile?.email) {
          applicantInfo.email = profile.email;
        }
        if (applicantInfo.phone === '[Your Phone]' && profile?.phoneNumber) {
          applicantInfo.phone = profile.phoneNumber;
        }
        if (applicantInfo.address === '[Your Address]' && profile?.location) {
          applicantInfo.address = profile.location;
        }
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
  }

  return applicantInfo;
}

export async function POST(req: NextRequest) {
  const { message, resume, jobTitle, company, jobDescription, mode = 'agent', coverLetter: existingCoverLetter } = await req.json()
  
  try {
    const startTime = Date.now();
    
    // Use the centralized prompt system
    const result = await executeCoverLetterGeneration({
      resume,
      jobTitle,
      company,
      jobDescription,
      userRequest: message,
      mode: mode as 'agent' | 'ask',
      existingCoverLetter
    });

    const timeTaken = (Date.now() - startTime) / 1000;

    // Log activity
    const token = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (token) {
      initFirebaseAdmin();
      const decodedToken = await getAuth().verifyIdToken(token);
      const userId = decodedToken.uid;
      await logActivity({
        userId,
        activityType: 'cover_letter_generation',
        tokenUsage: 0, // TODO: Get actual token usage from prompt manager
        timeTaken,
        metadata: { 
          model: 'openai/gpt-4o-mini', 
          mode, 
          user_prompt: message,
          prompt_system: 'centralized',
          isEditing: !!existingCoverLetter
        },
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Cover letter generation error:", err);
    return NextResponse.json(
      { 
        error: "Failed to process cover letter request", 
        details: err instanceof Error ? err.message : String(err) 
      },
      { status: 500 }
    );
  }
}

// Legacy code removed - now using centralized prompt system
