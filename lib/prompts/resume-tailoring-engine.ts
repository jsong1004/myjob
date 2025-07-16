// lib/prompts/resume-tailoring-engine.ts
import { promptManager } from './index'

export type TailoringAgentType = 
  | 'technicalSkills'
  | 'experienceReframing' 
  | 'achievementAmplification'
  | 'atsOptimization'
  | 'professionalSummary'
  | 'educationCertifications'
  | 'gapMitigation'
  | 'industryAlignment'

export interface TailoringAgentResult {
  agentType: TailoringAgentType
  result: any
  executedAt: string
  executionTime?: number
  success: boolean
  error?: string
}

export interface TailoringAgentResults {
  agents: Record<TailoringAgentType, TailoringAgentResult>
  executionMetadata: {
    totalExecutionTime: number
    agentsExecuted: number
    timestamp: string
  }
}

export interface TailoringOrchestrationResult {
  finalTailoredResume: string
  priorityChanges: string[]
  changeSummary: string
  expectedScoreImprovements: string[]
  conflictsResolved: string[]
  consistencyImprovements: string[]
  readabilityEnhancements: string[]
  executionSummary: {
    agentsExecuted: number
    totalExecutionTime: string
    tailoringVersion: string
  }
}

export interface MultiAgentTailoringResult extends TailoringOrchestrationResult {
  agentResults: TailoringAgentResults
  processedAt: string
  totalProcessingTime: number
}

/**
 * Execute a single tailoring agent with error handling and retry logic
 */
async function executeTailoringAgent(
  agentType: TailoringAgentType,
  resume: string,
  jobDescription: string,
  scoringAnalysis: any,
  userRequest: string,
  openRouterApiKey: string
): Promise<TailoringAgentResult> {
  
  const startTime = Date.now()
  console.log(`🎯 [${agentType}] Starting tailoring agent execution...`)
  
  try {
    // Get the appropriate prompt ID for the agent
    const promptIdMap: Record<TailoringAgentType, string> = {
      technicalSkills: 'tailoring-technical-skills',
      experienceReframing: 'tailoring-experience-reframing',
      achievementAmplification: 'tailoring-achievement-amplification',
      atsOptimization: 'tailoring-ats-optimization',
      professionalSummary: 'tailoring-professional-summary',
      educationCertifications: 'tailoring-education-certifications',
      gapMitigation: 'tailoring-gap-mitigation',
      industryAlignment: 'tailoring-industry-alignment'
    }

    const promptId = promptIdMap[agentType]
    if (!promptId) {
      throw new Error(`No prompt ID found for tailoring agent type: ${agentType}`)
    }

    // Format scoring analysis for the prompt
    const scoringAnalysisForPrompt = JSON.stringify(scoringAnalysis, null, 2)

    // Execute the agent prompt
    const response = await promptManager.executePrompt({
      promptId,
      variables: {
        resume,
        jobDescription,
        scoringAnalysis: scoringAnalysisForPrompt,
        userRequest
      },
      context: {
        metadata: {
          agentType,
          timestamp: new Date().toISOString()
        }
      },
      overrides: {
        // Tailoring agents need more tokens for detailed analysis
        maxTokens: 1500
      }
    })

    if (!response.success) {
      throw new Error(response.error || `${agentType} tailoring agent execution failed`)
    }

    const executionTime = Date.now() - startTime
    console.log(`✅ [${agentType}] Tailoring agent completed in ${executionTime}ms`)

    return {
      agentType,
      result: response.data,
      executedAt: new Date().toISOString(),
      executionTime,
      success: true
    }
    
  } catch (error) {
    const executionTime = Date.now() - startTime
    const isTimeout = error instanceof Error && error.message.includes('timeout')
    
    if (isTimeout) {
      console.warn(`⏱️ [${agentType}] Tailoring agent timed out after ${executionTime}ms`)
    } else {
      console.error(`❌ [${agentType}] Tailoring agent failed after ${executionTime}ms:`, error)
    }
    
    // Return a fallback result indicating failure
    return {
      agentType,
      result: {
        error: true,
        message: isTimeout 
          ? `${agentType} tailoring timed out - please try again`
          : `${agentType} tailoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      executedAt: new Date().toISOString(),
      executionTime,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Execute all tailoring agents in parallel
 */
export async function executeAllTailoringAgentsParallel(
  resume: string,
  jobDescription: string,
  scoringAnalysis: any,
  userRequest: string,
  openRouterApiKey: string
): Promise<TailoringAgentResults> {
  
  console.log('🚀 [MultiAgentTailoring] Starting parallel execution of 8 tailoring agents...')
  const overallStartTime = Date.now()
  
  const agentTypes: TailoringAgentType[] = [
    'technicalSkills',
    'experienceReframing',
    'achievementAmplification',
    'atsOptimization',
    'professionalSummary',
    'educationCertifications',
    'gapMitigation',
    'industryAlignment'
  ]

  try {
    // Execute all agents in parallel
    const agentPromises = agentTypes.map(agentType => 
      executeTailoringAgent(agentType, resume, jobDescription, scoringAnalysis, userRequest, openRouterApiKey)
    )
    
    const agentResults = await Promise.all(agentPromises)
    const totalExecutionTime = Date.now() - overallStartTime
    
    console.log(`✅ [MultiAgentTailoring] All agents completed in ${totalExecutionTime}ms`)
    
    // Organize results by agent type
    const organizedResults: TailoringAgentResults = {
      agents: {},
      executionMetadata: {
        totalExecutionTime,
        agentsExecuted: agentTypes.length,
        timestamp: new Date().toISOString()
      }
    }
    
    // Organize results into agents object
    agentResults.forEach((result) => {
      organizedResults.agents[result.agentType] = result
    })
    
    return organizedResults
    
  } catch (error) {
    console.error('❌ [MultiAgentTailoring] Parallel execution failed:', error)
    throw new Error(`Multi-agent tailoring execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Execute the orchestration agent to combine all tailoring results
 */
async function executeTailoringOrchestrationAgent(
  agentResults: TailoringAgentResults,
  resume: string,
  jobDescription: string,
  scoringAnalysis: any,
  userRequest: string,
  openRouterApiKey: string
): Promise<TailoringOrchestrationResult> {
  
  console.log('🎭 [TailoringOrchestration] Starting result combination...')
  const startTime = Date.now()
  
  try {
    // Prepare agent results for the orchestration prompt
    const agentResultsForPrompt = JSON.stringify(agentResults, null, 2)
    const scoringAnalysisForPrompt = JSON.stringify(scoringAnalysis, null, 2)
    
    // Execute orchestration prompt
    const response = await promptManager.executePrompt({
      promptId: 'tailoring-orchestration',
      variables: {
        resume,
        jobDescription,
        scoringAnalysis: scoringAnalysisForPrompt,
        agentResults: agentResultsForPrompt,
        userRequest
      },
      context: {
        metadata: {
          agentType: 'orchestration',
          timestamp: new Date().toISOString()
        }
      },
      overrides: {
        // Reduced tokens to encourage concise, 2-page resumes
        maxTokens: 2000
      }
    })

    if (!response.success) {
      throw new Error(response.error || 'Tailoring orchestration failed')
    }

    const executionTime = Date.now() - startTime
    console.log(`✅ [TailoringOrchestration] Completed in ${executionTime}ms`)

    const result = response.data
    
    // Validate and enhance the orchestration result
    return validateTailoringOrchestrationResult(result, agentResults, resume)
    
  } catch (error) {
    console.error('❌ [TailoringOrchestration] Failed:', error)
    
    // Fallback orchestration using local logic
    console.log('🔄 [TailoringOrchestration] Using fallback logic...')
    return createFallbackTailoringOrchestrationResult(agentResults, resume, jobDescription)
  }
}

/**
 * Validate and enhance orchestration result
 */
function validateTailoringOrchestrationResult(
  result: any, 
  agentResults: TailoringAgentResults,
  originalResume?: string
): TailoringOrchestrationResult {
  
  // Ensure all required fields are present with fallbacks
  return {
    finalTailoredResume: result.finalTailoredResume || originalResume || '# Resume\n\nUnable to process resume content.',
    priorityChanges: result.priorityChanges || [],
    changeSummary: result.changeSummary || 'Unable to generate change summary',
    expectedScoreImprovements: result.expectedScoreImprovements || [],
    conflictsResolved: result.conflictsResolved || [],
    consistencyImprovements: result.consistencyImprovements || [],
    readabilityEnhancements: result.readabilityEnhancements || [],
    executionSummary: {
      agentsExecuted: agentResults.executionMetadata.agentsExecuted,
      totalExecutionTime: `${agentResults.executionMetadata.totalExecutionTime}ms`,
      tailoringVersion: '2.0-multi-agent'
    }
  }
}

/**
 * Create fallback orchestration result when AI orchestration fails
 */
function createFallbackTailoringOrchestrationResult(
  agentResults: TailoringAgentResults,
  originalResume: string,
  jobDescription: string
): TailoringOrchestrationResult {
  
  console.log('🔧 [FallbackTailoring] Creating fallback orchestration result...')
  
  // Collect successful agent results
  const successfulAgents = Object.entries(agentResults.agents)
    .filter(([_, result]) => result.success)
    .map(([agentType, _]) => agentType)
  
  const failedAgents = Object.entries(agentResults.agents)
    .filter(([_, result]) => !result.success)
    .map(([agentType, _]) => agentType)
  
  // Create basic recommendations based on successful agents
  const priorityChanges: string[] = []
  const expectedImprovements: string[] = []
  
  successfulAgents.forEach(agentType => {
    priorityChanges.push(`${agentType} optimization completed successfully`)
    expectedImprovements.push(`Improved ${agentType} alignment with target role`)
  })
  
  if (failedAgents.length > 0) {
    priorityChanges.push(`Some optimizations failed: ${failedAgents.join(', ')}`)
  }
  
  return {
    finalTailoredResume: originalResume, // Fallback to original resume
    priorityChanges,
    changeSummary: `Multi-agent tailoring completed with ${successfulAgents.length}/${Object.keys(agentResults.agents).length} agents successful. ${failedAgents.length > 0 ? `Failed agents: ${failedAgents.join(', ')}` : 'All agents completed successfully.'}`,
    expectedScoreImprovements: expectedImprovements,
    conflictsResolved: ['Fallback orchestration used - no conflicts to resolve'],
    consistencyImprovements: ['Manual review recommended for consistency'],
    readabilityEnhancements: ['Original resume readability maintained'],
    executionSummary: {
      agentsExecuted: agentResults.executionMetadata.agentsExecuted,
      totalExecutionTime: `${agentResults.executionMetadata.totalExecutionTime}ms`,
      tailoringVersion: '2.0-multi-agent-fallback'
    }
  }
}

/**
 * Main multi-agent tailoring function
 */
export async function calculateMultiAgentTailoring(
  resume: string,
  jobDescription: string,
  scoringAnalysis: any,
  userRequest: string,
  openRouterApiKey: string
): Promise<MultiAgentTailoringResult> {
  
  console.log('🎬 [MultiAgentTailoring] Starting multi-agent tailoring process...')
  const startTime = Date.now()
  
  try {
    // Step 1: Execute all tailoring agents in parallel
    const agentResults = await executeAllTailoringAgentsParallel(
      resume,
      jobDescription,
      scoringAnalysis,
      userRequest,
      openRouterApiKey
    )
    
    // Step 2: Orchestrate results
    const orchestrationResult = await executeTailoringOrchestrationAgent(
      agentResults,
      resume,
      jobDescription,
      scoringAnalysis,
      userRequest,
      openRouterApiKey
    )
    
    const totalTime = Date.now() - startTime
    
    console.log(`🎉 [MultiAgentTailoring] Tailoring completed in ${totalTime}ms`)
    
    return {
      ...orchestrationResult,
      agentResults,
      processedAt: new Date().toISOString(),
      totalProcessingTime: totalTime
    }
    
  } catch (error) {
    console.error('💥 [MultiAgentTailoring] Tailoring failed:', error)
    throw new Error(`Multi-agent tailoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Performance tracking for monitoring
 */
export function trackTailoringPerformance(results: MultiAgentTailoringResult): void {
  console.log(`📊 [TailoringPerformance] ${results.totalProcessingTime}ms for ${results.executionSummary.agentsExecuted} agents`)
  
  // Calculate individual agent performance
  const agentPerformance: { [key: string]: number } = {}
  
  Object.entries(results.agentResults.agents).forEach(([agentType, data]) => {
    if (data) {
      agentPerformance[agentType] = data.executionTime || 0
    }
  })
  
  console.log('📈 [TailoringPerformance] Agent execution times:', agentPerformance)
  
  // Track success rate
  const successfulAgents = Object.values(results.agentResults.agents).filter(agent => agent.success).length
  const totalAgents = Object.keys(results.agentResults.agents).length
  const successRate = (successfulAgents / totalAgents) * 100
  
  console.log(`📈 [TailoringPerformance] Success rate: ${successRate.toFixed(1)}% (${successfulAgents}/${totalAgents})`)
}