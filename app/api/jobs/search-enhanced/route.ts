import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore, Timestamp } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import { getJson } from "serpapi"
import { 
  JobFilters, 
  EnhancedJobSearchResult, 
  BatchJob,
  ExperienceLevel,
  JobType,
  WorkArrangement,
  CompanySize,
  PostedWithin
} from "@/lib/types"
import { 
  batchJobToSearchResult, 
  generateBatchId,
  extractExperienceLevel,
  extractJobType,
  extractWorkArrangement,
  extractCompanySize,
  calculateJobFreshness
} from "@/lib/batch-job-utils"

/**
 * Enhanced job search endpoint that prioritizes batch jobs and applies advanced filtering
 * Flow: Query batch_jobs -> Apply filters -> Fill gaps with live SerpAPI -> Merge results
 */

interface SearchRequest {
  query: string
  location?: string
  filters?: JobFilters
  limit?: number
  offset?: number
  resume?: string // For scoring (optional)
}

interface SearchResponse {
  jobs: EnhancedJobSearchResult[]
  total: number
  batchHitRate: number
  executionTime: number
  appliedFilters: JobFilters
  suggestions?: {
    locations: string[]
    companies: string[]
    skills: string[]
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await req.json() as SearchRequest
    const {
      query,
      location = "United States",
      filters = {},
      limit = 50,
      offset = 0,
      resume
    } = body

    if (!query.trim()) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 })
    }

    console.log(`[EnhancedSearch] Starting search for: "${query}" in "${location}"`)
    console.log(`[EnhancedSearch] Filters:`, filters)

    // Get user ID for personalization (optional)
    let userId: string | null = null
    const authHeader = req.headers.get("authorization")
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "")
        initFirebaseAdmin()
        const decoded = await getAuth().verifyIdToken(token)
        userId = decoded.uid
      } catch (error) {
        console.log(`[EnhancedSearch] Auth optional, continuing without user:`, error)
      }
    }

    const db = getFirestore()

    // Step 1: Search batch jobs first
    console.log(`[EnhancedSearch] Searching batch jobs...`)
    const batchJobs = await searchBatchJobs(db, query, location, filters)
    console.log(`[EnhancedSearch] Found ${batchJobs.length} jobs in batch`)

    let allJobs = batchJobs.map(batchJobToSearchResult)
    let batchJobCount = allJobs.length

    // Step 2: If insufficient results, supplement with live API
    const minResultsThreshold = Math.min(20, limit)
    let liveApiJobs: EnhancedJobSearchResult[] = []
    
    if (allJobs.length < minResultsThreshold) {
      console.log(`[EnhancedSearch] Insufficient batch results, calling live API...`)
      
      try {
        liveApiJobs = await fetchLiveJobs(query, location, limit - allJobs.length)
        console.log(`[EnhancedSearch] Found ${liveApiJobs.length} jobs from live API`)
        
        // Merge with batch results, avoiding duplicates
        const existingIds = new Set(allJobs.map(job => job.id))
        const uniqueLiveJobs = liveApiJobs.filter(job => !existingIds.has(job.id))
        
        allJobs = [...allJobs, ...uniqueLiveJobs]
      } catch (apiError) {
        console.error(`[EnhancedSearch] Live API failed:`, apiError)
        // Continue with batch results only
      }
    }

    // Step 3: Apply remaining filters and calculate relevance
    allJobs = applySearchFilters(allJobs, filters)
    allJobs = calculateRelevanceScore(allJobs, query)

    // Step 4: Sort results
    allJobs = sortResults(allJobs, filters.sortBy, filters.sortDirection)

    // Step 5: Apply pagination
    const total = allJobs.length
    const paginatedJobs = allJobs.slice(offset, offset + limit)

    // Step 6: Log search analytics
    const executionTime = Date.now() - startTime
    const batchHitRate = batchJobCount / Math.max(allJobs.length, 1)
    
    try {
      await db.collection('search_analytics').add({
        query,
        location,
        filters,
        resultCount: total,
        batchHitRate,
        executionTime,
        userId,
        timestamp: Timestamp.now()
      })
    } catch (error) {
      console.error('[EnhancedSearch] Failed to log analytics:', error)
    }

    // Step 7: Generate suggestions for better search
    const suggestions = generateSearchSuggestions(allJobs, query)

    const response: SearchResponse = {
      jobs: paginatedJobs,
      total,
      batchHitRate,
      executionTime,
      appliedFilters: filters,
      suggestions
    }

    console.log(`[EnhancedSearch] Search completed: ${total} total, ${batchHitRate.toFixed(2)} batch hit rate, ${executionTime}ms`)

    return NextResponse.json(response)

  } catch (error) {
    console.error("[EnhancedSearch] Error:", error)
    return NextResponse.json({
      error: "Search failed",
      detail: error instanceof Error ? error.message : "Unknown error",
      executionTime: Date.now() - startTime
    }, { status: 500 })
  }
}

/**
 * Search batch jobs collection with filters
 */
async function searchBatchJobs(
  db: FirebaseFirestore.Firestore, 
  query: string, 
  location: string, 
  filters: JobFilters
): Promise<BatchJob[]> {
  const today = generateBatchId()
  const yesterday = generateBatchId(new Date(Date.now() - 24 * 60 * 60 * 1000))
  
  let batchQuery = db.collection('batch_jobs')
    .where('batchId', 'in', [today, yesterday]) // Search today and yesterday
  
  // Apply basic location filter
  if (location && location !== "United States" && location !== "Anywhere") {
    // Extract state for location matching
    const stateMatch = location.match(/([A-Z]{2})\b/)
    if (stateMatch) {
      const state = stateMatch[1]
      batchQuery = batchQuery.where('location', '>=', state)
        .where('location', '<=', state + '\uf8ff')
    }
  }
  
  const snapshot = await batchQuery.limit(200).get() // Limit to prevent excessive results
  
  let jobs: BatchJob[] = []
  snapshot.forEach(doc => {
    jobs.push({ id: doc.id, ...doc.data() } as BatchJob)
  })

  // Apply text search filtering (simple implementation)
  const queryLower = query.toLowerCase()
  jobs = jobs.filter(job => {
    const searchText = `${job.title} ${job.company} ${job.description}`.toLowerCase()
    const queryWords = queryLower.split(' ')
    return queryWords.some(word => searchText.includes(word))
  })

  return jobs
}

/**
 * Fetch jobs from live SerpAPI
 */
async function fetchLiveJobs(
  query: string, 
  location: string, 
  limit: number
): Promise<EnhancedJobSearchResult[]> {
  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) {
    throw new Error("SerpAPI key not configured")
  }

  const searchParams = {
    engine: "google_jobs",
    api_key: apiKey,
    q: query,
    location: location === "Anywhere" ? "United States" : location,
    hl: "en",
    gl: "us",
    num: Math.min(limit, 50),
    timeout: 15000
  }

  console.log(`[EnhancedSearch] SerpAPI request:`, { query, location, limit })
  const response = await getJson(searchParams)

  if (response.error) {
    throw new Error(`SerpAPI error: ${response.error}`)
  }

  const jobs = response.jobs_results || []
  
  return jobs.map((job: any): EnhancedJobSearchResult => ({
    id: job.job_id || `live-${job.title}-${job.company_name}-${Date.now()}`,
    title: job.title || "",
    company: job.company_name || job.company || "",
    location: job.location || "",
    description: job.description || job.snippet || "",
    qualifications: extractJobHighlights(job, "qualification"),
    responsibilities: extractJobHighlights(job, "responsibilit"),
    benefits: extractJobHighlights(job, "benefit"),
    salary: job.salary || job.detected_extensions?.salary || "",
    postedAt: job.detected_extensions?.posted_at || job.posted_at || "",
    applyUrl: job.apply_options?.[0]?.link || job.apply_link || job.link || "",
    source: "Google Jobs",
    matchingScore: 0,
    
    // Enhanced fields
    experienceLevel: extractExperienceLevel(job.title, job.description),
    jobType: extractJobType(job.title, job.description),
    workArrangement: extractWorkArrangement(job.location, job.description),
    companySize: extractCompanySize(job.company_name || job.company, job.description),
    freshness: calculateJobFreshness(job.detected_extensions?.posted_at || job.posted_at),
    
    isBatchResult: false,
    searchRelevance: 0,
    lastUpdated: new Date().toISOString()
  }))
}

/**
 * Apply advanced filters to job results
 */
function applySearchFilters(
  jobs: EnhancedJobSearchResult[], 
  filters: JobFilters
): EnhancedJobSearchResult[] {
  return jobs.filter(job => {
    // Salary filtering
    if (filters.salaryMin && job.salary) {
      const salaryNumbers = job.salary.match(/\d+/g)
      if (salaryNumbers) {
        const minSalary = parseInt(salaryNumbers[0])
        if (minSalary < filters.salaryMin) return false
      }
    }
    
    if (filters.salaryMax && job.salary) {
      const salaryNumbers = job.salary.match(/\d+/g)
      if (salaryNumbers) {
        const maxSalary = parseInt(salaryNumbers[salaryNumbers.length - 1])
        if (maxSalary > filters.salaryMax) return false
      }
    }

    // Experience level filtering
    if (filters.experienceLevel?.length && job.experienceLevel) {
      if (!filters.experienceLevel.includes(job.experienceLevel)) return false
    }

    // Job type filtering
    if (filters.jobType?.length && job.jobType) {
      if (!filters.jobType.includes(job.jobType)) return false
    }

    // Work arrangement filtering
    if (filters.workArrangement?.length && job.workArrangement) {
      if (!filters.workArrangement.includes(job.workArrangement)) return false
    }

    // Company size filtering
    if (filters.companySize?.length && job.companySize) {
      if (!filters.companySize.includes(job.companySize)) return false
    }

    // Company filtering
    if (filters.companies?.length) {
      const jobCompanyLower = job.company.toLowerCase()
      if (!filters.companies.some(company => jobCompanyLower.includes(company.toLowerCase()))) {
        return false
      }
    }

    // Skills filtering (basic implementation)
    if (filters.skillsRequired?.length) {
      const jobText = `${job.title} ${job.description}`.toLowerCase()
      const hasAllSkills = filters.skillsRequired.every(skill => 
        jobText.includes(skill.toLowerCase())
      )
      if (!hasAllSkills) return false
    }

    // Posted date filtering
    if (filters.postedWithin && job.postedAt) {
      const postedDate = new Date(job.postedAt)
      const now = new Date()
      const diffHours = (now.getTime() - postedDate.getTime()) / (1000 * 60 * 60)
      
      let maxHours = 24 * 30 // Default to 30 days
      switch (filters.postedWithin) {
        case '24h': maxHours = 24; break
        case '3d': maxHours = 72; break
        case '1w': maxHours = 168; break
        case '2w': maxHours = 336; break
        case '1m': maxHours = 720; break
      }
      
      if (diffHours > maxHours) return false
    }

    // Exclude companies
    if (filters.excludeCompanies?.length) {
      const jobCompanyLower = job.company.toLowerCase()
      if (filters.excludeCompanies.some(company => jobCompanyLower.includes(company.toLowerCase()))) {
        return false
      }
    }

    // Exclude keywords
    if (filters.excludeKeywords?.length) {
      const jobText = `${job.title} ${job.description}`.toLowerCase()
      if (filters.excludeKeywords.some(keyword => jobText.includes(keyword.toLowerCase()))) {
        return false
      }
    }

    return true
  })
}

/**
 * Calculate search relevance score based on query match
 */
function calculateRelevanceScore(
  jobs: EnhancedJobSearchResult[], 
  query: string
): EnhancedJobSearchResult[] {
  const queryWords = query.toLowerCase().split(' ')
  
  return jobs.map(job => {
    let relevanceScore = 0
    const jobText = `${job.title} ${job.company} ${job.description}`.toLowerCase()
    
    // Title matches get highest weight
    queryWords.forEach(word => {
      if (job.title.toLowerCase().includes(word)) {
        relevanceScore += 3
      } else if (job.company.toLowerCase().includes(word)) {
        relevanceScore += 2
      } else if (jobText.includes(word)) {
        relevanceScore += 1
      }
    })
    
    // Boost fresh jobs slightly
    if (job.freshness === 'new') relevanceScore += 0.5
    else if (job.freshness === 'recent') relevanceScore += 0.2
    
    job.searchRelevance = relevanceScore
    return job
  })
}

/**
 * Sort results based on criteria
 */
function sortResults(
  jobs: EnhancedJobSearchResult[], 
  sortBy: string = 'relevance', 
  direction: string = 'desc'
): EnhancedJobSearchResult[] {
  return jobs.sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'relevance':
        comparison = (a.searchRelevance || 0) - (b.searchRelevance || 0)
        break
      case 'date':
        comparison = new Date(a.postedAt || 0).getTime() - new Date(b.postedAt || 0).getTime()
        break
      case 'company':
        comparison = a.company.localeCompare(b.company)
        break
      case 'salary':
        // Simple salary comparison (could be improved)
        const aSalary = extractFirstNumber(a.salary || '')
        const bSalary = extractFirstNumber(b.salary || '')
        comparison = aSalary - bSalary
        break
      default:
        comparison = (a.searchRelevance || 0) - (b.searchRelevance || 0)
    }
    
    return direction === 'desc' ? -comparison : comparison
  })
}

/**
 * Generate search suggestions
 */
function generateSearchSuggestions(
  jobs: EnhancedJobSearchResult[], 
  query: string
) {
  const companies = [...new Set(jobs.map(job => job.company))]
    .slice(0, 5)
  
  const locations = [...new Set(jobs.map(job => job.location))]
    .slice(0, 5)
  
  // Extract common skills (simplified)
  const skills = ['JavaScript', 'Python', 'React', 'AWS', 'Docker']
    .slice(0, 5)
  
  return { companies, locations, skills }
}

// Helper functions
function extractJobHighlights(job: any, type: string): string[] {
  if (!job.job_highlights) return []
  
  for (const highlight of job.job_highlights) {
    if (highlight.title?.toLowerCase().includes(type.toLowerCase())) {
      return highlight.items || []
    }
  }
  
  return []
}

function extractFirstNumber(text: string): number {
  const match = text.match(/\d+/)
  return match ? parseInt(match[0]) : 0
}