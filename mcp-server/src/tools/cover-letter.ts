import { z } from 'zod'
import fetch from 'node-fetch'
import { CoverLetterSchema, AuthContext, CoverLetter } from '../types/index.js'

export const coverLetterTool = {
  name: 'cover_letter',
  description: 'Generate or edit a cover letter for a specific job',
  inputSchema: {
    type: 'object',
    properties: {
      jobId: {
        type: 'string',
        description: 'Job ID to create cover letter for'
      },
      resumeId: {
        type: 'string',
        description: 'Resume ID to base cover letter on (optional, uses default if not provided)'
      },
      mode: {
        type: 'string',
        enum: ['agent', 'ask'],
        description: 'Agent mode creates/edits, ask mode provides advice'
      },
      request: {
        type: 'string',
        description: 'Specific request or customization'
      },
      existingCoverLetterId: {
        type: 'string',
        description: 'Existing cover letter ID for editing (optional)'
      },
      _auth: {
        type: 'string',
        description: 'Authentication token (required)'
      }
    },
    required: ['jobId', 'mode', 'request', '_auth']
  },
  handler: async (args: any, context: AuthContext): Promise<{
    reply: string,
    coverLetter?: string,
    coverLetterId?: string
  }> => {
    // Validate input
    const input = CoverLetterSchema.parse(args)
    
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
    
    // Get existing cover letter if editing
    let existingCoverLetter = ''
    if (input.existingCoverLetterId) {
      const coverLetterResponse = await fetch(
        `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/cover-letters/${input.existingCoverLetterId}`,
        {
          headers: {
            'Authorization': `Bearer ${context.authToken}`
          }
        }
      )
      
      if (coverLetterResponse.ok) {
        const cl = await coverLetterResponse.json() as any
        existingCoverLetter = cl.content
      }
    }
    
    // Call the cover letter API
    const coverLetterResponse = await fetch(
      `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/openrouter/cover-letter`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${context.authToken}`
        },
        body: JSON.stringify({
          resume: resumeContent,
          jobTitle: job.title,
          company: job.company,
          jobDescription: job.description,
          mode: input.mode,
          userRequest: input.request,
          existingCoverLetter: existingCoverLetter || undefined
        })
      }
    )
    
    if (!coverLetterResponse.ok) {
      throw new Error('Cover letter generation failed')
    }
    
    const coverLetterData = await coverLetterResponse.json() as any
    
    // If in agent mode and cover letter was created, save it
    if (input.mode === 'agent' && coverLetterData.coverLetter) {
      const saveData = {
        jobId: input.jobId,
        jobTitle: job.title,
        company: job.company,
        content: coverLetterData.coverLetter
      }
      
      const saveResponse = await fetch(
        `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/cover-letters`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${context.authToken}`
          },
          body: JSON.stringify(saveData)
        }
      )
      
      if (saveResponse.ok) {
        const newCoverLetter = await saveResponse.json() as any
        return {
          reply: coverLetterData.reply,
          coverLetter: coverLetterData.coverLetter,
          coverLetterId: newCoverLetter.id
        }
      }
    }
    
    return {
      reply: coverLetterData.reply,
      coverLetter: coverLetterData.coverLetter
    }
  }
}