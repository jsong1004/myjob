"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  FileText, 
  Sparkles, 
  Target, 
  CheckCircle2, 
  Lightbulb,
  Brain,
  Zap,
  TrendingUp,
  Shield,
  Award,
  Edit3,
  AlertCircle
} from "lucide-react"

interface ResumeTailoringLoadingInfoProps {
  jobTitle?: string
  company?: string
  resumeName?: string
}

interface LoadingTip {
  icon: React.ReactNode
  title: string
  content: string
  type: 'tip' | 'stat' | 'progress' | 'warning' | 'best-practice'
}

export function ResumeTailoringLoadingInfo({ 
  jobTitle = "this position", 
  company = "the company",
  resumeName = "your resume"
}: ResumeTailoringLoadingInfoProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [aiStage, setAiStage] = useState(0)

  const aiStages = [
    "Analyzing job description...",
    "Identifying key requirements...",
    "Scanning your resume content...",
    "Matching skills and experiences...",
    "Optimizing keyword placement...",
    "Generating tailored content...",
    "Finalizing recommendations..."
  ]

  // Generate dynamic tips based on the job and resume
  const generateTips = (): LoadingTip[] => {
    const tips: LoadingTip[] = [
      {
        icon: <Brain className="h-5 w-5 text-purple-500" />,
        title: "AI Processing",
        content: aiStages[aiStage] || "Processing your resume...",
        type: 'progress'
      },
      {
        icon: <Target className="h-5 w-5 text-blue-500" />,
        title: "Keyword Optimization",
        content: `Our AI identifies critical keywords from the ${jobTitle} job description to ensure ATS compatibility`,
        type: 'stat'
      },
      {
        icon: <Sparkles className="h-5 w-5 text-yellow-500" />,
        title: "Tailoring Tip",
        content: "Resumes tailored to specific jobs are 3x more likely to get interviews than generic ones",
        type: 'stat'
      },
      {
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        title: "Best Practice",
        content: "Use the same terminology as the job posting - if they say 'customer success', don't say 'client satisfaction'",
        type: 'best-practice'
      },
      {
        icon: <Lightbulb className="h-5 w-5 text-orange-500" />,
        title: "Pro Tip",
        content: `For ${company}, emphasize achievements with quantifiable results - numbers catch recruiters' eyes`,
        type: 'tip'
      },
      {
        icon: <Edit3 className="h-5 w-5 text-indigo-500" />,
        title: "Formatting Insight",
        content: "Keep your tailored resume to 2 pages max - recruiters spend only 7 seconds on initial scan",
        type: 'tip'
      },
      {
        icon: <TrendingUp className="h-5 w-5 text-emerald-500" />,
        title: "Success Rate",
        content: "Users who tailor their resumes see a 40% increase in callback rates",
        type: 'stat'
      },
      {
        icon: <Shield className="h-5 w-5 text-red-500" />,
        title: "ATS Optimization",
        content: "We ensure your resume passes Applicant Tracking Systems by using standard section headers",
        type: 'best-practice'
      },
      {
        icon: <Award className="h-5 w-5 text-pink-500" />,
        title: "Achievement Focus",
        content: "Transform responsibilities into achievements - 'Managed team' becomes 'Led team of 5 to 20% sales increase'",
        type: 'tip'
      },
      {
        icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
        title: "Quick Reminder",
        content: "Don't forget to update your resume filename to include the company name and position",
        type: 'warning'
      },
      {
        icon: <Zap className="h-5 w-5 text-cyan-500" />,
        title: "Power Words",
        content: "Our AI suggests action verbs like 'spearheaded', 'orchestrated', and 'optimized' for stronger impact",
        type: 'tip'
      },
      {
        icon: <FileText className="h-5 w-5 text-gray-500" />,
        title: "Content Analysis",
        content: `Examining how your experience in ${resumeName} aligns with ${jobTitle} requirements`,
        type: 'progress'
      }
    ]

    return tips
  }

  const tips = generateTips()

  // Rotate through tips every 3.5 seconds
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length)
    }, 3500)

    return () => clearInterval(tipInterval)
  }, [tips.length])

  // Simulate AI processing progress
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return prev
        return prev + Math.random() * 12
      })
    }, 900)

    const stageInterval = setInterval(() => {
      setAiStage((prev) => {
        if (prev >= aiStages.length - 1) return prev
        return prev + 1
      })
    }, 2800)

    return () => {
      clearInterval(progressInterval)
      clearInterval(stageInterval)
    }
  }, [])

  const currentTip = tips[currentTipIndex]

  // Helper function to get color variant based on tip type
  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'progress': return 'default'
      case 'tip': return 'secondary'
      case 'best-practice': return 'outline'
      case 'warning': return 'destructive'
      default: return 'secondary'
    }
  }

  // Helper function to get badge label
  const getBadgeLabel = (type: string) => {
    switch (type) {
      case 'progress': return 'Processing'
      case 'tip': return 'Tip'
      case 'best-practice': return 'Best Practice'
      case 'warning': return 'Reminder'
      case 'stat': return 'Fact'
      default: return 'Info'
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Progress Bar */}
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Tailoring Engine
          </span>
          <span>{Math.min(Math.round(progress), 100)}%</span>
        </div>
        <Progress value={Math.min(progress, 100)} className="h-2" />
      </div>

      {/* Rotating Tips Card */}
      <Card className="max-w-lg mx-auto transition-all duration-500 hover:shadow-lg border-muted">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="mt-1">{currentTip.icon}</div>
            <div className="flex-1 min-h-[80px]">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-sm">{currentTip.title}</h3>
                <Badge 
                  variant={getBadgeVariant(currentTip.type)}
                  className="text-xs"
                >
                  {getBadgeLabel(currentTip.type)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentTip.content}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resume Tailoring Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 mx-auto mb-2 text-blue-600" />
            <div className="text-lg font-bold text-blue-600">Keyword</div>
            <div className="text-xs text-muted-foreground">Matching</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="h-5 w-5 mx-auto mb-2 text-green-600" />
            <div className="text-lg font-bold text-green-600">ATS</div>
            <div className="text-xs text-muted-foreground">Optimized</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="h-5 w-5 mx-auto mb-2 text-purple-600" />
            <div className="text-lg font-bold text-purple-600">Impact</div>
            <div className="text-xs text-muted-foreground">Focused</div>
          </CardContent>
        </Card>
      </div>

      {/* Tip Navigation Dots */}
      <div className="flex justify-center gap-2">
        {tips.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentTipIndex ? 'bg-primary' : 'bg-muted'
            }`}
            onClick={() => setCurrentTipIndex(index)}
            aria-label={`View tip ${index + 1}`}
          />
        ))}
      </div>

      {/* Additional Context */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Our AI is creating a custom version optimized for <span className="font-medium">{jobTitle}</span>
          {company !== "the company" && <span> at <span className="font-medium">{company}</span></span>}
        </p>
      </div>
    </div>
  )
}