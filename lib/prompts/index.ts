// lib/prompts/index.ts
import { PromptManager } from './manager'
import { JOB_SCORING_PROMPTS, JOB_SUMMARY_PROMPTS } from './job-matching'
import { RESUME_TAILORING_PROMPTS, RESUME_EDITING_PROMPTS } from './resume'
import { COVER_LETTER_GENERATION_PROMPTS, COVER_LETTER_EDITING_PROMPTS } from './cover-letter'

// Initialize and configure the prompt manager
const promptManager = PromptManager.getInstance()

// Register all job-matching prompts
Object.values(JOB_SCORING_PROMPTS).forEach(prompt => promptManager.registerPrompt(prompt))
Object.values(JOB_SUMMARY_PROMPTS).forEach(prompt => promptManager.registerPrompt(prompt))

// Register all resume prompts
Object.values(RESUME_TAILORING_PROMPTS).forEach(prompt => promptManager.registerPrompt(prompt))
Object.values(RESUME_EDITING_PROMPTS).forEach(prompt => promptManager.registerPrompt(prompt))

// Register all cover letter prompts
Object.values(COVER_LETTER_GENERATION_PROMPTS).forEach(prompt => promptManager.registerPrompt(prompt))
Object.values(COVER_LETTER_EDITING_PROMPTS).forEach(prompt => promptManager.registerPrompt(prompt))

// Export the configured manager and all types
export { promptManager }
export * from './types'
export * from './constants'
export * from './config'
export * from './manager'
export * from './job-matching'
export * from './resume'
export * from './cover-letter'
export * from './shared'
export * from './utils'