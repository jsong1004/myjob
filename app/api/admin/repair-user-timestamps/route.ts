import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore, Timestamp } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

// Admin user email
const ADMIN_EMAIL = "jsong@koreatous.com"

export async function POST(req: NextRequest) {
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

    const { userId, repairType } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`[Admin][RepairTimestamps] Repairing timestamps for user: ${userId}, type: ${repairType}`)

    // Get the user document
    const userDoc = await adminDb.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    console.log(`[Admin][RepairTimestamps] Current user data:`, {
      email: userData?.email,
      createdAt: userData?.createdAt,
      updatedAt: userData?.updatedAt,
    })

    let updateData: any = {}

    if (repairType === "fix_invalid_created") {
      // If createdAt is invalid but updatedAt is valid, set createdAt to a reasonable date
      // We'll use the updatedAt date minus some time, or a default date
      const currentUpdatedAt = userData?.updatedAt
      
      if (currentUpdatedAt && currentUpdatedAt.toDate) {
        // Set createdAt to be the same as updatedAt (user joined and was last active on same day)
        updateData.createdAt = currentUpdatedAt
      } else {
        // Fallback to a default creation date (July 18, 2025 as mentioned by user)
        updateData.createdAt = Timestamp.fromDate(new Date('2025-07-18'))
      }
    } else if (repairType === "set_specific_dates") {
      // For Jaehee Song specifically: Joined 7/18/2025, Last Active 8/9/2025
      if (userData?.email === "jsong@koreatous.com") {
        updateData.createdAt = Timestamp.fromDate(new Date('2025-07-18'))
        updateData.updatedAt = Timestamp.fromDate(new Date('2025-08-09'))
      }
    } else if (repairType === "copy_updated_to_created") {
      // Copy updatedAt to createdAt (assuming they joined on their last active date)
      const currentUpdatedAt = userData?.updatedAt
      if (currentUpdatedAt) {
        updateData.createdAt = currentUpdatedAt
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No updates needed or invalid repair type" }, { status: 400 })
    }

    // Update the document
    await adminDb.collection("users").doc(userId).update(updateData)

    console.log(`[Admin][RepairTimestamps] Successfully repaired timestamps for user ${userId}`)
    console.log(`[Admin][RepairTimestamps] Updated data:`, updateData)

    return NextResponse.json({ 
      message: "Timestamps repaired successfully",
      updates: Object.keys(updateData).reduce((acc: any, key) => {
        acc[key] = updateData[key].toDate ? updateData[key].toDate().toISOString() : updateData[key]
        return acc
      }, {}),
      repairType
    })
  } catch (error) {
    console.error("[Admin][RepairTimestamps] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({ error: "Failed to repair timestamps", details: errorMessage }, { status: 500 })
  }
}