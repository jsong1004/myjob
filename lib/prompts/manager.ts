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

      // Make API call with retries
      const response = await this.callOpenRouterWithRetry({
        model: finalConfig.model,
        messages: [
          { role: 'system', content: systemRole },
          { role: 'user', content: userContent }
        ],
        temperature: finalConfig.temperature ?? GLOBAL_CONFIG.defaultTemperature,
        max_tokens: finalConfig.maxTokens ?? GLOBAL_CONFIG.defaultMaxTokens
      })

      // Parse response based on format
      const parsedData = ResponseParser.parseResponse(response, finalConfig.responseFormat)

      // Validate response
      if (!ResponseParser.validateResponse(parsedData, finalConfig.responseFormat)) {
        throw new Error('Response validation failed')
      }

      const endTime = Date.now()
      const promptResponse: PromptResponse = {
        success: true,
        data: parsedData,
        usage: response.usage,
        metadata: {
          model: finalConfig.model,
          temperature: finalConfig.temperature ?? GLOBAL_CONFIG.defaultTemperature,
          responseTime: endTime - startTime,
          promptId: request.promptId,
          cached: false
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
   * Call OpenRouter API with retry logic
   */
  private async callOpenRouterWithRetry(params: any, retries: number = 0): Promise<any> {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error('Missing OpenRouter API key')
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
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(GLOBAL_CONFIG.requestTimeout)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
      }

      return await response.json()

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
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}