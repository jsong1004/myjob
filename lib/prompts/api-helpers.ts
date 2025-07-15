// lib/prompts/api-helpers.ts
import { promptManager } from './index'
import { JobScoringRequest, ResumeTailoringRequest, CoverLetterRequest, JobSearchResult, EnhancedScoreResult, SCORE_CATEGORIES, ENHANCED_SCORING_WEIGHTS, MultiAgentScoreResult } from './types'
import { ResponseParser } from './utils/response-parser'
import { calculateMultiAgentScore, trackAgentPerformance } from './multi-agent-engine'

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
 * Execute enhanced job scoring with detailed breakdown and improvement plans
 */
export async function executeEnhancedJobScoring(request: JobScoringRequest): Promise<JobSearchResult[]> {
  try {
    console.log('[Enhanced Scoring] Starting enhanced job scoring for', request.jobs.length, 'jobs')
    
    // Format jobs for the prompt
    const jobsForPrompt = request.jobs.map(job => 
      `ID: ${job.id}\nJob Title: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location || 'Not specified'}\nDescription: ${job.description}`
    ).join('\n\n---\n\n')

    console.log('[Enhanced Scoring] Jobs formatted for prompt')
    console.log('[Enhanced Scoring] Sample formatted job:', jobsForPrompt.substring(0, 300) + '...')

    // Execute the enhanced scoring prompt
    const response = await promptManager.executePrompt({
      promptId: 'job-scoring-enhanced-hiring-manager',
      variables: {
        jobs: jobsForPrompt,
        resume: request.resume
      },
      context: {
        userId: request.userId,
        metadata: {
          jobCount: request.jobs.length,
          timestamp: new Date().toISOString(),
          scoringType: 'enhanced'
        }
      }
    })

    console.log('[Enhanced Scoring] Prompt execution result:', response.success)
    if (response.error) {
      console.error('[Enhanced Scoring] Prompt execution error:', response.error)
    }

    if (!response.success) {
      console.error('[Enhanced Scoring] Prompt execution failed, falling back to basic scoring')
      return executeJobScoring(request)
    }

    console.log('[Enhanced Scoring] Response data type:', typeof response.data)
    console.log('[Enhanced Scoring] Response data length:', Array.isArray(response.data) ? response.data.length : 'not array')
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      console.log('[Enhanced Scoring] First response sample:', JSON.stringify(response.data[0], null, 2))
    }

    // Transform response back to JobSearchResult format with enhanced details
    const scoredJobs = response.data
    if (!Array.isArray(scoredJobs)) {
      console.error('[Enhanced Scoring] Response data is not an array:', scoredJobs)
      return executeJobScoring(request)
    }

    return request.jobs.map(job => {
      const scoredJob = scoredJobs.find((s: any) => s.id === job.id)
      if (!scoredJob) {
        console.warn('[Enhanced Scoring] No scored job found for ID:', job.id)
        console.log('[Enhanced Scoring] Available scored job IDs:', scoredJobs.map(s => s.id))
        return {
          ...job,
          matchingScore: 0,
          matchingSummary: 'AI analysis failed - no match found',
          scoreDetails: {}
        }
      }

      console.log('[Enhanced Scoring] Processing scored job:', scoredJob.id, 'score:', scoredJob.overallScore)

      // Validate and enhance the score
      const enhancedScore = validateAndEnhanceScore(scoredJob, request.resume, job)

      return {
        ...job,
        matchingScore: enhancedScore.overallScore,
        matchingSummary: enhancedScore.summary,
        scoreDetails: {
          strengths: enhancedScore.positiveIndicators || [],
          gaps: enhancedScore.redFlags || [],
          recommendations: enhancedScore.keyStrengths || []
        },
        enhancedScoreDetails: enhancedScore
      }
    })
  } catch (error) {
    console.error('Enhanced job scoring error:', error)
    // Fall back to basic scoring
    console.log('[Enhanced Scoring] Falling back to basic scoring due to error')
    return executeJobScoring(request)
  }
}

/**
 * Validate and enhance score with business logic
 */
function validateAndEnhanceScore(
  aiScore: any, 
  resume: string, 
  job: JobSearchResult
): EnhancedScoreResult {
  
  console.log('[Enhanced Scoring] Validating AI score:', aiScore)
  
  // Handle cases where AI response is malformed or incomplete
  let finalScore = aiScore.overallScore || 0
  const additionalRedFlags = []
  
  // If score is 0 or undefined, provide a basic fallback score
  if (finalScore === 0 || finalScore === undefined) {
    finalScore = 45 // Default to weak match
    additionalRedFlags.push("AI scoring failed - using fallback score")
  }
  
  // Additional validation rules
  if (finalScore > 85 && aiScore.redFlags?.length > 0) {
    finalScore = Math.min(finalScore, 80)
    additionalRedFlags.push("Score adjusted due to red flags")
  }
  
  // Experience validation - check for common experience indicators
  const resumeText = resume.toLowerCase()
  const jobText = job.description.toLowerCase()
  
  // Check for experience level mismatch
  if (jobText.includes('senior') && !resumeText.includes('senior') && !resumeText.includes('lead')) {
    if (finalScore > 70) {
      finalScore = Math.min(finalScore, 70)
      additionalRedFlags.push("Experience level mismatch - job requires senior level")
    }
  }
  
  // Check for required technology mentions
  const commonTechnologies = ['javascript', 'python', 'java', 'react', 'node', 'aws', 'sql', 'docker', 'kubernetes']
  const jobTechnologies = commonTechnologies.filter(tech => jobText.includes(tech))
  const resumeTechnologies = commonTechnologies.filter(tech => resumeText.includes(tech))
  
  const missingTechnologies = jobTechnologies.filter(tech => !resumeTechnologies.includes(tech))
  if (finalScore > 70 && missingTechnologies.length > 2) {
    finalScore = Math.min(finalScore, 65)
    additionalRedFlags.push(`Missing key technologies: ${missingTechnologies.join(', ')}`)
  }
  
  // Ensure breakdown scores are consistent with overall score
  if (aiScore.breakdown) {
    const weightedScore = Object.values(aiScore.breakdown).reduce((sum: number, detail: any) => {
      const weight = ENHANCED_SCORING_WEIGHTS[detail.category as keyof typeof ENHANCED_SCORING_WEIGHTS] || 0.1
      return sum + (detail.score * weight)
    }, 0)
    
    // If weighted score is significantly different from overall score, adjust
    if (Math.abs(weightedScore - finalScore) > 15) {
      finalScore = Math.round(weightedScore)
      additionalRedFlags.push("Score adjusted for consistency with breakdown")
    }
  }
  
  // Determine final category
  const category = Object.entries(SCORE_CATEGORIES).find(([key, cat]) => 
    finalScore >= cat.min && finalScore <= cat.max
  )?.[0] || 'poor'
  
  // Create a valid EnhancedScoreResult with fallback values
  const enhancedScore: EnhancedScoreResult = {
    overallScore: Math.round(finalScore),
    category: category as any,
    breakdown: aiScore.breakdown || {},
    redFlags: [...(aiScore.redFlags || []), ...additionalRedFlags],
    positiveIndicators: aiScore.positiveIndicators || [],
    hiringRecommendation: aiScore.hiringRecommendation || "Standard evaluation required",
    keyStrengths: aiScore.keyStrengths || [],
    keyWeaknesses: aiScore.keyWeaknesses || [],
    interviewFocus: aiScore.interviewFocus || [],
    summary: aiScore.summary || "AI analysis incomplete",
    validatedAt: new Date().toISOString(),
    scoringVersion: '2.0-enhanced'
  }
  
  console.log('[Enhanced Scoring] Validated score:', enhancedScore.overallScore, 'category:', enhancedScore.category)
  
  return enhancedScore
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

/**
 * Execute multi-agent job scoring - 8x faster, more accurate scoring
 */
export async function executeMultiAgentJobScoring(request: JobScoringRequest): Promise<JobSearchResult[]> {
  try {
    console.log('[MultiAgent] Starting multi-agent scoring for', request.jobs.length, 'jobs')
    
    const openRouterApiKey = process.env.OPENROUTER_API_KEY
    if (!openRouterApiKey) {
      throw new Error('Missing OpenRouter API key for multi-agent scoring')
    }

    // Process each job individually with multi-agent scoring
    const scoredJobs: JobSearchResult[] = []
    
    for (const job of request.jobs) {
      try {
        console.log(`[MultiAgent] Processing job: ${job.title} at ${job.company}`)
        
        // Execute multi-agent scoring for this job
        const multiAgentResult = await calculateMultiAgentScore(
          { resume: request.resume },
          job,
          openRouterApiKey
        )
        
        // Track performance metrics
        trackAgentPerformance(multiAgentResult)
        
        // Transform result to JobSearchResult format
        const scoredJob: JobSearchResult = {
          ...job,
          matchingScore: multiAgentResult.overallScore,
          matchingSummary: multiAgentResult.hiringRecommendation,
          scoreDetails: {
            strengths: multiAgentResult.keyStrengths,
            gaps: multiAgentResult.redFlags,
            recommendations: multiAgentResult.interviewFocus
          },
          enhancedScoreDetails: {
            overallScore: multiAgentResult.overallScore,
            category: multiAgentResult.category,
            breakdown: transformBreakdownToScoreDetails(multiAgentResult.breakdown),
            redFlags: multiAgentResult.redFlags,
            positiveIndicators: multiAgentResult.positiveIndicators,
            hiringRecommendation: multiAgentResult.hiringRecommendation,
            keyStrengths: multiAgentResult.keyStrengths,
            keyWeaknesses: multiAgentResult.keyWeaknesses,
            interviewFocus: multiAgentResult.interviewFocus,
            summary: multiAgentResult.hiringRecommendation,
            validatedAt: multiAgentResult.processedAt,
            scoringVersion: multiAgentResult.executionSummary.scoringVersion
          }
        }
        
        scoredJobs.push(scoredJob)
        
      } catch (jobError) {
        console.error(`[MultiAgent] Error processing job ${job.id}:`, jobError)
        
        // Add job with error state
        scoredJobs.push({
          ...job,
          matchingScore: 0,
          matchingSummary: 'Multi-agent analysis failed',
          scoreDetails: {
            strengths: [],
            gaps: ['Analysis system error'],
            recommendations: ['Manual review recommended']
          }
        })
      }
    }
    
    console.log(`[MultiAgent] Completed scoring for ${scoredJobs.length} jobs`)
    return scoredJobs
    
  } catch (error) {
    console.error('[MultiAgent] Multi-agent scoring failed:', error)
    
    // Fallback to enhanced scoring
    console.log('[MultiAgent] Falling back to enhanced scoring system')
    return executeEnhancedJobScoring(request)
  }
}

/**
 * Transform multi-agent breakdown to ScoreDetail format
 */
function transformBreakdownToScoreDetails(breakdown: any): {
  technicalSkills: any
  experienceDepth: any
  achievements: any
  education: any
  softSkills: any
  careerProgression: any
} {
  const defaultDetail = { score: 0, reasoning: 'Not evaluated', weight: 0 }
  
  return {
    technicalSkills: breakdown.technicalSkills || defaultDetail,
    experienceDepth: breakdown.experienceDepth || defaultDetail,
    achievements: breakdown.achievements || defaultDetail,
    education: breakdown.education || defaultDetail,
    softSkills: breakdown.softSkills || defaultDetail,
    careerProgression: breakdown.careerProgression || defaultDetail
  }
}