// lib/prompts/resume/tailoring.ts
import { PromptConfig } from '../types'
import { MODELS, TEMPERATURE, TAGS } from '../constants'
import { SYSTEM_ROLES } from '../shared/system-roles'

export const RESUME_TAILORING_PROMPTS: Record<string, PromptConfig> = {
  ATS_OPTIMIZED: {
    id: 'resume-tailoring-ats',
    name: 'ATS-Optimized Resume Tailoring',
    description: 'Resume optimization for ATS systems and recruiter appeal',
    systemRole: SYSTEM_ROLES.RESUME_OPTIMIZATION_SPECIALIST,
    userTemplate: `You are helping a candidate tailor their resume for a specific job opportunity. Focus on ATS optimization while maintaining authenticity and readability.

INPUTS:
- Job Title: {jobTitle}
- Company: {company}
- Job Description: {jobDescription}
- Current Resume: {resume}
- User Request: {userRequest}

Please analyze the job requirements and make the requested changes to optimize the resume for this specific role. Focus on:
1. Keyword optimization for ATS
2. Highlighting relevant experience
3. Aligning skills with job requirements
4. Improving formatting and structure if needed

Respond with:
UPDATED_RESUME:
[The complete updated resume in clean markdown format - NO ** at beginning or end]

CHANGE_SUMMARY:
[Brief summary of the key changes made and why they improve the resume for this role]

IMPORTANT: Do not add ** or any other markdown artifacts at the beginning or end of the resume content. Return clean, properly formatted markdown.`,
    model: MODELS.GPT4O_MINI,
    temperature: TEMPERATURE.BALANCED,
    responseFormat: {
      type: 'text',
      examples: [
        'UPDATED_RESUME:\n[resume content]\n\nCHANGE_SUMMARY:\n[summary of changes]'
      ]
    },
    version: '1.0.0',
    tags: [TAGS.TAILORING, TAGS.ATS, 'resume']
  },

  ADVISORY: {
    id: 'resume-tailoring-advisory',
    name: 'Resume Tailoring Advisory',
    description: 'Resume advice for job-specific tailoring without making changes',
    systemRole: SYSTEM_ROLES.CAREER_ADVISOR,
    userTemplate: `You are providing advice to help a candidate understand how to tailor their resume for a specific job opportunity.

INPUTS:
- Job Title: {jobTitle}
- Company: {company}
- Job Description: {jobDescription}
- Current Resume: {resume}
- User Question: {userRequest}

Please analyze the job requirements against the current resume and provide specific, actionable advice. Focus on:
1. Key areas that need improvement
2. Specific skills/experiences to highlight
3. Keywords to incorporate
4. Formatting suggestions
5. Content recommendations

Provide helpful advice without making actual changes to the resume.`,
    model: MODELS.GPT4O_MINI,
    temperature: TEMPERATURE.CREATIVE,
    responseFormat: { type: 'text' },
    version: '1.0.0',
    tags: [TAGS.TAILORING, TAGS.ADVISORY, 'resume']
  },

  PROFESSIONAL_ENHANCEMENT: {
    id: 'resume-tailoring-professional',
    name: 'Professional Resume Enhancement',
    description: 'Comprehensive resume enhancement for professional presentation',
    systemRole: SYSTEM_ROLES.EXPERT_RESUME_WRITER,
    userTemplate: `You are helping enhance a resume for a specific job opportunity with a focus on professional presentation and impact.

INPUTS:
- Job Title: {jobTitle}
- Company: {company}
- Job Description: {jobDescription}
- Current Resume: {resume}
- Enhancement Request: {userRequest}

Please enhance the resume by:
1. Improving professional language and impact statements
2. Quantifying achievements where possible
3. Optimizing for the specific role and company
4. Ensuring professional formatting and structure
5. Highlighting transferable skills

Respond with:
UPDATED_RESUME:
[The enhanced resume in markdown format]

CHANGE_SUMMARY:
[Detailed summary of enhancements made and their impact]`,
    model: MODELS.GPT4O_MINI,
    temperature: TEMPERATURE.BALANCED,
    responseFormat: {
      type: 'text',
      examples: [
        'UPDATED_RESUME:\n[enhanced resume content]\n\nCHANGE_SUMMARY:\n[detailed summary of enhancements]'
      ]
    },
    version: '1.0.0',
    tags: [TAGS.TAILORING, TAGS.PROFESSIONAL, 'resume']
  },

  INDUSTRY_SPECIFIC: {
    id: 'resume-tailoring-industry',
    name: 'Industry-Specific Resume Tailoring',
    description: 'Tailor resume for specific industry requirements and norms',
    systemRole: SYSTEM_ROLES.RESUME_OPTIMIZATION_SPECIALIST,
    userTemplate: `You are helping tailor a resume for a specific industry and role, focusing on industry-specific requirements and conventions.

INPUTS:
- Job Title: {jobTitle}
- Company: {company}
- Job Description: {jobDescription}
- Current Resume: {resume}
- Tailoring Request: {userRequest}

Please tailor the resume considering:
1. Industry-specific terminology and keywords
2. Relevant certifications and qualifications
3. Industry-standard formatting and structure
4. Key metrics and achievements valued in this industry
5. Technical skills and tools commonly used

Respond with:
UPDATED_RESUME:
[The industry-tailored resume in markdown format]

CHANGE_SUMMARY:
[Summary of industry-specific changes and their relevance]`,
    model: MODELS.GPT4O_MINI,
    temperature: TEMPERATURE.BALANCED,
    responseFormat: {
      type: 'text',
      examples: [
        'UPDATED_RESUME:\n[industry-tailored resume]\n\nCHANGE_SUMMARY:\n[industry-specific changes summary]'
      ]
    },
    version: '1.0.0',
    tags: [TAGS.TAILORING, 'industry', 'resume']
  }
}