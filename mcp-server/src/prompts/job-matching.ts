export const jobMatchingPrompt = {
  name: 'job_match_analysis',
  description: 'Analyze how well you match a specific job and get detailed feedback',
  arguments: [
    {
      name: 'job_title',
      description: 'Job title',
      required: true
    },
    {
      name: 'company',
      description: 'Company name',
      required: true
    },
    {
      name: 'job_description',
      description: 'Full job description',
      required: true
    },
    {
      name: 'resume_content',
      description: 'Your resume content (optional - will use default if not provided)',
      required: false
    },
    {
      name: 'analysis_type',
      description: 'Type of analysis (fit_assessment, gap_analysis, interview_prep, application_strategy)',
      required: false
    }
  ],
  handler: async (args: Record<string, any>) => {
    const { job_title, company, job_description, resume_content, analysis_type = 'fit_assessment' } = args
    
    let systemPrompt = "You are an expert career advisor and hiring manager with deep knowledge of job market trends, hiring practices, and candidate evaluation. Provide detailed, honest, and actionable analysis."
    
    let userPrompt = `Please analyze this job opportunity:\n\n`
    userPrompt += `**Job Title:** ${job_title}\n`
    userPrompt += `**Company:** ${company}\n`
    userPrompt += `**Job Description:**\n${job_description}\n\n`
    
    if (resume_content) {
      userPrompt += `**My Resume:**\n${resume_content}\n\n`
    }
    
    // Add analysis type specific instructions
    switch (analysis_type) {
      case 'fit_assessment':
        systemPrompt += " Provide a comprehensive fit assessment including match percentage, key strengths, potential concerns, and overall recommendation."
        userPrompt += "Please provide a detailed fit assessment including:\n"
        userPrompt += "1. Overall match score (0-100)\n"
        userPrompt += "2. Key strengths that align with the role\n"
        userPrompt += "3. Potential gaps or concerns\n"
        userPrompt += "4. Specific recommendations for improving my candidacy\n"
        userPrompt += "5. Whether I should apply and why"
        break
        
      case 'gap_analysis':
        systemPrompt += " Focus on identifying skill gaps, experience shortfalls, and areas for improvement to become a stronger candidate."
        userPrompt += "Please provide a detailed gap analysis including:\n"
        userPrompt += "1. Required skills/experience I'm missing\n"
        userPrompt += "2. Skills I have that aren't well-highlighted\n"
        userPrompt += "3. Specific areas for development\n"
        userPrompt += "4. Timeline and resources for closing gaps\n"
        userPrompt += "5. Alternative ways to demonstrate relevant experience"
        break
        
      case 'interview_prep':
        systemPrompt += " Focus on interview preparation specific to this role and company, including likely questions and talking points."
        userPrompt += "Please provide interview preparation guidance including:\n"
        userPrompt += "1. Likely interview questions for this role\n"
        userPrompt += "2. Key talking points to emphasize\n"
        userPrompt += "3. Examples from my background to highlight\n"
        userPrompt += "4. Questions I should ask the interviewer\n"
        userPrompt += "5. Company-specific talking points"
        break
        
      case 'application_strategy':
        systemPrompt += " Focus on application strategy including resume tailoring, cover letter guidance, and networking approaches."
        userPrompt += "Please provide application strategy guidance including:\n"
        userPrompt += "1. How to tailor my resume for this role\n"
        userPrompt += "2. Key points for my cover letter\n"
        userPrompt += "3. Networking opportunities at this company\n"
        userPrompt += "4. Best way to submit my application\n"
        userPrompt += "5. Follow-up timeline and approach"
        break
    }
    
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