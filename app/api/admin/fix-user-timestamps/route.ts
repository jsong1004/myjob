import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore } from "firebase-admin/firestore"
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

    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`[Admin][FixTimestamps] Fixing timestamps for user: ${userId}`)

    // Get the user document
    const userDoc = await adminDb.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    console.log(`[Admin][FixTimestamps] Current user data:`, {
      email: userData?.email,
      createdAt: userData?.createdAt,
      updatedAt: userData?.updatedAt,
      createdAtDate: userData?.createdAt?.toDate ? userData.createdAt.toDate() : null,
      updatedAtDate: userData?.updatedAt?.toDate ? userData.updatedAt.toDate() : null,
    })

    // Swap the createdAt and updatedAt values
    const currentCreatedAt = userData?.createdAt
    const currentUpdatedAt = userData?.updatedAt

    if (!currentCreatedAt || !currentUpdatedAt) {
      return NextResponse.json({ error: "Missing timestamp data" }, { status: 400 })
    }

    // Update the document with swapped values
    await adminDb.collection("users").doc(userId).update({
      createdAt: currentUpdatedAt, // What was updatedAt becomes createdAt
      updatedAt: currentCreatedAt,  // What was createdAt becomes updatedAt
    })

    console.log(`[Admin][FixTimestamps] Successfully swapped timestamps for user ${userId}`)

    return NextResponse.json({ 
      message: "Timestamps swapped successfully",
      before: {
        createdAt: currentCreatedAt?.toDate ? currentCreatedAt.toDate().toISOString() : null,
        updatedAt: currentUpdatedAt?.toDate ? currentUpdatedAt.toDate().toISOString() : null,
      },
      after: {
        createdAt: currentUpdatedAt?.toDate ? currentUpdatedAt.toDate().toISOString() : null,
        updatedAt: currentCreatedAt?.toDate ? currentCreatedAt.toDate().toISOString() : null,
      }
    })
  } catch (error) {
    console.error("[Admin][FixTimestamps] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return NextResponse.json({ error: "Failed to fix timestamps", details: errorMessage }, { status: 500 })
  }
}