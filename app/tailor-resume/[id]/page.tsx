"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Send, Loader2, Save, Download, MessageSquare, FileText, Sparkles, Edit3 } from "lucide-react"
import Link from "next/link"
import { Header } from "@/components/header"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { ChatMessage } from "@/lib/types"
import { auth } from "@/lib/firebase"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Textarea } from "@/components/ui/textarea"

interface TailorResumePageProps {
  params: Promise<{ id: string }>
}

export default function TailorResumePage({ params }: TailorResumePageProps) {
  const { id } = use(params)
  const { user } = useAuth()
  const router = useRouter()

  const [job, setJob] = useState<any | null>(null)
  const [currentResume, setCurrentResume] = useState<string>("")
  const [resumeName, setResumeName] = useState<string>("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'agent' | 'ask'>("agent")
  const [defaultResume, setDefaultResume] = useState<string>("")
  const [tailoring, setTailoring] = useState(false)
  const [tailorError, setTailorError] = useState<string | null>(null)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [hasNoResume, setHasNoResume] = useState(false)

  // Fetch job data and default resume on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setTailorError(null)
      try {
        // Fetch job data directly from Firestore
        let foundJob = null
        console.log(`[TailorResume][useEffect] Fetching job data for id: ${id}`)
        const res = await fetch(`/api/jobs/${id}`)
        if (res.ok) {
          const data = await res.json()
          foundJob = data.job || null
        }
        setJob(foundJob)

        // Set resume name to "Title - Company Name" format
        if (foundJob) {
          setResumeName(`${foundJob.title} - ${foundJob.company}`)
        }

        // 2. Fetch default resume
        if (user && auth?.currentUser) {
          const token = await auth.currentUser.getIdToken()
          const res = await fetch('/api/resumes', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          if (res.ok) {
            const data = await res.json()
            const resumes = data.resumes || []
            
            if (resumes.length === 0) {
              // User has no resumes - redirect to resume upload page
              setHasNoResume(true)
              return
            }
            
            const defaultResume = resumes.find((r: any) => r.isDefault) || resumes[0]
            if (defaultResume) {
              setDefaultResume(defaultResume.content)
            }
          } else {
            // If we can't fetch resumes, assume user has no resumes
            setHasNoResume(true)
          }
        }
      } catch (err) {
        setTailorError('Failed to load job or resume data.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, user])

  // Redirect to resume upload page if user has no resumes
  useEffect(() => {
    if (hasNoResume) {
      router.push('/resumes?message=Please upload a resume first to tailor it for this job.')
    }
  }, [hasNoResume, router])

  // Tailor the resume automatically when both job and defaultResume are loaded
  useEffect(() => {
    const tailorResume = async () => {
      if (!job || !defaultResume || !user || !auth?.currentUser) return
      setTailoring(true)
      setTailorError(null)
      try {
        const token = await auth.currentUser.getIdToken()
        const res = await fetch("/api/openrouter/tailor-resume", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            message: "Tailor this resume for the following job. Do not change unless necessary.",
            resume: defaultResume,
            jobTitle: job.title,
            company: job.company,
            jobDescription: job.fullDescription || job.description || "",
            mode: "agent",
          }),
        })
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
          console.error('AI service error:', errorData)
          throw new Error(`AI service error: ${errorData.error || 'Unknown error'}`)
        }
        const data = await res.json()
        setCurrentResume(data.updatedResume || defaultResume)
        setChatMessages([
    {
      id: "1",
      type: "ai",
            content: `Here's your tailored resume for the ${job.title} position at ${job.company}. You can review it and ask me to make any adjustments!`,
      timestamp: new Date(),
    },
  ])
      } catch (err) {
        console.error('Tailor resume error:', err)
        setTailorError('Sorry, there was a problem with the AI service. Please try again later.')
        setCurrentResume(defaultResume)
      } finally {
        setTailoring(false)
      }
    }
    tailorResume()
  }, [job, defaultResume, user])

  // Generate AI suggestions based on job description
  useEffect(() => {
    const generateSuggestions = async () => {
      if (!job || !job.description || !user || !auth?.currentUser) return
      
      try {
        const token = await auth.currentUser.getIdToken()
        const res = await fetch("/api/openrouter/tailor-resume", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            message: "Generate 3 short, specific suggestions for improving a resume for this job. Each suggestion should be one sentence and actionable. Format as a JSON array of strings.",
            jobTitle: job.title,
            company: job.company,
            jobDescription: job.fullDescription || job.description || "",
            mode: "ask",
          }),
        })
        
        if (res.ok) {
          const data = await res.json()
          try {
            // Try to parse the AI response as JSON array
            const suggestions = JSON.parse(data.reply)
            if (Array.isArray(suggestions)) {
              setAiSuggestions(suggestions.slice(0, 3)) // Take first 3 suggestions
            }
          } catch {
            // If parsing fails, use default suggestions
            setAiSuggestions([
              "Make the professional summary more concise",
              "Add more specific metrics and achievements", 
              "Highlight relevant technical skills"
            ])
          }
        }
      } catch (err) {
        // Use default suggestions if AI call fails
        setAiSuggestions([
          "Make the professional summary more concise",
          "Add more specific metrics and achievements",
          "Highlight relevant technical skills"
        ])
      }
    }
    
    generateSuggestions()
  }, [job, user])

  const handleSendMessage = async () => {
    console.log("handleSendMessage called", { newMessage, job });
    if (!newMessage.trim() || !job || !user || !auth?.currentUser) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: newMessage,
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, userMessage])
    setNewMessage("")
    setIsProcessing(true)

    try {
      const token = await auth.currentUser.getIdToken()
      // Call OpenRouter API for AI resume tailoring or Q&A
      const res = await fetch("/api/openrouter/tailor-resume", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: newMessage,
          resume: currentResume,
          jobTitle: job.title,
          company: job.company,
          jobDescription: job.fullDescription || job.description || "",
          mode, // pass mode to backend
        }),
      })
      if (!res.ok) throw new Error("AI service error")
      const data = await res.json()
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: data.reply || "AI could not process your request.",
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, aiResponse])
      if (mode === "agent" && data.updatedResume) {
        setCurrentResume(data.updatedResume)
        // Exit edit mode when AI makes changes
        setIsEditMode(false)
      }
      // In 'ask' mode, do not update resume
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          type: "ai",
          content: "Sorry, there was a problem with the AI service. Please try again later.",
          timestamp: new Date(),
        },
      ])
    }
    setIsProcessing(false)
  }

  const handleDownloadResume = () => {
    if (!currentResume || !resumeName) return
    
    // Create markdown content
    const markdownContent = `# ${resumeName}\n\n${currentResume}`
    
    // Create blob and download
    const blob = new Blob([markdownContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${resumeName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleSaveResume = async () => {
    if (!user || !auth?.currentUser || !currentResume || !resumeName) {
      alert("Please sign in and ensure resume content is available")
      return
    }

    setIsSaving(true)
    try {
      const token = await auth.currentUser.getIdToken()
      const res = await fetch('/api/resumes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: resumeName,
          content: currentResume,
          type: 'tailored',
          jobTitle: job?.title || '',
          jobId: id,
          isDefault: false
        })
      })
      
      if (res.ok) {
        alert("Resume saved successfully!")
      } else {
        const error = await res.json()
        alert(`Failed to save resume: ${error.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Save error:', err)
      alert("Failed to save resume. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading || tailoring) {
    return (
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto text-center py-20 text-gray-500">
              {loading ? 'Loading tailored resume...' : 'Tailoring your resume for this job...'}
            </div>
          </div>
        </div>
      </AuthProvider>
    )
  }

  if (tailorError || !job) {
    return (
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto text-center py-20 text-red-500">
              {tailorError || 'Unable to load job information. Please return to the job search and try again.'}
            </div>
          </div>
        </div>
      </AuthProvider>
    )
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link href={`/jobs/${id}`}>
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Job Details
              </Button>
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-8 w-8 text-blue-600" />
                  Tailor Resume
                </h1>
                <p className="text-gray-600">
                  AI-powered resume customization for {job?.title || "the selected job"} at {job?.company || "the company"}
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={handleDownloadResume}
                  disabled={!currentResume || !resumeName}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button 
                  onClick={handleSaveResume} 
                  disabled={!currentResume || !resumeName || !user || isSaving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Resume"}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resume Preview */}
            <Card className="h-fit">
              <CardHeader>
                <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Tailored Resume Preview
                </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsEditMode(!isEditMode)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    {isEditMode ? "View" : "Edit"}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={resumeName}
                    onChange={(e) => setResumeName(e.target.value)}
                    className="text-sm"
                    placeholder="Resume name"
                  />
                  <Badge variant="secondary">Draft</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {isEditMode ? (
                  <Textarea
                    value={currentResume}
                    onChange={(e) => setCurrentResume(e.target.value)}
                    className="min-h-[600px] font-mono text-sm"
                    placeholder="Edit your resume content here..."
                  />
                ) : (
                  <div className="bg-white border rounded-lg p-6 max-h-[600px] overflow-y-auto prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentResume}</ReactMarkdown>
                </div>
                )}
              </CardContent>
            </Card>

            {/* Chat Interface */}
            <Card className="flex flex-col h-[700px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  AI Resume Assistant
                </CardTitle>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm text-gray-600">Mode:</span>
                  <ToggleGroup type="single" value={mode} onValueChange={v => v && setMode(v as 'agent' | 'ask')}>
                    <ToggleGroupItem value="agent">Agent (Edit Resume)</ToggleGroupItem>
                    <ToggleGroupItem value="ask">Ask (Q&A Only)</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {mode === 'agent'
                    ? 'Give instructions to edit your resume. Example: "Make the summary shorter".'
                    : 'Ask questions about your resume or the job. Example: "What skills should I highlight?"'}
                </p>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                {/* Debug: Show job object */}
                <div className="mb-2">
                  <details>
                    <summary className="text-xs text-gray-400 cursor-pointer">Debug: Job object</summary>
                    <pre className="text-xs bg-gray-50 p-2 rounded border border-gray-100 max-h-40 overflow-auto">{JSON.stringify(job, null, 2)}</pre>
                  </details>
                </div>
                {/* Chat Messages */}
                <div className="flex-1 space-y-4 mb-4 overflow-y-auto">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.type === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                        </div>
                        <p className={`text-xs mt-1 ${message.type === "user" ? "text-blue-100" : "text-gray-500"}`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-gray-600">AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="mb-4" />

                {/* Message Input */}
                {job ? (
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Ask me to modify your resume..."
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    disabled={isProcessing}
                  />
                    <Button onClick={handleSendMessage} disabled={isProcessing || !newMessage.trim() || !job}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                ) : (
                  <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded p-3 mt-2">
                    Unable to load job information. Please return to the job search and try again.<br/>
                    (The chat is disabled until a job is loaded.)
                  </div>
                )}

                {/* Quick Actions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {aiSuggestions.map((suggestion, index) => (
                  <Button
                      key={index}
                    variant="outline"
                    size="sm"
                      onClick={() => setNewMessage(suggestion)}
                    disabled={isProcessing}
                      className="text-left justify-start"
                  >
                      {suggestion.length > 30 ? suggestion.substring(0, 30) + '...' : suggestion}
                  </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      </div>
    </AuthProvider>
  )
}
