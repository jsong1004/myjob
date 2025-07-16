// lib/prompts/job-matching/scoring.ts
import { PromptConfig } from '../types'
import { MODELS, TEMPERATURE, TAGS } from '../constants'
import { SYSTEM_ROLES } from '../shared/system-roles'

export const JOB_SCORING_PROMPTS: Record<string, PromptConfig> = {
  ENHANCED_HIRING_MANAGER: {
    id: 'job-scoring-enhanced-hiring-manager',
    name: 'Enhanced Hiring Manager Scoring',
    description: 'Thorough, detailed, and honest scoring system like a seasoned hiring manager',
    systemRole: `You are a seasoned hiring manager. Score candidates honestly - most score 40-70%, only exceptional candidates score 80%+.

Return ONLY valid JSON. No explanatory text or markdown.`,
    userTemplate: `Score these jobs against the resume. Be honest with scores.

Resume:
{resume}

Jobs:
{jobs}

Return JSON array:
[
  {
    "id": "job_id",
    "overallScore": 65,
    "category": "fair",
    "breakdown": {
      "technicalSkills": {"score": 60, "reasoning": "Missing key tech", "weight": 0.25},
      "experienceDepth": {"score": 70, "reasoning": "Good experience", "weight": 0.25},
      "achievements": {"score": 50, "reasoning": "Limited metrics", "weight": 0.20},
      "education": {"score": 80, "reasoning": "Meets requirements", "weight": 0.10},
      "softSkills": {"score": 70, "reasoning": "Good communication", "weight": 0.10},
      "careerProgression": {"score": 60, "reasoning": "Some gaps", "weight": 0.10}
    },
    "redFlags": ["Missing required skill X"],
    "positiveIndicators": ["Strong in Y"],
    "hiringRecommendation": "Consider for phone screen",
    "keyStrengths": ["Strength 1", "Strength 2"],
    "keyWeaknesses": [
      {
        "weakness": "Missing skill X",
        "impact": "Cannot perform core duties",
        "improvementPlan": {
          "shortTerm": "Take online course",
          "midTerm": "Build practice projects",
          "longTerm": "Gain work experience"
        }
      }
    ],
    "interviewFocus": ["Technical skills"],
    "summary": "Fair candidate with development needs"
  }
]`,
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
            overallScore: { type: 'number' },
            category: { type: 'string' },
            breakdown: { type: 'object' },
            redFlags: { type: 'array', items: { type: 'string' } },
            positiveIndicators: { type: 'array', items: { type: 'string' } },
            hiringRecommendation: { type: 'string' },
            keyStrengths: { type: 'array', items: { type: 'string' } },
            keyWeaknesses: { type: 'array', items: { type: 'object' } },
            interviewFocus: { type: 'array', items: { type: 'string' } },
            summary: { type: 'string' }
          }
        }
      }
    },
    version: '2.0.0',
    tags: [TAGS.SCORING, TAGS.PROFESSIONAL, 'job-matching', 'enhanced']
  },

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