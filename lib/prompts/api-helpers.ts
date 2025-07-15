// lib/prompts/api-helpers.ts
import { promptManager } from './index'
import { JobScoringRequest, ResumeTailoringRequest, CoverLetterRequest, JobSearchResult } from './types'
import { ResponseParser } from './utils/response-parser'

/**
 * Execute job scoring using the centralized prompt system
 */
export async function executeJobScoring(request: JobScoringRequest): Promise<JobSearchResult[]> {
  try {
    // Format jobs for the prompt
    const jobsForPrompt = request.jobs.map(job => 
      `ID: ${job.id}\nJob Title: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location || 'Not specified'}\nDescription: ${job.description}`
    ).join('\n\n---\n\n')

    // Execute the scoring prompt
    const response = await promptManager.executePrompt({
      promptId: 'job-scoring-professional',
      variables: {
        jobs: jobsForPrompt,
        resume: request.resume
      },
      context: {
        userId: request.userId,
        metadata: {
          jobCount: request.jobs.length,
          timestamp: new Date().toISOString()
        }
      }
    })

    if (!response.success) {
      throw new Error(response.error || 'Job scoring failed')
    }

    // Transform response back to JobSearchResult format
    const scoredJobs = response.data
    return request.jobs.map(job => {
      const scoredJob = scoredJobs.find((s: any) => s.id === job.id)
      return {
        ...job,
        matchingScore: scoredJob?.overallScore || 0,
        matchingSummary: scoredJob?.summary || 'AI analysis failed',
        scoreDetails: {
          strengths: scoredJob?.strengths || [],
          gaps: scoredJob?.gaps || [],
          recommendations: scoredJob?.recommendations || []
        }
      }
    })
  } catch (error) {
    console.error('Job scoring error:', error)
    throw error
  }
}

/**
 * Execute job summary generation using the centralized prompt system
 */
export async function executeJobSummary(jobs: JobSearchResult[]): Promise<JobSearchResult[]> {
  try {
    // Format jobs for the prompt
    const jobsForPrompt = jobs.map(job => 
      `ID: ${job.id}\nJob Title: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location || 'Not specified'}\nDescription: ${job.description}`
    ).join('\n\n---\n\n')

    // Execute the summary prompt
    const response = await promptManager.executePrompt({
      promptId: 'job-summary-concise',
      variables: {
        jobs: jobsForPrompt
      },
      context: {
        metadata: {
          jobCount: jobs.length,
          timestamp: new Date().toISOString()
        }
      }
    })

    if (!response.success) {
      throw new Error(response.error || 'Job summary generation failed')
    }

    // Transform response back to JobSearchResult format
    const summaries = response.data
    return jobs.map(job => {
      const summary = summaries.find((s: any) => s.id === job.id)
      return {
        ...job,
        snippet: summary?.summary || job.snippet || 'Summary not available'
      }
    })
  } catch (error) {
    console.error('Job summary error:', error)
    throw error
  }
}

/**
 * Execute resume tailoring using the centralized prompt system
 */
export async function executeResumeTailoring(request: ResumeTailoringRequest): Promise<{ reply: string; updatedResume?: string }> {
  try {
    // Choose the appropriate prompt based on mode
    const promptId = request.mode === 'agent' ? 'resume-tailoring-ats' : 'resume-tailoring-advisory'
    
    // Execute the tailoring prompt
    const response = await promptManager.executePrompt({
      promptId,
      variables: {
        resume: request.resume,
        jobTitle: request.jobTitle,
        company: request.company,
        jobDescription: request.jobDescription,
        userRequest: request.userRequest
      },
      context: {
        metadata: {
          mode: request.mode,
          timestamp: new Date().toISOString()
        }
      }
    })

    if (!response.success) {
      throw new Error(response.error || 'Resume tailoring failed')
    }

    if (request.mode === 'agent') {
      // Parse the structured response for agent mode
      const parsed = ResponseParser.parseAgentResponse(response.data)
      return {
        reply: parsed.summary || 'Resume updated successfully',
        updatedResume: parsed.updatedContent || request.resume
      }
    } else {
      // For advisory mode, return the advice directly
      return {
        reply: response.data
      }
    }
  } catch (error) {
    console.error('Resume tailoring error:', error)
    throw error
  }
}

/**
 * Execute resume editing using the centralized prompt system
 */
export async function executeResumeEditing(request: { resume: string; userRequest: string; mode: 'agent' | 'ask' }): Promise<{ reply: string; updatedResume?: string }> {
  try {
    // Choose the appropriate prompt based on mode
    const promptId = request.mode === 'agent' ? 'resume-editing-agent' : 'resume-editing-advisor'
    
    // Execute the editing prompt
    const response = await promptManager.executePrompt({
      promptId,
      variables: {
        resume: request.resume,
        userRequest: request.userRequest
      },
      context: {
        metadata: {
          mode: request.mode,
          timestamp: new Date().toISOString()
        }
      }
    })

    if (!response.success) {
      throw new Error(response.error || 'Resume editing failed')
    }

    if (request.mode === 'agent') {
      // Parse the structured response for agent mode
      const parsed = ResponseParser.parseAgentResponse(response.data)
      return {
        reply: parsed.summary || 'Resume updated successfully',
        updatedResume: parsed.updatedContent || request.resume
      }
    } else {
      // For advisory mode, return the advice directly
      return {
        reply: response.data
      }
    }
  } catch (error) {
    console.error('Resume editing error:', error)
    throw error
  }
}

/**
 * Execute cover letter generation using the centralized prompt system
 */
export async function executeCoverLetterGeneration(request: CoverLetterRequest): Promise<{ reply: string; coverLetter?: string }> {
  try {
    let promptId: string
    
    if (request.mode === 'agent') {
      // Choose generation or editing based on whether existing cover letter exists
      promptId = request.existingCoverLetter ? 'cover-letter-editing-agent' : 'cover-letter-generation-professional'
    } else {
      // Advisory mode
      promptId = 'cover-letter-editing-advisory'
    }
    
    // Prepare variables
    const variables: any = {
      resume: request.resume,
      jobTitle: request.jobTitle,
      company: request.company,
      jobDescription: request.jobDescription,
      userRequest: request.userRequest
    }
    
    // Add existing cover letter if editing
    if (request.existingCoverLetter) {
      variables.existingCoverLetter = request.existingCoverLetter
    }

    // Execute the cover letter prompt
    const response = await promptManager.executePrompt({
      promptId,
      variables,
      context: {
        metadata: {
          mode: request.mode,
          isEditing: !!request.existingCoverLetter,
          timestamp: new Date().toISOString()
        }
      }
    })

    if (!response.success) {
      throw new Error(response.error || 'Cover letter generation failed')
    }

    if (request.mode === 'agent') {
      if (request.existingCoverLetter) {
        // Editing mode - response is the complete cover letter
        return {
          reply: 'Cover letter updated successfully',
          coverLetter: response.data
        }
      } else {
        // Generation mode - parse the structured response
        const parsed = ResponseParser.parseAgentResponse(response.data)
        return {
          reply: parsed.summary || 'Cover letter generated successfully',
          coverLetter: parsed.updatedContent || response.data
        }
      }
    } else {
      // Advisory mode - return the advice directly
      return {
        reply: response.data
      }
    }
  } catch (error) {
    console.error('Cover letter generation error:', error)
    throw error
  }
}

/**
 * Get prompt statistics and usage information
 */
export async function getPromptStats(): Promise<{
  totalRequests: number
  registeredPrompts: number
  cacheSize: number
  promptsByTag: Record<string, number>
}> {
  return promptManager.getStats()
}

/**
 * Clear the prompt cache
 */
export async function clearPromptCache(): Promise<void> {
  promptManager.clearCache()
}

/**
 * Get all available prompts
 */
export async function getAvailablePrompts(): Promise<Array<{
  id: string
  name: string
  description: string
  tags: string[]
  version: string
}>> {
  return promptManager.getAllPrompts().map(prompt => ({
    id: prompt.id,
    name: prompt.name,
    description: prompt.description,
    tags: prompt.tags,
    version: prompt.version
  }))
}