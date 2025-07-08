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
      // Firestore 'in' query is limited to 30 items, so we may need to batch requests
      const MAX_IDS_PER_QUERY = 10 // Firestore `in` query limit
      for (let i = 0; i < userIds.length; i += MAX_IDS_PER_QUERY) {
        const chunk = userIds.slice(i, i + MAX_IDS_PER_QUERY)
        if (chunk.length > 0) {
          const usersSnapshot = await adminDb.collection("users").where('userId', 'in', chunk).get()
          usersSnapshot.forEach(doc => {
            const userData = doc.data()
            userMap.set(userData.userId, userData.name || 'Anonymous')
          })
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