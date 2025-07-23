export const careerAdvisorPrompt = {
  name: 'career_advisor',
  description: 'Get personalized career advice, interview preparation, and job search guidance',
  arguments: [
    {
      name: 'topic',
      description: 'Topic for career advice (interview_prep, salary_negotiation, career_change, skill_development, networking)',
      required: true
    },
    {
      name: 'context',
      description: 'Additional context about your situation',
      required: false
    },
    {
      name: 'job_title',
      description: 'Specific job title or role you are targeting',
      required: false
    },
    {
      name: 'industry',
      description: 'Industry you are interested in',
      required: false
    },
    {
      name: 'experience_level',
      description: 'Your experience level (entry, mid, senior, executive)',
      required: false
    }
  ],
  handler: async (args: Record<string, any>) => {
    const { topic, context, job_title, industry, experience_level } = args
    
    let systemPrompt = "You are an experienced career advisor and coach with expertise in job searching, interview preparation, and career development. Provide personalized, actionable advice based on current market trends and best practices."
    
    let userPrompt = `Please provide career advice on: ${topic}`
    
    if (job_title) {
      userPrompt += `\nTarget role: ${job_title}`
    }
    
    if (industry) {
      userPrompt += `\nIndustry: ${industry}`
    }
    
    if (experience_level) {
      userPrompt += `\nExperience level: ${experience_level}`
    }
    
    if (context) {
      userPrompt += `\nAdditional context: ${context}`
    }
    
    // Add topic-specific guidance
    switch (topic) {
      case 'interview_prep':
        systemPrompt += " Focus on providing specific interview preparation strategies, common questions, and techniques for answering behavioral questions using the STAR method."
        break
      case 'salary_negotiation':
        systemPrompt += " Provide strategies for researching market rates, timing negotiations, and presenting compelling cases for salary increases or better job offers."
        break
      case 'career_change':
        systemPrompt += " Focus on helping with career transitions, identifying transferable skills, and strategies for pivoting to new industries or roles."
        break
      case 'skill_development':
        systemPrompt += " Focus on identifying skill gaps, recommending learning resources, and creating development plans aligned with career goals."
        break
      case 'networking':
        systemPrompt += " Provide strategies for building professional networks, leveraging LinkedIn, attending industry events, and maintaining relationships."
        break
    }
    
    userPrompt += "\n\nPlease provide specific, actionable advice that I can implement immediately."
    
    return [
      {
        role: 'system',
        content: {
          type: 'text',
          text: systemPrompt
        }
      },
      {
        role: 'user',
        content: {
          type: 'text',
          text: userPrompt
        }
      }
    ]
  }
}