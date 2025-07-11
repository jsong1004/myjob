import { NextRequest, NextResponse } from "next/server"
import puppeteer from 'puppeteer'
import { marked } from 'marked'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!file.name.endsWith('.md')) {
      return NextResponse.json({ error: "File must be a Markdown (.md) file" }, { status: 400 })
    }

    // Read the markdown content
    let markdownContent = await file.text()
    // Detect and unwrap fenced markdown blocks, e.g.:
    // ```markdown\n...content...\n```
    // or ```\n...content...\n```
    const fenceRegex = /```\s*(?:markdown)?[^\n]*\n([\s\S]*?)\n```/i
    const fenceMatch = markdownContent.match(fenceRegex)
    if (fenceMatch && fenceMatch[1]) {
      markdownContent = fenceMatch[1]
    }
    
    if (!markdownContent.trim()) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 })
    }

    // Convert markdown to HTML using the correct API for marked v16
    let htmlContent: string
    try {
      // Set marked options
      marked.setOptions({
        gfm: true, // GitHub Flavored Markdown
        breaks: true, // Convert line breaks to <br>
      })
      
      // Parse the markdown
      htmlContent = await marked.parse(markdownContent)
    } catch (parseError) {
      console.error("[MD to PDF] Markdown parsing error:", parseError)
      return NextResponse.json({ error: "Failed to parse markdown content" }, { status: 400 })
    }
    
    console.log("[MD to PDF] Markdown content length:", markdownContent.length)
    console.log("[MD to PDF] HTML content length:", htmlContent.length)
    console.log("[MD to PDF] First 200 chars of markdown:", markdownContent.substring(0, 200))
    console.log("[MD to PDF] First 200 chars of HTML:", htmlContent.substring(0, 200))
    
    // Create a complete HTML document with styling
    const fullHtmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Resume</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 8.5in;
              margin: 0 auto;
              padding: 0.5in;
              background: white;
            }
            h1 {
              color: #2c3e50;
              border-bottom: 2px solid #3498db;
              padding-bottom: 10px;
              margin-bottom: 20px;
              font-size: 28px;
              font-weight: bold;
            }
            h2 {
              color: #34495e;
              border-bottom: 1px solid #bdc3c7;
              padding-bottom: 5px;
              margin-top: 30px;
              margin-bottom: 15px;
              font-size: 22px;
              font-weight: bold;
            }
            h3 {
              color: #34495e;
              margin-top: 20px;
              margin-bottom: 10px;
              font-size: 18px;
              font-weight: bold;
            }
            ul {
              margin-bottom: 15px;
            }
            li {
              margin-bottom: 5px;
            }
            p {
              margin-bottom: 10px;
            }
            strong {
              color: #2c3e50;
            }
            a {
              color: #3498db;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
            blockquote {
              border-left: 4px solid #3498db;
              margin: 20px 0;
              padding-left: 20px;
              color: #7f8c8d;
            }
            code {
              background-color: #f8f9fa;
              padding: 2px 4px;
              border-radius: 3px;
              font-family: 'Monaco', 'Consolas', monospace;
              font-size: 0.9em;
            }
            pre {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              overflow-x: auto;
              margin: 15px 0;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 15px 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            @media print {
              body {
                margin: 0;
                padding: 0.5in;
              }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `

    // Launch Puppeteer and convert to PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    })

    const page = await browser.newPage()
    
    // Set the content
    await page.setContent(fullHtmlContent, {
      waitUntil: 'networkidle0'
    })

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      printBackground: true,
      preferCSSPageSize: true
    })

    await browser.close()

    // Create filename based on original file
    const originalName = file.name.replace(/\.md$/, '')
    const pdfFileName = `${originalName}.pdf`

    // Return the PDF as a downloadable response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfFileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error("[MD to PDF] Conversion error:", error)
    return NextResponse.json(
      { error: "Failed to convert markdown to PDF" }, 
      { status: 500 }
    )
  }
}