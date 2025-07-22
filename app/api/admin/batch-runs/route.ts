import { NextRequest, NextResponse } from "next/server"
import { getFirestore } from "firebase-admin/firestore"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getAuthenticatedUser } from "@/lib/api/auth-middleware"

/**
 * API endpoint to fetch batch run statistics and recent runs
 * Admin only - requires authentication
 */

interface BatchRunData {
  id: string
  batchId: string
  completedAt: string
  totalJobs: number
  newJobs: number
  duplicates: number
  queriesProcessed: number
  executionTime: number
  errors: string[]
}

interface BatchStats {
  totalRuns: number
  totalJobsProcessed: number
  averageExecutionTime: number
  successRate: number
  lastRunDate: string
  upcomingRunDate: string
}

export async function GET(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verify authentication
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Admin check - only allow specific admin user
    const isAdmin = user.email === "jsong@koreatous.com"
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log(`[BatchRunsAPI] Fetching batch run data for admin: ${user.email}`)

    // Initialize Firebase Admin and get Firestore
    const adminInitialized = initFirebaseAdmin()
    if (!adminInitialized) {
      throw new Error('Firebase Admin initialization failed')
    }
    
    const adminDB = getFirestore()

    // Fetch recent batch runs from Firestore
    const batchRunsRef = adminDB.collection('batch_runs')
    const recentRuns = await batchRunsRef
      .orderBy('completedAt', 'desc')
      .limit(10)
      .get()

    const batchRuns: BatchRunData[] = []
    
    recentRuns.docs.forEach(doc => {
      const data = doc.data()
      batchRuns.push({
        id: doc.id,
        batchId: data.batchId || '',
        completedAt: data.completedAt?.toDate?.()?.toISOString() || data.completedAt || new Date().toISOString(),
        totalJobs: data.totalJobs || 0,
        newJobs: data.newJobs || 0,
        duplicates: data.duplicates || 0,
        queriesProcessed: data.queriesProcessed || 0,
        executionTime: data.executionTime || 0,
        errors: data.errors || []
      })
    })

    // Calculate statistics
    const totalRuns = batchRuns.length
    const totalJobsProcessed = batchRuns.reduce((sum, run) => sum + run.totalJobs, 0)
    const averageExecutionTime = totalRuns > 0 
      ? batchRuns.reduce((sum, run) => sum + run.executionTime, 0) / totalRuns 
      : 0
    const successRate = totalRuns > 0
      ? batchRuns.filter(run => run.errors.length === 0).length / totalRuns
      : 1

    // Get next run date (next weekday at 2 AM)
    const getNextRunDate = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(2, 0, 0, 0)
      
      // If tomorrow is weekend, move to Monday
      if (tomorrow.getDay() === 0) { // Sunday
        tomorrow.setDate(tomorrow.getDate() + 1)
      } else if (tomorrow.getDay() === 6) { // Saturday
        tomorrow.setDate(tomorrow.getDate() + 2)
      }
      
      return tomorrow.toISOString()
    }

    const stats: BatchStats = {
      totalRuns,
      totalJobsProcessed,
      averageExecutionTime,
      successRate,
      lastRunDate: batchRuns[0]?.completedAt || '',
      upcomingRunDate: getNextRunDate()
    }

    const executionTime = Date.now() - startTime

    console.log(`[BatchRunsAPI] Successfully fetched ${batchRuns.length} batch runs in ${executionTime}ms`)

    return NextResponse.json({
      success: true,
      batchRuns,
      stats,
      executionTime
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[BatchRunsAPI] Error fetching batch runs:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch batch runs',
      detail: error instanceof Error ? error.message : 'Unknown error',
      executionTime
    }, { status: 500 })
  }
}

// Create a new batch run record
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Admin check
    const isAdmin = user.email === "jsong@koreatous.com"
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Initialize Firebase Admin and get Firestore
    const adminInitialized = initFirebaseAdmin()
    if (!adminInitialized) {
      throw new Error('Firebase Admin initialization failed')
    }
    
    const adminDB = getFirestore()

    const body = await req.json()
    const {
      batchId,
      totalJobs,
      newJobs,
      duplicates,
      queriesProcessed,
      executionTime,
      errors
    } = body

    // Create batch run record
    const batchRunData = {
      batchId: batchId || new Date().toISOString().split('T')[0],
      completedAt: new Date(),
      totalJobs: totalJobs || 0,
      newJobs: newJobs || 0,
      duplicates: duplicates || 0,
      queriesProcessed: queriesProcessed || 0,
      executionTime: executionTime || 0,
      errors: errors || [],
      createdBy: user.uid
    }

    const docRef = await adminDB.collection('batch_runs').add(batchRunData)

    console.log(`[BatchRunsAPI] Created batch run record: ${docRef.id}`)

    return NextResponse.json({
      success: true,
      id: docRef.id,
      batchRun: {
        id: docRef.id,
        ...batchRunData,
        completedAt: batchRunData.completedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('[BatchRunsAPI] Error creating batch run:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create batch run record',
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}