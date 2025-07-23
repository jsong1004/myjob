import { z } from 'zod'
import fetch from 'node-fetch'
import { JobSearchSchema, AuthContext, JobSearchResult } from '../types/index.js'

export const jobSearchTool = {
  name: 'search_jobs',
  description: 'Search for job opportunities with optional filters',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: "Job search query (e.g., 'software engineer', 'data scientist')"
      },
      location: {
        type: 'string',
        description: "Job location (e.g., 'San Francisco, CA', 'Remote')"
      },
      filters: {
        type: 'object',
        properties: {
          experienceLevel: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['entry', 'mid', 'senior', 'lead', 'executive']
            }
          },
          jobType: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['full-time', 'part-time', 'contract', 'internship']
            }
          },
          workArrangement: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['remote', 'hybrid', 'on-site']
            }
          },
          salaryMin: { type: 'number' },
          salaryMax: { type: 'number' },
          postedWithin: {
            type: 'string',
            enum: ['24h', '3d', '1w', '2w', '1m']
          }
        }
      },
      _auth: {
        type: 'string',
        description: 'Authentication token (required)'
      }
    },
    required: ['query', '_auth']
  },
  handler: async (args: any, context: AuthContext): Promise<{ jobs: JobSearchResult[], count: number }> => {
    // Validate input
    const input = JobSearchSchema.parse(args)
    
    // Call the enhanced job search API
    const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000'}/api/jobs/search-enhanced`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${context.authToken}`
      },
      body: JSON.stringify({
        query: input.query,
        location: input.location || 'United States',
        filters: input.filters,
        limit: 50,
        forceLive: false // Use batch jobs when available
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Job search failed: ${error}`)
    }
    
    const data = await response.json() as any
    
    // Transform the response
    const jobs: JobSearchResult[] = data.jobs.map((job: any) => ({
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
      jobs,
      count: jobs.length
    }
  }
}