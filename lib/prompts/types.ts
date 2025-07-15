// lib/prompts/types.ts
export interface PromptConfig {
  id: string
  name: string
  description: string
  systemRole: string
  userTemplate: string
  model: string
  temperature?: number
  maxTokens?: number
  responseFormat?: ResponseFormat
  version: string
  tags: string[]
}

export interface ResponseFormat {
  type: 'json' | 'text' | 'structured'
  schema?: Record<string, any>
  examples?: string[]
}

export interface PromptContext {
  userId?: string
  sessionId?: string
  metadata?: Record<string, any>
}

export interface PromptRequest {
  promptId: string
  variables: Record<string, any>
  context?: PromptContext
  overrides?: Partial<PromptConfig>
}

export interface PromptResponse {
  success: boolean
  data?: any
  error?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  metadata?: {
    model: string
    temperature: number
    responseTime: number
  }
}

// Specific prompt types
export interface JobScoringRequest {
  jobs: JobSearchResult[]
  resume: string
  userId: string
}

export interface ResumeTailoringRequest {
  resume: string
  jobTitle: string
  company: string
  jobDescription: string
  userRequest: string
  mode: 'agent' | 'ask'
}

export interface CoverLetterRequest {
  resume: string
  jobTitle: string
  company: string
  jobDescription: string
  userRequest: string
  mode: 'agent' | 'ask'
  existingCoverLetter?: string
}

// Import types from existing application
export interface JobSearchResult {
  id: string
  title: string
  company: string
  description: string
  matchingScore?: number
  matchingSummary?: string
  scoreDetails?: any
  location?: string
  salary?: string
  applyUrl?: string
  snippet?: string
  originalData?: any
}