import { SavedJobsQuerySchema, AuthContext, SavedJob } from '../types/index.js'
import fetch from 'node-fetch'

export const savedJobsResource = {
  uri: 'myjob://saved-jobs',
  name: 'Saved Jobs',
  description: 'Access your saved jobs collection with status tracking',
  mimeType: 'application/json',
  handler: async (params: URLSearchParams, context: AuthContext): Promise<{
    jobs: SavedJob[],
    total: number,
    hasMore: boolean
  }> => {
    // Parse query parameters
    const query = SavedJobsQuerySchema.parse({
      status: params.get('status') || undefined,
      limit: params.get('limit') ? parseInt(params.get('limit')!) : 20,
      offset: params.get('offset') ? parseInt(params.get('offset')!) : 0
    })
    
    // Build query string
    const queryParams = new URLSearchParams()
    if (query.status) queryParams.append('status', query.status)
    queryParams.append('limit', (query.limit || 20).toString())
    queryParams.append('offset', (query.offset || 0).toString())
    
    // Fetch saved jobs
    const response = await fetch(
      `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/saved-jobs?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`
        }
      }
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch saved jobs')
    }
    
    const data = await response.json() as any
    
    // Transform the response
    const jobs: SavedJob[] = data.jobs.map((job: any) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.originalData?.description || job.summary,
      salary: job.salary,
      postedAt: job.originalData?.postedAt || '',
      matchingScore: job.matchingScore,
      matchingSummary: job.matchingSummary,
      applyUrl: job.originalData?.applyUrl,
      savedAt: job.savedAt,
      status: job.status,
      notes: job.notes,
      resumeTailoredAt: job.resumeTailoredAt,
      coverLetterCreatedAt: job.coverLetterCreatedAt
    }))
    
    return {
      jobs,
      total: data.total || jobs.length,
      hasMore: jobs.length === (query.limit || 20)
    }
  }
}