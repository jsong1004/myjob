import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    initFirebaseAdmin()
    const adminAuth = getAuth()
    const adminDb = getFirestore()

    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const userId = decoded.uid
    const { jobId } = await params

    const querySnapshot = await adminDb
      .collection("savedJobs")
      .where("userId", "==", userId)
      .where("jobId", "==", jobId)
      .get()

    if (querySnapshot.empty) {
      return NextResponse.json({ error: "Saved job not found" }, { status: 404 })
    }

    const doc = querySnapshot.docs[0]
    await doc.ref.delete()

    return NextResponse.json({ message: "Job successfully unsaved" })
  } catch (error) {
    console.error(`[SavedJobs][DELETE] Error:`, error)
    return NextResponse.json({ error: "Failed to unsave job" }, { status: 500 })
  }
} 