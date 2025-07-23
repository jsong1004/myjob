import { z } from 'zod'
import fetch from 'node-fetch'
import { ResumeTailoringSchema, AuthContext } from '../types/index.js'

export const resumeTailoringTool = {
  name: 'tailor_resume',
  description: 'Tailor a resume for a specific job using AI assistance',
  inputSchema: {
    type: 'object',
    properties: {
      resumeId: {
        type: 'string',
        description: 'Resume ID to tailor'
      },
      jobId: {
        type: 'string',
        description: 'Job ID to tailor for'
      },
      mode: {
        type: 'string',
        enum: ['agent', 'ask'],
        description: 'Agent mode makes changes, ask mode provides advice'
      },
      request: {
        type: 'string',
        description: 'Specific tailoring request or question'
      },
      _auth: {
        type: 'string',
        description: 'Authentication token (required)'
      }
    },
    required: ['resumeId', 'jobId', 'mode', 'request', '_auth']
  },
  handler: async (args: any, context: AuthContext): Promise<{
    reply: string,
    updatedResume?: string,
    resumeId?: string
  }> => {
    // Validate input
    const input = ResumeTailoringSchema.parse(args)
    
    // Get the resume
    const resumeResponse = await fetch(
      `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/resumes/${input.resumeId}`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`
        }
      }
    )
    
    if (!resumeResponse.ok) {
      throw new Error('Resume not found')
    }
    
    const resume = await resumeResponse.json() as any
    
    // Get the job details
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
    
    // Call the tailoring API
    const tailoringResponse = await fetch(
      `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/openrouter/tailor-resume`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${context.authToken}`
        },
        body: JSON.stringify({
          resume: resume.content,
          jobTitle: job.title,
          company: job.company,
          jobDescription: job.description,
          mode: input.mode,
          userRequest: input.request
        })
      }
    )
    
    if (!tailoringResponse.ok) {
      throw new Error('Resume tailoring failed')
    }
    
    const tailoringData = await tailoringResponse.json() as any
    
    // If in agent mode and resume was updated, save the new version
    if (input.mode === 'agent' && tailoringData.updatedResume) {
      const saveResponse = await fetch(
        `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/resumes`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${context.authToken}`
          },
          body: new FormData()
        }
      )
      
      if (saveResponse.ok) {
        const newResume = await saveResponse.json() as any
        return {
          reply: tailoringData.reply,
          updatedResume: tailoringData.updatedResume,
          resumeId: newResume.id
        }
      }
    }
    
    return {
      reply: tailoringData.reply,
      updatedResume: tailoringData.updatedResume
    }
  }
}