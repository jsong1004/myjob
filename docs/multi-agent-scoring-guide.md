# Multi-Agent Job Scoring Integration Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Quick Start](#quick-start)
3. [Understanding the System](#understanding-the-system)
4. [Integration Steps](#integration-steps)
5. [Activity Monitoring](#activity-monitoring)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [Cost Optimization](#cost-optimization)

## Introduction

The Multi-Agent Job Scoring System uses 9 specialized AI agents to provide comprehensive job matching analysis. This guide will help you integrate and use the system effectively while maintaining accurate token tracking and cost control.

### Key Benefits
- **Comprehensive Analysis**: 8 specialized agents analyze different aspects
- **Accurate Scoring**: Multi-perspective evaluation for better matches
- **Transparent Costs**: Individual agent activity tracking
- **Performance Insights**: Detailed metrics for optimization

## Quick Start

### Basic Usage

```typescript
// Import the scoring function
import { executeMultiAgentJobScoring } from '@/lib/prompts/api-helpers'

// Score a single job
const scoredJobs = await executeMultiAgentJobScoring({
  jobs: [{
    id: 'job123',
    title: 'Senior Software Engineer',
    company: 'TechCorp',
    description: 'We are looking for...',
    // ... other job fields
  }],
  resume: 'John Doe\nSoftware Engineer\n...',
  userId: 'user123' // Important for activity tracking!
})

// Access the results
const job = scoredJobs[0]
console.log(`Match Score: ${job.matchingScore}%`)
console.log(`Summary: ${job.matchingSummary}`)
console.log(`Token Usage: ${job.enhancedScoreDetails.usage.totalTokens}`)
```

### API Endpoints

```typescript
// Multi-agent scoring endpoint
POST /api/jobs/score-multi-agent
{
  "jobs": [...],      // Array of jobs to score
  "resume": "..."     // Resume content
}

// General scoring endpoint (supports multi-agent)
POST /api/jobs/score?multiAgent=true
{
  "jobs": [...],
  "resume": "...",
  "multiAgent": true  // Enable multi-agent scoring
}
```

## Understanding the System

### Architecture Overview

```
User Request
    ↓
Job Scoring API
    ↓
Multi-Agent Engine
    ├── Technical Skills Agent (≈3,320 tokens)
    ├── Experience Depth Agent (≈3,307 tokens)
    ├── Achievements Agent (≈3,330 tokens)
    ├── Education Agent (≈3,297 tokens)
    ├── Soft Skills Agent (≈3,330 tokens)
    ├── Career Progression Agent (≈3,314 tokens)
    ├── Strengths Agent (≈3,315 tokens)
    ├── Weaknesses Agent (≈3,366 tokens)
    └── Orchestration Agent (≈6,446 tokens)
         ↓
    Activity Logger
    ├── 9 individual agent activities
    └── 1 summary activity
         ↓
    Score Results + Token Tracking
```

### Token Usage Breakdown

Total tokens per job: **≈29,925 tokens**

| Agent | Purpose | Typical Tokens |
|-------|---------|----------------|
| Technical Skills | Evaluates technical competencies | 3,320 |
| Experience Depth | Assesses years and relevance | 3,307 |
| Achievements | Analyzes quantifiable results | 3,330 |
| Education | Reviews academic qualifications | 3,297 |
| Soft Skills | Evaluates communication, leadership | 3,330 |
| Career Progression | Analyzes growth trajectory | 3,314 |
| Strengths | Identifies top 5 strengths | 3,315 |
| Weaknesses | Identifies improvement areas | 3,366 |
| Orchestration | Combines all results | 6,446 |

## Integration Steps

### Step 1: Setup Authentication

```typescript
// Ensure user is authenticated
const authHeader = req.headers.get("authorization")
const token = authHeader?.replace("Bearer ", "")

if (!token) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

// Verify token and get userId
const decoded = await getAuth().verifyIdToken(token)
const userId = decoded.uid
```

### Step 2: Prepare Job Data

```typescript
// Format job data for scoring
const jobsToScore: JobSearchResult[] = jobs.map(job => ({
  id: job.id || generateId(),
  title: job.title,
  company: job.company,
  location: job.location || '',
  description: job.description,
  qualifications: job.qualifications || [],
  responsibilities: job.responsibilities || [],
  benefits: job.benefits || [],
  salary: job.salary || '',
  postedAt: job.postedAt || new Date().toISOString(),
  applyUrl: job.applyUrl || '',
  source: job.source || 'manual',
  matchingScore: 0, // Will be calculated
  matchingSummary: '', // Will be generated
  summary: job.summary || job.description
}))
```

### Step 3: Execute Scoring

```typescript
try {
  const startTime = Date.now()
  
  // Execute multi-agent scoring
  const scoredJobs = await executeMultiAgentJobScoring({
    jobs: jobsToScore,
    resume: resumeContent,
    userId // Pass userId for activity tracking
  })
  
  const executionTime = Date.now() - startTime
  console.log(`Scoring completed in ${executionTime}ms`)
  
  // Process results
  scoredJobs.forEach(job => {
    console.log(`${job.title}: ${job.matchingScore}%`)
  })
  
} catch (error) {
  console.error('Scoring failed:', error)
  // Handle error appropriately
}
```

### Step 4: Access Enhanced Details

```typescript
// Access comprehensive scoring details
const job = scoredJobs[0]
const details = job.enhancedScoreDetails

// Overall assessment
console.log(`Score: ${details.overallScore}%`)
console.log(`Category: ${details.category}`)
console.log(`Recommendation: ${details.hiringRecommendation}`)

// Detailed breakdown
Object.entries(details.breakdown).forEach(([category, data]) => {
  console.log(`${category}: ${data.score}% - ${data.reasoning}`)
})

// Key insights
console.log('Strengths:', details.keyStrengths)
console.log('Weaknesses:', details.keyWeaknesses)
console.log('Red Flags:', details.redFlags)

// Token usage
console.log(`Total Tokens: ${details.usage.totalTokens}`)
console.log(`Cost: $${details.usage.estimatedCost}`)
```

## Activity Monitoring

### Understanding Activity Logs

The system creates multiple activity records for transparency:

```typescript
// 1. Individual agent activities (9 total)
{
  activityType: 'job_scoring_agent',
  tokenUsage: 3320,
  metadata: {
    agent_type: 'technicalSkills',
    job_title: 'Senior Developer',
    execution_time_ms: 2456,
    cache_hit_rate: '0%',
    estimated_cost: 0.00066
  }
}

// 2. Summary activity (1 total)
{
  activityType: 'job_scoring_summary',
  tokenUsage: 0, // Individual activities track usage
  metadata: {
    jobs_scored: 1,
    agent_count: 9,
    total_tokens_used: 29925,
    note: 'Individual agent activities logged separately'
  }
}
```

### Querying Activities

```typescript
// Get all activities for a user
const activities = await db.collection('activities')
  .where('userId', '==', userId)
  .where('activityType', 'in', ['job_scoring_agent', 'job_scoring_summary'])
  .orderBy('createdAt', 'desc')
  .get()

// Calculate total tokens by agent
const tokensByAgent = new Map()
activities.forEach(doc => {
  const data = doc.data()
  if (data.activityType === 'job_scoring_agent') {
    const agent = data.metadata.agent_type
    const current = tokensByAgent.get(agent) || 0
    tokensByAgent.set(agent, current + data.tokenUsage)
  }
})

// Find most expensive agents
const sorted = Array.from(tokensByAgent.entries())
  .sort((a, b) => b[1] - a[1])
console.log('Most expensive agents:', sorted.slice(0, 3))
```

### Admin Dashboard Integration

```typescript
// Display activities in admin panel
function renderActivities(activities) {
  return activities.map(activity => {
    if (activity.activityType === 'job_scoring_agent') {
      return {
        type: `Agent: ${activity.metadata.agent_type}`,
        tokens: activity.tokenUsage,
        cost: `$${activity.metadata.estimated_cost}`,
        time: `${activity.metadata.execution_time_ms}ms`,
        cache: activity.metadata.cache_hit_rate
      }
    } else if (activity.activityType === 'job_scoring_summary') {
      return {
        type: 'Multi-Agent Summary',
        tokens: activity.metadata.total_tokens_used,
        agents: activity.metadata.agent_count,
        jobs: activity.metadata.jobs_scored
      }
    }
  })
}
```

## Best Practices

### 1. Always Pass User ID

```typescript
// ✅ GOOD - Enables accurate activity tracking
const scored = await executeMultiAgentJobScoring({
  jobs,
  resume,
  userId: authenticatedUser.uid
})

// ❌ BAD - Activities logged as 'system'
const scored = await executeMultiAgentJobScoring({
  jobs,
  resume
})
```

### 2. Handle Errors Gracefully

```typescript
try {
  const scored = await executeMultiAgentJobScoring(request)
} catch (error) {
  // Check if it's a token limit error
  if (error.message.includes('token limit')) {
    // Fall back to basic scoring
    const basicScored = await executeJobScoring(request)
  } else {
    // Log and handle other errors
    console.error('Multi-agent scoring failed:', error)
  }
}
```

### 3. Batch Jobs Efficiently

```typescript
// ✅ GOOD - Process multiple jobs in one request
const allScored = await executeMultiAgentJobScoring({
  jobs: [job1, job2, job3], // Process together
  resume,
  userId
})

// ❌ BAD - Multiple requests waste tokens
for (const job of jobs) {
  const scored = await executeMultiAgentJobScoring({
    jobs: [job], // Inefficient!
    resume,
    userId
  })
}
```

### 4. Cache Results

```typescript
// Implement result caching for identical job/resume pairs
const cacheKey = `scoring:${userId}:${job.id}:${resumeHash}`
const cached = await cache.get(cacheKey)

if (cached) {
  return cached
}

const scored = await executeMultiAgentJobScoring({ jobs, resume, userId })
await cache.set(cacheKey, scored, { ttl: 3600 }) // 1 hour cache
```

## Troubleshooting

### Common Issues and Solutions

#### 1. High Token Usage

**Problem**: Token usage exceeds expectations

**Solution**:
```typescript
// Monitor individual agent usage
const highUsageAgents = activities
  .filter(a => a.tokenUsage > 4000)
  .map(a => a.metadata.agent_type)

console.log('High usage agents:', highUsageAgents)

// Consider using enhanced scoring for less critical jobs
const scoring = job.priority === 'high' 
  ? executeMultiAgentJobScoring 
  : executeEnhancedJobScoring
```

#### 2. Missing Activities

**Problem**: Activities not appearing in logs

**Solution**:
```typescript
// Verify userId is passed correctly
console.log('Scoring with userId:', userId)

// Check activity logger
const recentActivities = await db.collection('activities')
  .where('userId', '==', userId)
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get()

console.log('Recent activities:', recentActivities.size)
```

#### 3. Slow Performance

**Problem**: Multi-agent scoring takes too long

**Solution**:
```typescript
// Implement timeout handling
const scoringPromise = executeMultiAgentJobScoring(request)
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Timeout')), 60000)
)

try {
  const scored = await Promise.race([scoringPromise, timeoutPromise])
} catch (error) {
  if (error.message === 'Timeout') {
    // Use cached or basic scoring
  }
}
```

## Cost Optimization

### 1. Token Usage Analysis

```typescript
// Analyze token usage patterns
async function analyzeTokenUsage(userId: string, days: number = 7) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const activities = await db.collection('activities')
    .where('userId', '==', userId)
    .where('createdAt', '>=', startDate)
    .where('activityType', '==', 'job_scoring_agent')
    .get()
  
  const stats = {
    totalTokens: 0,
    totalCost: 0,
    byAgent: {},
    avgPerJob: 0
  }
  
  activities.forEach(doc => {
    const data = doc.data()
    stats.totalTokens += data.tokenUsage
    stats.totalCost += data.metadata.estimated_cost || 0
    
    const agent = data.metadata.agent_type
    stats.byAgent[agent] = (stats.byAgent[agent] || 0) + data.tokenUsage
  })
  
  return stats
}
```

### 2. Implement Usage Limits

```typescript
// Check user's token usage before scoring
async function checkTokenLimit(userId: string) {
  const usage = await getUserTokenUsage(userId)
  const limit = await getUserTokenLimit(userId)
  
  if (usage.month >= limit.month) {
    throw new Error('Monthly token limit exceeded')
  }
  
  // Warn if approaching limit
  if (usage.month > limit.month * 0.8) {
    console.warn(`User ${userId} at 80% of token limit`)
  }
}
```

### 3. Optimize Agent Selection

```typescript
// Conditionally execute agents based on job type
async function optimizedScoring(job: JobSearchResult, resume: string) {
  const agents = ['technicalSkills', 'experienceDepth'] // Always run
  
  // Add agents based on job requirements
  if (job.description.includes('leadership')) {
    agents.push('softSkills', 'achievements')
  }
  
  if (job.description.includes('degree required')) {
    agents.push('education')
  }
  
  // Execute only selected agents
  return await executeSelectedAgents(agents, job, resume)
}
```

### 4. Monitor Cache Performance

```typescript
// Track cache hit rates
const cacheStats = activities
  .filter(a => a.activityType === 'job_scoring_agent')
  .reduce((stats, activity) => {
    const rate = parseFloat(activity.metadata.cache_hit_rate)
    stats.total++
    stats.totalRate += rate
    if (rate > 0) stats.hits++
    return stats
  }, { total: 0, hits: 0, totalRate: 0 })

console.log(`Cache Performance: ${(cacheStats.hits / cacheStats.total * 100).toFixed(1)}% requests with cache hits`)
console.log(`Average Cache Hit Rate: ${(cacheStats.totalRate / cacheStats.total).toFixed(1)}%`)
```

## Advanced Features

### Custom Agent Configuration

```typescript
// Future feature: Configure agent parameters
const customConfig = {
  agents: {
    technicalSkills: {
      enabled: true,
      maxTokens: 1000,
      temperature: 0.7
    },
    education: {
      enabled: job.requiresDegree,
      maxTokens: 800
    }
  }
}
```

### Real-time Monitoring

```typescript
// Stream activity updates
const unsubscribe = db.collection('activities')
  .where('userId', '==', userId)
  .where('activityType', '==', 'job_scoring_agent')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const activity = change.doc.data()
        console.log(`New agent activity: ${activity.metadata.agent_type} - ${activity.tokenUsage} tokens`)
      }
    })
  })
```

## Conclusion

The Multi-Agent Job Scoring System provides comprehensive job matching analysis with transparent token tracking. By following this guide, you can effectively integrate the system while maintaining cost control and performance optimization.

Key takeaways:
- Always pass userId for proper activity attribution
- Monitor individual agent performance for optimization
- Use caching strategies to reduce costs
- Handle errors gracefully with fallback options
- Analyze usage patterns for continuous improvement

For additional support, refer to the [API Documentation](../lib/prompts/multi-agent-token-tracking.md) or contact the development team.