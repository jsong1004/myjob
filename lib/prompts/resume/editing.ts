// lib/prompts/resume/editing.ts
import { PromptConfig } from '../types'
import { MODELS, TEMPERATURE, TAGS } from '../constants'
import { SYSTEM_ROLES } from '../shared/system-roles'

export const RESUME_EDITING_PROMPTS: Record<string, PromptConfig> = {
  AGENT: {
    id: 'resume-editing-agent',
    name: 'Resume Editing Agent',
    description: 'Make actual changes to resume based on user request',
    systemRole: SYSTEM_ROLES.EXPERT_RESUME_WRITER,
    userTemplate: `You are helping edit a resume based on the user's specific request. Make the requested changes while maintaining professional quality and coherence.

INPUTS:
- User Request: {userRequest}
- Current Resume: {resume}

Please make the requested changes to the resume. Focus on:
1. Implementing the specific changes requested
2. Maintaining professional language and formatting
3. Ensuring consistency throughout the document
4. Preserving the overall structure and flow
5. Improving clarity and impact where possible

Respond with:
UPDATED_RESUME:
[The complete updated resume in markdown format]

CHANGE_SUMMARY:
[Brief summary of the specific changes made]`,
    model: MODELS.GPT5_MINI,
    temperature: TEMPERATURE.BALANCED,
    responseFormat: {
      type: 'text',
      examples: [
        'UPDATED_RESUME:\n[updated resume content]\n\nCHANGE_SUMMARY:\n[summary of changes made]'
      ]
    },
    version: '1.0.0',
    tags: [TAGS.EDITING, 'agent', 'resume']
  },

  ADVISOR: {
    id: 'resume-editing-advisor',
    name: 'Resume Editing Advisor',
    description: 'Provide editing advice and answer resume-related questions',
    systemRole: SYSTEM_ROLES.CAREER_ADVISOR,
    userTemplate: `You are a career advisor helping with resume-related questions and advice. You can answer general questions about resume content, provide guidance on how to present experience, and offer suggestions for improvement.

INPUTS:
- Current Resume: {resume}
- User Question: {userRequest}

You can help with:
1. **General Resume Questions**: Answer questions about how to describe experience, skills, or achievements
2. **Content Guidance**: Suggest how to present specific experiences or skills effectively
3. **Improvement Advice**: Provide actionable suggestions for enhancing resume sections
4. **Best Practices**: Share resume writing best practices and industry standards
5. **Experience Framing**: Help frame experiences in compelling ways for specific roles

For questions about describing experience (like "Describe your experience developing and deploying NLP models"):
- Analyze the resume for relevant experience
- Suggest how to frame and present that experience effectively
- Provide specific language and bullet point suggestions
- Recommend what to emphasize or de-emphasize
- Offer examples of strong descriptions

Provide specific, actionable advice that draws from the resume content while following best practices.`,
    model: MODELS.GPT5_MINI,
    temperature: TEMPERATURE.CREATIVE,
    responseFormat: { type: 'text' },
    version: '1.1.0',
    tags: [TAGS.EDITING, TAGS.ADVISORY, 'resume']
  },

  PROOFREADING: {
    id: 'resume-editing-proofread',
    name: 'Resume Proofreading',
    description: 'Fix grammar, spelling, and formatting issues',
    systemRole: SYSTEM_ROLES.EXPERT_RESUME_WRITER,
    userTemplate: `You are proofreading a resume for grammar, spelling, formatting, and clarity issues.

INPUTS:
- User Request: {userRequest}
- Current Resume: {resume}

Please review and fix:
1. Grammar and spelling errors
2. Formatting inconsistencies
3. Punctuation issues
4. Clarity and readability problems
5. Professional language improvements

Respond with:
UPDATED_RESUME:
[The proofread resume in markdown format]

CHANGE_SUMMARY:
[Summary of corrections and improvements made]`,
    model: MODELS.GPT5_MINI,
    temperature: TEMPERATURE.PRECISE,
    responseFormat: {
      type: 'text',
      examples: [
        'UPDATED_RESUME:\n[proofread resume]\n\nCHANGE_SUMMARY:\n[summary of corrections]'
      ]
    },
    version: '1.0.0',
    tags: [TAGS.EDITING, 'proofreading', 'resume']
  },

  CONTENT_ENHANCEMENT: {
    id: 'resume-editing-enhance',
    name: 'Resume Content Enhancement',
    description: 'Enhance resume content for better impact and clarity',
    systemRole: SYSTEM_ROLES.EXPERT_RESUME_WRITER,
    userTemplate: `You are enhancing the content of a resume to make it more impactful and compelling.

INPUTS:
- User Request: {userRequest}
- Current Resume: {resume}

Please enhance the resume by:
1. Improving action verbs and power words
2. Adding quantifiable achievements where possible
3. Enhancing job descriptions for better impact
4. Improving skills presentation
5. Strengthening the overall narrative

Respond with:
UPDATED_RESUME:
[The enhanced resume in markdown format]

CHANGE_SUMMARY:
[Detailed summary of content enhancements made]`,
    model: MODELS.GPT5_MINI,
    temperature: TEMPERATURE.BALANCED,
    responseFormat: {
      type: 'text',
      examples: [
        'UPDATED_RESUME:\n[enhanced resume]\n\nCHANGE_SUMMARY:\n[enhancement summary]'
      ]
    },
    version: '1.0.0',
    tags: [TAGS.EDITING, 'enhancement', 'resume']
  },

  SECTION_SPECIFIC: {
    id: 'resume-editing-section',
    name: 'Section-Specific Resume Editing',
    description: 'Edit specific sections of the resume',
    systemRole: SYSTEM_ROLES.EXPERT_RESUME_WRITER,
    userTemplate: `You are editing a specific section of a resume based on the user's request.

INPUTS:
- User Request: {userRequest}
- Current Resume: {resume}

Please focus on the specific section mentioned in the user's request and:
1. Make the requested changes to that section
2. Ensure the section integrates well with the rest of the resume
3. Maintain consistency in formatting and style
4. Optimize the section for maximum impact
5. Preserve the overall resume structure

Respond with:
UPDATED_RESUME:
[The complete resume with the updated section]

CHANGE_SUMMARY:
[Summary of the specific section changes made]`,
    model: MODELS.GPT5_MINI,
    temperature: TEMPERATURE.BALANCED,
    responseFormat: {
      type: 'text',
      examples: [
        'UPDATED_RESUME:\n[resume with updated section]\n\nCHANGE_SUMMARY:\n[section-specific changes]'
      ]
    },
    version: '1.0.0',
    tags: [TAGS.EDITING, 'section', 'resume']
  }
}