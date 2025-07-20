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
  Mail,
  Award,
  Edit3,
  AlertCircle,
  MessageSquare
} from "lucide-react"

interface CoverLetterLoadingInfoProps {
  jobTitle?: string
  company?: string
}

interface LoadingTip {
  icon: React.ReactNode
  title: string
  content: string
  type: 'tip' | 'stat' | 'progress' | 'warning' | 'best-practice'
}

export function CoverLetterLoadingInfo({ 
  jobTitle = "this position", 
  company = "the company"
}: CoverLetterLoadingInfoProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [aiStage, setAiStage] = useState(0)

  const aiStages = [
    "Analyzing job requirements...",
    "Reviewing your resume...",
    "Researching company culture...",
    "Crafting opening paragraph...",
    "Highlighting key achievements...",
    "Creating compelling closing...",
    "Polishing final draft..."
  ]

  // Generate dynamic tips for cover letter creation
  const generateTips = (): LoadingTip[] => {
    const tips: LoadingTip[] = [
      {
        icon: <Brain className="h-5 w-5 text-purple-500" />,
        title: "AI Processing",
        content: aiStages[aiStage] || "Creating your cover letter...",
        type: 'progress'
      },
      {
        icon: <Target className="h-5 w-5 text-blue-500" />,
        title: "Personalization Key",
        content: `Mentioning ${company} specifically increases response rates by 50%`,
        type: 'stat'
      },
      {
        icon: <Mail className="h-5 w-5 text-green-500" />,
        title: "Cover Letter Fact",
        content: "83% of recruiters say a great cover letter can secure an interview despite a weak resume",
        type: 'stat'
      },
      {
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        title: "Best Practice",
        content: "Keep it to one page - hiring managers spend only 30 seconds on initial review",
        type: 'best-practice'
      },
      {
        icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
        title: "Pro Tip",
        content: "Start with a compelling story or achievement rather than 'I am applying for...'",
        type: 'tip'
      },
      {
        icon: <MessageSquare className="h-5 w-5 text-indigo-500" />,
        title: "Tone Advice",
        content: `Match ${company}'s culture - research their website and social media for voice clues`,
        type: 'tip'
      },
      {
        icon: <TrendingUp className="h-5 w-5 text-orange-500" />,
        title: "Success Rate",
        content: "Tailored cover letters are 3x more likely to get responses than generic ones",
        type: 'stat'
      },
      {
        icon: <Award className="h-5 w-5 text-pink-500" />,
        title: "Achievement Focus",
        content: "Include 2-3 specific achievements with metrics to stand out",
        type: 'best-practice'
      },
      {
        icon: <Edit3 className="h-5 w-5 text-cyan-500" />,
        title: "Writing Tip",
        content: "Use active voice and action verbs - 'I increased sales' not 'Sales were increased'",
        type: 'tip'
      },
      {
        icon: <AlertCircle className="h-5 w-5 text-amber-500" />,
        title: "Don't Forget",
        content: "Address it to a specific person - 'Dear Hiring Manager' is your last resort",
        type: 'warning'
      },
      {
        icon: <Zap className="h-5 w-5 text-red-500" />,
        title: "Opening Hook",
        content: "First sentence should grab attention - mention a mutual connection or company news",
        type: 'tip'
      },
      {
        icon: <FileText className="h-5 w-5 text-gray-500" />,
        title: "Structure Tip",
        content: "Follow the STAR method: Situation, Task, Action, Result for your examples",
        type: 'best-practice'
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
      case 'progress': return 'Creating'
      case 'tip': return 'Tip'
      case 'best-practice': return 'Best Practice'
      case 'warning': return 'Important'
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
            AI Cover Letter Writer
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

      {/* Cover Letter Writing Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-4 text-center">
            <Mail className="h-5 w-5 mx-auto mb-2 text-blue-600" />
            <div className="text-lg font-bold text-blue-600">Personal</div>
            <div className="text-xs text-muted-foreground">Touch</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 mx-auto mb-2 text-green-600" />
            <div className="text-lg font-bold text-green-600">Company</div>
            <div className="text-xs text-muted-foreground">Focused</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="h-5 w-5 mx-auto mb-2 text-purple-600" />
            <div className="text-lg font-bold text-purple-600">Result</div>
            <div className="text-xs text-muted-foreground">Driven</div>
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
          Creating a compelling cover letter for <span className="font-medium">{jobTitle}</span>
          {company !== "the company" && <span> at <span className="font-medium">{company}</span></span>}
        </p>
      </div>
    </div>
  )
}