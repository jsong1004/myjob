import { NextRequest, NextResponse } from "next/server"
import puppeteer from 'puppeteer'

export async function POST(req: NextRequest) {
  try {
    const analysisData = await req.json()
    
    // Generate HTML content for the PDF
    const htmlContent = generateAnalysisHTML(analysisData)
    
    // Launch puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    })
    
    await browser.close()
    
    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${analysisData.job.title.replace(/[^a-zA-Z0-9]/g, '_')}_Match_Analysis.pdf"`
      }
    })
    
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

function generateAnalysisHTML(analysisData: any) {
  const { job, breakdown, enhancedScoreDetails } = analysisData
  
  // Helper function to get score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return '#16a34a' // green-600
    if (score >= 70) return '#ca8a04' // yellow-600
    return '#dc2626' // red-600
  }
  
  // Helper function to extract strings from arrays
  const extractStringArray = (data: any): string[] => {
    if (!data) return []
    if (Array.isArray(data)) {
      return data.map(item => {
        if (typeof item === 'string') return item
        if (typeof item === 'object' && item !== null) {
          if (item.weakness) return item.weakness
          if (item.strength) return item.strength
          if (item.skill) return item.skill
          if (item.name) return item.name
          if (item.description) return item.description
          return JSON.stringify(item)
        }
        return String(item)
      })
    }
    if (typeof data === 'string') return [data]
    return []
  }
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Job Match Analysis - ${job.title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 8px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #1e293b;
        }
        .company {
          font-size: 18px;
          color: #64748b;
          margin-bottom: 10px;
        }
        .overall-score {
          font-size: 48px;
          font-weight: bold;
          color: #2563eb;
          margin: 20px 0;
        }
        .score-section {
          margin: 20px 0;
          padding: 15px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }
        .score-header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 10px;
        }
        .score-title {
          font-size: 16px;
          font-weight: 600;
          margin-right: 10px;
        }
        .score-value {
          font-weight: bold;
          font-size: 14px;
        }
        .progress-bar {
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          margin: 10px 0;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: #2563eb;
          transition: width 0.3s ease;
        }
        .skills-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 10px;
        }
        .skill-item {
          display: inline-block;
          background: #f1f5f9;
          padding: 4px 8px;
          margin: 2px;
          border-radius: 4px;
          font-size: 12px;
        }
        .skill-matched {
          background: #dcfce7;
          color: #166534;
        }
        .skill-missing {
          background: #fef3c7;
          color: #92400e;
        }
        .experience-details {
          background: #f8fafc;
          padding: 15px;
          border-radius: 6px;
          margin-top: 10px;
        }
        .experience-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .summary-section {
          background: #dbeafe;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .insights-section {
          margin: 20px 0;
        }
        .insight-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 8px;
        }
        .insight-bullet {
          width: 6px;
          height: 6px;
          background: #2563eb;
          border-radius: 50%;
          margin-right: 10px;
          margin-top: 8px;
          flex-shrink: 0;
        }
        .breakdown-item {
          background: #f8fafc;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 10px;
        }
        .breakdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }
        .breakdown-title {
          font-weight: 500;
          text-transform: capitalize;
        }
        .breakdown-reasoning {
          font-size: 12px;
          color: #64748b;
          margin-top: 5px;
        }
        .page-break {
          page-break-before: always;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Job Match Analysis</div>
        <div class="company">${job.title} at ${job.company}</div>
        <div class="overall-score">${job.matchingScore}%</div>
        <div>Overall Match Score</div>
      </div>

      <!-- Skills Analysis -->
      <div class="score-section">
        <div class="score-header">
          <span class="score-title">Skills Match</span>
          <span class="score-value" style="color: ${getScoreColor(breakdown.skills.score)}">${breakdown.skills.score}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${breakdown.skills.score}%"></div>
        </div>
        <div class="skills-grid">
          <div>
            <strong>Matched Skills:</strong><br>
            ${breakdown.skills.matched.map((skill: string) => `<span class="skill-item skill-matched">${skill}</span>`).join(' ')}
          </div>
          <div>
            <strong>Missing Skills:</strong><br>
            ${breakdown.skills.missing.map((skill: string) => `<span class="skill-item skill-missing">${skill}</span>`).join(' ')}
          </div>
        </div>
      </div>

      <!-- Experience Analysis -->
      <div class="score-section">
        <div class="score-header">
          <span class="score-title">Experience Match</span>
          <span class="score-value" style="color: ${getScoreColor(breakdown.experience.score)}">${breakdown.experience.score}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${breakdown.experience.score}%"></div>
        </div>
        <div class="experience-details">
          <div class="experience-row">
            <span>Required Experience:</span>
            <span>${breakdown.experience.yearsRequired} years</span>
          </div>
          <div class="experience-row">
            <span>Your Experience:</span>
            <span>${breakdown.experience.yearsHave} years</span>
          </div>
          <div>
            <strong>Relevant Areas:</strong><br>
            ${breakdown.experience.relevantExperience}
          </div>
        </div>
      </div>

      <!-- Education Analysis -->
      <div class="score-section">
        <div class="score-header">
          <span class="score-title">Education Match</span>
          <span class="score-value" style="color: ${getScoreColor(breakdown.education.score)}">${breakdown.education.score}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${breakdown.education.score}%"></div>
        </div>
        <div class="experience-details">
          <div>
            <strong>Required:</strong><br>
            ${breakdown.education.required}
          </div>
          <div style="margin-top: 10px;">
            <strong>Your Education:</strong><br>
            ${breakdown.education.have}
          </div>
        </div>
      </div>

      <!-- Keywords Analysis -->
      <div class="score-section">
        <div class="score-header">
          <span class="score-title">Keywords Match</span>
          <span class="score-value" style="color: ${getScoreColor(breakdown.keywords.score)}">${breakdown.keywords.score}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${breakdown.keywords.score}%"></div>
        </div>
        <div style="margin-top: 10px;">
          <strong>Matched ${breakdown.keywords.matched.length} of ${breakdown.keywords.total} key terms:</strong><br>
          ${breakdown.keywords.matched.map((keyword: string) => `<span class="skill-item">${keyword}</span>`).join(' ')}
        </div>
      </div>

      ${job.matchingSummary ? `
        <div class="summary-section">
          <h3 style="margin-top: 0;">Match Summary</h3>
          <p>${job.matchingSummary}</p>
        </div>
      ` : ''}

      ${enhancedScoreDetails ? `
        <div class="page-break">
          <h2>AI Analysis Insights</h2>
          
          ${extractStringArray(enhancedScoreDetails.keyStrengths).length > 0 ? `
            <div class="insights-section">
              <h3 style="color: #166534;">Key Strengths</h3>
              ${extractStringArray(enhancedScoreDetails.keyStrengths).map((strength: string) => `
                <div class="insight-item">
                  <div class="insight-bullet" style="background: #16a34a;"></div>
                  <span>${strength}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${extractStringArray(enhancedScoreDetails.keyWeaknesses).length > 0 ? `
            <div class="insights-section">
              <h3 style="color: #ca8a04;">Areas for Improvement</h3>
              ${extractStringArray(enhancedScoreDetails.keyWeaknesses).map((weakness: string) => `
                <div class="insight-item">
                  <div class="insight-bullet" style="background: #ca8a04;"></div>
                  <span>${weakness}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${enhancedScoreDetails.breakdown ? `
            <div class="insights-section">
              <h3>Detailed Score Breakdown</h3>
              ${Object.entries(enhancedScoreDetails.breakdown).map(([category, details]: [string, any]) => `
                <div class="breakdown-item">
                  <div class="breakdown-header">
                    <span class="breakdown-title">${category.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span style="color: ${getScoreColor(details.score)}; font-weight: bold;">${details.score}%</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${details.score}%"></div>
                  </div>
                  ${details.reasoning ? `<div class="breakdown-reasoning">${details.reasoning}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${extractStringArray(enhancedScoreDetails.interviewFocus).length > 0 ? `
            <div class="insights-section">
              <h3 style="color: #2563eb;">Interview Focus Areas</h3>
              ${extractStringArray(enhancedScoreDetails.interviewFocus).map((focus: string) => `
                <div class="insight-item">
                  <div class="insight-bullet"></div>
                  <span>${focus}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}
    </body>
    </html>
  `
}