// lib/prompts/job-matching/scoring.ts
import { PromptConfig } from '../types'
import { MODELS, TEMPERATURE, TAGS } from '../constants'
import { SYSTEM_ROLES } from '../shared/system-roles'

export const JOB_SCORING_PROMPTS: Record<string, PromptConfig> = {
  PROFESSIONAL: {
    id: 'job-scoring-professional',
    name: 'Professional Hiring Manager Scoring',
    description: 'Rigorous job-candidate matching from senior hiring manager perspective',
    systemRole: SYSTEM_ROLES.SENIOR_HIRING_MANAGER,
    userTemplate: `Please analyze the following jobs against the provided resume and provide professional hiring manager assessments.

Resume:
{resume}

Jobs to analyze:
{jobs}

For each job, provide a detailed assessment including:
1. Overall match score (0-100)
2. Key strengths that align with the role
3. Potential gaps or concerns
4. Specific recommendations for the candidate

Please respond with a JSON array where each object contains:
- id: job identifier
- overallScore: number (0-100)
- strengths: array of key strengths
- gaps: array of potential gaps
- recommendations: array of specific recommendations
- summary: brief overall assessment`,
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
            overallScore: { type: 'number' },
            strengths: { type: 'array', items: { type: 'string' } },
            gaps: { type: 'array', items: { type: 'string' } },
            recommendations: { type: 'array', items: { type: 'string' } },
            summary: { type: 'string' }
          }
        }
      }
    },
    version: '1.0.0',
    tags: [TAGS.SCORING, TAGS.PROFESSIONAL, 'job-matching']
  },

  BASIC: {
    id: 'job-scoring-basic',
    name: 'Basic Job Scoring',
    description: 'Simple job-candidate matching for quick assessments',
    systemRole: SYSTEM_ROLES.JOB_MATCHING_SPECIALIST,
    userTemplate: `Please score the following jobs against the provided resume. Focus on core qualifications and experience alignment.

Resume:
{resume}

Jobs to score:
{jobs}

For each job, provide:
- Overall match score (0-100)
- Brief summary of the match reasoning

Please respond with a JSON array where each object contains:
- id: job identifier
- score: number (0-100)
- summary: brief explanation of the score`,
    model: MODELS.GPT4O_MINI,
    temperature: TEMPERATURE.PRECISE,
    responseFormat: {
      type: 'json',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            score: { type: 'number' },
            summary: { type: 'string' }
          }
        }
      }
    },
    version: '1.0.0',
    tags: [TAGS.SCORING, TAGS.BASIC, 'job-matching']
  },

  QUICK_MATCH: {
    id: 'job-scoring-quick',
    name: 'Quick Match Scoring',
    description: 'Fast job scoring for high-volume scenarios',
    systemRole: SYSTEM_ROLES.JOB_MATCHING_SPECIALIST,
    userTemplate: `Quickly score these jobs against the resume. Focus on must-have qualifications and experience level.

Resume:
{resume}

Jobs:
{jobs}

Provide a JSON array with id, score (0-100), and brief summary for each job.`,
    model: MODELS.GPT4O_MINI,
    temperature: TEMPERATURE.PRECISE,
    responseFormat: {
      type: 'json',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            score: { type: 'number' },
            summary: { type: 'string' }
          }
        }
      }
    },
    version: '1.0.0',
    tags: [TAGS.SCORING, 'quick', 'job-matching']
  }
}