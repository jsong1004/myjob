import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { message, resume, jobTitle, company } = await req.json()
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Missing OpenRouter API key" }, { status: 500 })
  }

  try {
    const prompt = `You are an expert resume coach. Given the following resume and a user request, update the resume to better match the job title and company.\n\nJob Title: ${jobTitle}\nCompany: ${company}\n\nUser Request: ${message}\n\nCurrent Resume:\n${resume}\n\nReturn ONLY the improved resume text, nothing else.`

    const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert resume writer and ATS specialist. You will receive two inputs: (1) the candidate's full resume, and (2) the job description. Your tasks:\n1. Extract from the job description the top required skills, experiences, qualifications, and keywords.\n2. Remove any skills, roles, or achievements from the resume that are not relevant to the job description.\n3. Reorganize the remaining content into a clean, ATS‑friendly structure with headings like \"Professional Summary,\" \"Experience,\" \"Education,\" and \"Skills.\"\n4. Rewrite bullet points using concise, impactful, action‑verb‑led language (e.g., \"Spearheaded,\" \"Optimized,\" \"Delivered\") and include quantifiable metrics wherever possible.\n5. Ensure the resume:\n* Is no more than two pages\n* Uses standard sans-serif fonts, simple headings, and bullet points (no tables, graphics, images)\n* Embeds keywords verbatim from the job description\n* Is formatted clearly for both ATS parsing and human readability\nOutput only the updated resume (not analysis or explanations). Preserve formatting (e.g., bullets). Keep tone professional and focused." },
          { role: "user", content: prompt },
        ],
      }),
    })
    if (!openrouterRes.ok) {
      const error = await openrouterRes.text()
      return NextResponse.json({ error: "OpenRouter error", details: error }, { status: 500 })
    }
    const data = await openrouterRes.json()
    const reply = data.choices?.[0]?.message?.content || ""
    return NextResponse.json({ reply, updatedResume: reply })
  } catch (err) {
    return NextResponse.json({ error: "Failed to call OpenRouter" }, { status: 500 })
  }
} 