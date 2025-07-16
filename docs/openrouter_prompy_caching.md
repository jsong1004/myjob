p# OpenRouter Prompt Caching for Multi-User Applications

OpenRouter implements automatic prompt caching for GPT-4o mini that requires no special configuration, offering 25-50% cost savings on cached tokens with a minimum threshold of 1,024 tokens. The system provides user-specific cache isolation through the `user` parameter and maintains caches for 5-10 minutes of inactivity, making it ideal for multi-user applications like resume analysis services.

## Automatic caching with zero configuration

OpenRouter's implementation of GPT-4o mini caching follows OpenAI's native approach exactly - no headers, parameters, or special configuration required. When your prompt exceeds **1,024 tokens**, caching activates automatically. The system caches prompts in 128-token increments beyond this threshold, ensuring efficient reuse of common prompt prefixes.

The caching mechanism works through intelligent provider routing. OpenRouter makes "best-effort" attempts to route requests from the same user to the same provider, maintaining warm caches while ensuring reliability through automatic fallback to alternative providers when needed. This approach balances cache efficiency with service availability.

**Key configuration details:**
- **Minimum prompt size**: 1,024 tokens
- **Cache increments**: 128-token blocks  
- **Cache duration**: 5-10 minutes of inactivity
- **Maximum lifetime**: 1 hour absolute maximum
- **Scope**: Organization-level caching

## Multi-user isolation through strategic user tracking

User isolation represents a critical aspect of OpenRouter's multi-user caching architecture. The system provides cache isolation through the `user` parameter in API requests, accepting any stable string identifier that represents your end-user.

```javascript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        user: `user_${userId}`,  // Critical for cache isolation
        messages: [
            {
                role: 'system',
                content: 'You are a resume analysis assistant...' 
            },
            {
                role: 'user',
                content: resumeText
            }
        ],
        usage: { include: true }  // Enable usage tracking
    })
});
```

The user parameter ensures that:
- Each user's cache remains isolated from others
- Requests from the same user route to the same provider when possible
- Cache hits are specific to the user who originally generated them
- Load balancing distributes different users across providers

**Best practices for user identifiers include using stable, anonymized IDs like `user_12345` or `session_xyz789` rather than personally identifiable information**. Avoid random or timestamp-based identifiers that change between requests, as these prevent effective cache utilization.

## Cost structure delivers significant savings

OpenRouter's caching pricing for GPT-4o mini provides substantial cost reductions without additional configuration complexity. The system charges nothing for cache writes while cache reads cost 50-75% of original input token pricing.

**Pricing breakdown for GPT-4o mini:**
- **Base input cost**: $0.15/M tokens
- **Cached input cost**: $0.075-0.1125/M tokens (50-75% of base)
- **Cache write cost**: Free
- **Output cost**: $0.60/M tokens (unaffected by caching)

For a typical resume analysis with 2,000 input tokens where 1,500 tokens are cached:
- Without caching: 2,000 × $0.15/M = $0.30
- With caching: 500 × $0.15/M + 1,500 × $0.075/M = $0.1875
- **Savings**: 37.5% reduction in input costs

The response includes detailed usage accounting when you set `usage: { include: true }`:
```json
{
    "usage": {
        "prompt_tokens": 2000,
        "completion_tokens": 150,
        "cached_tokens": 1500,
        "cache_discount": 0.375
    }
}
```

## Implementation patterns optimize cache efficiency

Structuring prompts correctly maximizes cache hit rates in multi-user scenarios. The key principle involves placing static content at the beginning and dynamic, user-specific content at the end.

**Python implementation with optimized structure:**
```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="your-openrouter-api-key"
)

def analyze_resume(user_id: str, resume_text: str):
    # Static instructions cached across all users
    static_instructions = """
    You are an expert resume analyzer. Evaluate resumes based on:
    1. Clarity and structure
    2. Quantifiable achievements
    3. Relevant skills alignment
    4. Professional formatting
    5. Grammar and language quality
    
    Provide detailed feedback in these categories...
    [Additional 500+ tokens of instructions]
    """
    
    response = client.chat.completions.create(
        model="openai/gpt-4o-mini",
        user=f"resume_analyzer_{user_id}",
        messages=[
            {
                "role": "system",
                "content": static_instructions  # Cached portion
            },
            {
                "role": "user",
                "content": f"Analyze this resume:\n\n{resume_text}"  # Variable portion
            }
        ],
        usage={"include": True}
    )
    
    return response
```

**TypeScript implementation for Next.js applications:**
```typescript
// app/api/analyze-resume/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const RESUME_ANALYSIS_PROMPT = `
You are an expert resume analyzer with 15 years of recruiting experience.
[... 1000+ tokens of detailed instructions ...]
`;

export async function POST(request: NextRequest) {
    const { userId, resumeContent } = await request.json();
    
    const client = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY
    });
    
    try {
        const response = await client.chat.completions.create({
            model: 'openai/gpt-4o-mini',
            user: `resume_service_${userId}`,
            messages: [
                {
                    role: 'system',
                    content: RESUME_ANALYSIS_PROMPT  // Cached
                },
                {
                    role: 'user',
                    content: `Please analyze the following resume:\n\n${resumeContent}`
                }
            ],
            usage: { include: true }
        });
        
        const usage = response.usage;
        console.log(`Cache hit rate: ${(usage.cached_tokens / usage.prompt_tokens * 100).toFixed(1)}%`);
        
        return NextResponse.json({
            analysis: response.choices[0].message.content,
            usage: {
                totalTokens: usage.total_tokens,
                cachedTokens: usage.cached_tokens,
                costSavings: usage.cache_discount
            }
        });
    } catch (error) {
        console.error('OpenRouter API error:', error);
        return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }
}
```

## Rate limiting requires application-level management

OpenRouter governs capacity globally, meaning rate limits apply at the account level rather than per-user. For multi-user applications, you must implement your own rate limiting logic.

**Rate limit considerations:**
- Standard models: No documented hard limits, but subject to fair use
- Free models (`:free` suffix): 20 requests/minute, 50-1000 requests/day based on credits
- Limits shared across all users under single API key
- DDoS protection via Cloudflare for extreme usage patterns

**Application-level rate limiting implementation:**
```javascript
class RateLimiter {
    constructor() {
        this.userRequests = new Map();
        this.windowMs = 60000; // 1 minute
        this.maxRequestsPerUser = 10;
    }
    
    async checkLimit(userId) {
        const now = Date.now();
        const userHistory = this.userRequests.get(userId) || [];
        
        // Remove old requests outside window
        const recentRequests = userHistory.filter(
            timestamp => now - timestamp < this.windowMs
        );
        
        if (recentRequests.length >= this.maxRequestsPerUser) {
            throw new Error('Rate limit exceeded for user');
        }
        
        recentRequests.push(now);
        this.userRequests.set(userId, recentRequests);
        
        return true;
    }
}

const limiter = new RateLimiter();

// Use in your API endpoint
app.post('/api/analyze', async (req, res) => {
    try {
        await limiter.checkLimit(req.userId);
        // Proceed with OpenRouter request
    } catch (error) {
        res.status(429).json({ error: 'Too many requests' });
    }
});
```

## Monitoring delivers actionable cache insights

OpenRouter provides comprehensive monitoring capabilities through multiple channels, enabling detailed analysis of cache performance and cost optimization opportunities.

**Real-time usage tracking provides immediate feedback:**
```javascript
const trackCachePerformance = (response) => {
    const usage = response.usage;
    const metrics = {
        promptTokens: usage.prompt_tokens,
        cachedTokens: usage.cached_tokens,
        cacheHitRate: (usage.cached_tokens / usage.prompt_tokens * 100).toFixed(1),
        costSavings: usage.cache_discount,
        estimatedSavings: (usage.cached_tokens * 0.075 / 1000000).toFixed(4) // in dollars
    };
    
    console.log('Cache Performance:', metrics);
    
    // Send to your analytics system
    analytics.track('cache_performance', {
        userId: response.user,
        ...metrics
    });
};
```

**Multi-user analytics implementation:**
```python
import logging
from datetime import datetime

class CacheAnalytics:
    def __init__(self):
        self.user_stats = {}
        
    def log_request(self, user_id: str, response: dict):
        usage = response.get('usage', {})
        
        if user_id not in self.user_stats:
            self.user_stats[user_id] = {
                'total_requests': 0,
                'cache_hits': 0,
                'total_tokens': 0,
                'cached_tokens': 0,
                'total_savings': 0
            }
        
        stats = self.user_stats[user_id]
        stats['total_requests'] += 1
        stats['total_tokens'] += usage.get('prompt_tokens', 0)
        
        cached = usage.get('cached_tokens', 0)
        if cached > 0:
            stats['cache_hits'] += 1
            stats['cached_tokens'] += cached
            stats['total_savings'] += usage.get('cache_discount', 0)
        
        # Calculate metrics
        hit_rate = (stats['cache_hits'] / stats['total_requests']) * 100
        token_cache_rate = (stats['cached_tokens'] / stats['total_tokens']) * 100
        
        logging.info(f"User {user_id}: Hit rate: {hit_rate:.1f}%, "
                    f"Token cache rate: {token_cache_rate:.1f}%, "
                    f"Total savings: ${stats['total_savings']:.2f}")
```

**Available monitoring channels include:**
- **Activity Dashboard**: Web interface showing usage by user ID
- **Generation API**: Retrieve detailed metrics using generation IDs
- **CSV Exports**: Bulk data export for analysis
- **Real-time tracking**: Immediate feedback via usage parameter

## Comparing OpenRouter and OpenAI implementations

While OpenRouter implements OpenAI's caching mechanism faithfully, several key differences affect multi-user applications:

**OpenRouter advantages:**
- Access to 300+ models through single API
- Automatic provider fallback for reliability
- User-specific sticky routing for cache optimization
- No additional configuration complexity

**OpenAI direct advantages:**
- Consistent 50% discount (vs 25-50% on OpenRouter)
- More predictable caching behavior
- Direct provider relationship
- Potentially lower latency

**For multi-user resume analysis services**, OpenRouter's advantages in reliability and automatic fallback often outweigh the slightly higher costs, especially when service availability is critical.

## Production-ready implementation example

Here's a complete implementation for a multi-user resume analysis service:

```typescript
// lib/resume-analyzer.ts
import { OpenAI } from 'openai';
import { Redis } from 'ioredis';

export class ResumeAnalyzer {
    private openai: OpenAI;
    private redis: Redis;
    private rateLimiter: Map<string, number[]>;
    
    constructor() {
        this.openai = new OpenAI({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey: process.env.OPENROUTER_API_KEY!
        });
        
        this.redis = new Redis(process.env.REDIS_URL!);
        this.rateLimiter = new Map();
    }
    
    private async checkRateLimit(userId: string): Promise<boolean> {
        const now = Date.now();
        const userRequests = this.rateLimiter.get(userId) || [];
        const recentRequests = userRequests.filter(t => now - t < 60000);
        
        if (recentRequests.length >= 10) {
            throw new Error('Rate limit exceeded');
        }
        
        recentRequests.push(now);
        this.rateLimiter.set(userId, recentRequests);
        return true;
    }
    
    async analyzeResume(userId: string, resumeText: string) {
        await this.checkRateLimit(userId);
        
        // Check cache for previous analysis of same resume
        const cacheKey = `resume:${userId}:${this.hashResume(resumeText)}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
        
        const systemPrompt = `
        You are an expert resume analyzer specializing in ATS optimization and 
        professional development. Analyze resumes across these dimensions:
        
        1. **ATS Compatibility** (30%): Keyword optimization, formatting, parsability
        2. **Content Quality** (25%): Achievement quantification, action verbs, relevance
        3. **Structure** (20%): Logical flow, section organization, readability
        4. **Professional Impact** (15%): Leadership indicators, growth trajectory
        5. **Technical Accuracy** (10%): Grammar, consistency, factual accuracy
        
        Provide specific, actionable feedback with examples from the resume.
        Score each dimension 0-100 and provide an overall score.
        Highlight top 3 strengths and top 3 areas for improvement.
        Suggest specific keywords based on apparent target roles.
        
        Format your response as structured JSON.
        `;
        
        try {
            const response = await this.openai.chat.completions.create({
                model: 'openai/gpt-4o-mini',
                user: `analyzer_${userId}`,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Analyze this resume:\n\n${resumeText}` }
                ],
                response_format: { type: 'json_object' },
                usage: { include: true }
            });
            
            const analysis = JSON.parse(response.choices[0].message.content!);
            const usage = response.usage!;
            
            // Track metrics
            await this.trackUsage(userId, usage);
            
            // Cache the result
            await this.redis.set(cacheKey, JSON.stringify(analysis), 'EX', 3600);
            
            return {
                analysis,
                metrics: {
                    tokensUsed: usage.total_tokens,
                    cachedTokens: usage.cached_tokens,
                    cacheHitRate: (usage.cached_tokens / usage.prompt_tokens * 100).toFixed(1),
                    estimatedCost: this.calculateCost(usage)
                }
            };
            
        } catch (error) {
            console.error('Analysis error:', error);
            throw new Error('Resume analysis failed');
        }
    }
    
    private hashResume(text: string): string {
        // Simple hash for cache key
        return Buffer.from(text).toString('base64').substring(0, 16);
    }
    
    private calculateCost(usage: any): number {
        const inputCost = (usage.prompt_tokens - usage.cached_tokens) * 0.15 / 1000000;
        const cachedCost = usage.cached_tokens * 0.075 / 1000000;
        const outputCost = usage.completion_tokens * 0.60 / 1000000;
        return inputCost + cachedCost + outputCost;
    }
    
    private async trackUsage(userId: string, usage: any): Promise<void> {
        const metrics = {
            timestamp: new Date().toISOString(),
            userId,
            promptTokens: usage.prompt_tokens,
            cachedTokens: usage.cached_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
            cacheDiscount: usage.cache_discount || 0
        };
        
        await this.redis.lpush(`metrics:${userId}`, JSON.stringify(metrics));
        await this.redis.ltrim(`metrics:${userId}`, 0, 999); // Keep last 1000
    }
}
```

## Conclusion

OpenRouter's prompt caching implementation for GPT-4o mini provides a robust foundation for multi-user applications, combining automatic caching with sophisticated user isolation and monitoring capabilities. The system's zero-configuration approach, combined with strategic prompt structuring and user tracking, enables significant cost savings while maintaining performance and reliability. For resume analysis services, the combination of automatic fallback, user-specific routing, and comprehensive monitoring makes OpenRouter an excellent choice for production deployments.