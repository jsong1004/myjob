import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import { SavedJob } from "@/lib/types"

export async function GET(req: NextRequest) {
  try {
    initFirebaseAdmin()
    const adminAuth = getAuth()
    const adminDb = getFirestore()

    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const userId = decoded.uid

    const snapshot = await adminDb.collection("savedJobs").where("userId", "==", userId).get()
    const savedJobs: SavedJob[] = []
    snapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      savedJobs.push({ id: doc.id, ...doc.data() } as SavedJob)
    })
    return NextResponse.json({ savedJobs })
  } catch (error) {
    console.error("[SavedJobs][GET] Error:", error)
    return NextResponse.json({ error: "Failed to fetch saved jobs" }, { status: 500 })
  }
}

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
    const { jobId, title, company, location, summary, salary, matchingScore, scoreDetails, matchingSummary, originalData } = body
    if (!jobId || !title || !company) {
      return NextResponse.json({ error: "Missing required job fields" }, { status: 400 })
    }

    // Prevent duplicate saves for the same user and job
    const existing = await adminDb.collection("savedJobs")
      .where("userId", "==", userId)
      .where("jobId", "==", jobId)
      .get()
    if (!existing.empty) {
      return NextResponse.json({ error: "Job already saved" }, { status: 409 })
    }

    const docRef = await adminDb.collection("savedJobs").add({
      userId,
      jobId,
      title,
      company,
      location,
      summary: summary || "",
      salary: salary || "",
      matchingScore: matchingScore ?? 0,
      matchingSummary: matchingSummary || "",
      scoreDetails: scoreDetails || {},
      savedAt: new Date(),
      appliedAt: null, // Initialize as null, can be updated later
      originalData: originalData || {},
    })
    const doc = await docRef.get()
    return NextResponse.json({ id: doc.id, ...doc.data() })
  } catch (error) {
    console.error("[SavedJobs][POST] Error:", error)
    return NextResponse.json({ error: "Failed to save job" }, { status: 500 })
  }
} 