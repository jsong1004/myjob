# Job Search System - Complete Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Firestore Collections](#firestore-collections)
4. [Search Flow](#search-flow)
5. [Database-First Strategy](#database-first-strategy)
6. [SerpAPI Integration](#serpapi-integration)
7. [AI Enhancement Pipeline](#ai-enhancement-pipeline)
8. [Batch Processing System](#batch-processing-system)
9. [Advanced Filtering](#advanced-filtering)
10. [Performance Optimizations](#performance-optimizations)
11. [Metrics & Monitoring](#metrics--monitoring)

## Overview

The MyJob platform implements a sophisticated job search system that combines multiple data sources, AI enhancements, and intelligent caching to deliver relevant job opportunities while optimizing API costs and performance.

### Key Features
- **Database-first approach** with intelligent API fallback
- **Batch processing** for popular searches (600+ queries nightly)
- **AI-powered job scoring** with 8 specialized agents
- **Advanced filtering** with 7 dynamic categories
- **Cost optimization** reducing API calls by ~90%

## System Architecture

### High-Level Architecture
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend UI   │────▶│  Search API      │────▶│   Database      │
│ (React/Next.js) │     │  (Enhanced)      │     │  (Firestore)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                           │
                               ▼                           ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │   SerpAPI        │     │  Batch Jobs     │
                        │  (Fallback)      │     │  (Cached)       │
                        └──────────────────┘     └─────────────────┘
                               │                           │
                               ▼                           ▼
                        ┌──────────────────────────────────┐
                        │    AI Enhancement Pipeline       │
                        │  (Multi-Agent Scoring System)    │
                        └──────────────────────────────────┘
```

### Component Overview

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Enhanced Search UI | `components/enhanced-job-search.tsx` | Advanced search interface with filters |
| Search API (Enhanced) | `app/api/jobs/search-enhanced/route.ts` | Main search endpoint with filtering |
| Search API (Basic) | `app/api/jobs/search/route.ts` | Database-first search with fallback |
| Batch Processor | `app/api/batch/process/route.ts` | Nightly job scraping |
| Cron Scheduler | `app/api/cron/batch-jobs/route.ts` | Scheduled batch triggers |
| Filter API | `app/api/jobs/filters/route.ts` | Dynamic filter generation |
| AI Scoring | `app/api/jobs/score-multi-agent/route.ts` | Multi-agent job scoring |

## Firestore Collections

The system uses three main Firestore collections, each serving a specific purpose in the job search and management workflow:

### Collection Overview

| Collection | Purpose | Created By | Primary Use |
|------------|---------|------------|-------------|
| `batch_jobs` | Pre-scraped job cache | Nightly batch processing | Primary search source |
| `jobs` | General job storage | Live API + user interactions | Job details & deduplication |
| `savedJobs` | User bookmarks | User save actions | Personal job management |

### 1. `batch_jobs` Collection

**Purpose**: Cost-effective job storage from automated nightly scraping

**Schema**:
```typescript
interface BatchJob {
  // Identification
  id: string              // Unique job hash
  batchId: string         // Date-based batch ID (e.g., "2024-01-15")
  
  // Job Content
  title: string
  company: string
  location: string
  description: string
  salary?: string
  benefits?: string[]
  qualifications?: string[]
  responsibilities?: string[]
  
  // Search Metadata
  searchQuery: string     // Original search term
  searchLocation: string  // Original location query
  
  // Batch Processing Data
  scrapedAt: Timestamp
  batchCreatedAt: Timestamp
  isActive: boolean       // For cleanup/expiration
  freshness: 'today' | 'week' | 'month' | 'older'
  
  // Source Information
  source: string          // "Google Jobs"
  sourceJobId?: string    // Original SerpAPI job ID
  applyUrl: string
  postedAt: string
  
  // Enhancement Data
  enhancedData?: {
    summary: string
    keyHighlights: string[]
    techStack: string[]
  }
}
```

**Creation Process**:
```typescript
// Nightly batch processing at 2 AM PST
const batchJobs = await processPopularQueries([
  'software engineer',
  'data scientist', 
  'product manager',
  // ... 60+ queries
], [
  'San Francisco, CA',
  'New York, NY',
  'Remote',
  // ... 10+ locations  
])

// Store in batch_jobs collection
await db.collection('batch_jobs').doc(jobId).set(batchJob)
```

**Lifecycle**:
- Created: Nightly at 2 AM PST (Monday-Friday)
- TTL: 30 days (automatic cleanup)
- Volume: ~600-1000 new jobs per night
- Query Performance: Indexed on `isActive`, `searchQuery`, `location`, `postedDate`

### 2. `jobs` Collection

**Purpose**: General-purpose job storage for all jobs users encounter

**Schema**:
```typescript
interface JobDocument {
  // Primary Fields
  job_id: string          // Unique identifier
  title: string
  company: string
  company_name: string    // Backward compatibility
  location: string
  description: string
  
  // Job Details
  salary?: string
  qualifications?: string[]
  responsibilities?: string[]
  benefits?: string[]
  
  // Metadata
  userId: string          // User who first encountered this job
  seenAt: Timestamp      // When first seen
  source: string         // "Google Jobs", "Database", etc.
  applyUrl: string
  postedAt: string
  
  // Optional Enhancement Data
  summary?: string
  enhancedData?: object
}
```

**Creation Triggers**:
1. **Live API Calls**: When batch results are insufficient
2. **User Interactions**: When users view specific jobs
3. **Deduplication**: Prevents duplicate storage

```typescript
// Usage in search flow
const existingJobs = await filterExistingJobs(liveApiResults)
await saveJobsIfNotExist(newJobs, userId)
```

**Primary Uses**:
- Job details page primary lookup (`/api/jobs/[id]/route.ts`)
- Search deduplication to avoid re-storing same jobs
- Fallback search when batch_jobs insufficient

### 3. `savedJobs` Collection

**Purpose**: User-specific job bookmarks with AI scoring and application tracking

**Schema**:
```typescript
interface SavedJob {
  // Document Metadata
  id: string              // Firestore document ID
  userId: string          // Job owner
  jobId: string          // Reference to job in batch_jobs/jobs
  
  // Basic Job Info
  title: string
  company: string
  location: string
  summary: string
  salary?: string
  
  // AI Scoring Data
  matchingScore: number   // 0-100 fit score
  scoreDetails: {
    skills: number
    experience: number
    education: number
    achievements: number
    // ... detailed breakdown
  }
  matchingSummary: string // AI-generated explanation
  
  // Complete Job Data
  originalData: JobSearchResult // Full job object
  
  // User Management
  savedAt: Timestamp
  status?: 'interested' | 'applied' | 'interviewing' | 'offered' | 'rejected' | 'notinterested'
  notes?: string          // User's personal notes
  applicationUrl?: string // Application tracking
  
  // Activity Tracking  
  lastViewed?: Timestamp
  viewCount?: number
}
```

**Creation Process**:
```typescript
// When user saves a job
const savedJob = {
  userId,
  jobId,
  title,
  company,
  location,
  // ... basic fields
  
  // AI scoring against user's resume
  matchingScore: await calculateScore(job, userResume),
  scoreDetails: await getDetailedScoring(job, userResume),
  matchingSummary: await generateMatchingSummary(job, userResume),
  
  originalData: completeJobData,
  savedAt: Timestamp.now()
}

await db.collection('savedJobs').add(savedJob)
```

**Primary Uses**:
- "My Jobs" page displaying user's saved jobs
- Application status tracking and management
- AI-powered job-resume matching scores
- Personal notes and job organization
- Fallback for job details when not found in `jobs`

### Data Flow and Relationships

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   batch_jobs    │────▶│      jobs        │────▶│   savedJobs     │
│   (Nightly)     │     │   (Live API)     │     │ (User Bookmarks)│
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
   Search Source           Job Details Page         User Management
   (Primary)               (Primary Lookup)         (Personal Jobs)
```

### Search Priority Flow

```typescript
// 1. Primary: batch_jobs (cached, fast, cost-effective)
const batchResults = await db.collection('batch_jobs')
  .where('isActive', '==', true)
  .where('searchQuery', 'in', relatedQueries)
  .get()

// 2. Fallback: Live API → jobs (real-time, costly)
if (batchResults.size < minThreshold) {
  const liveResults = await fetchFromSerpAPI(query)
  await saveJobsIfNotExist(liveResults, userId)
}

// 3. User Action: jobs → savedJobs (personalized)
if (userSavesJob) {
  const savedJob = await createSavedJob(job, userId, userResume)
  await db.collection('savedJobs').add(savedJob)
}
```

### Collection Performance Optimization

**Indexes**:
```typescript
// batch_jobs indexes
['isActive', 'searchQuery', 'postedDate']
['isActive', 'location', 'postedDate'] 
['batchId', 'isDuplicate', 'postedDate']

// jobs indexes  
['job_id']
['userId', 'seenAt']
['company', 'location']

// savedJobs indexes
['userId', 'savedAt']
['userId', 'status']
['userId', 'matchingScore']
```

**Query Patterns**:
```typescript
// Batch search (most common)
batch_jobs.where('isActive', '==', true)
          .where('searchQuery', 'in', queries)
          .limit(50)

// User's saved jobs
savedJobs.where('userId', '==', userId)
         .orderBy('savedAt', 'desc')

// Job deduplication
jobs.where('job_id', 'in', jobIds).limit(30)
```

### Data Lifecycle Management

**Batch Jobs Cleanup**:
```typescript
// Auto-expire after 30 days
const expiredJobs = await db.collection('batch_jobs')
  .where('batchCreatedAt', '<', thirtyDaysAgo)
  .get()

// Mark as inactive instead of deleting
await batch.update(docRef, { isActive: false })
```

**Jobs Collection Growth**:
- Grows incrementally with user activity
- No automatic cleanup (permanent storage)
- Deduplication prevents excessive growth

**Saved Jobs Management**:
- User-controlled (can delete anytime)
- Status updates for application tracking
- No automatic expiration

This three-tier collection system provides optimal balance between cost-effectiveness (batch_jobs), real-time capability (jobs), and user personalization (savedJobs).

## Search Flow

### Primary Search Path
```typescript
User Input 
    ↓
Enhanced Search Component (components/enhanced-job-search.tsx)
    ↓
Search-Enhanced API (/api/jobs/search-enhanced)
    ↓
Database Query (Firestore: batch_jobs collection)
    ↓
Check Results Threshold (minimum 10-20 jobs)
    ↓
[If Insufficient] → SerpAPI Fallback
    ↓
AI Enhancement (Multi-agent scoring)
    ↓
Return Results with Metrics
```

### Detailed Flow Steps

1. **User Input Processing**
   ```typescript
   interface SearchParams {
     query: string           // "software engineer"
     location: string        // "San Francisco"
     experienceLevel?: string[]
     jobType?: string[]
     workArrangement?: string[]
     companySize?: string[]
     salaryRange?: string
     datePosted?: string     // "today", "week", "month"
   }
   ```

2. **Database Query**
   ```typescript
   // Query cached batch jobs
   const batchJobs = await db.collection('batch_jobs')
     .where('isActive', '==', true)
     .where('searchQuery', 'in', relatedQueries)
     .where('location', 'in', expandedLocations)
     .orderBy('postedDate', 'desc')
     .limit(100)
     .get()
   ```

3. **Threshold Check**
   ```typescript
   const MIN_JOBS_THRESHOLD = 10
   const OPTIMAL_JOBS_THRESHOLD = 20
   
   if (batchJobs.size < MIN_JOBS_THRESHOLD) {
     // Trigger SerpAPI fallback
     const apiResults = await fetchFromSerpAPI(params)
     results = [...batchJobs, ...apiResults]
   }
   ```

## Database-First Strategy

### Batch Jobs Collection Schema
```typescript
interface BatchJob {
  // Identification
  jobId: string              // Unique hash of job details
  batchId: string            // Date of batch run (e.g., "2024-01-15")
  
  // Job Details
  title: string
  company: string
  location: string
  description: string
  
  // Search Metadata
  searchQuery: string        // Original search term
  searchLocation: string     // Original location query
  
  // Timestamps
  postedDate: Timestamp
  scrapedAt: Timestamp
  expiresAt: Timestamp       // Auto-cleanup after 30 days
  
  // Status
  isActive: boolean
  isDuplicate: boolean
  
  // Enhanced Data
  enhancedData?: {
    summary: string
    keyHighlights: string[]
    requirements: string[]
    benefits: string[]
  }
}
```

### Location Intelligence
```typescript
// Location expansion for better matching
const expandLocation = (location: string) => {
  const variations = []
  
  // Extract state from "City, State" format
  if (location.includes(',')) {
    const [city, state] = location.split(',')
    variations.push(city.trim(), state.trim())
  }
  
  // Add region mappings
  const regionMappings = {
    'San Francisco': ['Bay Area', 'SF', 'San Francisco Bay Area'],
    'New York': ['NYC', 'New York City', 'Manhattan'],
    'Los Angeles': ['LA', 'Greater Los Angeles']
  }
  
  return [...variations, ...(regionMappings[location] || [])]
}
```

## SerpAPI Integration

### API Configuration
```typescript
const SERPAPI_CONFIG = {
  engine: "google_jobs",
  api_key: process.env.SERPAPI_KEY,
  num: 20,                   // Results per page
  start: 0,                  // Pagination offset
  chips: "",                 // Date filters
  lrad: 50,                  // Location radius (miles)
}
```

### Fallback Logic
```typescript
async function fetchFromSerpAPI(params: SearchParams) {
  try {
    const results = await getJson({
      ...SERPAPI_CONFIG,
      q: params.query,
      location: params.location,
      chips: buildDateChips(params.datePosted),
    })
    
    // Transform and cache results
    const jobs = results.jobs_results?.map(transformSerpAPIJob)
    
    // Store in database for future queries
    await cacheJobsInDatabase(jobs)
    
    return jobs
  } catch (error) {
    console.error('SerpAPI fallback failed:', error)
    return []
  }
}
```

### Date Filter Mapping
```typescript
const DATE_FILTERS = {
  'today': 'date_posted:today',
  'week': 'date_posted:week',
  'month': 'date_posted:month',
  '3days': 'date_posted:3days'
}
```

## AI Enhancement Pipeline

### Multi-Agent Scoring System

The system employs 8 specialized AI agents to analyze job-candidate fit:

```typescript
const AI_AGENTS = {
  technical_skills: {
    weight: 0.25,
    focus: "Required technologies, programming languages, frameworks"
  },
  experience_level: {
    weight: 0.20,
    focus: "Years of experience, seniority alignment"
  },
  achievements: {
    weight: 0.15,
    focus: "Past accomplishments, impact metrics"
  },
  education: {
    weight: 0.10,
    focus: "Degree requirements, certifications"
  },
  soft_skills: {
    weight: 0.10,
    focus: "Communication, leadership, teamwork"
  },
  career_progression: {
    weight: 0.10,
    focus: "Growth potential, career trajectory"
  },
  comprehensive: {
    weight: 0.10,
    focus: "Overall fit and compatibility"
  }
}
```

### Scoring Process
```typescript
async function scoreJobWithMultiAgents(job: Job, resume: Resume) {
  const scores = await Promise.all([
    scoreTechnicalSkills(job, resume),
    scoreExperience(job, resume),
    scoreAchievements(job, resume),
    scoreEducation(job, resume),
    scoreSoftSkills(job, resume),
    scoreCareerProgression(job, resume),
    scoreComprehensive(job, resume)
  ])
  
  return {
    overall: calculateWeightedAverage(scores),
    breakdown: {
      skills: scores[0],
      experience: scores[1],
      achievements: scores[2],
      education: scores[3],
      softSkills: scores[4],
      careerGrowth: scores[5],
      comprehensive: scores[6]
    },
    recommendations: generateRecommendations(scores)
  }
}
```

### AI Summary Generation
```typescript
async function enhanceJobWithAI(job: Job) {
  return {
    ...job,
    aiSummary: await generateSummary(job.description),
    keyHighlights: await extractHighlights(job.description),
    requirements: await parseRequirements(job.description),
    benefits: await extractBenefits(job.description),
    techStack: await identifyTechnologies(job.description),
    estimatedSalary: await predictSalaryRange(job)
  }
}
```

## Batch Processing System

### Batch Configuration
```typescript
const BATCH_CONFIG = {
  schedule: "0 2 * * 1-5",    // 2 AM PST, Monday-Friday
  maxJobsPerQuery: 50,
  maxConcurrent: 5,
  timeout: 300000,             // 5 minutes per query
  retryAttempts: 3
}
```

### Popular Search Queries
```typescript
const POPULAR_QUERIES = [
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
  
  // Product & Design
  'product manager',
  'product designer',
  'ux designer',
  
  // ... 60+ total queries
]
```

### Batch Locations
```typescript
const BATCH_LOCATIONS = [
  'San Francisco Bay Area, CA',
  'New York, NY',
  'Seattle, WA',
  'Austin, TX',
  'Boston, MA',
  'Los Angeles, CA',
  'Chicago, IL',
  'Denver, CO',
  'Remote',
  'United States'
]
```

### Batch Processing Flow
```typescript
async function processBatchJobs() {
  const batchId = generateBatchId() // Format: YYYY-MM-DD
  const results = {
    totalJobs: 0,
    newJobs: 0,
    duplicates: 0,
    errors: []
  }
  
  for (const query of POPULAR_QUERIES) {
    for (const location of BATCH_LOCATIONS) {
      try {
        // Fetch jobs from SerpAPI
        const jobs = await fetchJobsFromAPI(query, location)
        
        // Deduplicate against existing jobs
        const newJobs = await deduplicateJobs(jobs)
        
        // Enhance with AI
        const enhancedJobs = await enhanceJobsWithAI(newJobs)
        
        // Store in database
        await storeJobsInBatch(enhancedJobs, batchId)
        
        results.totalJobs += jobs.length
        results.newJobs += newJobs.length
        results.duplicates += jobs.length - newJobs.length
        
      } catch (error) {
        results.errors.push({ query, location, error })
      }
    }
  }
  
  // Store batch run record
  await recordBatchRun(batchId, results)
  
  return results
}
```

## Advanced Filtering

### Filter Categories
```typescript
interface FilterOptions {
  experienceLevel: {
    entry: 'Entry Level',
    mid: 'Mid Level',
    senior: 'Senior Level',
    lead: 'Lead/Staff',
    principal: 'Principal/Distinguished'
  },
  
  jobType: {
    fullTime: 'Full-time',
    partTime: 'Part-time',
    contract: 'Contract',
    internship: 'Internship',
    temporary: 'Temporary'
  },
  
  workArrangement: {
    remote: 'Remote',
    hybrid: 'Hybrid',
    onsite: 'On-site'
  },
  
  companySize: {
    startup: '1-50 employees',
    small: '51-200 employees',
    medium: '201-1000 employees',
    large: '1001-5000 employees',
    enterprise: '5000+ employees'
  },
  
  salaryRange: {
    '0-50k': '$0 - $50,000',
    '50-100k': '$50,000 - $100,000',
    '100-150k': '$100,000 - $150,000',
    '150-200k': '$150,000 - $200,000',
    '200k+': '$200,000+'
  },
  
  datePosted: {
    today: 'Today',
    week: 'Past Week',
    month: 'Past Month'
  },
  
  skills: string[] // Dynamically extracted from job descriptions
}
```

### Dynamic Filter Generation
```typescript
async function generateFilters(jobs: Job[]) {
  const filters = {
    locations: new Set<string>(),
    skills: new Set<string>(),
    companies: new Set<string>(),
    experienceLevels: new Set<string>(),
    jobTypes: new Set<string>()
  }
  
  for (const job of jobs) {
    // Extract location
    filters.locations.add(job.location)
    
    // Extract skills from description
    const skills = extractSkills(job.description)
    skills.forEach(skill => filters.skills.add(skill))
    
    // Extract experience level
    const level = detectExperienceLevel(job.title, job.description)
    filters.experienceLevels.add(level)
    
    // Extract job type
    const type = detectJobType(job.description)
    filters.jobTypes.add(type)
  }
  
  return {
    locations: Array.from(filters.locations),
    skills: Array.from(filters.skills).slice(0, 20), // Top 20
    companies: Array.from(filters.companies),
    experienceLevels: Array.from(filters.experienceLevels),
    jobTypes: Array.from(filters.jobTypes)
  }
}
```

## Performance Optimizations

### Caching Strategies

1. **Database Caching**
   - Batch jobs cached for 30 days
   - Automatic cleanup of expired jobs
   - Indexed queries for fast retrieval

2. **Session Caching**
   ```typescript
   // Store search results in session
   req.session.searchResults = {
     query: params.query,
     results: jobs,
     timestamp: Date.now(),
     ttl: 3600000 // 1 hour
   }
   ```

3. **Filter Caching**
   ```typescript
   // Cache filter options per search
   const cacheKey = `filters:${query}:${location}`
   const cached = await redis.get(cacheKey)
   
   if (cached) {
     return JSON.parse(cached)
   }
   
   const filters = await generateFilters(jobs)
   await redis.set(cacheKey, JSON.stringify(filters), 'EX', 3600)
   ```

### Query Optimization

1. **Composite Indexes**
   ```typescript
   // Firestore composite indexes
   batch_jobs: [
     ['isActive', 'searchQuery', 'postedDate'],
     ['isActive', 'location', 'postedDate'],
     ['batchId', 'isDuplicate', 'postedDate']
   ]
   ```

2. **Parallel Processing**
   ```typescript
   // Parallel API calls for multiple locations
   const results = await Promise.all(
     locations.map(loc => fetchJobsForLocation(query, loc))
   )
   ```

3. **Result Limiting**
   ```typescript
   const MAX_RESULTS = 100
   const PAGE_SIZE = 20
   
   // Implement pagination
   const paginatedResults = results.slice(
     (page - 1) * PAGE_SIZE,
     page * PAGE_SIZE
   )
   ```

### Cost Optimization

1. **API Call Reduction**
   - Batch processing reduces API calls by ~90%
   - Smart fallback only when necessary
   - Weekend batch skip saves ~28% of costs

2. **Deduplication**
   ```typescript
   function generateJobHash(job: Job) {
     return crypto
       .createHash('md5')
       .update(`${job.company}:${job.title}:${job.location}`)
       .digest('hex')
   }
   ```

3. **Request Batching**
   ```typescript
   // Batch multiple searches into single API call
   const batchedQueries = queries.map(q => ({
     engine: 'google_jobs',
     q: q,
     location: location
   }))
   
   const results = await serpapi.batchSearch(batchedQueries)
   ```

## Metrics & Monitoring

### Search Metrics
```typescript
interface SearchMetrics {
  // Performance Metrics
  totalResults: number
  executionTime: number      // milliseconds
  
  // Source Metrics
  batchHits: number          // From database
  apiCalls: number           // From SerpAPI
  cacheHitRate: number       // Percentage
  
  // Enhancement Metrics
  aiEnhanced: number
  enhancementTime: number    // milliseconds
  
  // Cost Metrics
  estimatedCost: number      // Based on API calls
  savedByCaching: number     // Avoided API calls
}
```

### Batch Run Metrics
```typescript
interface BatchRunMetrics {
  batchId: string
  startTime: Date
  endTime: Date
  
  // Job Metrics
  totalJobs: number
  newJobs: number
  duplicates: number
  
  // Processing Metrics
  queriesProcessed: number
  queriesFailed: number
  
  // Performance
  executionTime: number
  averageQueryTime: number
  
  // Errors
  errors: Array<{
    query: string
    location: string
    error: string
  }>
}
```

### Monitoring Dashboard Features
- Real-time batch processing status
- API usage and cost tracking
- Cache hit rate visualization
- Error rate monitoring
- Search performance metrics
- Job freshness indicators

### Alert Thresholds
```typescript
const ALERT_THRESHOLDS = {
  apiErrorRate: 0.05,        // 5% error rate
  cacheHitRate: 0.70,        // Below 70% cache hits
  executionTime: 5000,       // Above 5 seconds
  batchFailureRate: 0.10,    // 10% batch failure
  dailyApiCalls: 10000,      // Daily limit warning
  monthlyBudget: 500         // Monthly cost alert
}
```

## API Endpoints Reference

### Search Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/jobs/search` | GET | Basic search with database-first approach | No |
| `/api/jobs/search-enhanced` | POST | Advanced search with filters | No |
| `/api/jobs/filters` | GET | Get available filter options | No |
| `/api/jobs/score-multi-agent` | POST | AI scoring for job-resume match | Yes |

### Batch Processing Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/batch/process` | POST | Process batch jobs | Admin |
| `/api/cron/batch-jobs` | GET | Scheduled batch trigger | No |
| `/api/cron/batch-jobs` | POST | Manual batch trigger | Admin |
| `/api/admin/batch-runs` | GET | Get batch run history | Admin |

## Configuration

### Environment Variables
```bash
# API Keys
SERPAPI_KEY=your_serpapi_key
OPENROUTER_API_KEY=your_openrouter_key

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
FIREBASE_SERVICE_ACCOUNT_KEY=your_service_account_json

# Batch Processing
BATCH_SCHEDULE="0 2 * * 1-5"  # 2 AM PST, weekdays
MAX_JOBS_PER_QUERY=50
BATCH_LOCATIONS="San Francisco,New York,Remote"
```

### Performance Tuning
```typescript
// config/search.ts
export const SEARCH_CONFIG = {
  minJobsThreshold: 10,
  optimalJobsThreshold: 20,
  maxResults: 100,
  pageSize: 20,
  cacheTimeout: 3600000,      // 1 hour
  batchJobsTTL: 2592000000,    // 30 days
  maxConcurrentRequests: 5,
  apiTimeout: 30000,           // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000            // 1 second
}
```

## Future Enhancements

### Planned Features
1. **Machine Learning Integration**
   - Personalized job recommendations
   - Salary prediction models
   - Application success probability

2. **Real-time Updates**
   - WebSocket job notifications
   - Live job status updates
   - Instant match alerts

3. **Advanced Analytics**
   - Job market trends
   - Skill demand analysis
   - Salary benchmarking

4. **Integration Expansions**
   - LinkedIn job integration
   - Indeed API integration
   - Company review aggregation

5. **Performance Improvements**
   - Redis caching layer
   - GraphQL API option
   - Edge computing for filters

## Troubleshooting

### Common Issues

1. **Insufficient Search Results**
   - Check batch job processing status
   - Verify SerpAPI key validity
   - Review location matching logic

2. **Slow Search Performance**
   - Monitor database query performance
   - Check cache hit rates
   - Review API response times

3. **Batch Processing Failures**
   - Verify cron schedule configuration
   - Check API rate limits
   - Review error logs in batch_runs

4. **AI Enhancement Errors**
   - Validate OpenRouter API key
   - Check token limits
   - Review prompt templates

## Support & Maintenance

### Regular Maintenance Tasks
- Monitor API usage and costs daily
- Review batch processing logs weekly
- Update popular search queries monthly
- Clean expired batch jobs monthly
- Analyze search metrics quarterly

### Debugging Commands
```bash
# Check batch processing status
curl https://myjob.ai-biz.app/api/admin/batch-runs \
  -H "Authorization: Bearer YOUR_TOKEN"

# Trigger manual batch run (dry run)
curl -X POST https://myjob.ai-biz.app/api/cron/batch-jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'

# Test search without caching
curl "https://myjob.ai-biz.app/api/jobs/search?q=software+engineer&location=San+Francisco&noCache=true"
```

