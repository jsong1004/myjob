"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, XCircle, Download } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useState } from "react"

interface Job {
  id: string
  title: string
  company: string
  matchingScore: number
  matchingSummary?: string
  summary?: string
  scoreDetails?: any
}

interface MatchingScoreDialogProps {
  job: Job
  isOpen: boolean
  onClose: () => void
}

export function MatchingScoreDialog({ job, isOpen, onClose }: MatchingScoreDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  
  // Use real score details if available, otherwise fall back to mock data
  const scoreDetails = job.scoreDetails
  const enhancedScoreDetails = (job as any).enhancedScoreDetails
  
  // Debug logging
  console.log('🔍 [Dialog] Job data received:', {
    title: job.title,
    hasScoreDetails: !!scoreDetails,
    hasEnhancedScoreDetails: !!enhancedScoreDetails,
    scoreDetailsKeys: scoreDetails ? Object.keys(scoreDetails) : [],
    enhancedScoreDetailsKeys: enhancedScoreDetails ? Object.keys(enhancedScoreDetails) : [],
    scoreDetailsData: scoreDetails,
    enhancedScoreDetails: enhancedScoreDetails,
    fullJobData: job
  })
  
  // Check if we have multi-agent or enhanced scoring data
  const hasEnhancedData = enhancedScoreDetails?.breakdown
  const isMultiAgent = enhancedScoreDetails?.executionSummary || enhancedScoreDetails?.scoringVersion?.includes('multi-agent')
  const hasMultiAgentData = hasEnhancedData && isMultiAgent
  
  const mockData = {
    skills: {
      score: 85,
      matched: ["Communication", "Problem Solving", "Teamwork"],
      missing: ["Industry Specific Skills"],
    },
    experience: {
      score: 80,
      yearsRequired: 3,
      yearsHave: 2,
      relevantExperience: "General Professional Experience",
    },
    education: {
      score: 75,
      required: "Bachelor's degree preferred",
      have: "Educational background",
    },
    keywords: {
      score: 70,
      matched: ["Professional", "Dedicated", "Results-oriented"],
      total: 10,
    },
  }

  // Helper function to safely extract strings from objects or arrays
  const extractStringArray = (data: any): string[] => {
    if (!data) return []
    if (Array.isArray(data)) {
      return data.map(item => {
        if (typeof item === 'string') return item
        if (typeof item === 'object' && item !== null) {
          // Handle objects with different structures
          if (item.weakness) return item.weakness
          if (item.strength) return item.strength
          if (item.skill) return item.skill
          if (item.name) return item.name
          if (item.description) return item.description
          return JSON.stringify(item)
        }
        return String(item)
      })
    }
    if (typeof data === 'string') return [data]
    return []
  }

  // If we have enhanced scoring data (multi-agent or regular enhanced), use it
  const matchingBreakdown = hasEnhancedData ? {
    skills: {
      score: enhancedScoreDetails.breakdown.technicalSkills?.score || 0,
      matched: extractStringArray(enhancedScoreDetails.keyStrengths).slice(0, 5), // Show top 5 strengths
      missing: extractStringArray(enhancedScoreDetails.keyWeaknesses).slice(0, 5), // Show top 5 weaknesses
    },
    experience: {
      score: enhancedScoreDetails.breakdown.experienceDepth?.score || 0,
      yearsRequired: 3, // Default as we don't have this in enhanced scoring
      yearsHave: 2, // Default as we don't have this in enhanced scoring
      relevantExperience: enhancedScoreDetails.breakdown.experienceDepth?.reasoning || "See detailed analysis",
    },
    education: {
      score: enhancedScoreDetails.breakdown.education?.score || 0,
      required: "See job requirements",
      have: enhancedScoreDetails.breakdown.education?.reasoning || "See detailed analysis",
    },
    keywords: {
      score: enhancedScoreDetails.breakdown.achievements?.score || 0,
      matched: extractStringArray(enhancedScoreDetails.positiveIndicators).slice(0, 6), // Top 6 positive indicators
      total: extractStringArray(enhancedScoreDetails.positiveIndicators).length + extractStringArray(enhancedScoreDetails.redFlags).length,
    },
  } : scoreDetails ? {
    // Legacy enhanced scoring format
    skills: {
      score: scoreDetails.skillsAndKeywords?.score || mockData.skills.score,
      matched: scoreDetails.skillsAndKeywords?.breakdown?.requiredSkills ? 
        [scoreDetails.skillsAndKeywords.breakdown.requiredSkills] : mockData.skills.matched,
      missing: scoreDetails.skillsAndKeywords?.breakdown?.technologyAndTools ? 
        [scoreDetails.skillsAndKeywords.breakdown.technologyAndTools] : mockData.skills.missing,
    },
    experience: {
      score: scoreDetails.experienceAndAchievements?.score || mockData.experience.score,
      yearsRequired: mockData.experience.yearsRequired,
      yearsHave: mockData.experience.yearsHave,
      relevantExperience: scoreDetails.experienceAndAchievements?.breakdown?.roleRelevance || mockData.experience.relevantExperience,
    },
    education: {
      score: scoreDetails.educationAndCertifications?.score || mockData.education.score,
      required: mockData.education.required,
      have: scoreDetails.educationAndCertifications?.rationale || mockData.education.have,
    },
    keywords: {
      score: scoreDetails.jobTitleAndSeniority?.score || mockData.keywords.score,
      matched: mockData.keywords.matched,
      total: mockData.keywords.total,
    },
  } : mockData

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-5 w-5 text-green-500" />
    if (score >= 70) return <AlertCircle className="h-5 w-5 text-yellow-500" />
    return <XCircle className="h-5 w-5 text-red-500" />
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      // Prepare analysis data for PDF generation
      const analysisData = {
        job: {
          title: job.title,
          company: job.company,
          matchingScore: job.matchingScore,
          matchingSummary: job.matchingSummary,
        },
        breakdown: matchingBreakdown,
        enhancedScoreDetails: hasEnhancedData ? enhancedScoreDetails : null,
      }

      const response = await fetch('/api/jobs/match-analysis-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisData),
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      // Handle PDF download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${job.title.replace(/[^a-zA-Z0-9]/g, '_')}_Match_Analysis.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      // You might want to show a toast notification here
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              Match Analysis: {job.title}
              <Badge variant="secondary" className="ml-2">
                {job.matchingScore}% Match
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isDownloading ? 'Generating...' : 'Download PDF'}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Score */}
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <div className="text-4xl font-bold text-blue-600 mb-2">{job.matchingScore}%</div>
            <p className="text-gray-600">Overall Match Score</p>
            <Progress value={job.matchingScore} className="mt-4" />
          </div>

          {/* Skills Analysis */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {getScoreIcon(matchingBreakdown.skills.score)}
              <h3 className="font-semibold">Skills Match</h3>
              <span className={`font-bold ${getScoreColor(matchingBreakdown.skills.score)}`}>
                {matchingBreakdown.skills.score}%
              </span>
            </div>
            <Progress value={matchingBreakdown.skills.score} className="mb-3" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-green-600 mb-2">Matched Skills:</p>
                <div className="flex flex-wrap gap-1">
                  {matchingBreakdown.skills.matched.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs bg-green-50 text-green-700">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-600 mb-2">Missing Skills:</p>
                <div className="flex flex-wrap gap-1">
                  {matchingBreakdown.skills.missing.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs bg-orange-50 text-orange-700">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Experience Analysis */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {getScoreIcon(matchingBreakdown.experience.score)}
              <h3 className="font-semibold">Experience Match</h3>
              <span className={`font-bold ${getScoreColor(matchingBreakdown.experience.score)}`}>
                {matchingBreakdown.experience.score}%
              </span>
            </div>
            <Progress value={matchingBreakdown.experience.score} className="mb-3" />
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Required Experience:</span>
                <span className="text-sm font-medium">{matchingBreakdown.experience.yearsRequired} years</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Your Experience:</span>
                <span className="text-sm font-medium">{matchingBreakdown.experience.yearsHave} years</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Relevant Areas:</span>
                <p className="text-sm font-medium">{matchingBreakdown.experience.relevantExperience}</p>
              </div>
            </div>
          </div>

          {/* Education Analysis */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {getScoreIcon(matchingBreakdown.education.score)}
              <h3 className="font-semibold">Education Match</h3>
              <span className={`font-bold ${getScoreColor(matchingBreakdown.education.score)}`}>
                {matchingBreakdown.education.score}%
              </span>
            </div>
            <Progress value={matchingBreakdown.education.score} className="mb-3" />
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div>
                <span className="text-sm text-gray-600">Required:</span>
                <p className="text-sm font-medium">{matchingBreakdown.education.required}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Your Education:</span>
                <p className="text-sm font-medium">{matchingBreakdown.education.have}</p>
              </div>
            </div>
          </div>

          {/* Keywords Analysis */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {getScoreIcon(matchingBreakdown.keywords.score)}
              <h3 className="font-semibold">Keywords Match</h3>
              <span className={`font-bold ${getScoreColor(matchingBreakdown.keywords.score)}`}>
                {matchingBreakdown.keywords.score}%
              </span>
            </div>
            <Progress value={matchingBreakdown.keywords.score} className="mb-3" />
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Matched {matchingBreakdown.keywords.matched.length} of {matchingBreakdown.keywords.total} key terms:
              </p>
              
              {/* Matched Keywords */}
              {matchingBreakdown.keywords.matched.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-green-600 mb-1">✓ Matched Terms:</p>
                  <div className="flex flex-wrap gap-1">
                    {matchingBreakdown.keywords.matched.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                        ✓ {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Unmatched Keywords - show red flags or missing areas */}
              {(matchingBreakdown.skills.missing.length > 0 || 
                (enhancedScoreDetails?.redFlags && extractStringArray(enhancedScoreDetails.redFlags).length > 0)) && (
                <div>
                  <p className="text-xs font-medium text-orange-600 mb-1">✗ Areas Needing Improvement:</p>
                  <div className="flex flex-wrap gap-1">
                    {(hasEnhancedData 
                      ? extractStringArray(enhancedScoreDetails.redFlags).slice(0, 5) // Top 5 red flags
                      : matchingBreakdown.skills.missing
                    ).map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                        ✗ {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Match Summary Section - Actual Analysis Summary */}
          {(job.matchingSummary || enhancedScoreDetails?.hiringRecommendation) && (
            <div className="pt-4 border-t">
              <h3 className="text-lg font-semibold mb-3">Match Analysis Summary</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
                  <div className="space-y-2">
                    <p className="text-gray-800 text-sm leading-relaxed font-medium">
                      Hiring Recommendation:
                    </p>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {(() => {
                        const recommendation = job.matchingSummary || enhancedScoreDetails?.hiringRecommendation || ""
                        // Fix illogical "Do Not Proceed" for good scores
                        if (job.matchingScore >= 70 && recommendation.includes("Do Not Proceed")) {
                          return `Standard Interview Process - Overall score: ${job.matchingScore}% (Good Match)`
                        }
                        return recommendation
                      })()}
                    </p>
                  </div>
                </div>
                
                {/* Overall Score Category */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Match Category:</span>
                    <Badge 
                      variant={
                        job.matchingScore >= 90 ? 'default' :
                        job.matchingScore >= 80 ? 'secondary' :
                        job.matchingScore >= 70 ? 'secondary' :
                        job.matchingScore >= 60 ? 'outline' :
                        'destructive'
                      }
                      className="capitalize"
                    >
                      {job.matchingScore >= 90 ? 'Exceptional' :
                       job.matchingScore >= 80 ? 'Strong' :
                       job.matchingScore >= 70 ? 'Good' :
                       job.matchingScore >= 60 ? 'Fair' :
                       job.matchingScore >= 45 ? 'Weak' : 'Poor'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced/Multi-Agent Insights Section */}
          {hasEnhancedData && (
            <div className="pt-4 border-t space-y-4">
              <h3 className="text-lg font-semibold">AI Analysis Insights</h3>
              
              {/* Key Strengths */}
              {extractStringArray(enhancedScoreDetails.keyStrengths).length > 0 && (
                <div>
                  <h4 className="font-medium text-green-700 mb-2">Key Strengths</h4>
                  <ul className="space-y-1">
                    {extractStringArray(enhancedScoreDetails.keyStrengths).map((strength: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Key Weaknesses */}
              {extractStringArray(enhancedScoreDetails.keyWeaknesses).length > 0 && (
                <div>
                  <h4 className="font-medium text-orange-700 mb-2">Areas for Improvement</h4>
                  <ul className="space-y-1">
                    {extractStringArray(enhancedScoreDetails.keyWeaknesses).map((weakness: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Detailed Breakdown */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Detailed Score Breakdown</h4>
                <div className="space-y-3">
                  {Object.entries(enhancedScoreDetails.breakdown || {}).map(([category, details]: [string, any]) => {
                    const categoryName = category.replace(/([A-Z])/g, ' $1').trim()
                    const getCategoryIcon = () => {
                      if (category.includes('technical')) return '🛠️'
                      if (category.includes('experience')) return '💼'
                      if (category.includes('achievement')) return '🏆'
                      if (category.includes('education')) return '🎓'
                      if (category.includes('soft')) return '💬'
                      if (category.includes('career')) return '📈'
                      return '📊'
                    }
                    
                    return (
                      <div key={category} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getCategoryIcon()}</span>
                            <span className="text-sm font-semibold capitalize">
                              {categoryName}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={`text-lg font-bold ${getScoreColor(details.score)}`}>
                              {details.score}%
                            </span>
                            {details.weight && (
                              <p className="text-xs text-gray-500">Weight: {(details.weight * 100).toFixed(0)}%</p>
                            )}
                          </div>
                        </div>
                        <Progress value={details.score} className="h-2 mb-3" />
                        {details.reasoning && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-700">Analysis:</p>
                            <p className="text-xs text-gray-600 leading-relaxed">{details.reasoning}</p>
                          </div>
                        )}
                        {/* Show sub-scores if available */}
                        {details.breakdown && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {Object.entries(details.breakdown).map(([subKey, subValue]: [string, any]) => (
                                <div key={subKey} className="flex justify-between">
                                  <span className="text-gray-600">{subKey}:</span>
                                  <span className="font-medium">{subValue}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                
                {/* Overall Score Calculation */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-900">Weighted Average Score:</span>
                    <span className="text-lg font-bold text-blue-600">{enhancedScoreDetails.overallScore}%</span>
                  </div>
                </div>
              </div>

              {/* Interview Focus Areas */}
              {extractStringArray(enhancedScoreDetails.interviewFocus).length > 0 && (
                <div>
                  <h4 className="font-medium text-blue-700 mb-2">Interview Focus Areas</h4>
                  <ul className="space-y-1">
                    {extractStringArray(enhancedScoreDetails.interviewFocus).map((focus: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-500">•</span>
                        <span>{focus}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
