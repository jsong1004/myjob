# MyJob: AI-Powered Job Search Platform

[![Version](https://img.shields.io/badge/version-2.5.0-blue)](https://github.com/jsong1004/myjob)
[![Last Updated](https://img.shields.io/badge/last%20updated-August%202025-green)](https://github.com/jsong1004/myjob)
[![License](https://img.shields.io/badge/license-MIT-orange)](LICENSE)

MyJob is a comprehensive, AI-driven platform designed to revolutionize the job search process. Built with cutting-edge technology, it provides intelligent job matching, AI-powered resume optimization, cover letter generation, and comprehensive application tracking for modern job seekers.

## ✨ Core Features

### 🤖 Advanced AI-Powered Job Matching
- **Multi-Agent Scoring System:** 8 specialized AI agents analyze job compatibility across technical skills, experience depth, achievements, education, soft skills, career progression, strengths, and weaknesses
- **Parallel Processing:** 8x faster execution with weighted scoring algorithm providing detailed hiring manager insights
- **Smart Job Discovery:** Comprehensive pagination fetching hundreds of jobs from multiple sources
- **Intelligent Filtering:** Location-based matching with remote work opportunities and deduplication logic

### 📄 Intelligent Resume Management
- **Multi-Agent Resume Tailoring:** 8 specialized agents for targeted optimization (Technical Skills, Experience, Achievement, Education, Soft Skills, Career Progression, ATS Optimization, Strategic Orchestration)
- **Advanced File Processing:** Support for PDF, DOCX, TXT, and Markdown with intelligent formatting preservation
- **Interactive AI Chat:** Real-time resume editing and optimization with AI assistance
- **Version Control:** Multiple resume management with default selection and download capabilities
- **Search & Sort:** Search resumes by name and sort by job title or creation date
- **Batch Operations:** Manage multiple resumes with efficient UI controls

### 💌 Professional Cover Letter Generation
- **AI-Powered Creation:** Personalized cover letters tailored to specific jobs and companies
- **Interactive Refinement:** Chat-based editing and optimization with AI assistance
- **Professional Formatting:** Modern format without outdated traditional headers
- **Template Variants:** Professional, Creative, Technical, and Entry-Level templates

### 📊 Comprehensive Application Tracking
- **Status Management:** Custom tracking (Saved, Applied, Interviewing, Offer, Rejected, Withdrawn, No Longer Available) with color-coded indicators
- **Reminder System:** Set follow-up reminders with custom notes and notifications
- **Advanced Filtering:** Filter by job title, company, status with sortable columns and default "Saved" view
- **Manual Job Addition:** Add custom job opportunities with full AI scoring integration
- **Smart Job Filtering:** Content-based deduplication preventing duplicate job listings
- **Visual Feedback:** Loading states and completion indicators for user actions

### 👤 Enhanced Profile & Onboarding
- **Quick Start Onboarding:** 3-step guided setup for new users with progress tracking
- **Comprehensive Profile:** Professional details, job preferences, and photo upload
- **Smart Autocomplete:** 50+ job titles and 100+ locations with intelligent suggestions
- **Preference Management:** Target roles, salary expectations, employment types, and visa sponsorship

### 🔍 Advanced Search & Discovery
- **Unauthenticated Search:** Public job discovery without registration requirement
- **Full Pagination:** Access to hundreds of jobs across multiple pages with safety limits
- **Smart Deduplication:** Backend logic preventing duplicate results
- **Sortable Results:** Sort by title, company, location, date, and salary with visual indicators

### 📄 Professional Document Generation
- **Markdown to PDF:** High-quality PDF generation with professional styling
- **Job Match Analysis PDFs:** Downloadable detailed scoring reports with visual breakdowns
- **File Attachment Support:** Upload images and documents for feedback submissions

### 🔐 Secure Authentication & Admin
- **Multi-Provider Auth:** Email/password and Google OAuth with Firebase Authentication
- **Admin Dashboard:** Comprehensive user management, GitHub issue tracking, and system monitoring
- **User Management:** Admin deletion capabilities with complete data cleanup and timestamp management
- **Session Security:** Automatic timeout with 1-hour idle protection
- **User Activity Tracking:** Detailed user statistics including resumes, saved jobs, and cover letters
- **Advanced Admin Tools:** User data correction utilities and robust error handling

## 🎯 Advanced AI Features

### Multi-Agent Job Scoring
- **Technical Skills Assessment (25%):** Framework proficiency, programming languages, technical competencies
- **Experience Depth Evaluation (25%):** Years of experience, role progression, industry alignment
- **Achievements Analysis (20%):** Quantifiable accomplishments, impact metrics, leadership examples
- **Education Verification (10%):** Degree relevance, certifications, continuous learning
- **Soft Skills Assessment (10%):** Communication, teamwork, problem-solving capabilities
- **Career Progression Review (10%):** Growth trajectory, role advancement, skill development

### Centralized Prompt Management
- **Comprehensive Prompt Library:** Organized categories for job matching, resume processing, cover letter generation
- **PromptManager System:** Caching, retry logic, error handling, usage statistics
- **Multiple Variants:** Professional, Creative, Technical, Entry-Level templates
- **Version Control:** Prompt versioning with monitoring capabilities

### Enhanced Loading Experiences
- **Educational Content:** Rotating tips and insights during processing
- **Real-time Progress:** Stage indicators for AI processing steps
- **Market Insights:** Job market data, salary trends, company statistics
- **Personalized Guidance:** User-specific recommendations and platform statistics

## 🛠️ Technology Stack

### Frontend & Framework
- **[Next.js 15](https://nextjs.org/)** - App Router with TypeScript
- **[Tailwind CSS](https://tailwindcss.com/)** - Custom design system with responsive layouts
- **[shadcn/ui](https://ui.shadcn.com/)** - Component library built on Radix UI primitives

### Backend & Database
- **[Firebase Authentication](https://firebase.google.com/docs/auth)** - Multi-provider authentication
- **[Cloud Firestore](https://firebase.google.com/docs/firestore)** - Document database with composite indexes
- **[Firebase Storage](https://firebase.google.com/docs/storage)** - File storage for photos and documents

### AI & External Services
- **[OpenRouter API](https://openrouter.ai/)** - GPT-4o-mini for matching, scoring, and content generation
- **[SerpApi](https://serpapi.com/)** - Comprehensive job listing aggregation
- **[The Companies API](https://thecompaniesapi.com/)** - Company information and metrics

### Document Processing
- **[Puppeteer](https://pptr.dev/)** - PDF generation for resumes and reports
- **[Marked](https://marked.js.org/)** - Markdown parsing and HTML conversion
- **[pdf-parse](https://www.npmjs.com/package/pdf-parse)** - PDF text extraction

### Development Tools
- **[TypeScript](https://www.typescriptlang.org/)** - Strict mode with comprehensive type definitions
- **[pnpm](https://pnpm.io/)** - Fast, efficient package management
- **[ESLint & Prettier](https://eslint.org/)** - Code quality and formatting

## 🔄 Recent Improvements (August 2025)

### Bug Fixes & Enhancements
- **Enhanced Job Filtering:** Fixed job ID mismatch issues between SerpAPI and Firestore with content-based matching
- **Improved UI Feedback:** Added visual loading states and completion indicators for "Don't Show" button
- **Default Filter Optimization:** My Jobs page now defaults to showing "Saved" jobs for better UX
- **Resume Management Upgrade:** Added search functionality and sortable Job Title column in My Resumes
- **Admin Panel Fixes:** Resolved timestamp display issues with robust date handling
- **Database Deduplication:** Comprehensive job deduplication system preventing duplicate listings
- **Error Handling:** Improved timestamp parsing with graceful fallbacks for invalid data

### Performance Optimizations
- **Content-Based Matching:** Implemented intelligent job matching by title, company, and location
- **Batch Processing:** Optimized database queries for better performance
- **Caching Strategy:** Enhanced caching for job search results and AI responses
- **Parallel Execution:** Improved concurrent processing for multi-agent operations

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18.18.0 or later
- **pnpm** package manager
- **Firebase project** with authentication and Firestore enabled

### 1. Repository Setup
```bash
git clone https://github.com/jsong1004/myjob
cd myjob
pnpm install
```

### 2. Environment Configuration
```bash
cp .env.example .env.local
```

Configure your `.env.local` with:
- Firebase project credentials (API keys, project ID, etc.)
- SerpApi key for job search functionality
- OpenRouter API key for AI features
- GitHub token for issue management
- The Companies API token for company data

### 3. Firebase Configuration

#### Authentication Setup
1. Enable **Email/Password** and **Google** providers in Firebase Console
2. Configure authorized domains for production deployment

#### Firestore Database
1. Create database in **Production mode**
2. Create composite index for `resumes` collection:
   - `userId` (Ascending)
   - `createdAt` (Descending)

#### Service Account (Local Development)
1. Generate service account key in Firebase Console
2. Save as `service-account-key.json` in project root
3. Required for PDF/DOCX processing and admin features

### 4. Development Server
```bash
pnpm dev
```

Access the application at [http://localhost:3000](http://localhost:3000)

## 📂 Project Architecture

```
myjob/
├── app/                          # Next.js App Router
│   ├── api/                      # 30+ API endpoints
│   │   ├── jobs/                 # Job search, scoring, matching
│   │   ├── resumes/              # Resume management, tailoring
│   │   ├── cover-letters/        # Cover letter generation
│   │   ├── openrouter/           # AI service integration
│   │   ├── admin/                # Admin dashboard APIs
│   │   └── ...
│   ├── (pages)/                  # Application routes
│   │   ├── search/               # Job search interface
│   │   ├── profile/              # User profile management
│   │   ├── resumes/              # Resume management
│   │   ├── saved-jobs/           # Application tracking
│   │   ├── cover-letters/        # Cover letter library
│   │   └── admin/                # Admin dashboard
│   └── globals.css               # Global styles
├── components/                   # 60+ React components
│   ├── ui/                       # shadcn/ui components
│   ├── admin/                    # Admin-specific components
│   ├── auth-provider.tsx         # Authentication context
│   ├── job-search.tsx            # Job search interface
│   ├── enhanced-job-search.tsx   # Advanced search features
│   └── ...
├── lib/                          # Core utilities and logic
│   ├── prompts/                  # Centralized AI prompt management
│   │   ├── job-matching/         # Job scoring and analysis
│   │   ├── resume/               # Resume processing and tailoring
│   │   ├── cover-letter/         # Cover letter generation
│   │   └── shared/               # Common templates and utilities
│   ├── firebase.ts               # Firebase client configuration
│   ├── firebase-admin-init.ts    # Firebase Admin SDK
│   ├── types.ts                  # TypeScript definitions
│   └── utils.ts                  # Shared utilities
├── docs/                         # Comprehensive documentation
│   ├── PROJECT_INDEX.md          # Master documentation hub
│   ├── API_REFERENCE.md          # Complete API documentation
│   ├── COMPONENT_GUIDE.md        # Component development guide
│   └── ...
└── public/                       # Static assets
```

## 🌐 Cloud Infrastructure

### Production Deployment
- **Platform:** Google Cloud Run with Docker containers
- **URL:** `https://myjob-service-7a7zpf65aq-uw.a.run.app`
- **Build System:** Cloud Build with automated CI/CD
- **Monitoring:** Admin dashboard with real-time metrics

### Automated Batch Processing
- **Schedule:** Nightly job processing (2 AM PST, Monday-Friday)
- **Orchestration:** Cloud Scheduler with timezone-aware execution
- **Manual Triggers:** Force run capability with `?force=true` parameter
- **Monitoring:** Real-time batch status in admin dashboard

### Database & Storage
- **Firestore:** Production database with composite indexes
- **Firebase Storage:** File uploads, profile photos, document attachments
- **Security:** Comprehensive Firestore rules and authentication middleware

## 📚 Documentation

### Core Documentation
- **[📋 Project Index](docs/PROJECT_INDEX.md)** - Master hub with complete project overview
- **[🔌 API Reference](docs/API_REFERENCE.md)** - Detailed documentation for all 30 endpoints
- **[🧩 Component Guide](docs/COMPONENT_GUIDE.md)** - Component architecture and patterns

### Technical Guides
- **[Multi-Agent Scoring](docs/multi-agent-scoring-guide.md)** - AI scoring system architecture
- **[Batch Job Processing](docs/batch-job-search-plan.md)** - Automated job processing
- **[Firebase Indexes](docs/firestore-indexes.md)** - Required database configuration
- **[Google Cloud Setup](docs/google-cloud-setup-checklist.md)** - Deployment guide

### Implementation Resources
- **[lib/types.ts](lib/types.ts)** - Complete TypeScript definitions
- **[lib/prompts/](lib/prompts/)** - Centralized AI prompt management
- **[components/](components/)** - 60+ React components with shadcn/ui
- **[app/api/](app/api/)** - 30 API endpoints for platform functionality

## 🤝 Contributing

### Development Workflow
1. **Setup:** Follow [Getting Started](#-getting-started) instructions
2. **Architecture:** Review [Project Index](docs/PROJECT_INDEX.md) for overview
3. **APIs:** Consult [API Reference](docs/API_REFERENCE.md) for endpoint details
4. **Components:** Use [Component Guide](docs/COMPONENT_GUIDE.md) for UI development
5. **Testing:** Ensure Firebase integration and AI feature testing

### Code Quality Standards
- **TypeScript:** Strict mode with comprehensive type definitions
- **Security:** Proper Firestore rules and authentication middleware
- **Error Handling:** User-friendly error messages and graceful degradation
- **Performance:** Optimized AI processing with caching and parallel execution

### Contribution Guidelines
- Follow existing code patterns and component structure
- Add appropriate TypeScript types for new features
- Include proper error handling and loading states
- Update documentation for new features or changes
- Test Firebase integration and AI functionality thoroughly

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

**MyJob** - Empowering job seekers with intelligent AI-driven tools for modern career success.
