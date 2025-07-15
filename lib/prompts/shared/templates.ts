// lib/prompts/shared/templates.ts

export const COMMON_TEMPLATES = {
  // Job context template
  JOB_CONTEXT: `Job Title: {jobTitle}
Company: {company}
Job Description: {jobDescription}`,

  // Resume context template
  RESUME_CONTEXT: `Resume:
{resume}`,

  // Combined job and resume context
  JOB_RESUME_CONTEXT: `Job Title: {jobTitle}
Company: {company}
Job Description: {jobDescription}

Resume:
{resume}`,

  // User request template
  USER_REQUEST: `User Request: {userRequest}`,

  // Response format instructions
  JSON_RESPONSE_FORMAT: `Please respond with a valid JSON object that matches the required schema.`,

  TEXT_RESPONSE_FORMAT: `Please respond with clear, well-structured text.`,

  STRUCTURED_RESPONSE_FORMAT: `Please structure your response with clear sections and formatting.`,

  // Common instructions
  NO_CHANGES_INSTRUCTION: `Please provide helpful advice without making changes to the resume.`,

  MAKE_CHANGES_INSTRUCTION: `Please make the requested changes and provide both the updated content and a summary of changes.`,

  PROFESSIONAL_TONE: `Maintain a professional, helpful, and constructive tone throughout your response.`,

  CONCISE_INSTRUCTION: `Keep your response concise and focused on the most important points.`,

  DETAILED_INSTRUCTION: `Provide detailed analysis and comprehensive recommendations.`
} as const

export type CommonTemplate = keyof typeof COMMON_TEMPLATES