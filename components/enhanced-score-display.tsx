// components/enhanced-score-display.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, CheckCircle, Clock, Target, TrendingUp, Users, BookOpen, Award } from "lucide-react"

interface EnhancedScoreResult {
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
  summary: string
}

interface ScoreDetail {
  score: number
  reasoning: string
  weight: number
}

interface WeaknessDetail {
  weakness: string
  impact: string
  improvementPlan: {
    shortTerm: string
    midTerm: string
    longTerm: string
  }
}

const SCORE_CATEGORIES = {
  exceptional: {
    min: 90, max: 100,
    label: "Exceptional Match",
    description: "Perfect candidate - immediate hire recommendation",
    color: "#10B981",
    bgColor: "bg-green-50",
    textColor: "text-green-800",
    action: "Fast Track to Final Round"
  },
  strong: {
    min: 80, max: 89,
    label: "Strong Candidate", 
    description: "Excellent fit with minor gaps - strong hire",
    color: "#059669",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    action: "Proceed to Technical Interview"
  },
  good: {
    min: 70, max: 79,
    label: "Good Potential",
    description: "Solid candidate with some development areas",
    color: "#D97706",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-800",
    action: "Standard Interview Process"
  },
  fair: {
    min: 60, max: 69,
    label: "Fair Match",
    description: "Possible candidate with notable gaps", 
    color: "#F59E0B",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-700",
    action: "Phone Screen First"
  },
  weak: {
    min: 45, max: 59,
    label: "Weak Match",
    description: "Significant gaps - consider for other roles",
    color: "#EF4444",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    action: "Consider for Junior/Alternative Roles"
  },
  poor: {
    min: 0, max: 44,
    label: "Poor Match", 
    description: "Not qualified for this position",
    color: "#DC2626",
    bgColor: "bg-red-50",
    textColor: "text-red-800",
    action: "Do Not Proceed"
  }
}

const CATEGORY_ICONS = {
  technicalSkills: <Target className="h-4 w-4" />,
  experienceDepth: <TrendingUp className="h-4 w-4" />,
  achievements: <Award className="h-4 w-4" />,
  education: <BookOpen className="h-4 w-4" />,
  softSkills: <Users className="h-4 w-4" />,
  careerProgression: <TrendingUp className="h-4 w-4" />
}

export function EnhancedScoreDisplay({ 
  score, 
  category, 
  breakdown, 
  keyStrengths, 
  keyWeaknesses, 
  redFlags, 
  positiveIndicators, 
  hiringRecommendation,
  interviewFocus,
  summary 
}: EnhancedScoreResult) {
  const categoryInfo = SCORE_CATEGORIES[category]
  
  return (
    <div className="space-y-6">
      {/* Overall Score Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center space-x-3">
                <div 
                  className="text-3xl font-bold"
                  style={{ color: categoryInfo.color }}
                >
                  {score}%
                </div>
                <div>
                  <Badge className={`${categoryInfo.bgColor} ${categoryInfo.textColor} border-0`}>
                    {categoryInfo.label}
                  </Badge>
                  <div className="text-sm text-gray-600 mt-1">{categoryInfo.description}</div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-700">Recommendation</div>
              <div 
                className="font-semibold"
                style={{ color: categoryInfo.color }}
              >
                {categoryInfo.action}
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <Progress value={score} className="h-3" />
          
          {/* Summary */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium mb-1">Hiring Manager Assessment</div>
            <div className="text-sm text-gray-700">{summary}</div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Score Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(breakdown).map(([key, detail]) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {CATEGORY_ICONS[key as keyof typeof CATEGORY_ICONS]}
                    <span className="font-medium capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">({detail.weight * 100}%)</span>
                    <span className="font-semibold">{detail.score}%</span>
                  </div>
                </div>
                <Progress value={detail.score} className="h-2" />
                <div className="text-xs text-gray-600">{detail.reasoning}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Strengths and Red Flags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Key Strengths */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Key Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {keyStrengths.slice(0, 5).map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-green-600 font-bold mt-0.5">{index + 1}.</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Red Flags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Areas of Concern
            </CardTitle>
          </CardHeader>
          <CardContent>
            {redFlags.length > 0 ? (
              <ul className="space-y-2">
                {redFlags.map((flag, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-500">No significant red flags identified</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Weaknesses with Improvement Plans */}
      {keyWeaknesses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <TrendingUp className="h-5 w-5" />
              Development Areas & Improvement Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {keyWeaknesses.slice(0, 3).map((weakness, index) => (
                <div key={index} className="border-l-4 border-orange-200 pl-4">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-orange-600 font-bold">{index + 1}.</span>
                      <div>
                        <div className="font-medium text-orange-800">{weakness.weakness}</div>
                        <div className="text-sm text-gray-600">{weakness.impact}</div>
                      </div>
                    </div>
                    
                    {/* Improvement Timeline */}
                    <div className="ml-6 space-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-blue-700">Short Term (1 Month)</div>
                          <div className="text-gray-700">{weakness.improvementPlan.shortTerm}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-amber-700">Mid Term (3 Months)</div>
                          <div className="text-gray-700">{weakness.improvementPlan.midTerm}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-purple-700">Long Term (6+ Months)</div>
                          <div className="text-gray-700">{weakness.improvementPlan.longTerm}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interview Focus Areas */}
      {interviewFocus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Users className="h-5 w-5" />
              Interview Focus Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {interviewFocus.map((area, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>{area}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hiring Recommendation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Final Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`p-4 rounded-lg ${categoryInfo.bgColor}`}>
            <div className="font-semibold mb-2" style={{ color: categoryInfo.color }}>
              {categoryInfo.action}
            </div>
            <div className="text-sm text-gray-700">{hiringRecommendation}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}