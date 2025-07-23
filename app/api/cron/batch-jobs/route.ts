import { NextRequest, NextResponse } from "next/server"

/**
 * Cron endpoint for nightly batch job processing
 * This endpoint is designed to be called by external cron services like Vercel Cron,
 * GitHub Actions, or external cron services.
 * 
 * For Vercel deployment, add this to vercel.json:
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/batch-jobs",
 *       "schedule": "0 2 * * *"
 *     }
 *   ]
 * }
 */

export async function GET(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('[CronBatchJobs] Starting scheduled batch job processing')
    
    // Check for force run parameter
    const { searchParams } = new URL(req.url)
    const forceRun = searchParams.get('force') === 'true'
    
    // Verify the request is from an authorized source
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // For Cloud Scheduler, check for the cron secret
    if (cronSecret) {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        console.error('[CronBatchJobs] Unauthorized cron request')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else {
      // For development or if no secret is set, just log a warning
      console.warn('[CronBatchJobs] No CRON_SECRET set - allowing request')
    }

    // Check if batch processing should run (avoid weekends for cost savings)
    // Use PST timezone since the scheduler is configured for America/Los_Angeles
    const now = new Date()
    const pstTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}))
    const dayOfWeek = pstTime.getDay() // 0 = Sunday, 6 = Saturday
    const hour = pstTime.getHours()
    
    console.log(`[CronBatchJobs] Current PST time: ${pstTime.toISOString()}, hour: ${hour}, day: ${dayOfWeek}`)
    console.log(`[CronBatchJobs] Force run: ${forceRun}`)
    
    // Skip time checks if force run is enabled
    if (!forceRun) {
      // Only run Monday-Friday, between 1 AM and 5 AM PST
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        console.log('[CronBatchJobs] Skipping batch processing on weekends')
        return NextResponse.json({
          message: 'Batch processing skipped - weekend',
          skipped: true,
          executionTime: Date.now() - startTime
        })
      }
      
      if (hour < 1 || hour > 5) {
        console.log(`[CronBatchJobs] Skipping batch processing outside allowed hours (${hour}:00 PST)`)
        return NextResponse.json({
          message: 'Batch processing skipped - outside allowed hours',
          skipped: true,
          currentHour: hour,
          executionTime: Date.now() - startTime
        })
      }
    } else {
      console.log('[CronBatchJobs] Force run enabled - bypassing time checks')
    }

    console.log('[CronBatchJobs] Calling batch processing endpoint...')
    
    // Get the base URL for the API call
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const host = req.headers.get('host') || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`
    
    // Call the batch processing endpoint
    const batchResponse = await fetch(`${baseUrl}/api/batch/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-system-call': 'true' // Identify this as a system call
      },
      body: JSON.stringify({
        dryRun: false,
        maxJobsPerQuery: 50, // Limit to control API costs
        forceRun: false
      })
    })

    const batchResult = await batchResponse.json()
    const executionTime = Date.now() - startTime

    if (!batchResponse.ok) {
      console.error('[CronBatchJobs] Batch processing failed:', batchResult)
      return NextResponse.json({
        success: false,
        error: 'Batch processing failed',
        details: batchResult,
        executionTime
      }, { status: 500 })
    }

    console.log('[CronBatchJobs] Batch processing completed successfully')
    console.log(`[CronBatchJobs] - New jobs: ${batchResult.result?.newJobs || 0}`)
    console.log(`[CronBatchJobs] - Total time: ${executionTime}ms`)

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Scheduled batch processing completed',
      executionTime,
      batchResult: {
        batchId: batchResult.result?.batchId,
        newJobs: batchResult.result?.newJobs,
        totalJobs: batchResult.result?.totalJobs,
        duplicates: batchResult.result?.duplicates,
        queriesProcessed: batchResult.result?.queriesProcessed,
        errors: batchResult.result?.errors?.length || 0
      }
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error('[CronBatchJobs] Fatal error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Cron batch job failed',
      detail: error instanceof Error ? error.message : 'Unknown error',
      executionTime
    }, { status: 500 })
  }
}

// Also support POST for manual triggers with additional options
export async function POST(req: NextRequest) {
  try {
    console.log('[CronBatchJobs] Manual batch processing trigger')
    
    // For manual triggers, require proper authentication
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required for manual triggers' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    
    // Get the base URL for the API call
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const host = req.headers.get('host') || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`
    
    // Forward to batch processing endpoint with authentication
    const batchResponse = await fetch(`${baseUrl}/api/batch/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        dryRun: body.dryRun || false,
        maxJobsPerQuery: body.maxJobsPerQuery || 50,
        forceRun: body.forceRun || true, // Allow force run for manual triggers
        queries: body.queries,
        locations: body.locations
      })
    })

    const result = await batchResponse.json()
    
    return NextResponse.json(result, { 
      status: batchResponse.status 
    })

  } catch (error) {
    console.error('[CronBatchJobs] Manual trigger error:', error)
    return NextResponse.json({
      success: false,
      error: 'Manual trigger failed',
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}