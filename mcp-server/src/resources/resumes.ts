import { ResumesQuerySchema, AuthContext, Resume } from '../types/index.js'
import fetch from 'node-fetch'

export const resumesResource = {
  uri: 'myjob://resumes',
  name: 'Resumes',
  description: 'Access your resume collection',
  mimeType: 'application/json',
  handler: async (params: URLSearchParams, context: AuthContext): Promise<{
    resumes: Resume[],
    defaultResumeId?: string,
    total: number
  }> => {
    // Parse query parameters
    const query = ResumesQuerySchema.parse({
      limit: params.get('limit') ? parseInt(params.get('limit')!) : 10,
      offset: params.get('offset') ? parseInt(params.get('offset')!) : 0
    })
    
    // Fetch resumes
    const response = await fetch(
      `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/resumes`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`
        }
      }
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch resumes')
    }
    
    const data = await response.json() as any
    
    // Apply pagination
    const start = query.offset || 0
    const end = start + (query.limit || 10)
    const paginatedResumes = data.resumes.slice(start, end)
    
    // Transform the response
    const resumes: Resume[] = paginatedResumes.map((resume: any) => ({
      id: resume.id,
      name: resume.name,
      content: resume.content,
      isDefault: resume.isDefault,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt
    }))
    
    // Find default resume
    const defaultResume = data.resumes.find((r: any) => r.isDefault)
    
    return {
      resumes,
      defaultResumeId: defaultResume?.id,
      total: data.resumes.length
    }
  }
}