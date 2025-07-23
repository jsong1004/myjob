import { z } from 'zod'
import fetch from 'node-fetch'
import { SaveJobSchema, AuthContext } from '../types/index.js'

export const saveJobTool = {
  name: 'save_job',
  description: 'Save a job to your collection for tracking',
  inputSchema: {
    type: 'object',
    properties: {
      jobId: {
        type: 'string',
        description: 'Job ID to save'
      },
      notes: {
        type: 'string',
        description: 'Personal notes about the job (optional)'
      },
      _auth: {
        type: 'string',
        description: 'Authentication token (required)'
      }
    },
    required: ['jobId', '_auth']
  },
  handler: async (args: any, context: AuthContext): Promise<{ 
    success: boolean,
    savedJob: {
      id: string,
      jobId: string,
      title: string,
      company: string,
      status: string,
      savedAt: string
    }
  }> => {
    // Validate input
    const input = SaveJobSchema.parse(args)
    
    // First get the job details
    const jobResponse = await fetch(
      `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/jobs/${input.jobId}`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`
        }
      }
    )
    
    if (!jobResponse.ok) {
      throw new Error('Job not found')
    }
    
    const job = await jobResponse.json() as any
    
    // Save the job
    const saveResponse = await fetch(
      `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/saved-jobs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${context.authToken}`
        },
        body: JSON.stringify({
          jobId: input.jobId,
          title: job.title,
          company: job.company,
          location: job.location,
          summary: job.summary || job.description.substring(0, 200) + '...',
          salary: job.salary,
          matchingScore: job.matchingScore || 0,
          originalData: job
        })
      }
    )
    
    if (!saveResponse.ok) {
      const error = await saveResponse.text()
      throw new Error(`Failed to save job: ${error}`)
    }
    
    const savedJobData = await saveResponse.json() as any
    
    // Update with notes if provided
    if (input.notes) {
      await fetch(
        `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/saved-jobs/${input.jobId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${context.authToken}`
          },
          body: JSON.stringify({
            notes: input.notes
          })
        }
      )
    }
    
    return {
      success: true,
      savedJob: {
        id: savedJobData.id,
        jobId: savedJobData.jobId,
        title: savedJobData.title,
        company: savedJobData.company,
        status: savedJobData.status || 'saved',
        savedAt: savedJobData.savedAt
      }
    }
  }
}