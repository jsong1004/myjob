import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from 'firebase-admin/firestore';
import { initFirebaseAdmin } from '@/lib/firebase-admin-init';

export async function POST(req: NextRequest) {
  const { type, title, description, user } = await req.json();
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO = process.env.GITHUB_REPO || "jsong1004/myjob"; // Default repo

  if (!GITHUB_TOKEN) {
    return NextResponse.json(
      { error: "GitHub token is not configured on the server." },
      { status: 500 }
    );
  }

  // Map feedback types to appropriate GitHub labels
  let labels: string[] = [];
  switch (type) {
    case "bug":
      labels = ["bug"];
      break;
    case "feature":
      labels = ["enhancement"];
      break;
    case "enhancement":
      labels = ["enhancement"];
      break;
    case "help wanted":
      labels = ["help wanted"];
      break;
    case "question":
      labels = ["question"];
      break;
    default:
      labels = ["enhancement"]; // fallback
  }
  const submittedBy = user ? `**Submitted by:** ${user.name} (${user.email || 'No email provided'})` : '**Submitted by:** Anonymous';

  const body = `
${submittedBy}
**Request Type:** ${type === 'bug' ? 'Bug Report' : 'Feature Request'}

---

### Description

${description}
  `;

  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
      method: "POST",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        title,
        body,
        labels,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("GitHub API Error:", errorData);
      return NextResponse.json(
        { error: `GitHub API Error: ${errorData.message}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const githubIssueUrl = data.html_url;

    // Now, store the feedback in Firestore
    try {
      initFirebaseAdmin();
      const db = getFirestore();
      await db.collection('feedback').add({
        userId: user ? user.id : null,
        userName: user ? user.name : 'Anonymous',
        userEmail: user ? user.email : null,
        type,
        title,
        description,
        githubIssueUrl,
        createdAt: new Date(),
      });
    } catch (dbError) {
      console.error("Firestore Error:", dbError);
      // Don't fail the request if only Firestore save fails,
      // as the GitHub issue was already created.
      // Log the error for monitoring.
    }

    return NextResponse.json({ url: githubIssueUrl }, { status: 201 });

  } catch (error: any) {
    console.error("Failed to create GitHub issue:", error);
    return NextResponse.json(
      { error: "Failed to connect to GitHub API." },
      { status: 500 }
    );
  }
} 