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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
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
    const body = await req.json()
    const { applied, resumeTailored, coverLetterCreated } = body

    // Validate inputs
    if (applied !== undefined && typeof applied !== 'boolean') {
      return NextResponse.json({ error: "Applied status must be a boolean" }, { status: 400 })
    }
    if (resumeTailored !== undefined && typeof resumeTailored !== 'boolean') {
      return NextResponse.json({ error: "Resume tailored status must be a boolean" }, { status: 400 })
    }
    if (coverLetterCreated !== undefined && typeof coverLetterCreated !== 'boolean') {
      return NextResponse.json({ error: "Cover letter created status must be a boolean" }, { status: 400 })
    }

    const querySnapshot = await adminDb
      .collection("savedJobs")
      .where("userId", "==", userId)
      .where("jobId", "==", jobId)
      .get()

    if (querySnapshot.empty) {
      return NextResponse.json({ error: "Saved job not found" }, { status: 404 })
    }

    const doc = querySnapshot.docs[0]
    const updateData: any = {}
    let message = ""

    // Handle applied status update
    if (applied !== undefined) {
      if (applied) {
        updateData.appliedAt = new Date()
        message += "Job marked as applied. "
      } else {
        updateData.appliedAt = null
        message += "Job unmarked as applied. "
      }
    }

    // Handle resume tailored status update
    if (resumeTailored !== undefined) {
      if (resumeTailored) {
        updateData.resumeTailoredAt = new Date()
        message += "Resume tailored for this job. "
      } else {
        updateData.resumeTailoredAt = null
        message += "Resume tailoring status removed. "
      }
    }

    // Handle cover letter created status update
    if (coverLetterCreated !== undefined) {
      if (coverLetterCreated) {
        updateData.coverLetterCreatedAt = new Date()
        message += "Cover letter created for this job. "
      } else {
        updateData.coverLetterCreatedAt = null
        message += "Cover letter status removed. "
      }
    }

    await doc.ref.update(updateData)

    const updatedDoc = await doc.ref.get()
    return NextResponse.json({ 
      id: updatedDoc.id, 
      ...updatedDoc.data(),
      message: message.trim() || "Job updated successfully"
    })
  } catch (error) {
    console.error(`[SavedJobs][PATCH] Error:`, error)
    return NextResponse.json({ error: "Failed to update job status" }, { status: 500 })
  }
} 