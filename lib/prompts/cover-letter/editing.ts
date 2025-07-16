// lib/prompts/cover-letter/editing.ts
import { PromptConfig } from '../types'
import { MODELS, TEMPERATURE, TAGS } from '../constants'
import { SYSTEM_ROLES } from '../shared/system-roles'

export const COVER_LETTER_EDITING_PROMPTS: Record<string, PromptConfig> = {
  AGENT: {
    id: 'cover-letter-editing-agent',
    name: 'Cover Letter Editing Agent',
    description: 'Edit existing cover letter based on user request',
    systemRole: SYSTEM_ROLES.PROFESSIONAL_COVER_LETTER_WRITER,
    userTemplate: `You are editing an existing cover letter based on the user's specific request. Make the requested changes while maintaining professional quality and coherence.

INPUTS:
- User Request: {userRequest}
- Existing Cover Letter: {existingCoverLetter}
- Job Title: {jobTitle}
- Company: {company}
- Job Description: {jobDescription}
- Resume: {resume}

Please edit the cover letter based on the user's request. Focus on:
1. Implementing the specific changes requested
2. Maintaining professional tone and structure
3. Ensuring the letter remains compelling and engaging
4. Preserving the overall flow and coherence
5. Optimizing for the specific job and company

Respond with only the complete, updated cover letter text.`,
    model: MODELS.GPT4O_MINI,
    temperature: TEMPERATURE.BALANCED,
    responseFormat: { type: 'text' },
    version: '1.0.0',
    tags: [TAGS.EDITING, 'agent', 'cover-letter']
  },

  ADVISORY: {
    id: 'cover-letter-editing-advisory',
    name: 'Cover Letter Editing Advisory',
    description: 'Provide cover letter editing advice without making changes',
    systemRole: SYSTEM_ROLES.CAREER_ADVISOR,
    userTemplate: `You are providing advice about editing a cover letter. Help the user understand how to improve their cover letter without making the actual changes.

INPUTS:
- Job Title: {jobTitle}
- Company: {company}
- Job Description: {jobDescription}
- Resume: {resume}
- User Question: {userRequest}

Please provide specific, actionable advice about:
1. How to improve the cover letter's impact
2. What elements to strengthen or modify
3. How to better align with the job requirements
4. Suggestions for tone and structure improvements
5. Best practices for cover letter writing

Provide helpful guidance without creating the actual cover letter content.`,
    model: MODELS.GPT4O_MINI,
    temperature: TEMPERATURE.CREATIVE,
    responseFormat: { type: 'text' },
    version: '1.0.0',
    tags: [TAGS.EDITING, TAGS.ADVISORY, 'cover-letter']
  },

  TONE_ADJUSTMENT: {
    id: 'cover-letter-editing-tone',
    name: 'Cover Letter Tone Adjustment',
    description: 'Adjust the tone and style of a cover letter',
    systemRole: SYSTEM_ROLES.PROFESSIONAL_COVER_LETTER_WRITER,
    userTemplate: `You are adjusting the tone and style of a cover letter to better match the company culture and role requirements.

INPUTS:
- Tone Request: {userRequest}
- Existing Cover Letter: {existingCoverLetter}
- Job Title: {jobTitle}
- Company: {company}
- Job Description: {jobDescription}
- Resume: {resume}

Please adjust the cover letter's tone while:
1. Maintaining the core content and structure
2. Adapting the language to match the requested tone
3. Ensuring the new tone aligns with the company culture
4. Preserving the key selling points and achievements
5. Keeping the letter engaging and professional

Respond with only the complete, tone-adjusted cover letter text.`,
    model: MODELS.GPT4O_MINI,
    temperature: TEMPERATURE.CREATIVE,
    responseFormat: { type: 'text' },
    version: '1.0.0',
    tags: [TAGS.EDITING, 'tone', 'cover-letter']
  },

  CONTENT_REFINEMENT: {
    id: 'cover-letter-editing-refine',
    name: 'Cover Letter Content Refinement',
    description: 'Refine and improve cover letter content for better impact',
    systemRole: SYSTEM_ROLES.PROFESSIONAL_COVER_LETTER_WRITER,
    userTemplate: `You are refining the content of a cover letter to make it more impactful and compelling.

INPUTS:
- Refinement Request: {userRequest}
- Existing Cover Letter: {existingCoverLetter}
- Job Title: {jobTitle}
- Company: {company}
- Job Description: {jobDescription}
- Resume: {resume}

Please refine the cover letter by:
1. Strengthening weak sections
2. Adding more compelling examples
3. Improving the flow and transitions
4. Enhancing the opening and closing
5. Making the content more specific and impactful

Respond with only the complete, refined cover letter text.`,
    model: MODELS.GPT4O_MINI,
    temperature: TEMPERATURE.BALANCED,
    responseFormat: { type: 'text' },
    version: '1.0.0',
    tags: [TAGS.EDITING, 'refinement', 'cover-letter']
  },

  LENGTH_ADJUSTMENT: {
    id: 'cover-letter-editing-length',
    name: 'Cover Letter Length Adjustment',
    description: 'Adjust cover letter length while maintaining key messages',
    systemRole: SYSTEM_ROLES.PROFESSIONAL_COVER_LETTER_WRITER,
    userTemplate: `You are adjusting the length of a cover letter based on the user's requirements while maintaining the most important messages.

INPUTS:
- Length Request: {userRequest}
- Existing Cover Letter: {existingCoverLetter}
- Job Title: {jobTitle}
- Company: {company}
- Job Description: {jobDescription}
- Resume: {resume}

Please adjust the cover letter length by:
1. Maintaining the most important selling points
2. Preserving the professional structure
3. Ensuring the letter remains engaging
4. Keeping the key achievements and qualifications
5. Maintaining proper flow and coherence

Respond with only the complete, length-adjusted cover letter text.`,
    model: MODELS.GPT4O_MINI,
    temperature: TEMPERATURE.BALANCED,
    responseFormat: { type: 'text' },
    version: '1.0.0',
    tags: [TAGS.EDITING, 'length', 'cover-letter']
  }
}