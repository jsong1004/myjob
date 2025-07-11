# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- **Development server**: `pnpm dev` or `npm run dev`
- **Build**: `pnpm build` or `npm run build`
- **Lint**: `pnpm lint` or `npm run lint`
- **Production server**: `pnpm start` or `npm run start`

Note: This project uses pnpm (evident from pnpm-lock.yaml), so prefer pnpm commands when available.

## Architecture Overview

This is a Next.js 15 job search application built with:

- **Framework**: Next.js 15 (App Router) with React 19
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Radix UI primitives with shadcn/ui components
- **Language**: TypeScript with strict mode enabled
- **Database**: Firebase (Firestore) for user data and resumes
- **Authentication**: Firebase Auth with Google OAuth
- **AI Integration**: OpenRouter API for job matching and resume tailoring
- **Job Search**: SerpApi for job listings
- **Package Manager**: pnpm

### Key Application Features

- **Job Search**: AI-powered job matching with SerpApi integration (app/api/jobs/search/route.ts)
- **Resume Upload**: Support for PDF, DOCX, and Markdown file uploads with text extraction (app/api/resumes/route.ts)
- **Resume Management**: Full CRUD operations for resumes with default resume system (app/resumes/page.tsx)
- **Resume Tailoring**: Interactive AI chat for resume customization (app/tailor-resume/[id]/page.tsx)
- **Job Management**: Save jobs and view detailed job pages (app/jobs/[id]/page.tsx)
- **Company Details**: Comprehensive company information pages using The Companies API (app/companies/[name]/page.tsx)
- **User Authentication**: Firebase Auth with Google sign-in and email/password

### Project Structure

- `/app/` - Next.js App Router pages and API routes
- `/components/` - Reusable React components (custom + shadcn/ui)
- `/components/ui/` - shadcn/ui component library
- `/lib/` - Utility functions, Firebase config, and TypeScript types
- `/hooks/` - Custom React hooks
- `/public/` - Static assets and placeholders

### Important Implementation Details

- **Firebase Integration**: Uses Firebase Auth and Firestore with proper null checks for build compatibility
- **Firebase Admin**: Resume backend requires Firebase Admin SDK with service account authentication
- **File Processing**: PDF, DOCX, and Markdown parsing using pdf-parse and mammoth libraries (lib/file-parser.ts)
- **AI Services**: OpenRouter API for job matching scores and resume tailoring conversations
- **Job Search**: SerpApi integration with AI-powered matching and job summarization
- **Component Architecture**: Uses shadcn/ui design system with Radix UI primitives
- **Authentication**: Complete auth flow with AuthProvider context and session management
- **Dynamic Routes**: Job details ([id]) and resume tailoring ([id]) with proper param handling
- **Styling**: HSL-based CSS custom properties for theming with Tailwind CSS
- **TypeScript**: Comprehensive type definitions in lib/types.ts for all data structures

### Build Configuration

- **Build optimization**: Ignores ESLint and TypeScript errors (next.config.mjs)
- **Images**: Unoptimized for deployment compatibility
- **Path mapping**: Configured with `@/*` aliases for cleaner imports
- **Tailwind**: Custom configuration with design tokens and animations

### External APIs and Services

- **SerpApi**: Job search integration (requires SERPAPI_KEY environment variable)
- **OpenRouter**: AI services for matching and resume tailoring (requires OPENROUTER_API_KEY)
- **The Companies API**: Company information and details (requires THE_COMPANIES_API_TOKEN environment variable)
- **Firebase**: Authentication and database (requires Firebase environment variables)

### Environment Variables Required

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_SERVICE_ACCOUNT_KEY= # JSON string of Firebase service account (required for resume upload)
SERPAPI_KEY=
OPENROUTER_API_KEY=
THE_COMPANIES_API_TOKEN=
```

### Development Notes

- The app gracefully handles missing Firebase configuration during build
- Uses server-side session storage for job search results
- Implements proper error handling for API failures
- Firebase emulators are configured but commented out in development
- The application is designed for v0.dev integration and Vercel deployment