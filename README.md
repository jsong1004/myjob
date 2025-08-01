# MyJob: AI-Powered Job Search Platform

MyJob is a modern, AI-driven platform designed to streamline the job search process. It allows users to find relevant job opportunities by matching their resumes to job descriptions, provides AI-powered summaries, and enables users to tailor or edit their resumes for specific roles interactively.

## ✨ Features

- **🤖 AI-Powered Job Matching:** Utilizes the OpenRouter API to analyze job descriptions against your resume, providing a matching score to identify the best-fit opportunities. Only jobs with a score of 80 or higher are shown by default.
- **📄 AI-Generated Summaries:** Get a quick, AI-generated summary of any job description (50 words or less) to understand the role at a glance.
- **📝 Interactive Resume Tailoring & Editing:**
    - Tailor your resume for a specific job using a chat-based AI assistant.
    - Edit any resume with AI chat, even without a job context. The AI can make changes or answer questions about your resume.
    - Resume preview is directly editable; AI chat works with your manual edits.
- **👤 Profile Management:**
    - Manage your account information, professional bio, social links, skills, and preferences.
    - Set your default resume for job applications.
- **📌 Advanced Application Tracking:** Comprehensive job application management system with custom status tracking (Saved, Applied, Interviewing, Offer, Rejected, Withdrawn), personal notes, reminder system with notifications, and powerful filtering and sorting capabilities.
- **🔍 Advanced Job Search:** 
    - Leverages the SerpApi to search for jobs based on keywords and location.
    - Complete job data storage from SerpAPI for richer job information.
    - Enhanced job retrieval with fallback mechanisms for backward compatibility.
- **🔐 User Authentication:** 
    - Secure sign-up and sign-in with Email/Password or Google OAuth, powered by Firebase Authentication.
    - Smart authentication flow that redirects unauthenticated users to sign-up when attempting to search.
    - Automatic redirect to main page after sign-out from protected areas with proper page refresh.
- **📂 Comprehensive Resume Management:**
    - Upload and store multiple resumes in various formats (PDF, DOCX, TXT, Markdown).
    - Advanced text extraction with intelligent formatting preservation that converts plain text to structured markdown.
    - Smart formatting detection for headers, contact information, job titles, dates, and bullet points.
    - View, edit (with or without AI), and delete any resume.
    - Set a default resume for job matching and download your resumes in markdown format at any time.
    - Save tailored resumes directly from the AI tailoring page.
    - Smart redirect to resume upload for users without resumes when trying to tailor.
- **💌 AI-Powered Cover Letter Management:**
    - Automatically generate compelling cover letters tailored to a specific job and your resume.
    - Interactively refine and edit the cover letter with an AI chat assistant.
    - Save, view, download, and delete cover letters from your personal library.
    - Download cover letters in professional Markdown format with proper structure and metadata.
- **📄 Markdown to PDF Converter:**
    - Convert Markdown resume files to professionally formatted PDF documents.
    - Drag-and-drop file upload with validation and error handling.
    - Professional styling optimized for resumes with clean typography.
    - Support for all standard Markdown elements (headers, lists, bold, links, tables, etc.).
- **🧭 Intuitive Navigation:**
    - Profile, Resume, and Saved Jobs links in the header for easy access.

## 🔄 Recent Improvements

### Authentication & User Experience
- **Smart Sign-Up Flow (Issue #15):** Unauthenticated users are automatically prompted to sign up when attempting to search for jobs, improving user onboarding.
- **Enhanced Sign-Out (Issue #19):** Users are properly redirected to the main page after signing out from protected areas with clean page refresh and proper styling.

### Resume Management
- **PDF Upload Support (Issue #16):** Full PDF resume upload functionality with advanced text extraction using pdf-parse library and proper error handling.
- **Resume Requirement Flow (Issue #17):** Users without resumes are intelligently redirected to upload a resume when trying to tailor, with helpful messaging and auto-opened upload dialog.

### Data Architecture & AI Features
- **Complete Job Data Storage (Issue #18):** Enhanced job search results storage to save complete SerpAPI data in jobs collection while maintaining user-specific scoring in savedJobs collection for better data separation and richer job information.
- **Session Timeout & Security (Issue #20):** Implemented 15-minute idle timeout with automatic logout and redirect to main page for enhanced security.
- **Extended Session Timeout (Issue #47):** Increased session timeout from 15 minutes to 1 hour (60 minutes) for better user experience. Users will now be automatically logged out after 1 hour of inactivity and redirected to the home page.
- **GitHub Issues Management (Issue #48):** Added comprehensive GitHub issue management to the admin dashboard. Administrators can now view all GitHub issues directly from the admin panel with filtering by state, labels, and search functionality. Features include issue summary statistics, detailed issue information with labels and assignees, creation dates, comment counts, and direct links to GitHub. Includes real-time GitHub API integration for up-to-date issue data and sortable column headers for easy organization by issue number, title, state, author, created date, and comment count.
- **Saved Jobs Date Sorting (Issue #21):** Saved jobs are now sorted by date with most recently added jobs appearing first.
- **Company Detail Pages (Issue #22):** Comprehensive company information pages using The Companies API with business metrics, employee data, and social links.
- **AI Job Summaries (Issue #23):** All new job postings now include AI-generated summaries highlighting key responsibilities and requirements.
- **Markdown to PDF Converter (Issue #24):** Professional PDF generation from Markdown resumes with clean styling and proper formatting.
- **Cover Letter Markdown Downloads (Issue #25):** Cover letters now download in Markdown format with professional structure and metadata.
- **Data Format Consistency (Issue #26):** Fixed markdown display inconsistency between resumes and cover letters. Resumes now properly render markdown instead of showing raw markdown tags, and AI-generated content no longer includes unwanted code fences.
- **Auto-Save on Tailor Resume (Issue #28):** When users click "Tailor Resume" from job search results, the job is automatically saved to their saved jobs list before navigating to the tailor resume page, ensuring job data persistence and eliminating the need for manual saving.
- **Visual Status Indicators (Issue #29):** Added color-coded visual indicators for "Tailor Resume" and "Create Cover Letter" buttons that change color when actions are completed. Green icons indicate resume tailoring is done, blue icons indicate cover letter creation is done, with updated tooltips showing completion status.
- **Consistent Icon Styling (Issue #30):** Updated "Mark as Applied" button to use consistent icon color styling instead of solid background fill. Now matches the visual style of other status indicators with clean icon-only color changes (green when applied, gray when not applied).
- **User Onboarding Process (Issue #31):** Implemented streamlined onboarding flow for new users. After sign-up (either via email/password or Google OAuth), users are automatically redirected to the resume upload page with a welcome message and the upload dialog pre-opened. This ensures all users have the required resume to use the job matching features from the start.
- **Improved Resume Format Processing (Issue #32):** Enhanced file upload processing to preserve document formatting when converting resumes to markdown. Added intelligent text parsing that detects resume structure including headers, contact information, job titles, dates, and bullet points. Supports PDF, DOCX, TXT, and Markdown files with automatic formatting enhancement for better readability and AI processing.
- **Admin Dashboard Refactoring (Issue #33):** Redesigned admin interface with a modern two-column layout (3:7 ratio). Left sidebar provides navigation between admin functions including All User Activities and User Management. Right content area displays detailed information with improved filtering, sorting, and data visualization. Added comprehensive user management with statistics and enhanced activity monitoring.
- **Admin Page Layout Improvement (Issue #34):** Updated admin interface from two-column layout to a cleaner stacked card design. Admin Actions are now displayed as compact navigation links in a minimal card at the top, followed by the content card below. Removed unnecessary descriptive text and reduced whitespace for a more streamlined interface with better space utilization and improved mobile responsiveness.
- **Admin Users API Bug Fixes (Issue #35):** Fixed critical bugs in the admin users data fetching that caused "undefined" errors and incorrect data counts. Resolved undefined uid handling in Firestore queries, fixed cover letters collection name mismatch (cover-letters vs coverLetters), and improved error handling with proper fallback logic. Added debugging logs and reduced admin page top margin for better layout.
- **Landing Page and Authentication Flow (Issue #36):** Created an attractive landing page for unauthenticated users that showcases the platform's features and benefits. The home page now acts as a marketing and onboarding page for new users, while authenticated users are automatically redirected to the job search functionality. Moved the original job search UI to a dedicated `/search` route with updated navigation links throughout the application. The landing page includes hero section, feature highlights, benefits overview, success stories, and call-to-action buttons.
- **Profile Photo Upload (Issue #37):** Implemented complete photo upload functionality in the profile page using Firebase Storage. Users can now upload and change their profile photos with support for JPEG, PNG, and WebP formats up to 5MB. Features include real-time upload progress, comprehensive file validation, error handling, and automatic synchronization with Firebase Auth user profile. The uploaded photo appears throughout the application including the header navigation and profile pages.
- **Advanced Application Tracking (Issue #38):** Enhanced the saved jobs functionality with comprehensive application tracking features. Users can now set custom statuses (Saved, Applied, Interviewing, Offer, Rejected, Withdrawn) with color-coded badges, add personal notes to each application, set reminder dates with custom notes for follow-ups, and receive notifications for upcoming reminders. The interface includes powerful filtering by job title, company, and status, plus sortable columns for better organization. The page layout has been optimized with reduced whitespace for improved usability.
- **Resumes Page Refactoring (Issue #39):** Transformed the resumes page from a card-based layout to a clean, organized table format similar to the jobs page. The new table structure displays resumes with sortable columns for Resume Name and Created Date, content preview with hover tooltips, and streamlined actions. Default resumes are highlighted with background color and star icons, always appearing at the top of the list. The interface provides better space utilization, easier comparison of multiple resumes, and a more professional appearance for resume management.
- **Cover Letters Sorting and Navigation (Issues #41 & #42):** Added comprehensive sorting functionality to the cover letters page with clickable column headers for Name, Job Title, Company, and Created Date. Implemented visual sort indicators and enhanced the table with company detail links. Fixed navigation bug where company detail pages always showed "Back to Saved Jobs" regardless of origin - now dynamically displays "Back to My Cover Letters" when accessed from the cover letters page, providing context-aware navigation throughout the application.
- **Manual Job Addition (Issue #43):** Implemented the ability for users to manually add jobs to their saved jobs list. Added an "Add Job" button in the saved jobs page header (similar to the "Add Resume" button in the resumes page) that opens a comprehensive modal form. Users can input job title, company, location, salary, apply URL, and detailed job description. Created a dedicated API endpoint `/api/saved-jobs/add-manual` that generates unique job IDs for manually added jobs and integrates seamlessly with the existing saved jobs functionality. Manual jobs appear in the saved jobs table with full support for all existing features including status tracking, notes, reminders, and AI-powered resume tailoring.
- **Cover Letter Header Improvement (Issue #44):** Removed the hiring manager section from cover letter generation to create cleaner, more professional cover letters. Implemented intelligent applicant information extraction that first attempts to parse contact details from the resume, then falls back to user profile data when information is missing. Added placeholder handling for missing information to ensure cover letters always have proper formatting. The system now automatically populates candidate name, email, phone, and address from available sources, eliminating manual entry requirements while maintaining professional presentation standards.
- **Manual Job Scoring Implementation (Issue #45):** Implemented comprehensive AI-powered matching scores for manually added jobs. Created dedicated `/api/jobs/score` endpoint for job scoring functionality using the same OpenRouter AI analysis as automated job searches. Enhanced manual job addition to automatically score jobs against user's default resume during creation. Added "Generate Match Score" button with refresh icon for existing manual jobs that lack scores, enabling users to rescore jobs at any time. The system intelligently fallback to any available resume when no default is set, ensuring all manual jobs receive proper matching analysis with detailed scoring summaries.
- **Chat Message Overflow Fix (Issue #46):** Fixed text overflow issue in Q&A chat interfaces where AI responses would spill outside the designated message containers. Added proper text wrapping, word breaking, and scrollable containers to all chat interfaces including resume tailoring, cover letter generation, and resume editing pages. Chat messages now properly contain long responses within their visual boundaries with `max-h-96` scrollable areas and comprehensive word-wrap styling for better user experience.
- **Q&A Chat Interface Improvements (Issue #46):** Completely restructured the AI assistant interface across all chat pages with improved UX design. Split the AI Assistant into two separate cards: a compact Mode Selection card and a larger scrollable Q&A Chat card. Removed unnecessary headers and debug sections to maximize content space. Fixed user message text visibility with proper white text on blue backgrounds. Aligned resume preview and chat card heights for consistent layout. Implemented multi-line input support with Textarea components allowing Enter key for new lines while requiring Send button clicks for message submission. Enhanced markdown rendering for AI responses with proper formatting of bold text, headers, lists, and links. Applied consistent styling and behavior across resume tailoring, cover letter generation, and resume editing pages.
- **Comprehensive Prompt Centralization System (Issue #51):** Implemented a complete centralized prompt management system that consolidates all LLM prompts across the application. Created a structured directory system (`lib/prompts/`) with organized prompt categories for job matching, resume processing, and cover letter generation. Built a sophisticated PromptManager class with features including caching, retry logic, error handling, and usage statistics. Developed comprehensive prompt libraries with multiple variants (professional, basic, creative, technical) for different use cases. All API endpoints have been migrated to use the centralized system, removing 400+ lines of duplicate code while improving maintainability, consistency, and performance. The system includes full TypeScript support, version control for prompts, and built-in monitoring capabilities.
- **Enhanced Job Matching with Multi-Agent Scoring (Issue #50):** Implemented a sophisticated multi-agent scoring system that replaces the single-prompt approach with 8 specialized AI agents working in parallel. The system includes dedicated agents for technical skills assessment, experience depth evaluation, achievements analysis, education verification, soft skills assessment, career progression review, strengths identification, and weaknesses analysis. Features an orchestration agent that combines all results using weighted scoring (Technical Skills 25%, Experience 25%, Achievements 20%, Education 10%, Soft Skills 10%, Career Progression 10%) with business logic validation. The new system provides 8x faster execution through parallel processing, more accurate and detailed scoring breakdowns, robust error handling with fallback mechanisms, and comprehensive hiring manager perspective analysis. Fixed critical bugs including score calculation errors (6850% → proper 0-100% range), mock data display issues, and refresh functionality problems. The enhanced scoring provides detailed insights including key strengths, areas for improvement, red flags, positive indicators, hiring recommendations, and interview focus areas for more thorough candidate evaluation.
- **Multi-Agent Resume Tailoring System (Issue #53):** Implemented an advanced multi-agent resume tailoring system that automatically activates when enhanced job scoring data is available. The system features 8 specialized agents (Technical Skills, Experience, Achievement, Education, Soft Skills, Career Progression, ATS Optimization, and Strategic Orchestration) working in parallel to provide targeted resume optimization. When jobs have enhanced scoring analysis, the tailoring interface automatically switches to multi-agent mode with visual indicators including a gradient "Multi-Agent" badge and specialized tooltip descriptions. The system uses job match analysis as input to provide data-driven improvements that address identified gaps and strengthen weak areas, resulting in more effective resume optimization compared to the legacy single-agent approach. Enhanced with on-demand scoring generation for jobs without existing analysis, automatic default resume loading when missing from requests, and robust error handling that ensures valid markdown content is always returned to the frontend.
- **Saved Jobs Page UX Enhancement:** Completely redesigned the saved jobs interface with improved action button visibility and intuitive layout. Replaced small, unclear icons with clear labeled buttons in a 2x2 grid format: "Resume" and "Cover" buttons for primary actions (with visual status indicators showing green when completed), and "Edit" and "Remove" buttons for secondary actions. Enhanced the table with optimized column ordering (Job Title, Company, Details, Score, Actions, Status, Notes), reduced whitespace between columns for better space utilization, left-aligned Actions column header, and horizontal scrolling support for responsive design. Added universal "Generate Match Score" refresh icons to all jobs for consistent scoring capabilities. Improved job title links with enhanced URL detection and blue link styling for better visual distinction. The new design provides clearer user guidance and more efficient workflow management.
- **Unauthenticated Job Search Implementation (Issue #56):** Transformed the job search experience to be accessible without authentication. Moved job search functionality from a protected `/search` route to the main homepage, allowing anyone to search for jobs without signing up. Removed AI-powered scoring from the search process to optimize performance - scoring now only occurs when authenticated users save jobs to their personal collection. Enhanced the job search results table with a cleaner column structure (Job Title, Company, Location, Posted Date, Salary, Details, Actions) and improved visual hierarchy. Added distinct color coding for action buttons (green for Save Job, purple for Tailor Resume) with authentication prompts for unauthenticated users. Implemented optimistic UI updates for instant feedback when saving jobs, and added comprehensive job details modal with full descriptions, qualifications, responsibilities, and benefits. The saved jobs page now features "View Details" buttons with Eye icons for consistency across the application, providing a seamless user experience whether browsing jobs anonymously or managing saved jobs as an authenticated user.
- **Enhanced Job Search with Full Pagination (Issue #58):** Implemented comprehensive pagination support to fetch all available jobs from SerpAPI, not just the first page. The search now retrieves up to 10 pages of results (with safety limits to prevent infinite loops) providing users with access to hundreds of jobs instead of just the initial 10-20. Added sophisticated conditional filtering based on authentication status: authenticated users see only jobs they haven't already saved (preventing duplicates in their workflow), while unauthenticated users see all available jobs for maximum discovery. Implemented backend deduplication logic to handle cases where SerpAPI returns duplicate jobs across pages. Added sortable columns to the job results table, allowing users to sort by Job Title, Company, Location, Posted Date, and Salary in both ascending and descending order. The sorting includes smart type handling for dates (chronological), salaries (numeric extraction from strings), and text fields (case-insensitive alphabetical). Visual sort indicators (chevron icons) show the current sort field and direction. Removed AI-powered summary generation from the search process for significantly faster results - jobs now return instantly without waiting for OpenRouter API calls. The implementation maintains all existing features while providing a much faster, more comprehensive job discovery experience.
- **Job Match Analysis PDF Download (Issue #59):** Added comprehensive PDF download functionality to the job match analysis dialog. Users can now download detailed match analysis reports as professionally formatted PDF documents directly from the match analysis popup window. The PDF includes all scoring details, skills breakdowns, experience analysis, education matching, keyword analysis, and AI insights when available. Features a clean, professional layout with progress bars, color-coded scoring sections, and comprehensive coverage of both basic and multi-agent scoring results. The download button is prominently placed in the dialog header with loading states and error handling. PDF generation uses Puppeteer to create high-quality documents with proper formatting, page breaks, and styling that maintains the visual hierarchy of the analysis. The generated PDFs are automatically named with the job title for easy organization and include all the detailed breakdown information that helps users understand their job compatibility.
- **Complete Search System Overhaul (Issues #57, #60, #61):** Implemented major improvements to the job search functionality addressing multiple critical issues. Fixed pagination to retrieve ALL available jobs from SerpAPI instead of just the first 10 results - the system now fetches up to 10 pages providing access to hundreds of job opportunities. Corrected the SerpAPI pagination parameter from `page_token` to `next_page_token` which was preventing proper page navigation. Enhanced job deduplication logic using proper `job_id` validation with fallback ID generation for missing identifiers. Implemented intelligent location filtering with state-based matching that recognizes state abbreviations and full state names while automatically including remote and flexible work opportunities. Jobs with "Remote" or "Anywhere" in their location are now included regardless of the searched state, ensuring users see both local opportunities and remote positions. Added comprehensive debugging and logging to track pagination flow, deduplication statistics, and location filtering results. The search now provides significantly more relevant results with proper geographic filtering while maintaining access to remote work opportunities, solving the core issues of limited results and poor location matching.
- **Comprehensive Profile Page Redesign (Issue #62):** Completely rebuilt the profile page with a modern, organized layout featuring 4 distinct cards: Basic Information (with photo upload, name, email, phone, location), Professional Profile (job title, experience, bio, social links), Job Search Preferences (target job titles with tag input, preferred locations with tag input, remote work preference, salary expectations, employment types, visa sponsorship), and Notifications (email notifications and job alerts toggles). Implemented intelligent autocomplete functionality for both Target Job Titles (50+ common tech roles) and Preferred Work Locations (100+ cities, states, and international locations including remote options). The autocomplete features provide smart filtering, duplicate prevention, and click-to-select functionality for enhanced user experience. Enhanced photo upload functionality with Firebase Storage integration, file validation (JPEG/PNG/WebP up to 5MB), and real-time upload progress. Added comprehensive form validation, success notifications, and proper API integration for profile data persistence. The streamlined 4-card design provides an intuitive and comprehensive user experience for managing professional information and job search preferences.
- **File Upload Support for Feedback Submissions (Issue #63):** Enhanced the Submit Feedback page with comprehensive file attachment capabilities. Users can now upload multiple files (up to 5 files, 5MB each) including images (JPG, PNG, GIF, BMP, WebP), documents (PDF, DOCX), and text files (TXT, MD). The system automatically processes text files to extract content and includes it in the GitHub issue body, while images and other files are uploaded to Firebase Storage with public access links. Features include drag-and-drop file upload interface, file validation with clear error messages, visual file list with file size indicators and removal buttons, and automatic file parsing for text extraction. All uploaded files are stored in Firebase Storage with proper metadata and are accessible via public URLs included in the GitHub issue. The implementation extends the existing file processing infrastructure to support feedback attachments while maintaining security and user experience standards.
- **Comprehensive User Onboarding Flow (Issue #65):** Implemented a streamlined "Quick Start" onboarding experience that automatically triggers for new users after signup. The onboarding features a 3-step modal flow with progress indicators: Step 1 captures core job preferences (target job titles with autocomplete, preferred work locations with autocomplete, remote work preference), Step 2 provides optional resume upload with drag-and-drop functionality (PDF/DOCX up to 5MB), and Step 3 gathers professional details (years of experience, employment type preferences). The system leverages existing autocomplete functionality with 50+ job titles and 100+ locations, integrates seamlessly with the profile API and resume upload infrastructure, and automatically redirects users to personalized job search results upon completion. Features include comprehensive form validation, step-by-step progress tracking, "Skip for Now" option, and immediate value demonstration through relevant job opportunities. The onboarding flow is designed to minimize user friction while maximizing engagement and platform value demonstration.
- **Admin User Management with Deletion Capability (Issue #66):** Added comprehensive user management functionality for administrators. The admin dashboard now includes a delete button (red trash icon) in the user management table that allows admins to remove users from the system. The deletion process includes: secure DELETE API endpoint with admin-only authentication, confirmation dialog showing exactly what data will be deleted (user account, resumes, saved jobs, cover letters), complete database cleanup that removes the user from Firebase Auth and Firestore along with all associated data, safety measures preventing admins from deleting their own accounts, loading states during deletion, and toast notifications for success/error feedback. The implementation ensures proper data cleanup to prevent orphaned records while maintaining security through role-based access control.
- **Enhanced Job Search Loading Experience:** Transformed the job search waiting time into an engaging and educational experience. Instead of a simple "Searching for jobs..." message, users now see a dynamic loading interface featuring: rotating informational cards that cycle through helpful tips and insights every 3 seconds, real-time progress indicators showing search stages (connecting to job boards, analyzing descriptions, calculating scores), job market insights tailored to the search query and location (average salaries, demand trends, company counts), personalized content for logged-in users (profile completion status, match strength indicators), platform statistics to build confidence (1000+ job sources, AI-powered matching), and smart content generation including related job title suggestions and location-specific data. The loading experience includes a progress bar, color-coded tip badges, and quick stats grid, all designed to reduce perceived wait time while providing actionable insights users can apply to their job search.
- **Enhanced AI Processing Loading Experiences:** Extended the engaging loading experience to AI-powered features including resume tailoring and cover letter generation. During resume tailoring, users see rotating tips about keyword optimization, ATS compatibility, achievement formatting, and tailoring best practices specific to their target job and company. The interface shows real-time AI processing stages like "Analyzing job description", "Matching skills and experiences", and "Optimizing keyword placement". Similarly, cover letter generation now features tips about personalization, opening hooks, company culture matching, and writing best practices. Both loading experiences include progress bars, statistics about success rates, and personalized advice based on the specific job application. These enhancements transform waiting time into educational moments that help users understand the AI's process and improve their application materials.
- **Modern Cover Letter Format:** Updated cover letter generation to remove outdated traditional letter header formatting. Cover letters now start directly with the greeting (e.g., "Dear Hiring Manager") without the old-fashioned sender address blocks, date lines, and recipient address blocks. This creates a cleaner, more modern format suitable for digital applications and email submissions. The change was implemented across all cover letter generation templates (Professional, Creative, Technical, Entry-Level) by updating the prompt instructions and removing legacy code that extracted applicant information for headers. The PDF download functionality retains minimal metadata (date, company, position) for context without the full traditional letter format.

## 🛠️ Technology Stack

The project is built with a modern, robust technology stack:

- **Framework:** [Next.js](https://nextjs.org/) 15 (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with a custom design system
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/) built on Radix UI primitives
- **Authentication:** [Firebase Authentication](https://firebase.google.com/docs/auth)
- **Database:** [Cloud Firestore](https://firebase.google.com/docs/firestore) for storing user data, resumes, and saved jobs
- **File Storage:** [Firebase Storage](https://firebase.google.com/docs/storage) for profile photos and file uploads
- **AI Services:** [OpenRouter API](https://openrouter.ai/) (`openai/gpt-4o-mini`) for matching, summarization, and resume editing
- **Job Search Data:** [SerpApi](https://serpapi.com/) for fetching job listings
- **Company Data:** [The Companies API](https://thecompaniesapi.com/) for comprehensive company information
- **PDF Generation:** [Puppeteer](https://pptr.dev/) for Markdown to PDF conversion
- **Markdown Processing:** [Marked](https://marked.js.org/) for Markdown parsing and HTML conversion
- **Package Manager:** [pnpm](https://pnpm.io/)

## 🚀 Getting Started

Follow these instructions to set up the project for local development.

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (version 18.18.0 or later recommended)
- [pnpm](https://pnpm.io/installation) package manager

### 2. Clone the Repository

```bash
git clone https://github.com/jsong1004/myjob
cd myjob
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Set Up Environment Variables

Copy the example environment file and fill in the required API keys and Firebase configuration details.

```bash
cp .env.example .env.local
```

You will need to populate `.env.local` with your credentials from Firebase, SerpApi, OpenRouter, and GitHub. The `.gitignore` file is already configured to keep this file private.

### 5. Firebase Setup

This project requires a Firebase project to handle authentication and data storage.

1.  **Create a Firebase Project:** Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  **Enable Authentication:** In the Firebase Console, navigate to **Authentication** > **Sign-in method** and enable the **Email/Password** and **Google** providers.
3.  **Create Firestore Database:** Go to the **Firestore Database** section and create a new database in **Production mode**.
4.  **Create Firestore Index:** The application requires a composite index for querying resumes. Go to the Firestore `Indexes` tab and create a new composite index for the `resumes` collection with the following fields:
      * `userId` (Ascending)
      * `createdAt` (Descending)
5.  **Generate Service Account Key:** For backend services (resume upload, PDF parsing) to work locally, you need a service account key.
      * In the Firebase Console, go to **Project Settings** > **Service accounts**.
      * Click "Generate new private key".
      * Save the downloaded JSON file as `service-account-key.json` in the root of the project directory. This file is included in `.gitignore` and will not be committed.
      * Note: The service account key is required for PDF/DOCX resume uploads to function properly.

### 6. Run the Development Server

Once the setup is complete, you can start the local development server.

```bash
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## 📂 Project Structure

The project follows the standard Next.js App Router structure:

```
/
├── app/                  # Main application routes and UI
│   ├── api/              # API routes for backend services
│   ├── (main)/           # Main application layout and pages
│   └── ...
├── components/           # Shared UI components
│   ├── ui/               # shadcn/ui components
│   └── ...
├── lib/                  # Helper functions and utilities
├── public/               # Static assets
└── ...
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue if you have any suggestions or find any bugs.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
