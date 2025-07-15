// lib/prompts/config.ts
import { MODELS, TEMPERATURE, TOKEN_LIMITS } from './constants'

export const GLOBAL_CONFIG = {
  // Default model for all prompts
  defaultModel: MODELS.GPT4O_MINI,
  
  // Default temperature
  defaultTemperature: TEMPERATURE.BALANCED,
  
  // Default token limit
  defaultMaxTokens: TOKEN_LIMITS.LONG,
  
  // API configuration
  apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
  
  // Timeout settings
  requestTimeout: 30000, // 30 seconds
  
  // Retry settings
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  
  // Caching settings
  enableCache: true,
  cacheExpiry: 300000, // 5 minutes
  
  // Logging settings
  enableLogging: process.env.NODE_ENV === 'development',
  logLevel: 'info'
} as const

export type GlobalConfig = typeof GLOBAL_CONFIG