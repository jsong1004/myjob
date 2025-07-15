// lib/prompts/job-matching/summary.ts
import { PromptConfig } from '../types'
import { MODELS, TEMPERATURE, TAGS } from '../constants'
import { SYSTEM_ROLES } from '../shared/system-roles'

export const JOB_SUMMARY_PROMPTS: Record<string, PromptConfig> = {
  CONCISE: {
    id: 'job-summary-concise',
    name: 'Concise Job Summary',
    description: '2-3 sentence job posting summaries for quick scanning',
    systemRole: SYSTEM_ROLES.PROFESSIONAL_SUMMARIZER,
    userTemplate: `Please create concise, professional summaries for the following job postings. Each summary should be 2-3 sentences and highlight the key role, requirements, and what makes it attractive.

Jobs to summarize:
{jobs}

Please respond with a JSON array where each object contains:
- id: job identifier
- summary: concise 2-3 sentence summary`,
    model: MODELS.GPT4O_MINI,
    temperature: TEMPERATURE.BALANCED,
    responseFormat: {
      type: 'json',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            summary: { type: 'string' }
          }
        }
      }
    },
    version: '1.0.0',
    tags: [TAGS.SUMMARY, TAGS.CONCISE, 'job-matching']
  },

  DETAILED: {
    id: 'job-summary-detailed',
    name: 'Detailed Job Summary',
    description: 'Comprehensive job summaries with key details',
    systemRole: SYSTEM_ROLES.PROFESSIONAL_SUMMARIZER,
    userTemplate: `Please create detailed summaries for the following job postings. Include key responsibilities, requirements, benefits, and what makes each role unique.

Jobs to summarize:
{jobs}

For each job, provide:
- Core responsibilities (3-4 key points)
- Required qualifications
- Preferred qualifications
- Benefits/perks mentioned
- Company culture insights (if available)

Please respond with a JSON array where each object contains:
- id: job identifier
- summary: detailed summary
- keyPoints: array of main highlights`,
    model: MODELS.GPT4O_MINI,
    temperature: TEMPERATURE.BALANCED,
    responseFormat: {
      type: 'json',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            summary: { type: 'string' },
            keyPoints: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    },
    version: '1.0.0',
    tags: [TAGS.SUMMARY, 'detailed', 'job-matching']
  },

  BULLET_POINTS: {
    id: 'job-summary-bullets',
    name: 'Bullet Point Job Summary',
    description: 'Job summaries in easy-to-scan bullet point format',
    systemRole: SYSTEM_ROLES.PROFESSIONAL_SUMMARIZER,
    userTemplate: `Please create bullet point summaries for the following job postings. Use clear, scannable bullet points for responsibilities, requirements, and benefits.

Jobs to summarize:
{jobs}

For each job, provide bullet points for:
- Role & Responsibilities
- Required Skills
- Nice-to-Have Skills
- Benefits & Perks (if mentioned)

Please respond with a JSON array where each object contains:
- id: job identifier
- responsibilities: array of responsibility bullet points
- required: array of required skills
- preferred: array of preferred skills
- benefits: array of benefits (if any)`,
    model: MODELS.GPT4O_MINI,
    temperature: TEMPERATURE.BALANCED,
    responseFormat: {
      type: 'json',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            responsibilities: { type: 'array', items: { type: 'string' } },
            required: { type: 'array', items: { type: 'string' } },
            preferred: { type: 'array', items: { type: 'string' } },
            benefits: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    },
    version: '1.0.0',
    tags: [TAGS.SUMMARY, 'bullets', 'job-matching']
  }
}