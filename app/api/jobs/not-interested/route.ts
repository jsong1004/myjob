import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore, Timestamp } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"

/**
 * API endpoint to mark a job as "not interested"
 * This creates a savedJob entry with status 'notinterested' 
 * which will filter the job out of future search results
 */

interface NotInterestedRequest {
  jobId: string
  jobData?: {
    title: string
    company: string
    location: string
    description?: string
    salary?: string
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
    
    const body = await req.json() as NotInterestedRequest
    const { jobId, jobData } = body

    if (!jobId) {
      return NextResponse.json({ error: "Missing required field: jobId" }, { status: 400 })
    }

    console.log(`[NotInterested] Marking job ${jobId} as not interested for user ${userId}`)

    // Check if this job is already saved by the user
    const existingJobQuery = await adminDb.collection("savedJobs")
      .where("userId", "==", userId)
      .where("jobId", "==", jobId)
      .get()

    if (!existingJobQuery.empty) {
      // Update existing saved job to "notinterested" status
      const existingDoc = existingJobQuery.docs[0]
      await existingDoc.ref.update({
        status: 'notinterested',
        updatedAt: Timestamp.now()
      })
      
      console.log(`[NotInterested] Updated existing saved job ${jobId} to notinterested status`)
      
      return NextResponse.json({ 
        message: "Job marked as not interested",
        jobId,
        action: "updated"
      })
    } else {
      // Create new savedJob entry with "notinterested" status
      const savedJobData = {
        userId,
        jobId,
        title: jobData?.title || 'Unknown',
        company: jobData?.company || 'Unknown',
        location: jobData?.location || 'Unknown',
        summary: jobData?.description || '',
        salary: jobData?.salary || '',
        matchingScore: 0,
        status: 'notinterested',
        savedAt: Timestamp.now(),
        originalData: jobData || {}
      }

      const docRef = await adminDb.collection("savedJobs").add(savedJobData)
      
      console.log(`[NotInterested] Created new savedJob ${docRef.id} with notinterested status`)
      
      return NextResponse.json({ 
        message: "Job marked as not interested",
        jobId,
        savedJobId: docRef.id,
        action: "created"
      })
    }

  } catch (error) {
    console.error('[NotInterested] Error:', error)
    return NextResponse.json({ 
      error: "Failed to mark job as not interested",
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    initFirebaseAdmin()
    const adminAuth = getAuth()
    const adminDb = getFirestore()

    const authHeader = req.headers.get("authorization") || ""
    const token = authHeader.replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const userId = decoded.uid
    
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: "Missing required parameter: jobId" }, { status: 400 })
    }

    console.log(`[NotInterested] Removing not-interested status for job ${jobId} for user ${userId}`)

    // Find and remove the "not interested" entry
    const existingJobQuery = await adminDb.collection("savedJobs")
      .where("userId", "==", userId)
      .where("jobId", "==", jobId)
      .where("status", "==", "notinterested")
      .get()

    if (existingJobQuery.empty) {
      return NextResponse.json({ error: "Not interested job not found" }, { status: 404 })
    }

    // Delete the not interested entry
    const doc = existingJobQuery.docs[0]
    await doc.ref.delete()
    
    console.log(`[NotInterested] Removed not-interested status for job ${jobId}`)
    
    return NextResponse.json({ 
      message: "Removed not interested status",
      jobId
    })

  } catch (error) {
    console.error('[NotInterested] Delete error:', error)
    return NextResponse.json({ 
      error: "Failed to remove not interested status",
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}