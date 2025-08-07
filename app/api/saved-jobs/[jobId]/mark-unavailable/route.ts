import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore, Timestamp } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import type { ApplicationStatus } from "@/lib/types"

interface MarkUnavailableRequest {
  status: ApplicationStatus
  notes?: string
  reminderDate?: string
  reminderNote?: string
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    initFirebaseAdmin()
    const adminAuth = getAuth()
    const adminDb = getFirestore()
    
    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = await adminAuth.verifyIdToken(token)
    const userId = decoded.uid
    const { jobId } = await params
    const body = await req.json() as MarkUnavailableRequest
    
    console.log(`[MarkUnavailable] Marking job ${jobId} as unavailable for user ${userId}`)

    // Find the saved job to get job details
    const savedJobQuery = await adminDb.collection("savedJobs")
      .where("userId", "==", userId)
      .where("jobId", "==", jobId)
      .limit(1)
      .get()

    if (savedJobQuery.empty) {
      return NextResponse.json({ error: "Saved job not found" }, { status: 404 })
    }

    const savedJobDoc = savedJobQuery.docs[0]
    const savedJobData = savedJobDoc.data()
    
    // Update the saved job with the new status
    const updateData: any = {
      status: body.status,
      updatedAt: Timestamp.now()
    }

    if (body.notes) updateData.notes = body.notes
    if (body.reminderDate) updateData.reminderDate = Timestamp.fromDate(new Date(body.reminderDate))
    if (body.reminderNote) updateData.reminderNote = body.reminderNote

    await savedJobDoc.ref.update(updateData)
    console.log(`[MarkUnavailable] Updated savedJob ${savedJobDoc.id} with status: ${body.status}`)

    // Now update the jobs collection to mark this job as unavailable for all users
    // We'll look for jobs that match the same title, company, and location
    const jobsQuery = await adminDb.collection("jobs")
      .where("title", "==", savedJobData.title)
      .where("company", "==", savedJobData.company)
      .get()

    console.log(`[MarkUnavailable] Found ${jobsQuery.size} jobs matching title and company`)

    // Filter by location if available and update matching jobs
    const jobsToUpdate: any[] = []
    jobsQuery.forEach(doc => {
      const jobData = doc.data()
      // Check if location matches (allowing for some flexibility)
      const savedLocation = (savedJobData.location || "").toLowerCase().trim()
      const jobLocation = (jobData.location || "").toLowerCase().trim()
      
      if (!savedLocation || !jobLocation || savedLocation === jobLocation || 
          savedLocation.includes(jobLocation) || jobLocation.includes(savedLocation)) {
        jobsToUpdate.push({ doc, data: jobData })
      }
    })

    console.log(`[MarkUnavailable] Will update ${jobsToUpdate.length} jobs in the jobs collection`)

    // Update jobs collection entries to mark as unavailable
    const batch = adminDb.batch()
    jobsToUpdate.forEach(({ doc }) => {
      batch.update(doc.ref, {
        isAvailable: false,
        unavailableReason: 'marked_by_user',
        markedUnavailableAt: Timestamp.now(),
        markedUnavailableBy: userId,
        updatedAt: Timestamp.now()
      })
    })

    if (jobsToUpdate.length > 0) {
      await batch.commit()
      console.log(`[MarkUnavailable] Updated ${jobsToUpdate.length} jobs in jobs collection as unavailable`)
    }

    return NextResponse.json({ 
      message: "Job marked as no longer available",
      updatedSavedJob: true,
      updatedJobsCount: jobsToUpdate.length,
      affectedJobs: jobsToUpdate.map(({ doc }) => doc.id)
    })

  } catch (error) {
    console.error('[MarkUnavailable] Error:', error)
    return NextResponse.json({ 
      error: "Failed to mark job as unavailable",
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}