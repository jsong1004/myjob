import { z } from 'zod'
import fetch from 'node-fetch'
import { JobScoringSchema, AuthContext, JobSearchResult } from '../types/index.js'

export const jobScoringTool = {
  name: 'score_jobs',
  description: 'Score job matches using AI multi-agent system based on resume',
  inputSchema: {
    type: 'object',
    properties: {
      jobIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of job IDs to score'
      },
      resumeId: {
        type: 'string',
        description: 'Resume ID to use for scoring (uses default if not provided)'
      },
      _auth: {
        type: 'string',
        description: 'Authentication token (required)'
      }
    },
    required: ['jobIds', '_auth']
  },
  handler: async (args: any, context: AuthContext): Promise<{ scoredJobs: JobSearchResult[] }> => {
    // Validate input
    const input = JobScoringSchema.parse(args)
    
    // First, fetch the jobs data
    const jobsResponse = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000'}/api/jobs/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${context.authToken}`
      },
      body: JSON.stringify({
        jobIds: input.jobIds
      })
    })
    
    if (!jobsResponse.ok) {
      throw new Error('Failed to fetch jobs for scoring')
    }
    
    const { jobs } = await jobsResponse.json() as any
    
    // Get the resume content
    let resumeContent = ''
    if (input.resumeId) {
      const resumeResponse = await fetch(
        `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/resumes/${input.resumeId}`,
        {
          headers: {
            'Authorization': `Bearer ${context.authToken}`
          }
        }
      )
      
      if (resumeResponse.ok) {
        const resume = await resumeResponse.json() as any
        resumeContent = resume.content
      }
    } else {
      // Get default resume
      const resumesResponse = await fetch(
        `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/resumes`,
        {
          headers: {
            'Authorization': `Bearer ${context.authToken}`
          }
        }
      )
      
      if (resumesResponse.ok) {
        const { resumes } = await resumesResponse.json() as any
        const defaultResume = resumes.find((r: any) => r.isDefault)
        if (defaultResume) {
          resumeContent = defaultResume.content
        }
      }
    }
    
    if (!resumeContent) {
      throw new Error('No resume found for scoring')
    }
    
    // Call the multi-agent scoring API
    const scoringResponse = await fetch(
      `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/jobs/score-multi-agent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${context.authToken}`
        },
        body: JSON.stringify({
          jobs,
          resume: resumeContent
        })
      }
    )
    
    if (!scoringResponse.ok) {
      throw new Error('Job scoring failed')
    }
    
    const scoringData = await scoringResponse.json() as any
    
    // Transform the response
    const scoredJobs: JobSearchResult[] = scoringData.jobs.map((job: any) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      salary: job.salary,
      postedAt: job.postedAt,
      matchingScore: job.matchingScore,
      matchingSummary: job.matchingSummary,
      applyUrl: job.applyUrl
    }))
    
    return {
      scoredJobs
    }
  }
}