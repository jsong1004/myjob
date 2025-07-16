// lib/prompts/manager.ts
import { PromptConfig, PromptRequest, PromptResponse, PromptContext } from './types'
import { GLOBAL_CONFIG } from './config'
import { PromptBuilder } from './utils/prompt-builder'
import { ResponseParser } from './utils/response-parser'

export class PromptManager {
  private static instance: PromptManager
  private prompts: Map<string, PromptConfig> = new Map()
  private cache: Map<string, any> = new Map()
  private requestCount: number = 0

  private constructor() {}

  static getInstance(): PromptManager {
    if (!PromptManager.instance) {
      PromptManager.instance = new PromptManager()
    }
    return PromptManager.instance
  }

  /**
   * Register a prompt configuration
   */
  registerPrompt(prompt: PromptConfig): void {
    this.prompts.set(prompt.id, prompt)
    if (GLOBAL_CONFIG.enableLogging) {
      console.log(`Registered prompt: ${prompt.id} (${prompt.name})`)
    }
  }

  /**
   * Get a prompt configuration by ID
   */
  getPrompt(promptId: string): PromptConfig | undefined {
    return this.prompts.get(promptId)
  }

  /**
   * Get all registered prompts
   */
  getAllPrompts(): PromptConfig[] {
    return Array.from(this.prompts.values())
  }

  /**
   * Get prompts by category/tag
   */
  getPromptsByTag(tag: string): PromptConfig[] {
    return Array.from(this.prompts.values()).filter(prompt => 
      prompt.tags.includes(tag)
    )
  }

  /**
   * Execute a prompt with the given request
   */
  async executePrompt(request: PromptRequest): Promise<PromptResponse> {
    const startTime = Date.now()
    this.requestCount++
    
    try {
      // Get prompt configuration
      const prompt = this.getPrompt(request.promptId)
      if (!prompt) {
        throw new Error(`Prompt not found: ${request.promptId}`)
      }

      // Apply overrides if provided
      const finalConfig = { ...prompt, ...request.overrides }

      // Check cache if enabled
      const cacheKey = this.generateCacheKey(request)
      if (GLOBAL_CONFIG.enableCache && this.cache.has(cacheKey)) {
        const cachedResponse = this.cache.get(cacheKey)
        if (GLOBAL_CONFIG.enableLogging) {
          console.log(`Cache hit for prompt: ${request.promptId}`)
        }
        return {
          ...cachedResponse,
          metadata: {
            ...cachedResponse.metadata,
            cached: true
          }
        }
      }

      // Build the complete prompt
      const { systemRole, userContent } = PromptBuilder.buildCompletePrompt(
        finalConfig.systemRole,
        finalConfig.userTemplate,
        request.variables
      )

      if (GLOBAL_CONFIG.enableLogging) {
        console.log(`Executing prompt: ${request.promptId}`)
        console.log(`System Role: ${systemRole.substring(0, 100)}...`)
        console.log(`User Content: ${userContent.substring(0, 200)}...`)
      }

      // Make API call with retries, including user context for cache optimization
      const response = await this.callOpenRouterWithRetry({
        model: finalConfig.model,
        messages: [
          { role: 'system', content: systemRole },
          { role: 'user', content: userContent }
        ],
        temperature: finalConfig.temperature ?? GLOBAL_CONFIG.defaultTemperature,
        max_tokens: finalConfig.maxTokens ?? GLOBAL_CONFIG.defaultMaxTokens,
        // Pass user ID for OpenRouter cache isolation
        user: request.context?.userId
      })

      // Parse response based on format
      const parsedData = ResponseParser.parseResponse(response, finalConfig.responseFormat)

      // Validate response
      if (!ResponseParser.validateResponse(parsedData, finalConfig.responseFormat)) {
        throw new Error('Response validation failed')
      }

      const endTime = Date.now()
      
      // Enhance usage data with cache metrics and cost calculations
      const enhancedUsage = this.enhanceUsageData(response.usage)
      
      const promptResponse: PromptResponse = {
        success: true,
        data: parsedData,
        usage: enhancedUsage,
        metadata: {
          model: finalConfig.model,
          temperature: finalConfig.temperature ?? GLOBAL_CONFIG.defaultTemperature,
          responseTime: endTime - startTime,
          promptId: request.promptId,
          cached: false,
          cacheHitRate: enhancedUsage.cachedTokens && enhancedUsage.promptTokens 
            ? (enhancedUsage.cachedTokens / enhancedUsage.promptTokens * 100).toFixed(1) + '%'
            : '0%'
        }
      }

      // Cache response if enabled
      if (GLOBAL_CONFIG.enableCache) {
        this.cache.set(cacheKey, promptResponse)
        // Clean up old cache entries
        this.cleanupCache()
      }

      if (GLOBAL_CONFIG.enableLogging) {
        console.log(`Prompt executed successfully: ${request.promptId} (${endTime - startTime}ms)`)
      }

      return promptResponse

    } catch (error) {
      const endTime = Date.now()
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (GLOBAL_CONFIG.enableLogging) {
        console.error(`Prompt execution failed: ${request.promptId}`, error)
      }

      return {
        success: false,
        error: errorMessage,
        metadata: {
          model: request.overrides?.model ?? this.getPrompt(request.promptId)?.model ?? GLOBAL_CONFIG.defaultModel,
          temperature: request.overrides?.temperature ?? this.getPrompt(request.promptId)?.temperature ?? GLOBAL_CONFIG.defaultTemperature,
          responseTime: endTime - startTime,
          promptId: request.promptId,
          cached: false
        }
      }
    }
  }

  /**
   * Call OpenRouter API with retry logic and cache optimization
   */
  private async callOpenRouterWithRetry(params: any, retries: number = 0): Promise<any> {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error('Missing OpenRouter API key')
    }

    // Add OpenRouter-specific optimizations for prompt caching
    const optimizedParams = {
      ...params,
      // Enable usage tracking for cache monitoring (required for cache insights)
      usage: { include: true },
      // Add user parameter for cache isolation if provided in context
      ...(params.user && { user: `myjob_${params.user}` })
    }

    try {
      const response = await fetch(GLOBAL_CONFIG.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'MyJob AI Assistant'
        },
        body: JSON.stringify(optimizedParams),
        signal: AbortSignal.timeout(GLOBAL_CONFIG.requestTimeout)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
      }

      const responseData = await response.json()
      
      // Log cache performance metrics if usage data is available
      if (responseData.usage && GLOBAL_CONFIG.enableLogging) {
        this.logCacheMetrics(responseData.usage, optimizedParams.user)
      }
      
      return responseData

    } catch (error) {
      if (retries < GLOBAL_CONFIG.maxRetries) {
        if (GLOBAL_CONFIG.enableLogging) {
          console.log(`Retrying API call (${retries + 1}/${GLOBAL_CONFIG.maxRetries})`)
        }
        await new Promise(resolve => setTimeout(resolve, GLOBAL_CONFIG.retryDelay))
        return this.callOpenRouterWithRetry(params, retries + 1)
      }
      throw error
    }
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: PromptRequest): string {
    const keyData = {
      promptId: request.promptId,
      variables: request.variables,
      overrides: request.overrides
    }
    return JSON.stringify(keyData)
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    if (this.cache.size > 100) { // Simple cleanup when cache gets too large
      const entries = Array.from(this.cache.entries())
      const toKeep = entries.slice(-50) // Keep last 50 entries
      this.cache.clear()
      toKeep.forEach(([key, value]) => this.cache.set(key, value))
    }
  }

  /**
   * Get usage statistics
   */
  getStats(): {
    totalRequests: number
    registeredPrompts: number
    cacheSize: number
    promptsByTag: Record<string, number>
  } {
    const promptsByTag: Record<string, number> = {}
    
    for (const prompt of this.prompts.values()) {
      for (const tag of prompt.tags) {
        promptsByTag[tag] = (promptsByTag[tag] || 0) + 1
      }
    }

    return {
      totalRequests: this.requestCount,
      registeredPrompts: this.prompts.size,
      cacheSize: this.cache.size,
      promptsByTag
    }
  }

  /**
   * Enhance usage data with cache metrics and cost calculations
   */
  private enhanceUsageData(usage: any): any {
    if (!usage) return usage
    
    const promptTokens = usage.prompt_tokens || 0
    const cachedTokens = usage.cached_tokens || 0
    const completionTokens = usage.completion_tokens || 0
    
    // Calculate costs based on GPT-4o mini pricing
    const baseCostPer1M = 0.15 // $0.15 per 1M input tokens
    const cachedCostPer1M = 0.075 // 50% discount on cached tokens
    const outputCostPer1M = 0.60 // $0.60 per 1M output tokens
    
    const nonCachedTokens = promptTokens - cachedTokens
    const inputCost = (nonCachedTokens * baseCostPer1M) / 1000000
    const cachedCost = (cachedTokens * cachedCostPer1M) / 1000000
    const outputCost = (completionTokens * outputCostPer1M) / 1000000
    const totalCost = inputCost + cachedCost + outputCost
    
    const savingsFromCache = (cachedTokens * (baseCostPer1M - cachedCostPer1M)) / 1000000
    
    return {
      promptTokens,
      completionTokens,
      totalTokens: usage.total_tokens || (promptTokens + completionTokens),
      cachedTokens,
      cacheDiscount: usage.cache_discount || 0,
      estimatedCost: totalCost,
      costSavings: savingsFromCache
    }
  }

  /**
   * Log cache performance metrics for monitoring
   */
  private logCacheMetrics(usage: any, userId?: string): void {
    const promptTokens = usage.prompt_tokens || 0
    const cachedTokens = usage.cached_tokens || 0
    const completionTokens = usage.completion_tokens || 0
    const totalTokens = usage.total_tokens || 0
    
    // Calculate cache performance metrics
    const cacheHitRate = promptTokens > 0 ? (cachedTokens / promptTokens * 100).toFixed(1) : '0.0'
    const cacheDiscount = usage.cache_discount || 0
    
    // Calculate estimated cost savings (GPT-4o mini pricing)
    const baseCostPer1M = 0.15 // $0.15 per 1M input tokens
    const cachedCostPer1M = 0.075 // 50% discount on cached tokens
    const outputCostPer1M = 0.60 // $0.60 per 1M output tokens
    
    const nonCachedTokens = promptTokens - cachedTokens
    const inputCost = (nonCachedTokens * baseCostPer1M) / 1000000
    const cachedCost = (cachedTokens * cachedCostPer1M) / 1000000
    const outputCost = (completionTokens * outputCostPer1M) / 1000000
    const totalCost = inputCost + cachedCost + outputCost
    
    const savingsFromCache = (cachedTokens * (baseCostPer1M - cachedCostPer1M)) / 1000000
    
    console.log(`[PromptCache] ${userId ? `User: ${userId} |` : ''} Cache Hit Rate: ${cacheHitRate}% | ` +
      `Tokens: ${promptTokens} (${cachedTokens} cached) | ` +
      `Cost: $${totalCost.toFixed(4)} | Savings: $${savingsFromCache.toFixed(4)}`)
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}