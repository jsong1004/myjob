# MyJob Project Documentation Index

## 📋 Overview

MyJob is a comprehensive AI-powered job search platform built with Next.js 15, featuring intelligent job matching, resume tailoring, and application tracking. This documentation provides a complete reference for developers working on the project.

## 🚀 Quick Start

- **Main README**: [README.md](../README.md) - Complete setup guide and feature overview
- **Claude Integration**: [CLAUDE.md](../CLAUDE.md) - AI assistant development guidelines
- **Development Server**: `pnpm dev`
- **Build**: `pnpm build`
- **Production**: `pnpm start`

## 📁 Project Structure

```
/
├── 📱 app/                     # Next.js App Router
│   ├── 🔌 api/                 # Backend API routes (30 endpoints)
│   ├── 🏠 (main)/              # Main application pages (20 routes)
│   └── 📄 page.tsx             # Homepage with job search
├── 🧩 components/              # React components (60+ components)
│   ├── 🎨 ui/                  # shadcn/ui component library (45 components)
│   ├── 👤 admin/               # Admin panel components
│   └── 🔧 [feature]/           # Feature-specific components
├── 📚 lib/                     # Utilities and configurations
│   ├── 🤖 prompts/             # AI prompt management system
│   ├── 🔥 firebase/            # Firebase configuration
│   ├── 📊 types.ts             # TypeScript definitions
│   └── 🛠️ utils/               # Helper functions
├── 📄 docs/                    # Project documentation (20+ files)
├── 🌐 public/                  # Static assets
└── 🔧 [config files]           # Various configuration files
```

## 🔌 API Reference

### Core APIs (30 endpoints)

#### Job Management
- `GET /api/jobs/search` - Job search with pagination
- `GET /api/jobs/search-enhanced` - Enhanced search with AI scoring
- `POST /api/jobs/score` - Individual job scoring
- `POST /api/jobs/score-multi-agent` - Advanced multi-agent scoring
- `GET /api/jobs/[id]` - Get specific job details
- `GET /api/jobs/filters` - Get available search filters
- `POST /api/jobs/match-analysis-pdf` - Generate match analysis PDF

#### User & Authentication
- `GET/POST /api/profile` - User profile management
- `GET /api/activity` - User activity tracking

#### Resume Management
- `GET/POST /api/resumes` - Resume CRUD operations
- `GET/PUT/DELETE /api/resumes/[id]` - Individual resume management
- `POST /api/resumes/[id]/set-default` - Set default resume
- `POST /api/resume/tailor-multi-agent` - AI resume tailoring

#### Saved Jobs & Application Tracking
- `GET/POST /api/saved-jobs` - Saved jobs management
- `GET/PUT/DELETE /api/saved-jobs/[jobId]` - Individual saved job
- `POST /api/saved-jobs/add-manual` - Add manual job entries

#### Cover Letters
- `GET/POST /api/cover-letters` - Cover letter management
- `GET/PUT/DELETE /api/cover-letters/[id]` - Individual cover letter

#### OpenRouter AI Services
- `POST /api/openrouter/tailor-resume` - AI resume tailoring
- `POST /api/openrouter/resume-edit` - AI resume editing
- `POST /api/openrouter/cover-letter` - AI cover letter generation

#### Company & External Data
- `GET /api/companies/[name]` - Company information via Companies API

#### Admin Panel
- `GET /api/admin/users` - User management (admin only)
- `GET /api/admin/activities` - Activity monitoring
- `GET /api/admin/batch-runs` - Batch job monitoring
- `GET /api/admin/github-issues` - GitHub issues integration

#### Batch Processing & Cron
- `GET/POST /api/cron/batch-jobs` - Scheduled job processing
- `POST /api/batch/process` - Manual batch job processing

#### Utilities
- `POST /api/convert/md-to-pdf` - Markdown to PDF conversion
- `POST /api/github/issue` - GitHub issue creation

## 🧩 Component Architecture

### UI Foundation (shadcn/ui)
- **45 base components** from shadcn/ui library
- **Radix UI primitives** for accessibility
- **Tailwind CSS** for styling
- **TypeScript** for type safety

### Feature Components

#### Authentication & User Management
- `auth-provider.tsx` - Firebase Auth context
- `auth-modal.tsx` - Sign-in/up modal
- `onboarding-modal.tsx` - New user onboarding

#### Job Search & Discovery
- `job-search.tsx` - Main search interface
- `enhanced-job-search.tsx` - Advanced search with filters
- `job-results.tsx` - Search results display
- `advanced-job-filters.tsx` - Filter components
- `matching-score-dialog.tsx` - Job match analysis

#### AI & Loading States
- `job-search-loading-info.tsx` - Educational loading content
- `resume-tailoring-loading-info.tsx` - Resume AI loading
- `cover-letter-loading-info.tsx` - Cover letter AI loading
- `enhanced-score-display.tsx` - Multi-agent score visualization

#### Admin Panel
- `admin/admin-activities.tsx` - Activity monitoring
- `admin/admin-user-management.tsx` - User management
- `admin/admin-github-issues.tsx` - GitHub integration
- `admin/batch-jobs-admin.tsx` - Batch job management

#### Layout & Navigation
- `header.tsx` - Main navigation
- `footer.tsx` - Site footer
- `landing-page.tsx` - Marketing homepage

## 📊 Data Models & Types

### Core Data Types (lib/types.ts)

```typescript
// User Management
interface User {
  id: string
  email: string  
  name: string
  photoURL?: string
  defaultResumeId?: string
  onboardingCompleted?: boolean
}

// Resume System
interface Resume {
  id: string
  userId: string
  name: string
  content: string
  isDefault: boolean
  type: 'original' | 'tailored' | 'draft'
  jobTitle?: string
  jobId?: string
}

// Application Tracking
interface SavedJob {
  id: string
  userId: string
  jobId: string
  title: string
  company: string
  status: ApplicationStatus
  notes?: string
  reminderDate?: Timestamp
  matchingScore: number
  originalData: JobSearchResult
}

// AI Analysis
interface MatchingBreakdown {
  overall: number
  skills: { score: number, matched: string[], missing: string[] }
  experience: { score: number, relevantExperience: string }
  education: { score: number, requirements: string[] }
}
```

## 🤖 AI Integration

### Multi-Agent Systems
- **Job Scoring**: 8 specialized agents for comprehensive analysis
- **Resume Tailoring**: 8 agents for targeted optimization
- **Prompt Management**: Centralized system with caching and variants

### AI Services
- **OpenRouter API**: GPT-4o-mini for all AI operations
- **Prompt Variants**: Professional, Creative, Technical, Entry-Level
- **Response Caching**: Intelligent caching for performance
- **Error Handling**: Robust fallback mechanisms

## 🗄️ Database Schema (Firestore)

### Collections Structure
```
users/
├── {userId}/
│   ├── profile data
│   └── settings
resumes/
├── {resumeId}/
│   ├── userId (indexed)
│   ├── content
│   └── metadata
saved-jobs/
├── {savedJobId}/
│   ├── userId (indexed)
│   ├── jobId
│   └── application data
cover-letters/
├── {letterId}/
│   ├── userId (indexed)
│   ├── jobId
│   └── content
jobs/
├── {jobId}/
│   ├── SerpAPI data
│   └── metadata
activities/
├── {activityId}/
│   ├── userId (indexed)
│   ├── type
│   └── timestamp
```

### Required Indexes
```javascript
// Firestore composite indexes
resumes: [userId ASC, createdAt DESC]
saved-jobs: [userId ASC, savedAt DESC]
cover-letters: [userId ASC, createdAt DESC]
activities: [userId ASC, timestamp DESC]
```

## 📱 Page Routes & Features

### Public Routes
- `/` - Homepage with job search (no auth required)
- `/companies/[name]` - Company detail pages
- `/terms-of-service` - Legal pages
- `/privacy-policy` - Privacy information

### Protected Routes (Authentication Required)
- `/search` - Advanced job search
- `/profile` - User profile management
- `/resumes` - Resume library management
- `/resumes/[id]/edit` - Resume editing with AI
- `/saved-jobs` - Application tracking dashboard
- `/cover-letters` - Cover letter library
- `/cover-letter/[id]` - Cover letter editing
- `/tailor-resume/[id]` - AI resume tailoring
- `/jobs/[id]` - Job detail view
- `/jobs/[id]/score-details` - Match analysis
- `/md-to-pdf` - Markdown converter
- `/my-activities` - Activity history
- `/feedback` - User feedback submission

### Admin Routes (Admin Only)
- `/admin` - Admin dashboard
- `/admin/activities` - User activity monitoring
- `/admin/batch-jobs` - Batch processing management

## 🛠️ Development Tools & Configuration

### Build System
- **Next.js 15** with App Router
- **TypeScript** with strict mode
- **Tailwind CSS** with custom design system
- **pnpm** for package management

### External Integrations
- **Firebase**: Auth, Firestore, Storage
- **SerpAPI**: Job search data
- **OpenRouter**: AI services
- **Companies API**: Company information
- **GitHub API**: Issue management
- **Puppeteer**: PDF generation

### Development Scripts
```bash
pnpm dev          # Development server
pnpm build        # Production build
pnpm start        # Production server
pnpm lint         # Code linting
```

## 📚 Documentation Files

### Core Documentation
- [README.md](../README.md) - Main project documentation
- [CLAUDE.md](../CLAUDE.md) - AI development guidelines
- [Implementation Plan.md](Implementation%20Plan.md) - Development roadmap
- [myJob PRD.md](myJob%20PRD.md) - Product requirements

### Technical Guides
- [google-cloud-setup-checklist.md](google-cloud-setup-checklist.md) - Deployment guide
- [firestore-indexes.md](firestore-indexes.md) - Database configuration
- [enhanced-job-search-deployment.md](enhanced-job-search-deployment.md) - Search system
- [multi-agent-scoring-guide.md](multi-agent-scoring-guide.md) - AI scoring system

### Feature Documentation
- [user-activities.md](user-activities.md) - Activity tracking
- [github_issue_dashboard.md](github_issue_dashboard.md) - Admin features
- [tailoring_resume.md](tailoring_resume.md) - Resume AI system
- [batch-job-search-plan.md](batch-job-search-plan.md) - Batch processing

### Development Notes
- [Debug-Auth.md](Debug-Auth.md) - Authentication troubleshooting
- [multi-agent-timeout-solution.md](multi-agent-timeout-solution.md) - Performance optimization
- [openrouter_prompy_caching.md](openrouter_prompy_caching.md) - AI optimization

## 🔗 Quick Navigation

| Category | Links |
|----------|-------|
| **Setup** | [README](../README.md) • [Cloud Setup](google-cloud-setup-checklist.md) • [Indexes](firestore-indexes.md) |
| **API** | [Types](../lib/types.ts) • [Routes](../app/api/) • [Prompts](../lib/prompts/) |
| **Components** | [UI Library](../components/ui/) • [Features](../components/) • [Admin](../components/admin/) |
| **Features** | [Job Search](job-search-plan.md) • [AI Scoring](multi-agent-scoring-guide.md) • [Batch Jobs](batch-job-search-plan.md) |
| **Admin** | [Dashboard](github_issue_dashboard.md) • [Activities](user-activities.md) • [Deployment](enhanced-job-search-deployment.md) |

---

*Last updated: July 2025*
*For questions or contributions, see the main [README](../README.md)*