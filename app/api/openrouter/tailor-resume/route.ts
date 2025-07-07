import { NextRequest, NextResponse } from "next/server"
import { logActivity } from "@/lib/activity-logger";
import { initFirebaseAdmin } from "@/lib/firebase-admin-init";
import { getAuth } from "firebase-admin/auth";

initFirebaseAdmin();

export async function POST(req: NextRequest) {
  const { message, resume, jobTitle, company, jobDescription, mode = 'agent' } = await req.json()
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Missing OpenRouter API key" }, { status: 500 })
  }

  try {
    const startTime = Date.now();
    let prompt = ""
    let systemPrompt = ""
    let llmModel = ""
    
    if (mode === "agent") {
      // Agent mode: Make actual changes to resume and provide summary
      llmModel = "openai/gpt-4.1-mini",
      systemPrompt = "You are an expert resume writer."
      
      prompt = `You are an expert resume optimization specialist focused on maximizing ATS (Applicant Tracking System) compatibility and recruiter appeal. Your task is to strategically tailor resumes to pass automated screening systems while maintaining complete truthfulness.

INPUTS:
- Resume
- Job description
- Job title
- Company

CORE OBJECTIVES:
1. Achieve maximum ATS score by incorporating exact keyword matches from the job description
2. Ensure the resume passes initial automated screening filters
3. Create compelling content that resonates with human reviewers post-ATS

ANALYSIS PHASE:
1. Extract and categorize from job description:
   - Required skills (must-have keywords)
   - Preferred skills (nice-to-have keywords)
   - Technical requirements and tools
   - Industry-specific terminology
   - Action verbs used in the posting
   - Qualification levels and years of experience

2. Identify keyword variations and synonyms that ATS systems recognize

OPTIMIZATION STRATEGIES:
1. Keyword Integration:
   - Mirror exact phrasing from job description where truthfully applicable
   - Distribute keywords naturally throughout resume sections
   - Include both acronyms and full terms (e.g., "SEO (Search Engine Optimization)")
   
2. Content Restructuring:
   - Prioritize experiences that directly match job requirements
   - Remove or minimize content irrelevant to the target role
   - Reorder bullet points to lead with most relevant achievements
   
3. Quantification and Impact:
   - Add metrics and numbers wherever possible
   - Convert vague statements into specific, measurable outcomes
   - Use CAR format (Challenge-Action-Result) where applicable

4. ATS-Friendly Formatting:
   - Use standard section headers (Experience, Education, Skills)
   - Avoid tables, columns, headers/footers, or graphics
   - Ensure consistent date formatting (MM/YYYY)
   - Use standard bullet points only

SECTION-SPECIFIC GUIDELINES:
- Professional Summary: 3-4 lines incorporating top keywords from job description
- Skills Section: List both technical and soft skills using exact terminology from posting
- Experience: Start each bullet with action verbs from the job description
- Education/Certifications: Include relevant coursework, projects, or certifications mentioned in posting

QUALITY CHECKS:
- Verify 70%+ keyword match rate with job description
- Ensure all statements remain truthful to candidate's actual experience
- Confirm readability at 10-12 point standard fonts
- Validate no formatting that could confuse ATS parsers

OUTPUT REQUIREMENTS:
- Format your response as follows:
  UPDATED_RESUME:
  [Insert the complete optimized resume here in clean markdown format]
  
  CHANGE_SUMMARY:
  [Brief summary of the changes made]
- Proper spacing and professional formatting
- All content in English (translate if necessary)
- Maintain logical flow while maximizing keyword density

CRITICAL REMINDERS:
- Never fabricate experience or skills
- Focus on reframing existing experience to align with job requirements
- If experience is genuinely lacking, emphasize transferable skills
- Remove all content that dilutes focus from the target role

Job Title: ${jobTitle}
Company: ${company}
Job Description: ${jobDescription}

User Request: ${message}

Current Resume:
${resume}

Please make the requested changes to the resume and provide both the updated resume and a brief summary of changes.`
    } else {
      // Ask mode: Only provide advice, don't change resume
      llmModel = "openai/gpt-4o-mini",

      systemPrompt = "You are an expert resume advisor. Answer questions about resumes and provide helpful advice, but do not make actual changes to the resume content."
      
      prompt = `Job Title: ${jobTitle}\nCompany: ${company}\nJob Description: ${jobDescription}\n\nResume:\n${resume}\n\nQuestion: ${message}\n\nPlease provide helpful advice without making changes to the resume.`
    }

    const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: llmModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    })
    
    if (!openrouterRes.ok) {
      const error = await openrouterRes.text()
      return NextResponse.json({ error: "OpenRouter error", details: error }, { status: 500 })
    }
    
    const data = await openrouterRes.json()
    const aiResponse = data.choices?.[0]?.message?.content || ""
    const tokenUsage = data.usage?.total_tokens || 0;
    const timeTaken = (Date.now() - startTime) / 1000;

    const token = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (token) {
        const decodedToken = await getAuth().verifyIdToken(token);
        const userId = decodedToken.uid;
        await logActivity({
            userId,
            activityType: 'resume_generation',
            tokenUsage,
            timeTaken,
            metadata: { model: llmModel, mode },
        });
    }
    
    if (mode === "agent") {
      // Parse the AI response to extract updated resume and change summary
      const updatedResumeMatch = aiResponse.match(/UPDATED_RESUME:\s*([\s\S]*?)\s*CHANGE_SUMMARY:/);
      const changeSummaryMatch = aiResponse.match(/CHANGE_SUMMARY:\s*([\s\S]*?)$/);
      
      let updatedResume = resume;
      let changeSummary = "Changes have been made to your resume.";
      
      if (updatedResumeMatch && changeSummaryMatch) {
        // If the AI followed the format correctly
        updatedResume = updatedResumeMatch[1].trim();
        changeSummary = changeSummaryMatch[1].trim();
      } else if (aiResponse.includes("UPDATED_RESUME:")) {
        // If partial format is found
        const resumeMatch = aiResponse.match(/UPDATED_RESUME:\s*([\s\S]*?)$/);
        if (resumeMatch) {
          updatedResume = resumeMatch[1].trim();
          changeSummary = "Resume has been updated according to your request.";
        }
      } else {
        // Fallback: treat the entire response as the updated resume if it looks like resume content
        const hasResumeStructure = aiResponse.includes("Experience") || aiResponse.includes("Skills") || aiResponse.includes("Education") || aiResponse.includes("Summary");
        if (hasResumeStructure && aiResponse.length > 100) {
          updatedResume = aiResponse.trim();
          changeSummary = "Resume has been updated according to your request.";
        } else {
          // If it doesn't look like resume content, treat it as a message and keep original resume
          changeSummary = aiResponse;
        }
      }
      
      return NextResponse.json({ 
        reply: changeSummary, 
        updatedResume: updatedResume 
      })
    } else {
      // Ask mode: just return the advice
      return NextResponse.json({ reply: aiResponse })
    }
  } catch (err) {
    return NextResponse.json({ error: "Failed to call OpenRouter" }, { status: 500 })
  }
} 