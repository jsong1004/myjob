# Multi-Agent Token Tracking System

## Overview

The Multi-Agent Token Tracking System provides accurate, granular tracking of OpenRouter API usage across the multi-agent job scoring system. Instead of aggregating token usage into a single activity, each AI agent's API call is logged separately, providing precise cost monitoring and usage analytics.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                   Multi-Agent Scoring                     │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Technical   │  │ Experience  │  │Achievements │ ... │
│  │   Skills    │  │   Depth     │  │   Agent     │     │
│  │   Agent     │  │   Agent     │  │             │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                 │                 │            │
│         ▼                 ▼                 ▼            │
│  ┌─────────────────────────────────────────────────┐    │
│  │          Individual Activity Logging             │    │
│  │  - job_scoring_agent (3,300 tokens each)       │    │
│  │  - Detailed metadata per agent                  │    │
│  └─────────────────────────────────────────────────┘    │
│                           │                              │
│                           ▼                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │         Orchestration Agent (6,400 tokens)       │    │
│  └─────────────────────────────────────────────────┘    │
│                           │                              │
│                           ▼                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │    Summary Activity (0 tokens, metadata only)    │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Agent Types

The system consists of 8 specialized scoring agents plus 1 orchestration agent:

1. **Technical Skills Agent** - Evaluates technical competencies
2. **Experience Depth Agent** - Assesses professional experience
3. **Achievements Agent** - Analyzes quantifiable accomplishments
4. **Education Agent** - Reviews educational qualifications
5. **Soft Skills Agent** - Evaluates interpersonal capabilities
6. **Career Progression Agent** - Analyzes career trajectory
7. **Strengths Agent** - Identifies top capabilities
8. **Weaknesses Agent** - Identifies areas for improvement
9. **Orchestration Agent** - Combines and synthesizes all results

## Token Usage Patterns

### Typical Token Consumption

```typescript
// Individual Scoring Agents
Technical Skills:    ~3,320 tokens
Experience Depth:    ~3,307 tokens
Achievements:        ~3,330 tokens
Education:          ~3,297 tokens
Soft Skills:        ~3,330 tokens
Career Progression: ~3,314 tokens
Strengths:          ~3,315 tokens
Weaknesses:         ~3,366 tokens

// Orchestration
Orchestration Agent: ~6,446 tokens

// Total per job scoring: ~29,925 tokens
```

### Activity Types

```typescript
type ActivityType = 
  | 'job_scoring_agent'    // Individual agent API calls
  | 'job_scoring_summary'  // Multi-agent operation summary
  | 'job_scoring'          // Standard (enhanced/basic) scoring
```

## API Reference

### Core Functions

#### `calculateMultiAgentScore`

Main entry point for multi-agent job scoring with token tracking.

```typescript
export async function calculateMultiAgentScore(
  candidateData: { resume: string },
  jobData: JobSearchResult,
  openRouterApiKey: string,
  userId?: string
): Promise<MultiAgentScoreResult>
```

**Parameters:**
- `candidateData` - Object containing the candidate's resume
- `jobData` - Job information to score against
- `openRouterApiKey` - API key for OpenRouter
- `userId` - Optional user ID for activity attribution

**Returns:** `MultiAgentScoreResult` with usage data

#### `executeAgent`

Executes a single agent with activity logging.

```typescript
async function executeAgent(
  agentType: AgentType,
  candidateData: { resume: string },
  jobData: JobSearchResult,
  openRouterApiKey: string,
  userId?: string
): Promise<AgentResult>
```

**Features:**
- Automatic activity logging for each API call
- Detailed token usage tracking
- Error handling with fallback scoring

### Data Types

#### `AgentResult`

```typescript
export interface AgentResult {
  agentType: string
  result: any
  executedAt: string
  executionTime?: number
  usage?: {
    totalTokens: number
    promptTokens: number
    completionTokens: number
    cachedTokens: number
    estimatedCost: number
    costSavings: number
  }
}
```

#### `MultiAgentScoreResult`

```typescript
export interface MultiAgentScoreResult extends OrchestrationResult {
  agentResults: AgentResults
  processedAt: string
  totalProcessingTime: number
  usage?: {
    totalTokens: number
    promptTokens: number
    completionTokens: number
    cachedTokens: number
    estimatedCost: number
    costSavings: number
  }
}
```

## Activity Logging

### Individual Agent Activities

Each agent logs its activity separately with comprehensive metadata:

```typescript
await logActivity({
  userId: userId || 'system',
  activityType: 'job_scoring_agent',
  tokenUsage: response.usage.totalTokens,
  timeTaken: executionTime / 1000,
  metadata: {
    model: 'openai/gpt-4o-mini',
    agent_type: agentType,
    job_title: jobData.title,
    job_company: jobData.company,
    execution_time_ms: executionTime,
    prompt_tokens: response.usage.promptTokens,
    completion_tokens: response.usage.completionTokens,
    cached_tokens: response.usage.cachedTokens || 0,
    cache_hit_rate: calculateCacheHitRate(response.usage),
    estimated_cost: response.usage.estimatedCost || 0,
    cost_savings: response.usage.costSavings || 0,
    scoring_context: 'multi_agent_individual',
    agent_execution: true
  }
})
```

### Summary Activities

Summary activities provide operation-level metadata without token counts:

```typescript
await logActivity({
  userId,
  activityType: 'job_scoring_summary',
  tokenUsage: 0, // Individual agents track actual usage
  timeTaken: executionTime / 1000,
  metadata: {
    model: 'multi-agent-system',
    jobs_scored: jobs.length,
    scoring_type: 'multi-agent',
    summary_activity: true,
    agent_count: 9,
    total_tokens_used: totalTokenUsage,
    note: 'Individual agent activities logged separately'
  }
})
```

## Usage Examples

### Basic Multi-Agent Scoring

```typescript
import { executeMultiAgentJobScoring } from '@/lib/prompts/api-helpers'

// Score jobs using multi-agent system
const scoredJobs = await executeMultiAgentJobScoring({
  jobs: jobsArray,
  resume: resumeContent,
  userId: currentUserId
})

// Access token usage data
const totalTokens = scoredJobs[0].enhancedScoreDetails?.usage?.totalTokens
```

### Monitoring Token Usage

```typescript
// Query activities for a specific user
const activities = await getActivities({
  userId: userId,
  activityType: 'job_scoring_agent'
})

// Calculate total tokens by agent type
const tokensByAgent = activities.reduce((acc, activity) => {
  const agentType = activity.metadata.agent_type
  acc[agentType] = (acc[agentType] || 0) + activity.tokenUsage
  return acc
}, {})
```

## Best Practices

### 1. User Attribution

Always pass `userId` through the scoring chain:

```typescript
// ✅ Good - User activities properly attributed
const scored = await executeMultiAgentJobScoring({
  jobs,
  resume,
  userId: authenticatedUserId
})

// ❌ Bad - Activities logged as 'system'
const scored = await executeMultiAgentJobScoring({
  jobs,
  resume
})
```

### 2. Error Handling

The system includes fallback scoring for failed agents:

```typescript
// Agents automatically fall back to conservative scores on failure
// Check metadata for fallback indicators
if (activity.metadata.fallback) {
  console.warn(`Agent ${activity.metadata.agent_type} used fallback scoring`)
}
```

### 3. Cost Monitoring

Monitor costs using activity metadata:

```typescript
// Calculate daily costs
const dailyCost = activities
  .filter(a => isToday(a.createdAt))
  .reduce((sum, a) => sum + (a.metadata.estimated_cost || 0), 0)
```

## Migration from Aggregated Logging

### Previous System (Aggregated)
- Single activity with total tokens
- Less visibility into individual agent performance
- Difficult to identify high-cost agents

### New System (Individual)
- Separate activity per agent
- Detailed performance metrics
- Precise cost attribution

### Admin Activities View

```
Before:
- job_scoring | 7,692 tokens (incorrect aggregation)

After:
- job_scoring_agent | technicalSkills | 3,320 tokens
- job_scoring_agent | experienceDepth | 3,307 tokens
- job_scoring_agent | achievements | 3,330 tokens
- ... (6 more agents)
- job_scoring_agent | orchestration | 6,446 tokens
- job_scoring_summary | 0 tokens (metadata only)
```

## Troubleshooting

### Common Issues

1. **Missing Agent Activities**
   - Ensure userId is passed through all functions
   - Check agent execution logs for errors
   - Verify OpenRouter API key is valid

2. **Zero Token Usage**
   - Check if response.usage is populated
   - Verify prompt execution succeeded
   - Review agent fallback logs

3. **High Token Usage**
   - Monitor individual agent consumption
   - Optimize prompts for efficiency
   - Consider caching strategies

### Debug Logging

Enable detailed logging:

```typescript
// Agent execution
console.log(`🤖 [${agentType}] Starting agent execution...`)
console.log(`✅ [${agentType}] Agent completed in ${executionTime}ms`)
console.log(`💰 [${agentType}] Agent activity logged: ${tokens} tokens`)

// Orchestration
console.log(`🎭 [Orchestration] Starting result combination...`)
console.log(`💰 [Usage] Aggregated: ${totalTokens} tokens`)
```

## Performance Optimization

### Token Reduction Strategies

1. **Prompt Optimization**
   - Use focused, specific prompts per agent
   - Limit response tokens with maxTokens parameter
   - Remove redundant context between agents

2. **Caching**
   - OpenRouter caching reduces repeat costs
   - Monitor cache_hit_rate in activities
   - Reuse scoring for identical job/resume pairs

3. **Selective Agent Execution**
   - Skip agents based on job requirements
   - Implement conditional agent activation
   - Use basic scoring for low-priority jobs

### Monitoring Metrics

Track these key metrics:
- Average tokens per agent
- Cache hit rates by agent type
- Total cost per job scored
- Agent execution times
- Fallback frequency

## Future Enhancements

1. **Dynamic Agent Selection**
   - Enable/disable agents based on job type
   - Adaptive token limits per agent
   - Priority-based agent execution

2. **Advanced Caching**
   - Resume embedding caching
   - Job description analysis caching
   - Cross-user similarity matching

3. **Cost Controls**
   - Per-user token budgets
   - Real-time cost alerts
   - Automatic fallback to basic scoring

4. **Analytics Dashboard**
   - Agent performance visualization
   - Cost trend analysis
   - Token usage patterns