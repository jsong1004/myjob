# MyJob API Reference

Complete reference for all API endpoints in the MyJob platform.

## 🔗 Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://myjob-service-7a7zpf65aq-uw.a.run.app`

## 🔐 Authentication

Most endpoints require Firebase Authentication. Include the Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

## 📊 Response Format

All APIs return JSON responses with consistent structure:

```typescript
// Success Response
{
  success: true,
  data: any,
  message?: string
}

// Error Response  
{
  success: false,
  error: string,
  details?: any
}
```

---

## 🔍 Job Search & Discovery

### Search for Jobs
Search for job opportunities with pagination and filtering.

**Endpoint**: `GET /api/jobs/search`

**Query Parameters**:
- `query` (string) - Search keywords
- `location` (string) - Job location
- `start` (number) - Pagination offset (default: 0)
- `num` (number) - Results per page (default: 20, max: 100)

**Response**:
```typescript
{
  success: true,
  data: {
    jobs: JobSearchResult[],
    totalResults: number,
    currentPage: number,
    totalPages: number
  }
}
```

### Enhanced Job Search
Advanced job search with AI-powered filtering and scoring.

**Endpoint**: `GET /api/jobs/search-enhanced`

**Query Parameters**:
- `query` (string, required) - Search keywords
- `location` (string, required) - Job location
- `start` (number) - Pagination offset
- `num` (number) - Results per page
- `datePosted` (string) - Filter by posting date (today, 3days, week, month)
- `salaryMin` (number) - Minimum salary filter
- `jobType` (string) - Employment type (fulltime, parttime, contract, internship)

**Authentication**: Required

**Response**:
```typescript
{
  success: true,
  data: {
    jobs: JobSearchResult[],
    searchMetadata: {
      totalResults: number,
      searchTime: number,
      filters: any
    }
  }
}
```

### Get Job Details
Retrieve detailed information for a specific job.

**Endpoint**: `GET /api/jobs/[id]`

**Authentication**: Optional (enhanced data if authenticated)

**Response**:
```typescript
{
  success: true,
  data: {
    job: JobSearchResult,
    company?: CompanyInfo,
    matchingScore?: number,
    isSaved?: boolean
  }
}
```

### Score Individual Job
Generate AI-powered matching score for a job against user's resume.

**Endpoint**: `POST /api/jobs/score`

**Authentication**: Required

**Request Body**:
```typescript
{
  jobId: string,
  resumeId?: string  // Uses default resume if not provided
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    matchingScore: number,
    breakdown: MatchingBreakdown,
    summary: string,
    hiringManagerPerspective: string
  }
}
```

### Multi-Agent Job Scoring
Advanced job scoring using multiple AI agents for comprehensive analysis.

**Endpoint**: `POST /api/jobs/score-multi-agent`

**Authentication**: Required

**Request Body**:
```typescript
{
  jobDescription: string,
  resumeContent: string,
  jobTitle?: string,
  company?: string
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    overallScore: number,
    agentScores: {
      technicalSkills: AgentScore,
      experience: AgentScore,
      achievements: AgentScore,
      education: AgentScore,
      softSkills: AgentScore,
      careerProgression: AgentScore
    },
    summary: string,
    recommendations: string[],
    redFlags: string[],
    keyStrengths: string[]
  }
}
```

### Generate Match Analysis PDF
Create a downloadable PDF report of job match analysis.

**Endpoint**: `POST /api/jobs/match-analysis-pdf`

**Authentication**: Required

**Request Body**:
```typescript
{
  jobTitle: string,
  company: string,
  matchingScore: number,
  breakdown: MatchingBreakdown,
  enhancedAnalysis?: EnhancedJobAnalysis
}
```

**Response**: PDF file download

### Get Job Filters
Retrieve available filters for job search refinement.

**Endpoint**: `GET /api/jobs/filters`

**Response**:
```typescript
{
  success: true,
  data: {
    jobTypes: string[],
    experienceLevels: string[],
    industries: string[],
    salaryRanges: { min: number, max: number }[]
  }
}
```

---

## 👤 User Profile & Management

### Get User Profile
Retrieve current user's profile information.

**Endpoint**: `GET /api/profile`

**Authentication**: Required

**Response**:
```typescript
{
  success: true,
  data: {
    user: User,
    profile: UserProfile,
    stats: {
      resumeCount: number,
      savedJobsCount: number,
      coverLettersCount: number
    }
  }
}
```

### Update User Profile
Update user profile information and preferences.

**Endpoint**: `POST /api/profile`

**Authentication**: Required

**Request Body**:
```typescript
{
  name?: string,
  phone?: string,
  location?: string,
  jobTitle?: string,
  experience?: string,
  bio?: string,
  skills?: string[],
  socialLinks?: {
    linkedin?: string,
    github?: string,
    website?: string
  },
  jobPreferences?: {
    targetJobTitles?: string[],
    preferredLocations?: string[],
    remoteWork?: boolean,
    salaryExpectation?: string,
    employmentTypes?: string[]
  },
  notifications?: {
    emailNotifications?: boolean,
    jobAlerts?: boolean
  }
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    user: User,
    message: "Profile updated successfully"
  }
}
```

---

## 📄 Resume Management

### List User Resumes
Get all resumes for the authenticated user.

**Endpoint**: `GET /api/resumes`

**Authentication**: Required

**Response**:
```typescript
{
  success: true,
  data: {
    resumes: Resume[],
    defaultResumeId: string
  }
}
```

### Create Resume
Upload and create a new resume.

**Endpoint**: `POST /api/resumes`

**Authentication**: Required

**Content-Type**: `multipart/form-data`

**Request Body**:
- `file` (File) - Resume file (PDF, DOCX, TXT, MD)
- `name` (string) - Resume name
- `isDefault` (boolean, optional) - Set as default resume

**Response**:
```typescript
{
  success: true,
  data: {
    resume: Resume,
    message: "Resume uploaded successfully"
  }
}
```

### Get Resume Details
Retrieve specific resume information.

**Endpoint**: `GET /api/resumes/[id]`

**Authentication**: Required

**Response**:
```typescript
{
  success: true,
  data: {
    resume: Resume
  }
}
```

### Update Resume
Update resume content and metadata.

**Endpoint**: `PUT /api/resumes/[id]`

**Authentication**: Required

**Request Body**:
```typescript
{
  name?: string,
  content?: string,
  isDefault?: boolean
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    resume: Resume,
    message: "Resume updated successfully"
  }
}
```

### Delete Resume
Remove a resume from user's collection.

**Endpoint**: `DELETE /api/resumes/[id]`

**Authentication**: Required

**Response**:
```typescript
{
  success: true,
  message: "Resume deleted successfully"
}
```

### Set Default Resume
Set a resume as the default for job matching.

**Endpoint**: `POST /api/resumes/[id]/set-default`

**Authentication**: Required

**Response**:
```typescript
{
  success: true,
  message: "Default resume updated successfully"
}
```

---

## 🤖 AI-Powered Services

### AI Resume Tailoring
Tailor resume content for a specific job using AI.

**Endpoint**: `POST /api/openrouter/tailor-resume`

**Authentication**: Required

**Request Body**:
```typescript
{
  resumeContent: string,
  jobDescription: string,
  jobTitle: string,
  company: string,
  message: string  // User instructions
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    response: string,  // AI-generated response
    tailoredContent?: string  // If requesting full resume
  }
}
```

### Multi-Agent Resume Tailoring
Advanced resume tailoring using multiple specialized AI agents.

**Endpoint**: `POST /api/resume/tailor-multi-agent`

**Authentication**: Required

**Request Body**:
```typescript
{
  resumeContent: string,
  jobDescription: string,
  jobTitle: string,
  company: string,
  jobAnalysis?: EnhancedJobAnalysis,
  userMessage: string
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    response: string,
    agentContributions: {
      technicalSkills: string,
      experience: string,
      achievements: string,
      education: string,
      softSkills: string,
      careerProgression: string,
      atsOptimization: string,
      orchestration: string
    }
  }
}
```

### AI Resume Editing
Interactive resume editing with AI assistance.

**Endpoint**: `POST /api/openrouter/resume-edit`

**Authentication**: Required

**Request Body**:
```typescript
{
  resumeContent: string,
  message: string,  // User editing instructions
  context?: string  // Additional context
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    response: string,
    updatedContent?: string
  }
}
```

### AI Cover Letter Generation
Generate personalized cover letters using AI.

**Endpoint**: `POST /api/openrouter/cover-letter`

**Authentication**: Required

**Request Body**:
```typescript
{
  resumeContent: string,
  jobDescription: string,
  jobTitle: string,
  company: string,
  message: string,  // User requirements
  variant?: 'professional' | 'creative' | 'technical' | 'entry-level'
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    response: string,
    coverLetterContent?: string
  }
}
```

---

## 💾 Saved Jobs & Application Tracking

### List Saved Jobs
Get all saved jobs for the authenticated user.

**Endpoint**: `GET /api/saved-jobs`

**Authentication**: Required

**Query Parameters**:
- `status` (string) - Filter by application status
- `company` (string) - Filter by company name
- `title` (string) - Filter by job title
- `sort` (string) - Sort field (savedAt, title, company, status)
- `order` (string) - Sort order (asc, desc)

**Response**:
```typescript
{
  success: true,
  data: {
    savedJobs: SavedJob[],
    totalCount: number,
    filters: {
      statuses: ApplicationStatus[],
      companies: string[]
    }
  }
}
```

### Save Job
Add a job to user's saved jobs collection.

**Endpoint**: `POST /api/saved-jobs`

**Authentication**: Required

**Request Body**:
```typescript
{
  jobId: string,
  jobData: JobSearchResult
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    savedJob: SavedJob,
    message: "Job saved successfully"
  }
}
```

### Add Manual Job
Add a custom job entry to saved jobs.

**Endpoint**: `POST /api/saved-jobs/add-manual`

**Authentication**: Required

**Request Body**:
```typescript
{
  title: string,
  company: string,
  location: string,
  description: string,
  salary?: string,
  applyUrl?: string
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    savedJob: SavedJob,
    message: "Manual job added successfully"
  }
}
```

### Get Saved Job Details
Retrieve specific saved job information.

**Endpoint**: `GET /api/saved-jobs/[jobId]`

**Authentication**: Required

**Response**:
```typescript
{
  success: true,
  data: {
    savedJob: SavedJob,
    relatedResumes: Resume[],
    relatedCoverLetters: CoverLetter[]
  }
}
```

### Update Saved Job
Update saved job status, notes, or reminders.

**Endpoint**: `PUT /api/saved-jobs/[jobId]`

**Authentication**: Required

**Request Body**:
```typescript
{
  status?: ApplicationStatus,
  notes?: string,
  reminderDate?: string,  // ISO date string
  reminderNote?: string
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    savedJob: SavedJob,
    message: "Job updated successfully"
  }
}
```

### Delete Saved Job
Remove a job from saved jobs collection.

**Endpoint**: `DELETE /api/saved-jobs/[jobId]`

**Authentication**: Required

**Response**:
```typescript
{
  success: true,
  message: "Job removed successfully"
}
```

---

## 💌 Cover Letter Management

### List Cover Letters
Get all cover letters for the authenticated user.

**Endpoint**: `GET /api/cover-letters`

**Authentication**: Required

**Query Parameters**:
- `jobTitle` (string) - Filter by job title
- `company` (string) - Filter by company
- `sort` (string) - Sort field (createdAt, name, jobTitle, company)
- `order` (string) - Sort order (asc, desc)

**Response**:
```typescript
{
  success: true,
  data: {
    coverLetters: CoverLetter[]
  }
}
```

### Create Cover Letter
Generate and save a new cover letter.

**Endpoint**: `POST /api/cover-letters`

**Authentication**: Required

**Request Body**:
```typescript
{
  name: string,
  content: string,
  jobTitle: string,
  company: string,
  jobId: string
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    coverLetter: CoverLetter,
    message: "Cover letter created successfully"
  }
}
```

### Get Cover Letter Details
Retrieve specific cover letter information.

**Endpoint**: `GET /api/cover-letters/[id]`

**Authentication**: Required

**Response**:
```typescript
{
  success: true,
  data: {
    coverLetter: CoverLetter,
    relatedJob?: SavedJob
  }
}
```

### Update Cover Letter
Update cover letter content and metadata.

**Endpoint**: `PUT /api/cover-letters/[id]`

**Authentication**: Required

**Request Body**:
```typescript
{
  name?: string,
  content?: string,
  jobTitle?: string,
  company?: string
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    coverLetter: CoverLetter,
    message: "Cover letter updated successfully"
  }
}
```

### Delete Cover Letter
Remove a cover letter from user's collection.

**Endpoint**: `DELETE /api/cover-letters/[id]`

**Authentication**: Required

**Response**:
```typescript
{
  success: true,
  message: "Cover letter deleted successfully"
}
```

---

## 🏢 Company Information

### Get Company Details
Retrieve comprehensive company information.

**Endpoint**: `GET /api/companies/[name]`

**Response**:
```typescript
{
  success: true,
  data: {
    company: CompanyInfo,
    metrics: {
      employeeCount: number,
      foundedYear: number,
      funding: string,
      valuation: string
    },
    socialLinks: {
      website: string,
      linkedin: string,
      twitter: string
    }
  }
}
```

---

## 🛠️ Utilities

### Convert Markdown to PDF
Convert markdown content to professionally formatted PDF.

**Endpoint**: `POST /api/convert/md-to-pdf`

**Content-Type**: `multipart/form-data`

**Request Body**:
- `file` (File) - Markdown file
- `filename` (string, optional) - Custom filename

**Response**: PDF file download

### Create GitHub Issue
Submit feedback or bug reports as GitHub issues.

**Endpoint**: `POST /api/github/issue`

**Authentication**: Required

**Request Body**:
```typescript
{
  title: string,
  body: string,
  labels?: string[],
  assignees?: string[]
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    issueUrl: string,
    issueNumber: number,
    message: "Issue created successfully"
  }
}
```

---

## 📊 Activity Tracking

### Log User Activity
Record user actions for analytics and debugging.

**Endpoint**: `POST /api/activity`

**Authentication**: Required

**Request Body**:
```typescript
{
  type: string,  // Activity type (job_search, resume_upload, etc.)
  details: any,  // Activity-specific data
  metadata?: any  // Additional context
}
```

**Response**:
```typescript
{
  success: true,
  message: "Activity logged successfully"
}
```

---

## 🔧 Admin Endpoints

### Get All Users (Admin Only)
Retrieve user list with statistics for admin dashboard.

**Endpoint**: `GET /api/admin/users`

**Authentication**: Required (Admin role)

**Response**:
```typescript
{
  success: true,
  data: {
    users: AdminUserInfo[],
    totalCount: number,
    statistics: {
      totalUsers: number,
      newUsersThisMonth: number,
      activeUsers: number
    }
  }
}
```

### Delete User (Admin Only)
Remove a user and all associated data.

**Endpoint**: `DELETE /api/admin/users`

**Authentication**: Required (Admin role)

**Request Body**:
```typescript
{
  userId: string
}
```

**Response**:
```typescript
{
  success: true,
  message: "User deleted successfully"
}
```

### Get User Activities (Admin Only)
Monitor user activities across the platform.

**Endpoint**: `GET /api/admin/activities`

**Authentication**: Required (Admin role)

**Query Parameters**:
- `userId` (string) - Filter by specific user
- `type` (string) - Filter by activity type
- `startDate` (string) - Date range start
- `endDate` (string) - Date range end
- `limit` (number) - Results limit

**Response**:
```typescript
{
  success: true,
  data: {
    activities: Activity[],
    totalCount: number,
    summary: {
      totalActivities: number,
      uniqueUsers: number,
      topActivities: { type: string, count: number }[]
    }
  }
}
```

### Get Batch Run Status (Admin Only)
Monitor batch job processing status.

**Endpoint**: `GET /api/admin/batch-runs`

**Authentication**: Required (Admin role)

**Response**:
```typescript
{
  success: true,
  data: {
    batchRuns: BatchRun[],
    statistics: {
      totalRuns: number,
      successRate: number,
      lastRunTime: string,
      averageJobsPerRun: number
    }
  }
}
```

### Get GitHub Issues (Admin Only)
View GitHub repository issues for bug tracking.

**Endpoint**: `GET /api/admin/github-issues`

**Authentication**: Required (Admin role)

**Query Parameters**:
- `state` (string) - Issue state (open, closed, all)
- `labels` (string) - Filter by labels
- `assignee` (string) - Filter by assignee

**Response**:
```typescript
{
  success: true,
  data: {
    issues: GitHubIssue[],
    totalCount: number,
    summary: {
      openIssues: number,
      closedIssues: number,
      recentActivity: number
    }
  }
}
```

---

## ⏰ Batch Processing & Cron

### Trigger Batch Jobs (System/Admin)
Manually trigger batch job processing.

**Endpoint**: `GET /api/cron/batch-jobs`

**Authentication**: System token or Admin

**Query Parameters**:
- `force` (boolean) - Force run outside normal hours

**Response**:
```typescript
{
  success: true,
  data: {
    batchId: string,
    newJobs: number,
    totalJobs: number,
    executionTime: number,
    message: "Batch processing completed"
  }
}
```

### Process Batch Jobs
Execute batch job processing workflow.

**Endpoint**: `POST /api/batch/process`

**Authentication**: System token or Admin

**Request Body**:
```typescript
{
  dryRun?: boolean,
  maxJobsPerQuery?: number,
  forceRun?: boolean,
  queries?: string[],
  locations?: string[]
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    result: {
      batchId: string,
      newJobs: number,
      totalJobs: number,
      duplicates: number,
      queriesProcessed: number,
      errors: any[]
    }
  }
}
```

---

## 📝 Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication required for this endpoint |
| `INVALID_TOKEN` | Invalid or expired authentication token |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `VALIDATION_ERROR` | Request validation failed |
| `RESOURCE_NOT_FOUND` | Requested resource does not exist |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `EXTERNAL_API_ERROR` | Third-party service error |
| `SERVER_ERROR` | Internal server error |

## 🔧 Rate Limiting

API endpoints have the following rate limits:

- **Job Search**: 100 requests/hour per user
- **AI Services**: 50 requests/hour per user  
- **File Uploads**: 20 requests/hour per user
- **General APIs**: 1000 requests/hour per user

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

---

*For detailed examples and integration guides, see the main [README](../README.md) and [CLAUDE.md](../CLAUDE.md) documentation.*