// lib/prompts/types.ts
export interface PromptConfig {
  id: string
  name: string
  description: string
  systemRole: string
  userTemplate: string
  model: string
  temperature?: number
  maxTokens?: number
  responseFormat?: ResponseFormat
  version: string
  tags: string[]
}

export interface ResponseFormat {
  type: 'json' | 'text' | 'structured'
  schema?: Record<string, any>
  examples?: string[]
}

export interface PromptContext {
  userId?: string
  sessionId?: string
  metadata?: Record<string, any>
}

export interface PromptRequest {
  promptId: string
  variables: Record<string, any>
  context?: PromptContext
  overrides?: Partial<PromptConfig>
}

export interface PromptResponse {
  success: boolean
  data?: any
  error?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    cachedTokens?: number
    cacheDiscount?: number
    estimatedCost?: number
    costSavings?: number
  }
  metadata?: {
    model: string
    temperature: number
    responseTime: number
  }
}

// Specific prompt types
export interface JobScoringRequest {
  jobs: JobSearchResult[]
  resume: string
  userId: string
}

export interface ResumeTailoringRequest {
  resume: string
  jobTitle: string
  company: string
  jobDescription: string
  userRequest: string
  mode: 'agent' | 'ask'
  userId?: string // For cache optimization
}

export interface CoverLetterRequest {
  resume: string
  jobTitle: string
  company: string
  jobDescription: string
  userRequest: string
  mode: 'agent' | 'ask'
  existingCoverLetter?: string
}

// Import types from existing application
export interface JobSearchResult {
  id: string
  title: string
  company: string
  description: string
  matchingScore?: number
  matchingSummary?: string
  scoreDetails?: any
  location?: string
  salary?: string
  applyUrl?: string
  snippet?: string
  originalData?: any
  enhancedScoreDetails?: EnhancedScoreResult
}

// Enhanced scoring system types
export interface EnhancedScoreResult {
  overallScore: number
  category: 'exceptional' | 'strong' | 'good' | 'fair' | 'weak' | 'poor'
  breakdown: {
    technicalSkills: ScoreDetail
    experienceDepth: ScoreDetail
    achievements: ScoreDetail
    education: ScoreDetail
    softSkills: ScoreDetail
    careerProgression: ScoreDetail
  }
  redFlags: string[]
  positiveIndicators: string[]
  hiringRecommendation: string
  keyStrengths: string[]
  keyWeaknesses: WeaknessDetail[]
  interviewFocus: string[]
  validatedAt?: string
  scoringVersion?: string
  summary: string
}

export interface ScoreDetail {
  score: number
  reasoning: string
  weight: number
}

export interface WeaknessDetail {
  weakness: string
  impact: string
  improvementPlan: {
    shortTerm: string   // 1 month actions
    midTerm: string     // 3 months actions
    longTerm: string    // 6+ months actions
  }
}

export interface ScoreCategory {
  min: number
  max: number
  label: string
  description: string
  color: string
  action: string
}

export const SCORE_CATEGORIES: Record<string, ScoreCategory> = {
  exceptional: {
    min: 90, max: 100,
    label: "Exceptional Match",
    description: "Perfect candidate - immediate hire recommendation",
    color: "#10B981",
    action: "Fast Track to Final Round"
  },
  strong: {
    min: 80, max: 89,
    label: "Strong Candidate", 
    description: "Excellent fit with minor gaps - strong hire",
    color: "#059669",
    action: "Proceed to Technical Interview"
  },
  good: {
    min: 70, max: 79,
    label: "Good Potential",
    description: "Solid candidate with some development areas",
    color: "#D97706", 
    action: "Standard Interview Process"
  },
  fair: {
    min: 60, max: 69,
    label: "Fair Match",
    description: "Possible candidate with notable gaps", 
    color: "#F59E0B",
    action: "Phone Screen First"
  },
  weak: {
    min: 45, max: 59,
    label: "Weak Match",
    description: "Significant gaps - consider for other roles",
    color: "#EF4444",
    action: "Consider for Junior/Alternative Roles"
  },
  poor: {
    min: 0, max: 44,
    label: "Poor Match", 
    description: "Not qualified for this position",
    color: "#DC2626",
    action: "Do Not Proceed"
  }
}

export const ENHANCED_SCORING_WEIGHTS = {
  technicalSkills: 0.25,      // Technical Skills & Tools (25%)
  experienceDepth: 0.25,      // Experience Depth & Relevance (25%)
  achievements: 0.20,         // Quantifiable Achievements (20%)
  education: 0.10,            // Education & Certifications (10%)
  softSkills: 0.10,           // Cultural & Soft Skills (10%)
  careerProgression: 0.10     // Career Progression (10%)
}

// Multi-Agent Scoring Types
export interface AgentResult {
  agentType: string
  result: any
  executedAt: string
  executionTime?: number
}

export interface ScoringAgentResult {
  categoryScore: number
  reasoning: string
  weight?: number
}

export interface TechnicalSkillsAgentResult extends ScoringAgentResult {
  skillsMatched: string[]
  skillsMissing: string[]
  skillsRelated: string[]
  proficiencyGaps: string[]
  recommendations: string[]
}

export interface ExperienceDepthAgentResult extends ScoringAgentResult {
  yearsRelevant: number
  yearsTotal: number
  industryMatch: boolean
  roleComplexityMatch: boolean
  leadershipExperience: boolean
  experienceGaps: string[]
  recommendations: string[]
}

export interface AchievementsAgentResult extends ScoringAgentResult {
  quantifiedResults: string[]
  businessImpact: string[]
  leadershipAchievements: string[]
  innovationExamples: string[]
  achievementGaps: string[]
  recommendations: string[]
}

export interface EducationAgentResult extends ScoringAgentResult {
  degreeMatch: boolean
  relevantCertifications: string[]
  expiredCertifications: string[]
  continuousLearning: boolean
  educationGaps: string[]
  recommendations: string[]
}

export interface SoftSkillsAgentResult extends ScoringAgentResult {
  communicationEvidence: string
  leadershipEvidence: string[]
  adaptabilityEvidence: string[]
  culturalFitIndicators: string[]
  softSkillGaps: string[]
  recommendations: string[]
}

export interface CareerProgressionAgentResult extends ScoringAgentResult {
  progressionPattern: string
  jobStability: string
  responsibilityGrowth: boolean
  careerFocus: boolean
  progressionConcerns: string[]
  recommendations: string[]
}

export interface StrengthsAgentResult {
  topStrengths: string[]
  reasoning: string
  differentiators: string[]
  roleRelevance: string
}

export interface WeaknessesAgentResult {
  topWeaknesses: Array<{
    weakness: string
    impact: string
    severity: 'high' | 'medium' | 'low'
    improvementPlan: {
      shortTerm: string
      midTerm: string
      longTerm: string
    }
  }>
  reasoning: string
  riskAssessment: string
  prioritization: string
}

export interface AgentResults {
  scoring: {
    technicalSkills?: { result: TechnicalSkillsAgentResult; executedAt: string }
    experienceDepth?: { result: ExperienceDepthAgentResult; executedAt: string }
    achievements?: { result: AchievementsAgentResult; executedAt: string }
    education?: { result: EducationAgentResult; executedAt: string }
    softSkills?: { result: SoftSkillsAgentResult; executedAt: string }
    careerProgression?: { result: CareerProgressionAgentResult; executedAt: string }
  }
  analysis: {
    strengths?: { result: StrengthsAgentResult; executedAt: string }
    weaknesses?: { result: WeaknessAgentResult; executedAt: string }
  }
  executionMetadata: {
    totalExecutionTime: number
    agentsExecuted: number
    timestamp: string
  }
}

export interface OrchestrationResult {
  overallScore: number
  category: 'exceptional' | 'strong' | 'good' | 'fair' | 'weak' | 'poor'
  categoryDetails: {
    label: string
    description: string
    action: string
    color: string
  }
  breakdown: {
    technicalSkills: { score: number; reasoning: string; weight: number }
    experienceDepth: { score: number; reasoning: string; weight: number }
    achievements: { score: number; reasoning: string; weight: number }
    education: { score: number; reasoning: string; weight: number }
    softSkills: { score: number; reasoning: string; weight: number }
    careerProgression: { score: number; reasoning: string; weight: number }
  }
  keyStrengths: string[]
  keyWeaknesses: WeaknessDetail[]
  redFlags: string[]
  positiveIndicators: string[]
  hiringRecommendation: string
  interviewFocus: string[]
  executionSummary: {
    agentsExecuted: number
    totalExecutionTime: string
    scoringVersion: string
  }
}

export interface MultiAgentScoreResult extends OrchestrationResult {
  agentResults: AgentResults
  processedAt: string
  totalProcessingTime: number
}

export type AgentType = 'technicalSkills' | 'experienceDepth' | 'achievements' | 'education' | 'softSkills' | 'careerProgression' | 'strengths' | 'weaknesses' | 'orchestration'