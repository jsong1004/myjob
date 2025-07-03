import { NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/lib/firebase-admin"

export async function DELETE(req: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const userId = decoded.uid
    const { jobId } = params

    const docRef = adminDb.collection("savedJobs").doc(jobId)
    const doc = await docRef.get()
    if (!doc.exists) {
      return NextResponse.json({ error: "Saved job not found" }, { status: 404 })
    }
    if (doc.data()?.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    await docRef.delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[SavedJobs][DELETE] Error:", error)
    return NextResponse.json({ error: "Failed to unsave job" }, { status: 500 })
  }
} 