// lib/prompts/constants.ts

// Common models used across prompts
export const MODELS = {
  GPT4O_MINI: 'openai/gpt-4o-mini',
  GPT4O: 'openai/gpt-4o',
  CLAUDE_SONNET: 'anthropic/claude-3-sonnet',
  CLAUDE_HAIKU: 'anthropic/claude-3-haiku'
} as const

// Common temperature settings
export const TEMPERATURE = {
  PRECISE: 0.1,
  BALANCED: 0.3,
  CREATIVE: 0.5,
  VERY_CREATIVE: 0.7,
  EXPERIMENTAL: 0.9
} as const

// Common token limits
export const TOKEN_LIMITS = {
  SHORT: 500,
  MEDIUM: 1000,
  LONG: 2000,
  VERY_LONG: 4000
} as const

// Prompt categories
export const PROMPT_CATEGORIES = {
  JOB_MATCHING: 'job-matching',
  RESUME: 'resume',
  COVER_LETTER: 'cover-letter',
  SHARED: 'shared'
} as const

// Common tags
export const TAGS = {
  SCORING: 'scoring',
  SUMMARY: 'summary',
  TAILORING: 'tailoring',
  EDITING: 'editing',
  GENERATION: 'generation',
  ADVISORY: 'advisory',
  PROFESSIONAL: 'professional',
  BASIC: 'basic',
  ATS: 'ats',
  CONCISE: 'concise'
} as const