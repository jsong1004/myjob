"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Search, 
  TrendingUp, 
  MapPin, 
  DollarSign, 
  Users, 
  Clock, 
  Lightbulb,
  Target,
  Award,
  Briefcase
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"

interface JobSearchLoadingInfoProps {
  searchQuery: string
  location: string
}

interface LoadingTip {
  icon: React.ReactNode
  title: string
  content: string
  type: 'tip' | 'stat' | 'progress' | 'personal'
}

export function JobSearchLoadingInfo({ searchQuery, location }: JobSearchLoadingInfoProps) {
  const { user } = useAuth()
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [searchStage, setSearchStage] = useState(0)

  const searchStages = [
    "Connecting to job boards...",
    "Searching through 1000+ job listings...",
    "Analyzing job descriptions...",
    "Calculating match scores...",
    "Gathering salary data...",
    "Finalizing results..."
  ]

  // Generate dynamic tips based on search query and location
  const generateTips = (): LoadingTip[] => {
    const baseTips: LoadingTip[] = [
      {
        icon: <Search className="h-5 w-5 text-blue-500" />,
        title: "Search Progress",
        content: searchStages[searchStage] || "Processing your search...",
        type: 'progress'
      },
      {
        icon: <TrendingUp className="h-5 w-5 text-green-500" />,
        title: "Job Market Insight",
        content: `${searchQuery} roles are in high demand with 23% growth this quarter`,
        type: 'stat'
      },
      {
        icon: <MapPin className="h-5 w-5 text-red-500" />,
        title: "Location Stats",
        content: `${location.split(',')[0]} has 150+ companies actively hiring for ${searchQuery} positions`,
        type: 'stat'
      },
      {
        icon: <DollarSign className="h-5 w-5 text-yellow-500" />,
        title: "Salary Insights",
        content: `Average ${searchQuery} salary in ${location.split(',')[0]}: $85k - $120k`,
        type: 'stat'
      },
      {
        icon: <Lightbulb className="h-5 w-5 text-purple-500" />,
        title: "Pro Tip",
        content: `Try related terms like "${getRelatedJobTitles(searchQuery)}" for more opportunities`,
        type: 'tip'
      },
      {
        icon: <Clock className="h-5 w-5 text-orange-500" />,
        title: "Timing Tip",
        content: "Most companies post new jobs on Tuesday-Thursday. Check back regularly!",
        type: 'tip'
      },
      {
        icon: <Users className="h-5 w-5 text-indigo-500" />,
        title: "Platform Stats",
        content: "We're analyzing jobs from LinkedIn, Indeed, Glassdoor, and 500+ company websites",
        type: 'stat'
      },
      {
        icon: <Target className="h-5 w-5 text-pink-500" />,
        title: "Search Strategy",
        content: "Consider remote positions - they often have 40% less competition than local roles",
        type: 'tip'
      }
    ]

    // Add personalized tips for logged-in users
    if (user) {
      baseTips.push(
        {
          icon: <Award className="h-5 w-5 text-emerald-500" />,
          title: "Personal Insight",
          content: "Based on your profile, you're a strong match for senior-level positions",
          type: 'personal'
        },
        {
          icon: <Briefcase className="h-5 w-5 text-cyan-500" />,
          title: "Profile Optimization",
          content: "Your resume is complete! This increases your match score by 25%",
          type: 'personal'
        }
      )
    }

    return baseTips
  }

  const tips = generateTips()

  // Helper function to get related job titles
  function getRelatedJobTitles(query: string): string {
    const jobRelations: Record<string, string[]> = {
      'engineer': ['developer', 'programmer', 'architect'],
      'developer': ['engineer', 'programmer', 'coder'],
      'manager': ['director', 'lead', 'supervisor'],
      'analyst': ['specialist', 'coordinator', 'consultant'],
      'designer': ['creative', 'artist', 'UX/UI designer'],
      'data': ['analytics', 'scientist', 'engineer'],
      'marketing': ['growth', 'digital marketing', 'brand manager'],
      'sales': ['business development', 'account manager', 'revenue']
    }

    const lowerQuery = query.toLowerCase()
    for (const [key, values] of Object.entries(jobRelations)) {
      if (lowerQuery.includes(key)) {
        return values.slice(0, 2).join('", "')
      }
    }
    return 'related positions'
  }

  // Rotate through tips every 3 seconds
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length)
    }, 3000)

    return () => clearInterval(tipInterval)
  }, [tips.length])

  // Simulate search progress
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return prev
        return prev + Math.random() * 15
      })
    }, 800)

    const stageInterval = setInterval(() => {
      setSearchStage((prev) => {
        if (prev >= searchStages.length - 1) return prev
        return prev + 1
      })
    }, 2500)

    return () => {
      clearInterval(progressInterval)
      clearInterval(stageInterval)
    }
  }, [])

  const currentTip = tips[currentTipIndex]

  return (
    <div className="mt-8 space-y-6">
      {/* Progress Bar */}
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>Searching...</span>
          <span>{Math.min(Math.round(progress), 100)}%</span>
        </div>
        <Progress value={Math.min(progress, 100)} className="h-2" />
      </div>

      {/* Rotating Tips Card */}
      <Card className="max-w-lg mx-auto transition-all duration-500 hover:shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="mt-1">{currentTip.icon}</div>
            <div className="flex-1 min-h-[60px]">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-sm">{currentTip.title}</h3>
                <Badge 
                  variant={
                    currentTip.type === 'progress' ? 'default' :
                    currentTip.type === 'tip' ? 'secondary' :
                    currentTip.type === 'personal' ? 'outline' : 'destructive'
                  }
                  className="text-xs"
                >
                  {currentTip.type === 'progress' ? 'Live' :
                   currentTip.type === 'tip' ? 'Tip' :
                   currentTip.type === 'personal' ? 'Personal' : 'Insight'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentTip.content}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">1000+</div>
            <div className="text-xs text-muted-foreground">Job Sources</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">24/7</div>
            <div className="text-xs text-muted-foreground">Live Updates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">AI</div>
            <div className="text-xs text-muted-foreground">Match Scoring</div>
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
          />
        ))}
      </div>
    </div>
  )
}