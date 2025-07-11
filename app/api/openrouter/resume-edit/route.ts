import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-logger";
import { initFirebaseAdmin } from "@/lib/firebase-admin-init";
import { getAuth } from "firebase-admin/auth";

export async function POST(req: NextRequest) {
  const { message, resume, mode } = await req.json();
  const apiKey = process.env.OPENROUTER_API_KEY;
  console.log("OpenRouter API key exists:", !!apiKey);
  console.log("OpenRouter API key length:", apiKey?.length || 0);
  if (!apiKey) {
    console.log("ERROR: Missing OpenRouter API key");
    return NextResponse.json(
      { error: "Missing OpenRouter API key" },
      { status: 500 }
    );
  }

  try {
    const startTime = Date.now();
    let prompt = "";
    let systemPrompt = "";
    const llmModel = "openai/gpt-4o-mini";

    if (mode === "agent") {
      // Agent mode: Make actual changes to resume and provide summary
      systemPrompt =
        "You are an expert resume writer and career coach. You will receive a resume and a specific instruction. Make the requested changes and then provide a response in this exact format:\n\nUPDATED_RESUME:\n[full updated resume here]\n\nCHANGE_SUMMARY:\n[brief 1-2 sentence summary of what you changed]";

      prompt = `User Request: ${message}\n\nCurrent Resume:\n${resume}\n\nPlease make the requested changes to the resume and provide both the updated resume and a brief summary of changes.`;
    } else {
      // Ask mode: Only provide advice, don't change resume
      systemPrompt =
        "You are an expert resume advisor and career coach. Answer questions about resumes, provide career advice, and offer helpful suggestions, but do not make actual changes to the resume content. Focus on best practices, industry standards, and actionable advice.";

      prompt = `Resume:\n${resume}\n\nQuestion: ${message}\n\nPlease provide helpful advice without making changes to the resume.`;
    }

    const openrouterRes = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: llmModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!openrouterRes.ok) {
      const error = await openrouterRes.text();
      console.log("OpenRouter API error:", openrouterRes.status, error);
      return NextResponse.json(
        { error: "OpenRouter error", details: error },
        { status: 500 }
      );
    }

    const data = await openrouterRes.json();
    const aiResponse = data.choices?.[0]?.message?.content || "";
    const tokenUsage = data.usage?.total_tokens || 0;
    const timeTaken = (Date.now() - startTime) / 1000;

    const token = req.headers.get("Authorization")?.split("Bearer ")[1];
    if (token) {
      initFirebaseAdmin();
      const decodedToken = await getAuth().verifyIdToken(token);
      const userId = decodedToken.uid;
      await logActivity({
        userId,
        activityType: "resume_edit",
        tokenUsage,
        timeTaken,
        metadata: { model: llmModel, mode, user_prompt: message },
      });
    }

    if (mode === "agent") {
      // Parse the AI response to extract updated resume and change summary
      const updatedResumeMatch = aiResponse.match(
        /UPDATED_RESUME:\s*([\s\S]*?)\s*CHANGE_SUMMARY:/
      );
      const changeSummaryMatch = aiResponse.match(
        /CHANGE_SUMMARY:\s*([\s\S]*?)$/
      );

      let updatedResume = updatedResumeMatch
        ? updatedResumeMatch[1].trim()
        : resume;
      
      // Remove markdown code fences if present
      const fenceRegex = /```\s*(?:markdown)?[^\n]*\n([\s\S]*?)\n```/i;
      const fenceMatch = updatedResume.match(fenceRegex);
      if (fenceMatch && fenceMatch[1]) {
        updatedResume = fenceMatch[1].trim();
      }
      const changeSummary = changeSummaryMatch
        ? changeSummaryMatch[1].trim()
        : "Changes have been made to your resume.";

      return NextResponse.json({
        reply: changeSummary,
        updatedResume: updatedResume,
      });
    } else {
      // Ask mode: just return the advice
      return NextResponse.json({ reply: aiResponse });
    }
  } catch (err) {
    console.error("OpenRouter API exception:", err);
    console.error("Error message:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: "Failed to call OpenRouter", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
 