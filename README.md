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
- **📌 Applied Job Tracking:** Mark any saved job as "Applied" with a single click and visually track your application progress.
- **🔍 Advanced Job Search:** Leverages the SerpApi to search for jobs based on keywords and location.
- **🔐 User Authentication:** Secure sign-up and sign-in with Email/Password or Google OAuth, powered by Firebase Authentication.
- **📂 Comprehensive Resume Management:**
    - Upload and store multiple resumes in various formats (DOCX, Markdown).
    - View, edit (with or without AI), and delete any resume.
    - Set a default resume for job matching and download your resumes in markdown format at any time.
    - Save tailored resumes directly from the AI tailoring page.
- **💌 AI-Powered Cover Letter Management:**
    - Automatically generate compelling cover letters tailored to a specific job and your resume.
    - Interactively refine and edit the cover letter with an AI chat assistant.
    - Save, view, download, and delete cover letters from your personal library.
- **🧭 Intuitive Navigation:**
    - Profile, Resume, and Saved Jobs links in the header for easy access.

## 🛠️ Technology Stack

The project is built with a modern, robust technology stack:

- **Framework:** [Next.js](https://nextjs.org/) 15 (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with a custom design system
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/) built on Radix UI primitives
- **Authentication:** [Firebase Authentication](https://firebase.google.com/docs/auth)
- **Database:** [Cloud Firestore](https://firebase.google.com/docs/firestore) for storing user data, resumes, and saved jobs
- **AI Services:** [OpenRouter API](https://openrouter.ai/) (`openai/gpt-4o-mini`) for matching, summarization, and resume editing
- **Job Search Data:** [SerpApi](https://serpapi.com/) for fetching job listings
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

You will need to populate `.env.local` with your credentials from Firebase, SerpApi, and OpenRouter. The `.gitignore` file is already configured to keep this file private.

### 5. Firebase Setup

This project requires a Firebase project to handle authentication and data storage.

1.  **Create a Firebase Project:** Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  **Enable Authentication:** In the Firebase Console, navigate to **Authentication** > **Sign-in method** and enable the **Email/Password** and **Google** providers.
3.  **Create Firestore Database:** Go to the **Firestore Database** section and create a new database in **Production mode**.
4.  **Create Firestore Index:** The application requires a composite index for querying resumes. Go to the Firestore `Indexes` tab and create a new composite index for the `resumes` collection with the following fields:
      * `userId` (Ascending)
      * `createdAt` (Descending)
5.  **Generate Service Account Key:** For backend services to work locally, you need a service account key.
      * In the Firebase Console, go to **Project Settings** > **Service accounts**.
      * Click "Generate new private key".
      * Save the downloaded JSON file as `service-account-key.json` in the root of the project directory. This file is included in `.gitignore` and will not be committed.

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
