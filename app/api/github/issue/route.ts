import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { initFirebaseAdmin } from '@/lib/firebase-admin-init';
import { parseFile } from '@/lib/file-parser';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const type = formData.get('type') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const userStr = formData.get('user') as string;
  const user = userStr ? JSON.parse(userStr) : null;
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

  // Process file attachments
  const attachments: string[] = [];
  const fileEntries = Array.from(formData.entries()).filter(([key]) => key.startsWith('file_'));
  
  if (fileEntries.length > 0) {
    try {
      initFirebaseAdmin();
      const storage = getStorage();
      const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      if (!bucketName) {
        throw new Error('Firebase Storage bucket not configured. Please set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable.');
      }
      const bucket = storage.bucket(bucketName);
      
      for (const [key, file] of fileEntries) {
        if (file instanceof File) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const timestamp = Date.now();
          const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const storagePath = `feedback-attachments/${timestamp}_${safeFilename}`;
          
          // Upload to Firebase Storage
          const fileRef = bucket.file(storagePath);
          await fileRef.save(buffer, {
            metadata: {
              contentType: file.type,
              customMetadata: {
                originalName: file.name,
                uploadedBy: user?.email || 'anonymous',
                feedbackTitle: title
              }
            }
          });
          
          // Make file publicly accessible
          await fileRef.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
          
          // Parse file content for text files
          const extension = file.name.toLowerCase().split('.').pop();
          const textExtensions = ['txt', 'md', 'markdown', 'pdf', 'docx'];
          
          if (textExtensions.includes(extension || '')) {
            const parsed = await parseFile(buffer, file.name);
            if (parsed.content) {
              attachments.push(`**📎 ${file.name}**
File Size: ${(file.size / 1024).toFixed(1)} KB
[Download Link](${publicUrl})

Content:
\`\`\`
${parsed.content.slice(0, 2000)}${parsed.content.length > 2000 ? '...' : ''}
\`\`\`
`);
            } else {
              attachments.push(`**📎 ${file.name}**
File Size: ${(file.size / 1024).toFixed(1)} KB
[Download Link](${publicUrl})
${parsed.error ? `\nError: ${parsed.error}` : ''}
`);
            }
          } else {
            // For images and other files, just show the link
            attachments.push(`**📎 ${file.name}**
File Size: ${(file.size / 1024).toFixed(1)} KB
[Download Link](${publicUrl})
`);
          }
        }
      }
    } catch (error) {
      console.error('File upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload attachments. Please try again.' },
        { status: 500 }
      );
    }
  }

  const body = `
${submittedBy}
**Request Type:** ${type === 'bug' ? 'Bug Report' : 'Feature Request'}

---

### Description

${description}

${attachments.length > 0 ? `\n---\n\n### Attachments\n\n${attachments.join('\n\n')}` : ''}
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
        attachments: attachments.length > 0 ? attachments : null,
        attachmentCount: attachments.length,
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