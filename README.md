# myjob


## Overview
**myJob** is an AI-powered job search and resume tailoring platform. Users can manage multiple resumes, create tailored versions for specific jobs, and search for job opportunities. The app is built with Next.js, React, Firebase, and Tailwind CSS.

## Features

- User authentication (Firebase)
- Resume management (upload, edit, delete, set default)
- Create tailored resumes for specific jobs
- Job search and filtering
- Responsive, modern UI
- Secure: All debug/test endpoints and UI have been removed for production

## Local Development

1. Clone this repository
2. Copy `.env.example` to `.env.local` and fill in your Firebase and other required credentials
3. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```
4. Run the development server:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

---

**Note:** All internal debug endpoints (health check, test auth, debug-resumes) and UI buttons have been removed for production security and cleanliness.