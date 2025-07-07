"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, XCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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
  // Use real score details if available, otherwise fall back to mock data
  const scoreDetails = job.scoreDetails
  
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

  // If we have real score details, use them; otherwise use mock data
  const matchingBreakdown = scoreDetails ? {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Match Analysis: {job.title}
            <Badge variant="secondary" className="ml-2">
              {job.matchingScore}% Match
            </Badge>
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
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Matched {matchingBreakdown.keywords.matched.length} of {matchingBreakdown.keywords.total} key terms:
              </p>
              <div className="flex flex-wrap gap-1">
                {matchingBreakdown.keywords.matched.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Section */}
          {job.matchingSummary && (
            <div className="pt-4 border-t">
              <h3 className="text-lg font-semibold mb-3">Match Summary</h3>
              <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
                <p className="text-gray-800 text-sm leading-relaxed">{job.matchingSummary}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
