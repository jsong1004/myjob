// lib/prompts/cover-letter/generation.ts
import { PromptConfig } from '../types'
import { MODELS, TEMPERATURE, TAGS } from '../constants'
import { SYSTEM_ROLES } from '../shared/system-roles'

export const COVER_LETTER_GENERATION_PROMPTS: Record<string, PromptConfig> = {
  PROFESSIONAL: {
    id: 'cover-letter-generation-professional',
    name: 'Professional Cover Letter Generation',
    description: 'Generate compelling, personalized cover letters for job applications',
    systemRole: SYSTEM_ROLES.PROFESSIONAL_COVER_LETTER_WRITER,
    userTemplate: `You are creating a compelling cover letter for a specific job opportunity. Create a professional, personalized cover letter that effectively connects the candidate's background to the role.

INPUTS:
- Job Title: {jobTitle}
- Company: {company}
- Job Description: {jobDescription}
- Candidate Resume: {resume}
- Specific Request: {userRequest}

Please create a cover letter that:
1. Opens with a strong, engaging introduction
2. Highlights relevant experience and achievements
3. Demonstrates knowledge of the company and role
4. Shows enthusiasm and cultural fit
5. Closes with a compelling call to action

IMPORTANT: Do NOT include traditional letter header formatting (no sender address, date, recipient address blocks). Start directly with "Dear Hiring Manager" or personalized greeting.

Respond with:
COVER_LETTER:
[The complete cover letter starting with the greeting, no header blocks]

SUMMARY:
[Brief summary of the key selling points highlighted in the cover letter]`,
    model: MODELS.GPT4O_MINI,
    temperature: TEMPERATURE.CREATIVE,
    responseFormat: {
      type: 'text',
      examples: [
        'COVER_LETTER:\n[professional cover letter content]\n\nSUMMARY:\n[key selling points summary]'
      ]
    },
    version: '1.0.0',
    tags: [TAGS.GENERATION, TAGS.PROFESSIONAL, 'cover-letter']
  },

  CREATIVE: {
    id: 'cover-letter-generation-creative',
    name: 'Creative Cover Letter Generation',
    description: 'Generate creative, engaging cover letters for creative roles',
    systemRole: SYSTEM_ROLES.PROFESSIONAL_COVER_LETTER_WRITER,
    userTemplate: `You are creating a creative and engaging cover letter for a role that values innovation and creativity. Balance professionalism with personality and creative flair.

INPUTS:
- Job Title: {jobTitle}
- Company: {company}
- Job Description: {jobDescription}
- Candidate Resume: {resume}
- Creative Request: {userRequest}

Please create a cover letter that:
1. Captures attention with a unique opening
2. Showcases creativity and personality
3. Demonstrates relevant creative experience
4. Shows understanding of the company culture
5. Maintains professionalism while being engaging

IMPORTANT: Do NOT include traditional letter header formatting (no sender address, date, recipient address blocks). Start directly with "Dear Hiring Manager" or personalized greeting.

Respond with:
COVER_LETTER:
[The creative cover letter starting with the greeting, no header blocks]

SUMMARY:
[Summary of the creative elements and key messages]`,
    model: MODELS.GPT4O_MINI,
    temperature: TEMPERATURE.VERY_CREATIVE,
    responseFormat: {
      type: 'text',
      examples: [
        'COVER_LETTER:\n[creative cover letter content]\n\nSUMMARY:\n[creative elements summary]'
      ]
    },
    version: '1.0.0',
    tags: [TAGS.GENERATION, 'creative', 'cover-letter']
  },

  TECHNICAL: {
    id: 'cover-letter-generation-technical',
    name: 'Technical Cover Letter Generation',
    description: 'Generate cover letters for technical roles with focus on skills and experience',
    systemRole: SYSTEM_ROLES.PROFESSIONAL_COVER_LETTER_WRITER,
    userTemplate: `You are creating a cover letter for a technical role. Focus on technical skills, relevant experience, and problem-solving abilities while maintaining readability for both technical and non-technical readers.

INPUTS:
- Job Title: {jobTitle}
- Company: {company}
- Job Description: {jobDescription}
- Candidate Resume: {resume}
- Technical Focus: {userRequest}

Please create a cover letter that:
1. Highlights relevant technical skills and experience
2. Demonstrates problem-solving abilities
3. Shows understanding of technical requirements
4. Includes specific examples of technical achievements
5. Balances technical depth with accessibility

IMPORTANT: Do NOT include traditional letter header formatting (no sender address, date, recipient address blocks). Start directly with "Dear Hiring Manager" or personalized greeting.

Respond with:
COVER_LETTER:
[The technical cover letter starting with the greeting, no header blocks]

SUMMARY:
[Summary of technical highlights and key qualifications]`,
    model: MODELS.GPT4O_MINI,
    temperature: TEMPERATURE.BALANCED,
    responseFormat: {
      type: 'text',
      examples: [
        'COVER_LETTER:\n[technical cover letter content]\n\nSUMMARY:\n[technical highlights summary]'
      ]
    },
    version: '1.0.0',
    tags: [TAGS.GENERATION, 'technical', 'cover-letter']
  },

  ENTRY_LEVEL: {
    id: 'cover-letter-generation-entry',
    name: 'Entry-Level Cover Letter Generation',
    description: 'Generate cover letters for entry-level positions and career changers',
    systemRole: SYSTEM_ROLES.PROFESSIONAL_COVER_LETTER_WRITER,
    userTemplate: `You are creating a cover letter for an entry-level position or career changer. Focus on potential, transferable skills, education, and enthusiasm rather than extensive experience.

INPUTS:
- Job Title: {jobTitle}
- Company: {company}
- Job Description: {jobDescription}
- Candidate Resume: {resume}
- Entry-Level Focus: {userRequest}

Please create a cover letter that:
1. Emphasizes potential and eagerness to learn
2. Highlights transferable skills from other experiences
3. Showcases relevant education and projects
4. Demonstrates enthusiasm for the role and company
5. Addresses any experience gaps positively

IMPORTANT: Do NOT include traditional letter header formatting (no sender address, date, recipient address blocks). Start directly with "Dear Hiring Manager" or personalized greeting.

Respond with:
COVER_LETTER:
[The entry-level focused cover letter starting with the greeting, no header blocks]

SUMMARY:
[Summary of key strengths and potential highlighted]`,
    model: MODELS.GPT4O_MINI,
    temperature: TEMPERATURE.CREATIVE,
    responseFormat: {
      type: 'text',
      examples: [
        'COVER_LETTER:\n[entry-level cover letter content]\n\nSUMMARY:\n[key strengths summary]'
      ]
    },
    version: '1.0.0',
    tags: [TAGS.GENERATION, 'entry-level', 'cover-letter']
  }
}