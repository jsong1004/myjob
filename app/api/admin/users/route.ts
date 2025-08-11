import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore, Timestamp } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

// Admin user email
const ADMIN_EMAIL = "jsong@koreatous.com"

// Helper function to safely format timestamps
function formatTimestampSafely(timestamp: any): string {
  if (!timestamp) return 'Unknown'
  
  try {
    // Handle Firestore Timestamp objects
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString()
    }
    
    // Handle regular Date objects
    if (timestamp instanceof Date) {
      return timestamp.toISOString()
    }
    
    // Handle timestamp strings/numbers
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) {
        return 'Invalid Date'
      }
      return date.toISOString()
    }
    
    // Handle Firestore Timestamp-like objects with seconds/nanoseconds
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      const date = new Date(timestamp.seconds * 1000)
      if (isNaN(date.getTime())) {
        return 'Invalid Date'
      }
      return date.toISOString()
    }
    
    return 'Unknown'
  } catch (error) {
    console.warn('Error formatting timestamp:', timestamp, error)
    return 'Invalid Date'
  }
}

interface UserData {
  uid: string;
  email: string;
  name: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  defaultResumeId?: string;
}

export async function GET(req: NextRequest) {
  try {
    initFirebaseAdmin()
    const adminAuth = getAuth()
    const adminDb = getFirestore()

    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: No token provided" }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(token)
    
    // Check if the user is the admin
    if (decodedToken.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 })
    }

    // Fetch all users
    const usersSnapshot = await adminDb.collection("users")
      .orderBy("createdAt", "desc")
      .limit(100) // Limit to the last 100 users
      .get()
      
    const usersData = usersSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as UserData & { id: string }))

    console.log(`[Admin][Users] Fetched ${usersData.length} users`)

    // Get additional data for each user (resume count, saved jobs count, etc.)
    const enrichedUsers = await Promise.all(
      usersData.map(async (user) => {
        try {
          // Determine the correct user identifier - try both uid and userId fields
          const userId = user.uid || user.userId || user.id
          
          if (!userId) {
            console.warn(`User has no valid identifier:`, user)
            return {
              ...user,
              resumeCount: 0,
              savedJobsCount: 0,
              coverLettersCount: 0,
              createdAt: user.createdAt?.toDate ? user.createdAt.toDate().toISOString() : new Date().toISOString(),
              updatedAt: user.updatedAt?.toDate ? user.updatedAt.toDate().toISOString() : new Date().toISOString(),
            }
          }

          // Count resumes
          const resumesSnapshot = await adminDb.collection("resumes")
            .where("userId", "==", userId)
            .get()
          
          // Count saved jobs
          const savedJobsSnapshot = await adminDb.collection("savedJobs")
            .where("userId", "==", userId)
            .get()
          
          // Count cover letters
          const coverLettersSnapshot = await adminDb.collection("coverLetters")
            .where("userId", "==", userId)
            .get()

          const counts = {
            resumeCount: resumesSnapshot.size,
            savedJobsCount: savedJobsSnapshot.size,
            coverLettersCount: coverLettersSnapshot.size,
          }

          // Log for debugging
          if (counts.resumeCount > 0 || counts.savedJobsCount > 0 || counts.coverLettersCount > 0) {
            console.log(`[Admin][Users] User ${user.name || user.email} (${userId}): resumes=${counts.resumeCount}, savedJobs=${counts.savedJobsCount}, coverLetters=${counts.coverLettersCount}`)
          }

          // Debug: Log the raw timestamps for Jaehee Song
          if (user.email === "jsong@koreatous.com") {
            console.log(`[Admin][Users][DEBUG] Raw data for ${user.email}:`, {
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
              createdAtDate: user.createdAt?.toDate ? user.createdAt.toDate() : null,
              updatedAtDate: user.updatedAt?.toDate ? user.updatedAt.toDate() : null,
              createdAtISOString: user.createdAt?.toDate ? user.createdAt.toDate().toISOString() : null,
              updatedAtISOString: user.updatedAt?.toDate ? user.updatedAt.toDate().toISOString() : null,
              createdAtFormatted: user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : null,
              updatedAtFormatted: user.updatedAt?.toDate ? user.updatedAt.toDate().toLocaleDateString() : null
            })
          }

          return {
            ...user,
            uid: user.id, // Ensure uid is always the document ID (Firebase Auth UID)
            userId: userId, // Ensure we have a consistent userId field
            ...counts,
            createdAt: formatTimestampSafely(user.createdAt),
            updatedAt: formatTimestampSafely(user.updatedAt),
          }
        } catch (error) {
          console.error(`Error fetching additional data for user ${user.uid || user.userId || user.id}:`, error)
          return {
            ...user,
            uid: user.id, // Ensure uid is always the document ID (Firebase Auth UID)
            userId: user.uid || user.userId || user.id,
            resumeCount: 0,
            savedJobsCount: 0,
            coverLettersCount: 0,
            createdAt: formatTimestampSafely(user.createdAt),
            updatedAt: formatTimestampSafely(user.updatedAt),
          }
        }
      })
    )

    return NextResponse.json({ users: enrichedUsers })
  } catch (error) {
    console.error("[Admin][Users][GET] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({ error: "Failed to fetch users", details: errorMessage }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    initFirebaseAdmin()
    const adminAuth = getAuth()
    const adminDb = getFirestore()

    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: No token provided" }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(token)
    
    // Check if the user is the admin
    if (decodedToken.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 })
    }

    // Get userId from request body
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Prevent admin from deleting themselves
    if (userId === decodedToken.uid) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    console.log(`[Admin][Users][DELETE] Deleting user: ${userId}`)

    // First, get user data to verify it exists
    const userDoc = await adminDb.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      console.log(`[Admin][Users][DELETE] User document ${userId} not found in Firestore`)
      return NextResponse.json({ error: "User not found in database" }, { status: 404 })
    }

    const userData = userDoc.data()
    console.log(`[Admin][Users][DELETE] Found user data:`, userData)

    // Delete user from Firebase Auth
    try {
      await adminAuth.deleteUser(userId)
      console.log(`[Admin][Users][DELETE] Successfully deleted user from Firebase Auth`)
    } catch (authError) {
      console.error(`[Admin][Users][DELETE] Failed to delete user from Firebase Auth:`, authError)
      // Continue with Firestore deletion even if Auth deletion fails
    }

    // Delete user document from Firestore
    await adminDb.collection("users").doc(userId).delete()
    console.log(`[Admin][Users][DELETE] Deleted user document from Firestore`)

    // Delete all user's resumes
    const resumesSnapshot = await adminDb.collection("resumes")
      .where("userId", "==", userId)
      .get()
    
    const resumeDeletePromises = resumesSnapshot.docs.map(doc => doc.ref.delete())
    await Promise.all(resumeDeletePromises)

    // Delete all user's saved jobs
    const savedJobsSnapshot = await adminDb.collection("savedJobs")
      .where("userId", "==", userId)
      .get()
    
    const savedJobsDeletePromises = savedJobsSnapshot.docs.map(doc => doc.ref.delete())
    await Promise.all(savedJobsDeletePromises)

    // Delete all user's cover letters
    const coverLettersSnapshot = await adminDb.collection("coverLetters")
      .where("userId", "==", userId)
      .get()
    
    const coverLettersDeletePromises = coverLettersSnapshot.docs.map(doc => doc.ref.delete())
    await Promise.all(coverLettersDeletePromises)

    console.log(`[Admin][Users][DELETE] Successfully deleted user ${userId} and all associated data`)

    return NextResponse.json({ 
      message: "User successfully deleted",
      deletedData: {
        resumes: resumesSnapshot.size,
        savedJobs: savedJobsSnapshot.size,
        coverLetters: coverLettersSnapshot.size
      }
    })
  } catch (error) {
    console.error("[Admin][Users][DELETE] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({ error: "Failed to delete user", details: errorMessage }, { status: 500 })
  }
}