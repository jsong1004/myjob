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
        model: "openai/gpt-4o",
        messages: [
          { role: "system", content: "You are an expert resume coach." },
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