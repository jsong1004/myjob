import { Timestamp } from 'firebase-admin/firestore'

// User document interface
export interface User {
  id: string
  email: string
  name: string
  photoURL?: string
  createdAt: Timestamp
  updatedAt: Timestamp
  defaultResumeId?: string
  onboardingCompleted?: boolean
}

// Resume document interface
export interface Resume {
  id: string
  userId: string
  name: string
  content: string
  isDefault: boolean
  type: 'original' | 'tailored' | 'draft'
  jobTitle?: string
  jobId?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Cover letter document interface
export interface CoverLetter {
  id: string
  userId: string
  name: string
  content: string
  jobTitle: string
  company: string
  jobId: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Application status enum
export type ApplicationStatus = 'saved' | 'notinterested' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'withdrawn' | 'nolongeravailable'

// Saved job document interface
export interface SavedJob {
  id: string
  userId: string
  jobId: string
  title: string
  company: string
  location: string
  summary: string
  salary: string
  matchingScore: number
  savedAt: Timestamp
  appliedAt?: Timestamp // Optional field to track when user applied
  resumeTailoredAt?: Timestamp // Optional field to track when resume was tailored for this job
  coverLetterCreatedAt?: Timestamp // Optional field to track when cover letter was created for this job
  // New application tracking fields
  status: ApplicationStatus // Current application status
  notes?: string // User notes about the application
  reminderDate?: Timestamp // Date for follow-up reminder
  reminderNote?: string // Note for the reminder
  originalData: JobSearchResult // Full job data from SerpApi
}

// Job search result interface (from SerpApi)
export interface JobSearchResult {
  id: string
  title: string
  company: string
  location: string
  description: string
  qualifications?: string[]
  responsibilities?: string[]
  benefits?: string[]
  salary?: string
  postedAt: string
  applyUrl?: string
  source: string
  matchingScore?: number
  matchingSummary?: string
  summary?: string
}

// Job document interface for jobs collection (unified from batch_jobs)
export interface JobDocument {
  // Primary identification
  job_id: string          // Unique job identifier
  
  // Core job fields
  title: string
  company: string
  company_name?: string   // Backward compatibility
  location: string
  description: string
  
  // Job details
  salary?: string
  qualifications?: string[]
  responsibilities?: string[]
  benefits?: string[]
  
  // Batch metadata (from batch_jobs migration)
  batchId?: string        // Date when batch processed (e.g., "2024-01-15")
  searchQuery?: string    // Original search query used
  searchLocation?: string // Original location query
  scrapedAt?: Timestamp   // When scraped from SerpAPI
  isFromBatch?: boolean   // Flag indicating if from batch processing
  
  // Source information
  source: string          // "Google Jobs", "Database", etc.
  sourceJobId?: string    // Original SerpAPI job ID
  applyUrl?: string
  postedAt?: string
  
  // User tracking
  userId?: string         // User who first encountered this job
  seenAt?: Timestamp      // When first seen by a user
  
  // Enhanced data
  summary?: string
  enhancedData?: {
    summary?: string
    keyHighlights?: string[]
    techStack?: string[]
    requirements?: string[]
  }
  
  // Migration metadata
  migratedAt?: Timestamp  // When migrated from batch_jobs
  migratedFrom?: string   // Source collection ("batch_jobs")
}

// AI matching breakdown interface
export interface MatchingBreakdown {
  overall: number
  skills: {
    score: number
    matched: string[]
    missing: string[]
  }
  experience: {
    score: number
    yearsRequired?: number
    yearsHave?: number
    relevantExperience: string
  }
  education: {
    score: number
    required: string
    have: string
  }
  keywords: {
    score: number
    matched: string[]
    total: number
  }
  summary: string
}

// Chat message interface for resume tailoring
export interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

// Feedback document interface
export interface Feedback {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  type: 'feature' | 'bug';
  title: string;
  description: string;
  githubIssueUrl?: string;
  createdAt: Timestamp;
}

// Auth context interface
export interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  showOnboarding: boolean
  setShowOnboarding: (show: boolean) => void
} 

export interface UserProfile {
  userId: string
  displayName: string
  email: string
  phoneNumber?: string
  location?: string
  linkedinUrl?: string
  githubUrl?: string
  portfolioUrl?: string
  bio?: string
  jobTitle?: string
  experience?: string
  skills: string[]
  defaultResumeId?: string
  emailNotifications: boolean
  jobAlerts: boolean
  createdAt: Date
  updatedAt: Date
}

// Enhanced job search types for batch processing and filtering
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive'
export type JobType = 'full-time' | 'part-time' | 'contract' | 'internship'
export type WorkArrangement = 'remote' | 'hybrid' | 'on-site'
export type CompanySize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
export type JobFreshness = 'new' | 'recent' | 'older'
export type SalaryType = 'hourly' | 'annual'
export type PostedWithin = '24h' | '3d' | '1w' | '2w' | '1m'

// Batch job interface for nightly job scraping
export interface BatchJob {
  id: string
  batchId: string          // Daily batch identifier (e.g., "2025-07-22")
  searchQuery: string      // Original search term used
  searchLocation: string   // Location searched
  
  // Core job details
  title: string
  company: string
  location: string
  description: string
  qualifications: string[]
  responsibilities: string[]
  benefits: string[]
  
  // Enhanced metadata for filtering
  salary?: string
  salaryMin?: number       // Extracted minimum salary
  salaryMax?: number       // Extracted maximum salary
  salaryType?: SalaryType  // Annual vs hourly
  experienceLevel: ExperienceLevel
  jobType: JobType
  workArrangement: WorkArrangement
  companySize: CompanySize
  
  // Additional metadata
  postedAt: string
  applyUrl: string
  source: string
  sourceJobId?: string     // Original job ID from source (SerpApi)
  
  // Batch processing metadata
  batchCreatedAt: Timestamp
  freshness: JobFreshness
  scrapedAt: Timestamp
  
  // Search optimization
  searchKeywords: string[] // Extracted keywords for matching
  industryTags: string[]   // Industry classifications
  skillTags: string[]      // Required skills extracted
}

// Advanced job filtering interface
export interface JobFilters {
  // Basic search
  searchQuery?: string
  locations?: string[]
  
  // Salary filtering
  salaryMin?: number
  salaryMax?: number
  salaryType?: SalaryType
  
  // Experience and role
  experienceLevel?: ExperienceLevel[]
  jobType?: JobType[]
  workArrangement?: WorkArrangement[]
  
  // Company filtering
  companySize?: CompanySize[]
  companies?: string[]
  
  // Temporal filtering
  postedWithin?: PostedWithin
  freshness?: JobFreshness[]
  
  // Advanced filtering
  skillsRequired?: string[]    // Must have these skills
  industryFocus?: string[]     // Preferred industries
  benefitsRequired?: string[]  // Required benefits
  
  // Search optimization
  excludeCompanies?: string[]
  excludeKeywords?: string[]
  sortBy?: 'relevance' | 'date' | 'salary' | 'company'
  sortDirection?: 'asc' | 'desc'
}

// Enhanced job search result for filtered results
export interface EnhancedJobSearchResult extends JobSearchResult {
  // Additional fields from batch processing
  experienceLevel?: ExperienceLevel
  jobType?: JobType
  workArrangement?: WorkArrangement
  companySize?: CompanySize
  freshness?: JobFreshness
  
  // Metadata
  isBatchResult?: boolean  // True if from batch, false if from live API
  searchRelevance?: number // Relevance score for search query
  lastUpdated?: string     // When this job was last updated
}

// Batch processing configuration
export interface BatchConfig {
  enabled: boolean
  schedule: string         // Cron expression
  popularQueries: string[] // Job titles to search for
  locations: string[]      // Locations to search in
  maxJobsPerQuery: number  // Limit jobs per search query
  retentionDays: number    // How long to keep batch jobs
}

// Filter options for UI components
export interface FilterOptions {
  locations: { value: string; label: string; count: number }[]
  companies: { value: string; label: string; count: number }[]
  experienceLevels: { value: ExperienceLevel; label: string; count: number }[]
  jobTypes: { value: JobType; label: string; count: number }[]
  workArrangements: { value: WorkArrangement; label: string; count: number }[]
  companySizes: { value: CompanySize; label: string; count: number }[]
  industries: { value: string; label: string; count: number }[]
  skills: { value: string; label: string; count: number }[]
  salaryRanges: {
    min: number
    max: number
    q25: number  // 25th percentile
    q50: number  // Median
    q75: number  // 75th percentile
  }
}

// Search analytics for optimization
export interface SearchAnalytics {
  query: string
  location: string
  filters: JobFilters
  resultCount: number
  batchHitRate: number     // Percentage from batch vs live API
  executionTime: number    // Search time in milliseconds
  timestamp: Timestamp
  userId?: string
} 