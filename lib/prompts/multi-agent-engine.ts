// lib/prompts/multi-agent-engine.ts
/**
 * Multi-Agent Job Scoring Engine
 * 
 * This module implements a sophisticated job scoring system using 9 specialized AI agents:
 * - 8 scoring agents that analyze specific aspects of job-candidate fit
 * - 1 orchestration agent that combines and synthesizes results
 * 
 * Key Features:
 * - Individual token tracking for each agent (≈3,300 tokens per scoring agent)
 * - Parallel agent execution for performance
 * - Automatic activity logging for cost monitoring
 * - Fallback scoring on agent failures
 * 
 * Total token usage per job: ≈29,925 tokens
 * 
 * @module multi-agent-engine
 */
import { promptManager } from './index'
import { 
  AgentType, 
  AgentResult, 
  AgentResults, 
  MultiAgentScoreResult,
  OrchestrationResult,
  JobSearchResult,
  SCORE_CATEGORIES,
  ENHANCED_SCORING_WEIGHTS 
} from './types'

/**
 * Execute a single agent with error handling, retry logic, and activity logging
 * 
 * Each agent execution:
 * 1. Runs a specialized prompt for its domain (e.g., technical skills, experience)
 * 2. Logs individual activity with actual token usage from OpenRouter
 * 3. Returns structured results with usage data
 * 4. Falls back to conservative scoring on failure
 * 
 * Typical token usage: 3,300 tokens per agent (6,400 for orchestration)
 * 
 * @param agentType - Type of agent to execute (e.g., 'technicalSkills', 'education')
 * @param candidateData - Object containing the candidate's resume
 * @param jobData - Job information to score against
 * @param openRouterApiKey - API key for OpenRouter
 * @param userId - User ID for activity attribution (defaults to 'system')
 * @returns Promise<AgentResult> with execution details and usage data
 */
async function executeAgent(
  agentType: AgentType,
  candidateData: { resume: string },
  jobData: JobSearchResult,
  openRouterApiKey: string,
  userId?: string
): Promise<AgentResult> {
  
  const startTime = Date.now()
  console.log(`🤖 [${agentType}] Starting agent execution...`)
  
  try {
    // Get the appropriate prompt ID for the agent
    const promptIdMap: Record<AgentType, string> = {
      technicalSkills: 'multi-agent-technical-skills',
      experienceDepth: 'multi-agent-experience-depth',
      achievements: 'multi-agent-achievements',
      education: 'multi-agent-education',
      softSkills: 'multi-agent-soft-skills',
      careerProgression: 'multi-agent-career-progression',
      strengths: 'multi-agent-strengths',
      weaknesses: 'multi-agent-weaknesses',
      orchestration: 'multi-agent-orchestration'
    }

    const promptId = promptIdMap[agentType]
    if (!promptId) {
      throw new Error(`No prompt ID found for agent type: ${agentType}`)
    }

    // Format job data for the prompt
    const jobForPrompt = JSON.stringify({
      title: jobData.title,
      company: jobData.company,
      description: jobData.description,
      location: jobData.location,
      requirements: jobData.description, // Additional parsing could be done here
    }, null, 2)

    // Execute the agent prompt with extended timeout for multi-agent processing
    const response = await promptManager.executePrompt({
      promptId,
      variables: {
        job: jobForPrompt,
        resume: candidateData.resume
      },
      context: {
        metadata: {
          agentType,
          jobId: jobData.id,
          timestamp: new Date().toISOString()
        }
      },
      overrides: {
        // Individual agents should be faster since they're focused
        maxTokens: 1000 // Reduced from default for faster responses
      }
    })

    if (!response.success) {
      throw new Error(response.error || `${agentType} agent execution failed`)
    }

    const executionTime = Date.now() - startTime
    console.log(`✅ [${agentType}] Agent completed in ${executionTime}ms`)

    // Log individual agent activity to track each OpenRouter API call separately
    if (response.usage && response.usage.totalTokens > 0) {
      try {
        const { logActivity } = await import('@/lib/activity-logger')
        
        await logActivity({
          userId: userId || 'system',
          activityType: 'job_scoring_agent',
          tokenUsage: response.usage.totalTokens,
          timeTaken: executionTime / 1000,
          metadata: {
            model: 'openai/gpt-4o-mini',
            agent_type: agentType,
            job_title: jobData.title,
            job_company: jobData.company,
            execution_time_ms: executionTime,
            prompt_tokens: response.usage.promptTokens,
            completion_tokens: response.usage.completionTokens,
            cached_tokens: response.usage.cachedTokens || 0,
            cache_hit_rate: response.usage.promptTokens > 0 
              ? (response.usage.cachedTokens / response.usage.promptTokens * 100).toFixed(1) + '%' 
              : '0%',
            estimated_cost: response.usage.estimatedCost || 0,
            cost_savings: response.usage.costSavings || 0,
            scoring_context: 'multi_agent_individual',
            agent_execution: true
          }
        })
        console.log(`💰 [${agentType}] Agent activity logged: ${response.usage.totalTokens} tokens`)
      } catch (activityError) {
        console.warn(`⚠️ [${agentType}] Failed to log agent activity:`, activityError)
      }
    }

    return {
      agentType,
      result: response.data,
      executedAt: new Date().toISOString(),
      executionTime,
      usage: response.usage
    }
    
  } catch (error) {
    const executionTime = Date.now() - startTime
    const isTimeout = error instanceof Error && error.message.includes('timeout')
    
    if (isTimeout) {
      console.warn(`⏱️ [${agentType}] Agent timed out after ${executionTime}ms - using fallback`)
    } else {
      console.error(`❌ [${agentType}] Agent failed after ${executionTime}ms:`, error)
    }
    
    // Return a fallback result with appropriate scoring based on agent type
    const fallbackScores: Record<string, number> = {
      technicalSkills: 45, // Conservative estimate for missing technical evaluation
      experienceDepth: 50, // Neutral score for experience
      achievements: 40,    // Lower score when achievements can't be evaluated
      education: 60,       // Moderate score for education
      softSkills: 55,      // Moderate score for soft skills
      careerProgression: 50 // Neutral score for career progression
    }
    
    return {
      agentType,
      result: {
        categoryScore: fallbackScores[agentType] || 45,
        reasoning: isTimeout 
          ? `${agentType} evaluation timed out - using conservative score`
          : `${agentType} evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: true,
        fallback: true
      },
      executedAt: new Date().toISOString(),
      executionTime
    }
  }
}

/**
 * Execute all scoring and analysis agents in parallel
 * 
 * This function coordinates the execution of 8 specialized agents:
 * 1. technicalSkills - Evaluates programming languages, frameworks, tools
 * 2. experienceDepth - Assesses years of experience and relevance
 * 3. achievements - Analyzes quantifiable accomplishments and impact
 * 4. education - Reviews degrees, certifications, and continuous learning
 * 5. softSkills - Evaluates communication, leadership, and cultural fit
 * 6. careerProgression - Analyzes growth trajectory and stability
 * 7. strengths - Identifies top 5 candidate strengths
 * 8. weaknesses - Identifies areas for improvement with development plans
 * 
 * All agents run in parallel for performance, with individual activity logging.
 * Total execution time: typically 15-25 seconds for all agents.
 * 
 * @param candidateData - Object containing the candidate's resume
 * @param jobData - Job information to score against
 * @param openRouterApiKey - API key for OpenRouter
 * @param userId - User ID for activity attribution
 * @returns Promise<AgentResults> with organized results and execution metadata
 */
export async function executeAllAgentsParallel(
  candidateData: { resume: string },
  jobData: JobSearchResult,
  openRouterApiKey: string,
  userId?: string
): Promise<AgentResults> {
  
  console.log('🚀 [MultiAgent] Starting parallel execution of 8 agents...')
  const overallStartTime = Date.now()
  
  const agentTypes: AgentType[] = [
    'technicalSkills',
    'experienceDepth', 
    'achievements',
    'education',
    'softSkills',
    'careerProgression',
    'strengths',
    'weaknesses'
  ]

  try {
    // Execute all agents in parallel
    const agentPromises = agentTypes.map(agentType => 
      executeAgent(agentType, candidateData, jobData, openRouterApiKey, userId)
    )
    
    const agentResults = await Promise.all(agentPromises)
    const totalExecutionTime = Date.now() - overallStartTime
    
    console.log(`✅ [MultiAgent] All agents completed in ${totalExecutionTime}ms`)
    
    // Organize results by agent type
    const organizedResults: AgentResults = {
      scoring: {},
      analysis: {},
      executionMetadata: {
        totalExecutionTime,
        agentsExecuted: agentTypes.length,
        timestamp: new Date().toISOString()
      }
    }
    
    // Organize results into scoring and analysis categories
    agentResults.forEach(({ agentType, result, executedAt }) => {
      if (['strengths', 'weaknesses'].includes(agentType)) {
        organizedResults.analysis[agentType as 'strengths' | 'weaknesses'] = { 
          result, 
          executedAt 
        }
      } else {
        organizedResults.scoring[agentType as keyof typeof organizedResults.scoring] = { 
          result, 
          executedAt 
        }
      }
    })
    
    return organizedResults
    
  } catch (error) {
    console.error('❌ [MultiAgent] Parallel execution failed:', error)
    throw new Error(`Multi-agent execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Execute the orchestration agent to combine all results
 * 
 * The orchestration agent is the final step in multi-agent scoring:
 * - Receives all 8 agent results as input
 * - Synthesizes results into a final comprehensive assessment
 * - Calculates weighted overall score using ENHANCED_SCORING_WEIGHTS
 * - Generates hiring recommendation and interview focus areas
 * - Uses significantly more tokens (≈6,400) due to processing all agent data
 * 
 * The agent applies business logic and validation to ensure scores are realistic
 * and recommendations are actionable.
 * 
 * @param agentResults - Results from all 8 specialized agents
 * @param candidateData - Original candidate data for context
 * @param jobData - Job information for final assessment
 * @param openRouterApiKey - API key for OpenRouter
 * @param userId - User ID for activity logging
 * @returns Promise<OrchestrationResult> with final assessment and usage data
 */
async function executeOrchestrationAgent(
  agentResults: AgentResults,
  candidateData: { resume: string },
  jobData: JobSearchResult,
  openRouterApiKey: string,
  userId?: string
): Promise<OrchestrationResult> {
  
  console.log('🎭 [Orchestration] Starting result combination...')
  const startTime = Date.now()
  
  try {
    // Prepare agent results for the orchestration prompt
    const agentResultsForPrompt = JSON.stringify(agentResults, null, 2)
    
    const jobForPrompt = JSON.stringify({
      title: jobData.title,
      company: jobData.company,
      description: jobData.description,
      location: jobData.location,
    }, null, 2)

    // Execute orchestration prompt with increased token limit
    const response = await promptManager.executePrompt({
      promptId: 'multi-agent-orchestration',
      variables: {
        agentResults: agentResultsForPrompt,
        job: jobForPrompt,
        resume: candidateData.resume
      },
      context: {
        metadata: {
          agentType: 'orchestration',
          jobId: jobData.id,
          timestamp: new Date().toISOString()
        }
      },
      overrides: {
        // Orchestration needs more tokens to process all agent results
        maxTokens: 2000
      }
    })

    if (!response.success) {
      throw new Error(response.error || 'Orchestration failed')
    }

    const executionTime = Date.now() - startTime
    console.log(`✅ [Orchestration] Completed in ${executionTime}ms`)

    // Log orchestration agent activity
    if (response.usage && response.usage.totalTokens > 0) {
      try {
        const { logActivity } = await import('@/lib/activity-logger')
        
        await logActivity({
          userId: userId || 'system',
          activityType: 'job_scoring_agent',
          tokenUsage: response.usage.totalTokens,
          timeTaken: executionTime / 1000,
          metadata: {
            model: 'openai/gpt-4o-mini',
            agent_type: 'orchestration',
            job_title: jobData.title,
            job_company: jobData.company,
            execution_time_ms: executionTime,
            prompt_tokens: response.usage.promptTokens,
            completion_tokens: response.usage.completionTokens,
            cached_tokens: response.usage.cachedTokens || 0,
            cache_hit_rate: response.usage.promptTokens > 0 
              ? (response.usage.cachedTokens / response.usage.promptTokens * 100).toFixed(1) + '%' 
              : '0%',
            estimated_cost: response.usage.estimatedCost || 0,
            cost_savings: response.usage.costSavings || 0,
            scoring_context: 'multi_agent_orchestration',
            agent_execution: true
          }
        })
        console.log(`💰 [Orchestration] Agent activity logged: ${response.usage.totalTokens} tokens`)
      } catch (activityError) {
        console.warn('⚠️ [Orchestration] Failed to log agent activity:', activityError)
      }
    }

    const result = response.data
    
    // Validate and enhance the orchestration result
    const orchestrationResult = validateOrchestrationResult(result, agentResults)
    
    // Add usage data from orchestration to the result
    return {
      ...orchestrationResult,
      usage: response.usage
    } as any
    
  } catch (error) {
    console.error('❌ [Orchestration] Failed:', error)
    
    // Fallback orchestration using local logic
    console.log('🔄 [Orchestration] Using fallback logic...')
    return createFallbackOrchestrationResult(agentResults, candidateData, jobData)
  }
}

/**
 * Validate and enhance orchestration result with business logic
 */
function validateOrchestrationResult(
  result: any, 
  agentResults: AgentResults
): OrchestrationResult {
  
  // Calculate weighted score from individual agent scores
  const weights = ENHANCED_SCORING_WEIGHTS
  let calculatedScore = 0
  let totalWeight = 0
  
  const scoringAgents = ['technicalSkills', 'experienceDepth', 'achievements', 'education', 'softSkills', 'careerProgression'] as const
  
  console.log('🔍 [Orchestration] Starting score calculation with weights:', weights)
  
  scoringAgents.forEach(agentType => {
    const agentResult = agentResults.scoring[agentType]
    if (agentResult && !agentResult.result.error) {
      const score = agentResult.result.categoryScore || 0
      const weight = weights[agentType]
      const weightedScore = score * weight
      calculatedScore += weightedScore
      totalWeight += weight
      console.log(`🔍 [Orchestration] ${agentType}: score=${score}, weight=${weight}, weighted=${weightedScore}`)
    }
  })
  
  console.log(`🔍 [Orchestration] Total calculated score: ${calculatedScore}, totalWeight: ${totalWeight}`)
  
  // Normalize if we're missing some agents
  if (totalWeight > 0) {
    calculatedScore = calculatedScore / totalWeight
  }
  
  console.log(`🔍 [Orchestration] Normalized calculated score: ${calculatedScore}`)
  
  // Use calculated score if AI result is way off
  const aiScore = result.overallScore || 0
  console.log(`🔍 [Orchestration] AI provided score: ${aiScore}`)
  const finalScore = Math.abs(aiScore - calculatedScore) > 25 ? calculatedScore : aiScore
  console.log(`🔍 [Orchestration] Final score selected: ${finalScore} (AI diff: ${Math.abs(aiScore - calculatedScore)})`)
  
  // Determine category based on final score
  const category = Object.entries(SCORE_CATEGORIES).find(([key, cat]) => 
    finalScore >= cat.min && finalScore <= cat.max
  )?.[0] || 'poor'
  
  const categoryDetails = SCORE_CATEGORIES[category]
  
  return {
    overallScore: Math.round(finalScore),
    category: category as any,
    categoryDetails: {
      label: categoryDetails.label,
      description: categoryDetails.description,
      action: categoryDetails.action,
      color: categoryDetails.color
    },
    breakdown: result.breakdown || {},
    keyStrengths: result.keyStrengths || [],
    keyWeaknesses: result.keyWeaknesses || [],
    redFlags: result.redFlags || [],
    positiveIndicators: result.positiveIndicators || [],
    hiringRecommendation: result.hiringRecommendation || 'Standard evaluation recommended',
    interviewFocus: result.interviewFocus || [],
    executionSummary: {
      agentsExecuted: agentResults.executionMetadata.agentsExecuted,
      totalExecutionTime: `${agentResults.executionMetadata.totalExecutionTime}ms`,
      scoringVersion: '3.0-multi-agent'
    }
  }
}

/**
 * Create fallback orchestration result when AI orchestration fails
 */
function createFallbackOrchestrationResult(
  agentResults: AgentResults,
  candidateData: { resume: string },
  jobData: JobSearchResult
): OrchestrationResult {
  
  console.log('🔧 [Fallback] Creating fallback orchestration result...')
  
  // Calculate weighted score
  const weights = ENHANCED_SCORING_WEIGHTS
  let totalScore = 0
  let totalWeight = 0
  const breakdown: any = {}
  
  const scoringAgents = ['technicalSkills', 'experienceDepth', 'achievements', 'education', 'softSkills', 'careerProgression'] as const
  
  console.log('🔧 [Fallback] Starting fallback score calculation with weights:', weights)
  
  scoringAgents.forEach(agentType => {
    const agentResult = agentResults.scoring[agentType]
    if (agentResult) {
      const score = agentResult.result.categoryScore || 0
      const weight = weights[agentType]
      const weightedScore = score * weight
      totalScore += weightedScore
      totalWeight += weight
      console.log(`🔧 [Fallback] ${agentType}: score=${score}, weight=${weight}, weighted=${weightedScore}`)
      
      const isFallback = agentResult.result.fallback || agentResult.result.error
      breakdown[agentType] = {
        score,
        reasoning: agentResult.result.reasoning || 'Agent evaluation completed',
        weight: weight * 100,
        ...(isFallback && { fallback: true })
      }
    } else {
      // Agent completely missing
      const fallbackScore = 45 // Conservative fallback
      const weight = weights[agentType]
      totalScore += fallbackScore * weight
      totalWeight += weight
      
      breakdown[agentType] = {
        score: fallbackScore,
        reasoning: 'Agent not executed - using fallback score',
        weight: weight * 100,
        fallback: true
      }
    }
  })
  
  console.log(`🔧 [Fallback] Total calculated score: ${totalScore}, totalWeight: ${totalWeight}`)
  const finalScore = totalWeight > 0 ? (totalScore / totalWeight) : 0
  console.log(`🔧 [Fallback] Final calculated score: ${finalScore}`)
  
  // Determine category
  const category = Object.entries(SCORE_CATEGORIES).find(([key, cat]) => 
    finalScore >= cat.min && finalScore <= cat.max
  )?.[0] || 'poor'
  
  const categoryDetails = SCORE_CATEGORIES[category]
  
  // Extract strengths and weaknesses
  const keyStrengths = agentResults.analysis.strengths?.result.topStrengths || []
  const keyWeaknesses = agentResults.analysis.weaknesses?.result.topWeaknesses || []
  
  // Create basic red flags and positive indicators
  const redFlags: string[] = []
  const positiveIndicators: string[] = []
  
  scoringAgents.forEach(agentType => {
    const agentResult = agentResults.scoring[agentType]
    if (agentResult && !agentResult.result.error) {
      const score = agentResult.result.categoryScore || 0
      if (score < 40) {
        redFlags.push(`Low ${agentType} score (${score}%)`)
      } else if (score >= 80) {
        positiveIndicators.push(`Strong ${agentType} performance (${score}%)`)
      }
    }
  })
  
  return {
    overallScore: Math.round(finalScore),
    category: category as any,
    categoryDetails: {
      label: categoryDetails.label,
      description: categoryDetails.description,
      action: categoryDetails.action,
      color: categoryDetails.color
    },
    breakdown,
    keyStrengths,
    keyWeaknesses,
    redFlags,
    positiveIndicators,
    hiringRecommendation: `${categoryDetails.action} - Overall score: ${Math.round(finalScore)}%`,
    interviewFocus: redFlags.length > 0 ? ['Address identified gaps', 'Verify key strengths'] : ['Standard competency assessment'],
    executionSummary: {
      agentsExecuted: agentResults.executionMetadata.agentsExecuted,
      totalExecutionTime: `${agentResults.executionMetadata.totalExecutionTime}ms`,
      scoringVersion: '3.0-multi-agent-fallback'
    }
  }
}

/**
 * Main multi-agent scoring function
 * 
 * This is the primary entry point for multi-agent job scoring. It:
 * 1. Executes 8 specialized agents in parallel (15-25 seconds)
 * 2. Runs orchestration agent to synthesize results (5-10 seconds)
 * 3. Logs individual activities for each agent (9 total activities)
 * 4. Aggregates token usage and cost data
 * 5. Returns comprehensive scoring results with detailed breakdown
 * 
 * Expected token usage:
 * - Total: ≈29,925 tokens per job
 * - Cost: ≈$0.006-0.010 per job (depending on cache hits)
 * - Time: 25-35 seconds total execution
 * 
 * The function includes automatic fallback scoring if individual agents fail,
 * ensuring robust operation even with API timeouts or errors.
 * 
 * @param candidateData - Object containing the candidate's resume
 * @param jobData - Job information to evaluate against
 * @param openRouterApiKey - API key for OpenRouter
 * @param userId - User ID for activity tracking and billing attribution
 * @returns Promise<MultiAgentScoreResult> with comprehensive scoring analysis
 */
export async function calculateMultiAgentScore(
  candidateData: { resume: string },
  jobData: JobSearchResult,
  openRouterApiKey: string,
  userId?: string
): Promise<MultiAgentScoreResult> {
  
  console.log('🎬 [MultiAgent] Starting multi-agent scoring process...')
  const startTime = Date.now()
  
  try {
    // Step 1: Execute all agents in parallel
    const agentResults = await executeAllAgentsParallel(
      candidateData, 
      jobData, 
      openRouterApiKey,
      userId
    )
    
    // Step 2: Orchestrate results
    const orchestrationResult = await executeOrchestrationAgent(
      agentResults,
      candidateData,
      jobData, 
      openRouterApiKey,
      userId
    )
    
    const totalTime = Date.now() - startTime
    
    // Aggregate usage data from all agents and orchestration
    const aggregatedUsage = aggregateTokenUsage(agentResults, orchestrationResult)
    
    console.log(`🎉 [MultiAgent] Scoring completed in ${totalTime}ms`)
    
    return {
      ...orchestrationResult,
      agentResults,
      processedAt: new Date().toISOString(),
      totalProcessingTime: totalTime,
      usage: aggregatedUsage
    }
    
  } catch (error) {
    console.error('💥 [MultiAgent] Scoring failed:', error)
    throw new Error(`Multi-agent scoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Aggregate token usage from all agents and orchestration
 * 
 * This function sums up the actual token usage from:
 * - 8 scoring agents (≈3,300 tokens each)
 * - 1 orchestration agent (≈6,400 tokens)
 * 
 * The aggregated data is used for:
 * - Cost calculation and billing
 * - Performance monitoring and optimization
 * - Usage analytics and reporting
 * - Cache hit rate analysis
 * 
 * @param agentResults - Results from all scoring and analysis agents
 * @param orchestrationResult - Result from orchestration agent
 * @returns Aggregated usage data with total tokens, costs, and savings
 */
function aggregateTokenUsage(agentResults: AgentResults, orchestrationResult: OrchestrationResult) {
  let totalTokens = 0
  let promptTokens = 0
  let completionTokens = 0
  let cachedTokens = 0
  let estimatedCost = 0
  let costSavings = 0

  // Aggregate usage from all scoring agents
  Object.values(agentResults.scoring).forEach(agentData => {
    if (agentData?.usage) {
      totalTokens += agentData.usage.totalTokens || 0
      promptTokens += agentData.usage.promptTokens || 0
      completionTokens += agentData.usage.completionTokens || 0
      cachedTokens += agentData.usage.cachedTokens || 0
      estimatedCost += agentData.usage.estimatedCost || 0
      costSavings += agentData.usage.costSavings || 0
    }
  })

  // Aggregate usage from analysis agents
  Object.values(agentResults.analysis).forEach(agentData => {
    if (agentData?.usage) {
      totalTokens += agentData.usage.totalTokens || 0
      promptTokens += agentData.usage.promptTokens || 0
      completionTokens += agentData.usage.completionTokens || 0
      cachedTokens += agentData.usage.cachedTokens || 0
      estimatedCost += agentData.usage.estimatedCost || 0
      costSavings += agentData.usage.costSavings || 0
    }
  })

  // Add orchestration agent usage if available
  if ((orchestrationResult as any).usage) {
    const orchUsage = (orchestrationResult as any).usage
    totalTokens += orchUsage.totalTokens || 0
    promptTokens += orchUsage.promptTokens || 0
    completionTokens += orchUsage.completionTokens || 0
    cachedTokens += orchUsage.cachedTokens || 0
    estimatedCost += orchUsage.estimatedCost || 0
    costSavings += orchUsage.costSavings || 0
  }

  console.log(`💰 [Usage] Aggregated: ${totalTokens} tokens (${promptTokens}+${completionTokens}, ${cachedTokens} cached), $${estimatedCost.toFixed(4)}, saved $${costSavings.toFixed(4)}`)

  return {
    totalTokens,
    promptTokens,
    completionTokens,
    cachedTokens,
    estimatedCost,
    costSavings
  }
}

/**
 * Performance tracking for monitoring
 */
export function trackAgentPerformance(results: MultiAgentScoreResult): void {
  console.log(`📊 [Performance] ${results.totalProcessingTime}ms for ${results.executionSummary.agentsExecuted} agents`)
  
  // Calculate individual agent performance
  const agentPerformance: { [key: string]: number } = {}
  
  Object.entries(results.agentResults.scoring).forEach(([agentType, data]) => {
    if (data) {
      agentPerformance[agentType] = data.result.executionTime || 0
    }
  })
  
  Object.entries(results.agentResults.analysis).forEach(([agentType, data]) => {
    if (data) {
      agentPerformance[agentType] = data.result.executionTime || 0
    }
  })
  
  console.log('📈 [Performance] Agent execution times:', agentPerformance)
  
  // This could be extended to integrate with analytics systems
  // For example: send metrics to monitoring service, store in database, etc.
}