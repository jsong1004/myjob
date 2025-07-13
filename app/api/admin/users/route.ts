import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore, Timestamp } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

// Admin user email
const ADMIN_EMAIL = "jsong@koreatous.com"

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

          return {
            ...user,
            userId: userId, // Ensure we have a consistent userId field
            ...counts,
            createdAt: user.createdAt?.toDate ? user.createdAt.toDate().toISOString() : new Date().toISOString(),
            updatedAt: user.updatedAt?.toDate ? user.updatedAt.toDate().toISOString() : new Date().toISOString(),
          }
        } catch (error) {
          console.error(`Error fetching additional data for user ${user.uid || user.userId || user.id}:`, error)
          return {
            ...user,
            userId: user.uid || user.userId || user.id,
            resumeCount: 0,
            savedJobsCount: 0,
            coverLettersCount: 0,
            createdAt: user.createdAt?.toDate ? user.createdAt.toDate().toISOString() : new Date().toISOString(),
            updatedAt: user.updatedAt?.toDate ? user.updatedAt.toDate().toISOString() : new Date().toISOString(),
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