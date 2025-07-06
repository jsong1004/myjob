import { Timestamp } from 'firebase/firestore'

// User document interface
export interface User {
  id: string
  email: string
  name: string
  photoURL?: string
  createdAt: Timestamp
  updatedAt: Timestamp
  defaultResumeId?: string
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