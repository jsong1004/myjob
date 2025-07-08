import { NextRequest, NextResponse } from "next/server"
import { logActivity } from "@/lib/activity-logger";
import { initFirebaseAdmin } from "@/lib/firebase-admin-init";
import { getAuth } from "firebase-admin/auth";

export async function POST(req: NextRequest) {
  const { message, resume, jobTitle, company, jobDescription, mode = 'agent', coverLetter: existingCoverLetter } = await req.json()
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
      // Agent mode: Generate cover letter and provide summary
      llmModel = "openai/gpt-4o-mini"
      
      if (existingCoverLetter) {
        // EDITING an existing cover letter
        systemPrompt = "You are an expert cover letter editor. Your task is to refine an existing cover letter based on the user's instructions. Make only the requested changes, preserving the rest of the letter. The output must be the complete, updated cover letter."
        prompt = `Please edit the following cover letter based on my request.

USER REQUEST:
${message}

EXISTING COVER LETTER:
${existingCoverLetter}

Resume and Job details are provided for context.
- Job Title: ${jobTitle}
- Company: ${company}
- Job Description: ${jobDescription}
- Resume: ${resume}

OUTPUT REQUIREMENTS:
Respond with only the complete, updated cover letter text. Do not include any other commentary, preamble, or summary. Just the letter.`
      } else {
        // GENERATING a new cover letter
        systemPrompt = "You are an expert cover letter writer who creates compelling, personalized cover letters that stand out to recruiters."
      
        prompt = `You are an expert cover letter writer specializing in creating compelling, personalized cover letters that capture a candidate's unique value proposition and demonstrate genuine interest in the specific role and company.

INPUTS:
- Resume
- Job description
- Job title
- Company name

CORE OBJECTIVES:
1. Create a compelling cover letter that tells a story connecting the candidate's experience to the job requirements
2. Demonstrate genuine interest in the specific role and company
3. Highlight key achievements that align with the job requirements
4. Use a professional yet engaging tone that reflects the candidate's personality

COVER LETTER STRUCTURE:
1. Header:
   - Candidate's name and contact information (if available in resume)
   - Date
   - Hiring manager/company address

2. Opening Paragraph:
   - Grab attention with a compelling hook
   - Mention the specific position and where you found it
   - Brief statement of why you're interested in the role

3. Body Paragraphs (1-2 paragraphs):
   - Connect specific experiences from the resume to job requirements
   - Quantify achievements wherever possible
   - Show knowledge of the company and how you can contribute
   - Address key requirements mentioned in the job description

4. Closing Paragraph:
   - Reiterate interest and enthusiasm
   - Mention next steps or availability for interview
   - Professional closing

WRITING GUIDELINES:
- Keep it to one page (3-4 paragraphs)
- Use active voice and strong action verbs
- Be specific and avoid generic statements
- Show enthusiasm without being overly casual
- Use keywords from the job description naturally
- Tell a story that connects your background to their needs

PERSONALIZATION STRATEGIES:
- Reference specific aspects of the job description
- Mention company values, recent news, or initiatives if relevant
- Connect past achievements to potential future contributions
- Use industry-specific terminology appropriately

QUALITY CHECKS:
- Ensure cover letter is tailored to the specific job and company
- Verify all claims can be supported by the resume
- Check for engaging opening and strong closing
- Confirm professional tone throughout
- Ensure logical flow and compelling narrative

OUTPUT REQUIREMENTS:
Format your response as follows:
COVER_LETTER:
[Insert the complete cover letter here in clean, professional format]

SUMMARY:
[Brief summary of the approach taken and key points highlighted]

Job Title: ${jobTitle}
Company: ${company}
Job Description: ${jobDescription}

User Request: ${message}

Candidate's Resume:
${resume}

Please create a compelling cover letter that effectively connects the candidate's background to this specific opportunity.`
      }
    } else {
      // Ask mode: Only provide advice, don't generate cover letter
      llmModel = "openai/gpt-4o-mini"

      systemPrompt = "You are an expert cover letter advisor. Answer questions about cover letters and provide helpful advice, but do not create actual cover letter content."
      
      prompt = `Job Title: ${jobTitle}\nCompany: ${company}\nJob Description: ${jobDescription}\n\nResume:\n${resume}\n\nQuestion: ${message}\n\nPlease provide helpful advice about cover letter writing without creating the actual cover letter content.`
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
        initFirebaseAdmin();
        const decodedToken = await getAuth().verifyIdToken(token);
        const userId = decodedToken.uid;
        
        // Determine activity type based on mode and message content
        let activityType = 'cover_letter_generation';
        if (mode === 'ask') {
            activityType = 'cover_letter_advice';
        } else if (mode === 'agent') {
            // Check if this is initial generation or editing
            const isInitialGeneration = message.includes('Create a professional, tailored cover letter') || 
                                      message.includes('Create a compelling cover letter for this position');
            activityType = isInitialGeneration ? 'cover_letter_generation' : 'cover_letter_edit';
        }
        
        await logActivity({
            userId,
            activityType,
            tokenUsage,
            timeTaken,
            metadata: { 
                model: llmModel, 
                mode, 
                user_prompt: message,
                job_title: jobTitle,
                company: company,
                is_initial_generation: mode === 'agent' && (
                    message.includes('Create a professional, tailored cover letter') || 
                    message.includes('Create a compelling cover letter for this position')
                )
            },
        });
    }
    
    if (mode === "agent") {
      if (existingCoverLetter) {
        // When editing, the entire response is the cover letter
        return NextResponse.json({ 
          coverLetter: aiResponse.trim(),
          reply: "I have updated the cover letter with your changes.", // A simple confirmation
        })
      }

      // Parse the AI response to extract cover letter and summary for generation
      const coverLetterMatch = aiResponse.match(/COVER_LETTER:\s*([\s\S]*?)\s*SUMMARY:/);
      const summaryMatch = aiResponse.match(/SUMMARY:\s*([\s\S]*?)$/);
      
      let coverLetter = "";
      let summary = "Cover letter has been generated.";
      
      if (coverLetterMatch && summaryMatch) {
        // If the AI followed the format correctly
        coverLetter = coverLetterMatch[1].trim();
        summary = summaryMatch[1].trim();
      } else if (aiResponse.includes("COVER_LETTER:")) {
        // If partial format is found
        const letterMatch = aiResponse.match(/COVER_LETTER:\s*([\s\S]*?)$/);
        if (letterMatch) {
          coverLetter = letterMatch[1].trim();
          summary = "Cover letter has been generated according to your request.";
        }
      } else {
        // Fallback: treat the entire response as the cover letter if it looks like letter content
        const hasLetterStructure = aiResponse.includes("Dear") || aiResponse.includes("Sincerely") || aiResponse.includes("Best regards") || aiResponse.length > 200;
        if (hasLetterStructure) {
          coverLetter = aiResponse.trim();
          summary = "Cover letter has been generated according to your request.";
        } else {
          // If it doesn't look like letter content, treat it as a message
          summary = aiResponse;
          coverLetter = "I apologize, but I couldn't generate a proper cover letter. Please try again with more specific requirements.";
        }
      }
      
      return NextResponse.json({ 
        reply: summary, 
        coverLetter: coverLetter 
      })
    } else {
      // Ask mode: just return the advice
      return NextResponse.json({ reply: aiResponse })
    }
  } catch (err) {
    console.error("OpenRouter API error:", err)
    console.error("Error details:", err instanceof Error ? err.message : String(err))
    console.error("Stack trace:", err instanceof Error ? err.stack : 'No stack trace')
    return NextResponse.json({ 
      error: "Failed to generate cover letter", 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 })
  }
} 