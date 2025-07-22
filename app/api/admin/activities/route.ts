import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore, Timestamp } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

// Admin user email
const ADMIN_EMAIL = "jsong@koreatous.com"

interface ActivityData {
  userId: string;
  timestamp: Timestamp;
  [key: string]: any;
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

    const activitiesSnapshot = await adminDb.collection("user-activities")
      .orderBy("timestamp", "desc")
      .limit(200) // Limit to the last 200 activities
      .get()
      
    const activitiesData = activitiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityData & { id: string }))

    // Get unique user IDs from activities
    const userIds = [...new Set(activitiesData.map(activity => activity.userId).filter(Boolean))]

    // Fetch user names
    const userMap = new Map<string, string>()
    if (userIds.length > 0) {
      // Fetch user documents by their document IDs
      for (const userId of userIds) {
        try {
          const userDoc = await adminDb.collection("users").doc(userId).get()
          if (userDoc.exists) {
            const userData = userDoc.data()
            // Use displayName field which is what's saved in the profile
            userMap.set(userId, userData?.displayName || userData?.name || 'Anonymous')
          } else {
            // If user doc doesn't exist in Firestore, try to get from Firebase Auth
            try {
              const authUser = await adminAuth.getUser(userId)
              userMap.set(userId, authUser.displayName || authUser.email || 'Anonymous')
            } catch (authError) {
              console.error(`User ${userId} not found in Firestore or Auth`)
            }
          }
        } catch (error) {
          console.error(`Failed to fetch user ${userId}:`, error)
        }
      }
    }
    
    // Combine activities with user names and format timestamp
    const enrichedActivities = activitiesData.map(activity => ({
      ...activity,
      id: activity.id,
      userName: userMap.get(activity.userId) || 'Unknown User',
      timestamp: activity.timestamp?.toDate ? activity.timestamp.toDate().toISOString() : new Date().toISOString(),
    }))

    return NextResponse.json({ activities: enrichedActivities })
  } catch (error) {
    console.error("[Admin][Activities][GET] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({ error: "Failed to fetch user activities", details: errorMessage }, { status: 500 })
  }
} 