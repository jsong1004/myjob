import { NextRequest, NextResponse } from 'next/server'
import { initFirebaseAdmin } from '@/lib/firebase-admin-init'
import { getAuth } from 'firebase-admin/auth'

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    initFirebaseAdmin()
    const adminAuth = getAuth()
    const decoded = await adminAuth.verifyIdToken(token)
    
    // Check if user is admin
    if (decoded.email !== 'jsong@koreatous.com') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // GitHub API configuration
    const githubOwner = 'jsong1004'
    const githubRepo = 'myjob'
    const githubToken = process.env.GITHUB_TOKEN

    if (!githubToken) {
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 })
    }

    // Fetch issues from GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/issues?state=all&sort=created&direction=desc&per_page=100`,
      {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'MyJob-Admin-Dashboard'
        }
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error('GitHub API error:', errorData)
      return NextResponse.json({ error: 'Failed to fetch issues from GitHub' }, { status: 500 })
    }

    const issues = await response.json()

    // Transform GitHub issues to our format
    const transformedIssues = issues.map((issue: any) => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      state: issue.state,
      author: issue.user.login,
      authorAvatar: issue.user.avatar_url,
      labels: issue.labels.map((label: any) => ({
        name: label.name,
        color: label.color
      })),
      assignees: issue.assignees.map((assignee: any) => ({
        login: assignee.login,
        avatar_url: assignee.avatar_url
      })),
      body: issue.body,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at,
      htmlUrl: issue.html_url,
      commentsCount: issue.comments,
      milestone: issue.milestone ? {
        title: issue.milestone.title,
        state: issue.milestone.state
      } : null
    }))

    return NextResponse.json({ 
      issues: transformedIssues,
      total: transformedIssues.length
    })

  } catch (error) {
    console.error('Error fetching GitHub issues:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}