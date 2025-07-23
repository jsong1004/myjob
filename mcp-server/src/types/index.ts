// MCP Server Types
import { z } from 'zod'

// Job search schemas
export const JobSearchSchema = z.object({
  query: z.string().describe("Job search query (e.g., 'software engineer', 'data scientist')"),
  location: z.string().optional().describe("Job location (e.g., 'San Francisco, CA', 'Remote')"),
  filters: z.object({
    experienceLevel: z.array(z.enum(['entry', 'mid', 'senior', 'lead', 'executive'])).optional(),
    jobType: z.array(z.enum(['full-time', 'part-time', 'contract', 'internship'])).optional(),
    workArrangement: z.array(z.enum(['remote', 'hybrid', 'on-site'])).optional(),
    salaryMin: z.number().optional(),
    salaryMax: z.number().optional(),
    postedWithin: z.enum(['24h', '3d', '1w', '2w', '1m']).optional()
  }).optional()
})

export const JobScoringSchema = z.object({
  jobIds: z.array(z.string()).describe("Array of job IDs to score"),
  resumeId: z.string().optional().describe("Resume ID to use for scoring (uses default if not provided)")
})

// Resume schemas
export const ResumeUploadSchema = z.object({
  name: z.string().describe("Name for the resume"),
  content: z.string().describe("Resume content in markdown format"),
  setAsDefault: z.boolean().optional().describe("Set this resume as default")
})

export const ResumeTailoringSchema = z.object({
  resumeId: z.string().describe("Resume ID to tailor"),
  jobId: z.string().describe("Job ID to tailor for"),
  mode: z.enum(['agent', 'ask']).describe("Agent mode makes changes, ask mode provides advice"),
  request: z.string().describe("Specific tailoring request or question")
})

// Cover letter schemas
export const CoverLetterSchema = z.object({
  jobId: z.string().describe("Job ID to create cover letter for"),
  resumeId: z.string().optional().describe("Resume ID to base cover letter on"),
  mode: z.enum(['agent', 'ask']).describe("Agent mode creates/edits, ask mode provides advice"),
  request: z.string().describe("Specific request or customization"),
  existingCoverLetterId: z.string().optional().describe("Existing cover letter ID for editing")
})

// Company info schema
export const CompanyInfoSchema = z.object({
  companyName: z.string().describe("Company name to get information for")
})

// Save job schema
export const SaveJobSchema = z.object({
  jobId: z.string().describe("Job ID to save"),
  notes: z.string().optional().describe("Personal notes about the job")
})

// Resource query schemas
export const SavedJobsQuerySchema = z.object({
  status: z.enum(['saved', 'notinterested', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn']).optional(),
  limit: z.number().min(1).max(100).default(20).optional(),
  offset: z.number().min(0).default(0).optional()
})

export const ResumesQuerySchema = z.object({
  limit: z.number().min(1).max(50).default(10).optional(),
  offset: z.number().min(0).default(0).optional()
})

// Authentication context
export interface AuthContext {
  userId: string
  authToken: string
}

// Response types
export interface MCPError {
  code: string
  message: string
  details?: Record<string, any>
}

export interface JobSearchResult {
  id: string
  title: string
  company: string
  location: string
  description: string
  salary?: string
  postedAt: string
  matchingScore?: number
  matchingSummary?: string
  applyUrl?: string
}

export interface SavedJob extends JobSearchResult {
  savedAt: string
  status: string
  notes?: string
  resumeTailoredAt?: string
  coverLetterCreatedAt?: string
}

export interface Resume {
  id: string
  name: string
  content: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface CoverLetter {
  id: string
  jobId: string
  jobTitle: string
  company: string
  content: string
  createdAt: string
  updatedAt: string
}