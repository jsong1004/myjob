import { 
  BatchJob, 
  JobSearchResult, 
  ExperienceLevel, 
  JobType, 
  WorkArrangement, 
  CompanySize, 
  JobFreshness,
  SalaryType,
  EnhancedJobSearchResult 
} from './types'
import { Timestamp } from 'firebase-admin/firestore'

/**
 * Utility functions for batch job processing and enhancement
 */

// Popular job search queries for batch processing
export const POPULAR_JOB_QUERIES = [
  // Software Engineering
  'software engineer',
  'senior software engineer',
  'full stack engineer',
  'frontend engineer',
  'backend engineer',
  'software developer',
  
  // AI/ML
  'machine learning engineer',
  'data scientist',
  'ai engineer',
  'ml engineer',
  'mlops engineer',
  'data engineer',
  
  // DevOps & Cloud
  'devops engineer',
  'cloud engineer',
  'site reliability engineer',
  'platform engineer',
  'kubernetes engineer',
  
  // Product & Design
  'product manager',
  'senior product manager',
  'product designer',
  'ux designer',
  'ui designer',
  
  // Leadership & Management
  'engineering manager',
  'technical lead',
  'tech lead',
  'staff engineer',
  'principal engineer',
  
  // Other Tech Roles
  'cybersecurity engineer',
  'security engineer',
  'mobile developer',
  'ios developer',
  'android developer',
  'game developer',
  'blockchain developer'
] as const

// Major locations for batch searching
export const BATCH_LOCATIONS = [
  'Anywhere',
  'United States',
  'Seattle, Washington, United States',
  'San Francisco, California, United States',
  'New York, New York, United States',
  'Austin, Texas, United States',
  'Boston, Massachusetts, United States',
  'Los Angeles, California, United States',
  'Chicago, Illinois, United States',
  'Denver, Colorado, United States',
  'Washington, District of Columbia, United States',
  'Atlanta, Georgia, United States'
] as const

/**
 * Extract salary information from job text
 */
export function extractSalaryInfo(salaryText: string, description?: string): {
  salaryMin?: number
  salaryMax?: number
  salaryType?: SalaryType
} {
  if (!salaryText && !description) return {}
  
  const text = `${salaryText || ''} ${description || ''}`.toLowerCase()
  
  // Common salary patterns
  const patterns = [
    // $100,000 - $150,000
    /\$(\d{1,3}(?:,\d{3})*)\s*-\s*\$(\d{1,3}(?:,\d{3})*)/g,
    // $100k - $150k
    /\$(\d+)k\s*-\s*\$(\d+)k/g,
    // $50/hour - $75/hour
    /\$(\d+)\/(?:hour|hr)\s*-\s*\$(\d+)\/(?:hour|hr)/g,
    // $50-$75/hour
    /\$(\d+)\s*-\s*\$(\d+)\/(?:hour|hr)/g,
    // Up to $150,000
    /up to \$(\d{1,3}(?:,\d{3})*)/g,
    // Starting at $100,000
    /starting (?:at|from) \$(\d{1,3}(?:,\d{3})*)/g
  ]
  
  let salaryMin: number | undefined
  let salaryMax: number | undefined
  let salaryType: SalaryType | undefined
  
  for (const pattern of patterns) {
    const matches = Array.from(text.matchAll(pattern))
    
    if (matches.length > 0) {
      const match = matches[0]
      
      if (match[2]) {
        // Range detected
        salaryMin = parseFloat(match[1].replace(/,/g, ''))
        salaryMax = parseFloat(match[2].replace(/,/g, ''))
        
        // Handle 'k' suffix
        if (text.includes('k')) {
          salaryMin *= 1000
          salaryMax *= 1000
        }
      } else {
        // Single value
        const value = parseFloat(match[1].replace(/,/g, ''))
        if (text.includes('up to')) {
          salaryMax = value
        } else {
          salaryMin = value
        }
      }
      
      // Determine salary type
      if (text.includes('/hour') || text.includes('/hr')) {
        salaryType = 'hourly'
      } else {
        salaryType = 'annual'
      }
      
      break
    }
  }
  
  return { salaryMin, salaryMax, salaryType }
}

/**
 * Determine experience level from job title and description
 */
export function extractExperienceLevel(title: string, description?: string): ExperienceLevel {
  const text = `${title} ${description || ''}`.toLowerCase()
  
  // Executive level
  if (/(?:cto|ceo|vp|vice president|director|head of)/i.test(text)) {
    return 'executive'
  }
  
  // Lead level
  if (/(?:lead|principal|staff|architect|senior manager)/i.test(text)) {
    return 'lead'
  }
  
  // Senior level
  if (/senior|sr\.|sr /i.test(text)) {
    return 'senior'
  }
  
  // Entry level indicators
  if (/(?:junior|jr\.|jr |entry|intern|graduate|new grad|associate)/i.test(text)) {
    return 'entry'
  }
  
  // Check years of experience in description
  if (description) {
    const yearMatches = description.match(/(\d+)\+?\s*years?\s*(?:of\s*)?experience/i)
    if (yearMatches) {
      const years = parseInt(yearMatches[1])
      if (years >= 8) return 'lead'
      if (years >= 5) return 'senior'
      if (years >= 2) return 'mid'
      return 'entry'
    }
  }
  
  // Default to mid-level
  return 'mid'
}

/**
 * Determine job type from title and description
 */
export function extractJobType(title: string, description?: string): JobType {
  const text = `${title} ${description || ''}`.toLowerCase()
  
  if (/(?:intern|internship)/i.test(text)) {
    return 'internship'
  }
  
  if (/(?:contract|contractor|freelance|temporary|temp|consultant)/i.test(text)) {
    return 'contract'
  }
  
  if (/(?:part.time|part time|parttime)/i.test(text)) {
    return 'part-time'
  }
  
  return 'full-time'
}

/**
 * Determine work arrangement from job description
 */
export function extractWorkArrangement(location: string, description?: string): WorkArrangement {
  const text = `${location} ${description || ''}`.toLowerCase()
  
  if (/(?:remote|anywhere|work from home|wfh|distributed)/i.test(text)) {
    return 'remote'
  }
  
  if (/(?:hybrid|flexible|remote.friendly)/i.test(text)) {
    return 'hybrid'
  }
  
  return 'on-site'
}

/**
 * Estimate company size from company name and description
 */
export function extractCompanySize(company: string, description?: string): CompanySize {
  const text = `${company} ${description || ''}`.toLowerCase()
  
  // Known large companies
  const largeCompanies = [
    'google', 'microsoft', 'amazon', 'apple', 'facebook', 'meta',
    'netflix', 'uber', 'lyft', 'airbnb', 'spotify', 'twitter', 'x',
    'linkedin', 'salesforce', 'oracle', 'ibm', 'cisco', 'intel',
    'nvidia', 'adobe', 'paypal', 'square', 'stripe', 'shopify'
  ]
  
  const isLargeCompany = largeCompanies.some(large => text.includes(large))
  
  if (isLargeCompany) {
    return 'large'
  }
  
  // Check for size indicators in description
  if (description) {
    if (/(?:fortune 500|enterprise|multinational|global)/i.test(text)) {
      return 'enterprise'
    }
    
    if (/(?:startup|early.stage|seed|series a)/i.test(text)) {
      return 'startup'
    }
    
    // Look for employee count
    const employeeMatch = text.match(/(\d+)\+?\s*(?:employees|people|team members)/i)
    if (employeeMatch) {
      const count = parseInt(employeeMatch[1])
      if (count >= 10000) return 'enterprise'
      if (count >= 1000) return 'large'
      if (count >= 100) return 'medium'
      if (count >= 10) return 'small'
      return 'startup'
    }
  }
  
  // Default assumption
  return 'medium'
}

/**
 * Determine job freshness based on posted date
 */
export function calculateJobFreshness(postedAt: string): JobFreshness {
  if (!postedAt) return 'older'
  
  try {
    const postedDate = new Date(postedAt)
    const now = new Date()
    const diffHours = (now.getTime() - postedDate.getTime()) / (1000 * 60 * 60)
    
    if (diffHours <= 24) return 'new'
    if (diffHours <= 168) return 'recent' // 1 week
    return 'older'
  } catch {
    return 'older'
  }
}

/**
 * Extract keywords from job title and description for search matching
 */
export function extractSearchKeywords(title: string, description?: string): string[] {
  const text = `${title} ${description || ''}`.toLowerCase()
  
  // Common tech keywords
  const techKeywords = [
    'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++', 'c#',
    'react', 'vue', 'angular', 'node', 'express', 'django', 'flask',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
    'sql', 'postgresql', 'mysql', 'mongodb', 'redis',
    'graphql', 'rest', 'api', 'microservices',
    'machine learning', 'artificial intelligence', 'data science',
    'devops', 'ci/cd', 'jenkins', 'github actions'
  ]
  
  const foundKeywords = techKeywords.filter(keyword => 
    text.includes(keyword)
  )
  
  return [...new Set(foundKeywords)]
}

/**
 * Extract skill requirements from job description
 */
export function extractSkillTags(description: string): string[] {
  const skills: string[] = []
  const text = description.toLowerCase()
  
  // Programming languages
  const languages = [
    'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++', 'c#',
    'php', 'ruby', 'swift', 'kotlin', 'scala', 'r', 'matlab'
  ]
  
  // Frameworks and libraries
  const frameworks = [
    'react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt',
    'django', 'flask', 'fastapi', 'spring', 'express', 'nest.js'
  ]
  
  // Tools and platforms
  const tools = [
    'git', 'docker', 'kubernetes', 'terraform', 'jenkins',
    'aws', 'azure', 'gcp', 'firebase', 'supabase'
  ]
  
  const allSkills = [...languages, ...frameworks, ...tools]
  
  for (const skill of allSkills) {
    if (text.includes(skill)) {
      skills.push(skill)
    }
  }
  
  return [...new Set(skills)]
}

/**
 * Convert JobSearchResult to BatchJob with enhanced metadata
 */
export function enhanceJobForBatch(
  job: JobSearchResult,
  searchQuery: string,
  searchLocation: string,
  batchId: string
): BatchJob {
  const now = Timestamp.now()
  
  return {
    id: job.id,
    batchId,
    searchQuery,
    searchLocation,
    
    // Core job details
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.description,
    qualifications: job.qualifications || [],
    responsibilities: job.responsibilities || [],
    benefits: job.benefits || [],
    
    // Enhanced metadata
    salary: job.salary,
    ...extractSalaryInfo(job.salary || '', job.description),
    experienceLevel: extractExperienceLevel(job.title, job.description),
    jobType: extractJobType(job.title, job.description),
    workArrangement: extractWorkArrangement(job.location, job.description),
    companySize: extractCompanySize(job.company, job.description),
    
    // Additional metadata
    postedAt: job.postedAt,
    applyUrl: job.applyUrl || '',
    source: job.source,
    sourceJobId: job.id,
    
    // Batch processing metadata
    batchCreatedAt: now,
    freshness: calculateJobFreshness(job.postedAt),
    scrapedAt: now,
    
    // Search optimization
    searchKeywords: extractSearchKeywords(job.title, job.description),
    industryTags: [], // TODO: Add industry classification
    skillTags: extractSkillTags(job.description)
  }
}

/**
 * Convert BatchJob back to EnhancedJobSearchResult for client
 */
export function batchJobToSearchResult(batchJob: BatchJob): EnhancedJobSearchResult {
  return {
    id: batchJob.id,
    title: batchJob.title,
    company: batchJob.company,
    location: batchJob.location,
    description: batchJob.description,
    qualifications: batchJob.qualifications,
    responsibilities: batchJob.responsibilities,
    benefits: batchJob.benefits,
    salary: batchJob.salary,
    postedAt: batchJob.postedAt,
    applyUrl: batchJob.applyUrl,
    source: batchJob.source,
    matchingScore: 0, // Will be calculated separately if needed
    
    // Enhanced fields
    experienceLevel: batchJob.experienceLevel,
    jobType: batchJob.jobType,
    workArrangement: batchJob.workArrangement,
    companySize: batchJob.companySize,
    freshness: batchJob.freshness,
    
    // Metadata
    isBatchResult: true,
    searchRelevance: 0, // Will be calculated based on search query
    lastUpdated: batchJob.scrapedAt.toDate().toISOString()
  }
}

/**
 * Generate today's batch ID
 */
export function generateBatchId(date: Date = new Date()): string {
  return date.toISOString().split('T')[0] // YYYY-MM-DD format
}

/**
 * Get batch configuration defaults
 */
export function getDefaultBatchConfig() {
  return {
    enabled: true,
    schedule: '0 2 * * *', // Daily at 2 AM
    popularQueries: [...POPULAR_JOB_QUERIES],
    locations: [...BATCH_LOCATIONS],
    maxJobsPerQuery: 100,
    retentionDays: 30
  }
}