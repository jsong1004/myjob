import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import { SavedJob } from "@/lib/types"

export async function POST(req: NextRequest) {
  try {
    initFirebaseAdmin()
    const adminAuth = getAuth()
    const adminDb = getFirestore()

    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const userId = decoded.uid
    const body = await req.json()
    const { title, company, location, description, applyUrl, salary } = body

    if (!title || !company) {
      return NextResponse.json({ error: "Title and company are required" }, { status: 400 })
    }

    // Generate a unique jobId for manually added jobs
    const jobId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create original data structure to match existing jobs
    const originalData = {
      id: jobId,
      title,
      company,
      location: location || "",
      description: description || "",
      salary: salary || "",
      postedAt: new Date().toISOString(),
      applyUrl: applyUrl || "",
      source: "manual",
      summary: description || ""
    }

    const docRef = await adminDb.collection("savedJobs").add({
      userId,
      jobId,
      title,
      company,
      location: location || "",
      summary: description || "",
      salary: salary || "",
      matchingScore: 0, // Manual jobs start with 0 score
      matchingSummary: "",
      scoreDetails: {},
      savedAt: new Date(),
      appliedAt: null,
      status: 'saved',
      notes: null,
      reminderDate: null,
      reminderNote: null,
      originalData: originalData,
    })

    const doc = await docRef.get()
    const savedJob = { id: doc.id, ...doc.data() } as SavedJob

    return NextResponse.json({ savedJob })
  } catch (error) {
    console.error("[SavedJobs][AddManual] Error:", error)
    return NextResponse.json({ error: "Failed to add job manually" }, { status: 500 })
  }
}