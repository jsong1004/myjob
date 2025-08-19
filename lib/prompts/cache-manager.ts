// lib/prompts/cache-manager.ts
/**
 * Enhanced caching system for multi-agent scoring
 * 
 * Features:
 * - Persistent database caching
 * - User-specific cache isolation
 * - Resume/job combination caching
 * - Default resume caching
 * - Current job description caching
 * - Cache invalidation strategies
 * - Performance monitoring
 */

import { initFirebaseAdmin } from '@/lib/firebase-admin-init'
import { getFirestore } from 'firebase-admin/firestore'
import { createHash } from 'crypto'

export interface CacheEntry {
  id: string
  userId: string
  cacheType: 'resume_default' | 'job_current' | 'scoring_result' | 'agent_result'
  key: string
  data: any
  createdAt: Date
  expiresAt: Date
  usage: {
    hits: number
    lastAccessed: Date
  }
}

export interface ScoringCacheKey {
  userId: string
  resumeHash: string
  jobId: string
  agentType?: string
}

export class CacheManager {
  private static instance: CacheManager
  private db: any

  private constructor() {
    initFirebaseAdmin()
    this.db = getFirestore()
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  /**
   * Generate hash for content (resume, job description, etc.)
   */
  private generateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, 16)
  }

  /**
   * Store default resume for user
   */
  async storeDefaultResume(userId: string, resume: string): Promise<void> {
    const resumeHash = this.generateHash(resume)
    const cacheKey = this.sanitizeCacheKey(`resume_default:${userId}:${resumeHash}`)
    
    const entry: CacheEntry = {
      id: cacheKey,
      userId,
      cacheType: 'resume_default',
      key: cacheKey,
      data: { resume, resumeHash },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      usage: { hits: 0, lastAccessed: new Date() }
    }

    await this.db.collection('prompt_cache').doc(cacheKey).set(entry)
    console.log(`💾 [Cache] Stored default resume for user ${userId}`)
  }

  /**
   * Sanitize cache key for Firestore document ID
   */
  private sanitizeCacheKey(key: string): string {
    return key
      .replace(/[\/\\]/g, '_') // Replace forward/backward slashes
      .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace other invalid chars with underscore
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
  }

  /**
   * Store resume processing result (tailoring, editing, etc.)
   */
  async storeResumeProcessingResult(
    userId: string,
    resumeHash: string,
    operation: 'tailoring' | 'editing' | 'analysis',
    jobId: string,
    result: any
  ): Promise<void> {
    const cacheKey = this.sanitizeCacheKey(`resume_processing:${userId}:${resumeHash}:${operation}:${jobId}`)
    
    const entry: CacheEntry = {
      id: cacheKey,
      userId,
      cacheType: 'resume_processing',
      key: cacheKey,
      data: { operation, jobId, result, resumeHash },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      usage: { hits: 0, lastAccessed: new Date() }
    }

    await this.db.collection('prompt_cache').doc(cacheKey).set(entry)
    console.log(`💾 [Cache] Stored resume ${operation} result for user ${userId}, job ${jobId}`)
  }

  /**
   * Store cover letter processing result
   */
  async storeCoverLetterProcessingResult(
    userId: string,
    resumeHash: string,
    jobId: string,
    operation: 'generation' | 'editing',
    result: any
  ): Promise<void> {
    const cacheKey = this.sanitizeCacheKey(`cover_letter_processing:${userId}:${resumeHash}:${operation}:${jobId}`)
    
    const entry: CacheEntry = {
      id: cacheKey,
      userId,
      cacheType: 'cover_letter_processing',
      key: cacheKey,
      data: { operation, jobId, result, resumeHash },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      usage: { hits: 0, lastAccessed: new Date() }
    }

    await this.db.collection('prompt_cache').doc(cacheKey).set(entry)
    console.log(`💾 [Cache] Stored cover letter ${operation} result for user ${userId}, job ${jobId}`)
  }

  /**
   * Store current job description for user
   */
  async storeCurrentJob(userId: string, jobId: string, jobDescription: string): Promise<void> {
    const jobHash = this.generateHash(jobDescription)
    const cacheKey = this.sanitizeCacheKey(`job_current:${userId}:${jobId}`)
    
    const entry: CacheEntry = {
      id: cacheKey,
      userId,
      cacheType: 'job_current',
      key: cacheKey,
      data: { jobId, jobDescription, jobHash },
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      usage: { hits: 0, lastAccessed: new Date() }
    }

    await this.db.collection('prompt_cache').doc(cacheKey).set(entry)
    console.log(`💾 [Cache] Stored current job ${jobId} for user ${userId}`)
  }

  /**
   * Store multi-agent scoring result
   */
  async storeScoringResult(
    userId: string, 
    resumeHash: string, 
    jobId: string, 
    result: any
  ): Promise<void> {
    const cacheKey = this.sanitizeCacheKey(`scoring_result:${userId}:${resumeHash}:${jobId}`)
    
    const entry: CacheEntry = {
      id: cacheKey,
      userId,
      cacheType: 'scoring_result',
      key: cacheKey,
      data: result,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      usage: { hits: 0, lastAccessed: new Date() }
    }

    await this.db.collection('prompt_cache').doc(cacheKey).set(entry)
    console.log(`💾 [Cache] Stored scoring result for user ${userId}, job ${jobId}`)
  }

  /**
   * Store individual agent result
   */
  async storeAgentResult(
    userId: string,
    resumeHash: string,
    jobId: string,
    agentType: string,
    result: any
  ): Promise<void> {
    const cacheKey = this.sanitizeCacheKey(`agent_result:${userId}:${resumeHash}:${jobId}:${agentType}`)
    
    const entry: CacheEntry = {
      id: cacheKey,
      userId,
      cacheType: 'agent_result',
      key: cacheKey,
      data: result,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      usage: { hits: 0, lastAccessed: new Date() }
    }

    await this.db.collection('prompt_cache').doc(cacheKey).set(entry)
    console.log(`💾 [Cache] Stored agent result for ${agentType}, user ${userId}`)
  }

  /**
   * Get cached scoring result
   */
  async getScoringResult(userId: string, resumeHash: string, jobId: string): Promise<any | null> {
    const cacheKey = this.sanitizeCacheKey(`scoring_result:${userId}:${resumeHash}:${jobId}`)
    
    try {
      const doc = await this.db.collection('prompt_cache').doc(cacheKey).get()
      
      if (doc.exists) {
        const entry = doc.data() as CacheEntry
        
        // Check if expired
        if (new Date() > entry.expiresAt) {
          await this.db.collection('prompt_cache').doc(cacheKey).delete()
          return null
        }

        // Update usage
        await this.db.collection('prompt_cache').doc(cacheKey).update({
          'usage.hits': entry.usage.hits + 1,
          'usage.lastAccessed': new Date()
        })

        console.log(`🎯 [Cache] Hit for scoring result, user ${userId}, job ${jobId}`)
        return entry.data
      }
    } catch (error) {
      console.warn(`⚠️ [Cache] Error retrieving scoring result:`, error)
    }

    return null
  }

  /**
   * Get cached agent result
   */
  async getAgentResult(
    userId: string, 
    resumeHash: string, 
    jobId: string, 
    agentType: string
  ): Promise<any | null> {
    const cacheKey = this.sanitizeCacheKey(`agent_result:${userId}:${resumeHash}:${jobId}:${agentType}`)
    
    try {
      const doc = await this.db.collection('prompt_cache').doc(cacheKey).get()
      
      if (doc.exists) {
        const entry = doc.data() as CacheEntry
        
        // Check if expired
        if (new Date() > entry.expiresAt) {
          await this.db.collection('prompt_cache').doc(cacheKey).delete()
          return null
        }

        // Update usage
        await this.db.collection('prompt_cache').doc(cacheKey).update({
          'usage.hits': entry.usage.hits + 1,
          'usage.lastAccessed': new Date()
        })

        console.log(`🎯 [Cache] Hit for agent ${agentType}, user ${userId}`)
        return entry.data
      }
    } catch (error) {
      console.warn(`⚠️ [Cache] Error retrieving agent result:`, error)
    }

    return null
  }

  /**
   * Get default resume for user
   */
  async getDefaultResume(userId: string): Promise<string | null> {
    try {
      const snapshot = await this.db.collection('prompt_cache')
        .where('userId', '==', userId)
        .where('cacheType', '==', 'resume_default')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get()

      if (!snapshot.empty) {
        const entry = snapshot.docs[0].data() as CacheEntry
        
        // Check if expired
        if (new Date() > entry.expiresAt) {
          await this.db.collection('prompt_cache').doc(entry.id).delete()
          return null
        }

        // Update usage
        await this.db.collection('prompt_cache').doc(entry.id).update({
          'usage.hits': entry.usage.hits + 1,
          'usage.lastAccessed': new Date()
        })

        console.log(`🎯 [Cache] Hit for default resume, user ${userId}`)
        return entry.data.resume
      }
    } catch (error) {
      console.warn(`⚠️ [Cache] Error retrieving default resume:`, error)
    }

    return null
  }

  /**
   * Get current job for user
   */
  async getCurrentJob(userId: string): Promise<{ jobId: string, jobDescription: string } | null> {
    try {
      const snapshot = await this.db.collection('prompt_cache')
        .where('userId', '==', userId)
        .where('cacheType', '==', 'job_current')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get()

      if (!snapshot.empty) {
        const entry = snapshot.docs[0].data() as CacheEntry
        
        // Check if expired
        if (new Date() > entry.expiresAt) {
          await this.db.collection('prompt_cache').doc(entry.id).delete()
          return null
        }

        // Update usage
        await this.db.collection('prompt_cache').doc(entry.id).update({
          'usage.hits': entry.usage.hits + 1,
          'usage.lastAccessed': new Date()
        })

        console.log(`🎯 [Cache] Hit for current job, user ${userId}`)
        return { jobId: entry.data.jobId, jobDescription: entry.data.jobDescription }
      }
    } catch (error) {
      console.warn(`⚠️ [Cache] Error retrieving current job:`, error)
    }

    return null
  }

  /**
   * Get resume processing result
   */
  async getResumeProcessingResult(
    userId: string,
    resumeHash: string,
    operation: 'tailoring' | 'editing' | 'analysis',
    jobId: string
  ): Promise<any | null> {
    const cacheKey = this.sanitizeCacheKey(`resume_processing:${userId}:${resumeHash}:${operation}:${jobId}`)
    
    try {
      const doc = await this.db.collection('prompt_cache').doc(cacheKey).get()
      
      if (doc.exists) {
        const entry = doc.data() as CacheEntry
        
        // Check if expired
        if (new Date() > entry.expiresAt) {
          await this.db.collection('prompt_cache').doc(cacheKey).delete()
          return null
        }

        // Update usage
        await this.db.collection('prompt_cache').doc(cacheKey).update({
          'usage.hits': entry.usage.hits + 1,
          'usage.lastAccessed': new Date()
        })

        console.log(`🎯 [Cache] Hit for resume ${operation}, user ${userId}, job ${jobId}`)
        return entry.data.result
      }
    } catch (error) {
      console.warn(`⚠️ [Cache] Error retrieving resume processing result:`, error)
    }

    return null
  }

  /**
   * Get cover letter processing result
   */
  async getCoverLetterProcessingResult(
    userId: string,
    resumeHash: string,
    jobId: string,
    operation: 'generation' | 'editing'
  ): Promise<any | null> {
    const cacheKey = this.sanitizeCacheKey(`cover_letter_processing:${userId}:${resumeHash}:${operation}:${jobId}`)
    
    try {
      const doc = await this.db.collection('prompt_cache').doc(cacheKey).get()
      
      if (doc.exists) {
        const entry = doc.data() as CacheEntry
        
        // Check if expired
        if (new Date() > entry.expiresAt) {
          await this.db.collection('prompt_cache').doc(cacheKey).delete()
          return null
        }

        // Update usage
        await this.db.collection('prompt_cache').doc(cacheKey).update({
          'usage.hits': entry.usage.hits + 1,
          'usage.lastAccessed': new Date()
        })

        console.log(`🎯 [Cache] Hit for cover letter ${operation}, user ${userId}, job ${jobId}`)
        return entry.data.result
      }
    } catch (error) {
      console.warn(`⚠️ [Cache] Error retrieving cover letter processing result:`, error)
    }

    return null
  }

  /**
   * Update current job (when user switches jobs)
   */
  async updateCurrentJob(userId: string, jobId: string, jobDescription: string): Promise<void> {
    // Delete old current job cache
    try {
      const snapshot = await this.db.collection('prompt_cache')
        .where('userId', '==', userId)
        .where('cacheType', '==', 'job_current')
        .get()

      const batch = this.db.batch()
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })
      await batch.commit()
    } catch (error) {
      console.warn(`⚠️ [Cache] Error cleaning old job cache:`, error)
    }

    // Store new current job
    await this.storeCurrentJob(userId, jobId, jobDescription)
    console.log(`🔄 [Cache] Updated current job to ${jobId} for user ${userId}`)
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(userId?: string): Promise<any> {
    try {
      let query = this.db.collection('prompt_cache')
      
      if (userId) {
        query = query.where('userId', '==', userId)
      }

      const snapshot = await query.get()
      
      const stats = {
        totalEntries: snapshot.size,
        byType: {} as Record<string, number>,
        totalHits: 0,
        averageHits: 0
      }

      snapshot.docs.forEach(doc => {
        const entry = doc.data() as CacheEntry
        stats.byType[entry.cacheType] = (stats.byType[entry.cacheType] || 0) + 1
        stats.totalHits += entry.usage.hits
      })

      stats.averageHits = stats.totalEntries > 0 ? stats.totalHits / stats.totalEntries : 0

      return stats
    } catch (error) {
      console.warn(`⚠️ [Cache] Error getting cache stats:`, error)
      return { totalEntries: 0, byType: {}, totalHits: 0, averageHits: 0 }
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredEntries(): Promise<void> {
    try {
      const now = new Date()
      const snapshot = await this.db.collection('prompt_cache')
        .where('expiresAt', '<', now)
        .get()

      if (!snapshot.empty) {
        const batch = this.db.batch()
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref)
        })
        await batch.commit()
        console.log(`🧹 [Cache] Cleaned up ${snapshot.size} expired entries`)
      }
    } catch (error) {
      console.warn(`⚠️ [Cache] Error cleaning up expired entries:`, error)
    }
  }
}

export const cacheManager = CacheManager.getInstance()
