"use client"

import { use, useState, useEffect } from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Send, Loader2, Download, MessageSquare, FileText, Edit3, Copy, Save } from "lucide-react"
import Link from "next/link"
import { Header } from "@/components/header"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { ChatMessage } from "@/lib/types"
import { auth } from "@/lib/firebase"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface CoverLetterPageProps {
  params: Promise<{ id: string }>
}

export default function CoverLetterPage({ params }: CoverLetterPageProps) {
  const { id } = use(params)
  const { user } = useAuth()

  const [job, setJob] = useState<any | null>(null)
  const [currentCoverLetter, setCurrentCoverLetter] = useState<string>("")
  const [letterName, setLetterName] = useState<string>("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'agent' | 'ask'>("agent")
  const [defaultResume, setDefaultResume] = useState<string>("")
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  // Fetch job data and default resume on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setGenerateError(null)
      try {
        // Fetch job data directly from Firestore
        let foundJob = null
        console.log(`[CoverLetter][useEffect] Fetching job data for id: ${id}`)
        const res = await fetch(`/api/jobs/${id}`)
        if (res.ok) {
          const data = await res.json()
          foundJob = data.job || null
        }
        setJob(foundJob)

        // Set letter name to "Cover Letter - Company Name" format
        if (foundJob) {
          setLetterName(`Cover Letter - ${foundJob.company}`)
        }

        // Fetch default resume
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
            const defaultResume = data.resumes?.find((r: any) => r.isDefault) || data.resumes?.[0]
            if (defaultResume) {
              setDefaultResume(defaultResume.content)
            }
          }
        }
      } catch (err) {
        setGenerateError('Failed to load job or resume data.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, user])

  // Generate cover letter automatically when both job and defaultResume are loaded
  useEffect(() => {
    const generateCoverLetter = async () => {
      if (!job || !defaultResume || !user || !auth?.currentUser) return
      setGenerating(true)
      setGenerateError(null)
      try {
        const token = await auth.currentUser.getIdToken()
        const res = await fetch("/api/openrouter/cover-letter", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            message: "You are a professional cover letter writing assistant. Your primary objective is to create compelling, personalized cover letters that effectively connect a candidate's qualifications with the requirements of a specific job opportunity. Create a professional, tailored cover letter that demonstrates clear alignment between my qualifications and this job's requirements. Use standard business letter format with proper salutation, 3-4 paragraph structure, and professional tone. Highlight my most relevant skills and achievements that directly match the job requirements. Keep it to one page (300-400 words) and ensure it's error-free and ready for submission.",
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
        setCurrentCoverLetter(data.coverLetter || "")
        setChatMessages([
          {
            id: "1",
            type: "ai",
            content: `Here's your personalized cover letter for the ${job.title} position at ${job.company}. You can review it and ask me to make any adjustments!`,
            timestamp: new Date(),
          },
        ])
      } catch (err) {
        console.error('Generate cover letter error:', err)
        setGenerateError('Sorry, there was a problem with the AI service. Please try again later.')
        setCurrentCoverLetter("")
      } finally {
        setGenerating(false)
      }
    }
    generateCoverLetter()
  }, [job, defaultResume, user])



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
      const res = await fetch("/api/openrouter/cover-letter", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: newMessage,
          resume: defaultResume,
          jobTitle: job.title,
          company: job.company,
          jobDescription: job.fullDescription || job.description || "",
          mode: mode,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`AI service error: ${errorData.error || 'Unknown error'}`)
      }

      const data = await res.json()
      console.log("AI response:", data)

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: data.reply || "I apologize, but I couldn't process your request. Please try again.",
        timestamp: new Date(),
      }

      setChatMessages((prev) => [...prev, aiMessage])

      // Update cover letter if in agent mode and new cover letter is provided
      if (mode === "agent" && data.coverLetter) {
        setCurrentCoverLetter(data.coverLetter)
      }
    } catch (err) {
      console.error("Error sending message:", err)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: "Sorry, there was an error processing your request. Please try again.",
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownloadCoverLetter = () => {
    if (!currentCoverLetter) return
    
    const element = document.createElement("a")
    const file = new Blob([currentCoverLetter], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `${letterName || 'cover-letter'}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const handleCopyCoverLetter = async () => {
    if (!currentCoverLetter) return
    
    try {
      await navigator.clipboard.writeText(currentCoverLetter)
      toast({
        title: "Copied to clipboard",
        description: "Cover letter has been copied to your clipboard.",
      })
    } catch (err) {
      console.error('Failed to copy:', err)
      toast({
        title: "Copy failed",
        description: "Please try again or copy manually.",
        variant: "destructive",
      })
    }
  }

  const handleSaveCoverLetter = async () => {
    if (!user || !auth?.currentUser || !currentCoverLetter || !letterName || !job) {
      toast({
        title: "Save failed",
        description: "Please ensure all required information is available.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const token = await auth.currentUser.getIdToken()
      const res = await fetch('/api/cover-letters', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: letterName,
          content: currentCoverLetter,
          jobTitle: job.title,
          company: job.company,
          jobId: job.id || id,
        })
      })

      if (res.ok) {
        toast({
          title: "Saved successfully",
          description: "Cover letter has been saved to your library.",
        })
        // Add AI message to chat
        setChatMessages((prev) => [...prev, {
          id: Date.now().toString(),
          type: "ai",
          content: "✅ Cover letter saved successfully to your library!",
          timestamp: new Date(),
        }])
      } else {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to save cover letter')
      }
    } catch (err) {
      console.error('Save error:', err)
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }



  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }



  if (loading) {
    return (
      <AuthProvider>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </AuthProvider>
    )
  }

  if (!job) {
    return (
      <AuthProvider>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Job Not Found</h1>
            <p className="text-muted-foreground mb-4">The job you're looking for doesn't exist.</p>
            <Button asChild>
              <Link href="/saved-jobs">Back to Saved Jobs</Link>
            </Button>
          </div>
        </main>
      </AuthProvider>
    )
  }

  return (
    <AuthProvider>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" asChild>
                <Link href="/saved-jobs">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Cover Letter Generator</h1>
                <p className="text-muted-foreground">
                  {job.title} at {job.company}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Letter name..."
                value={letterName}
                onChange={(e) => setLetterName(e.target.value)}
                className="w-64"
              />
            </div>
          </div>

          {/* Error State */}
          {generateError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{generateError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side - Cover Letter */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Cover Letter
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditMode(!isEditMode)}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      {isEditMode ? "Preview" : "Edit"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyCoverLetter}
                      disabled={!currentCoverLetter}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadCoverLetter}
                            disabled={!currentCoverLetter}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download Cover Letter</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveCoverLetter}
                      disabled={!currentCoverLetter || isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {generating ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Generating your cover letter...</p>
                      </div>
                    </div>
                  ) : isEditMode ? (
                    <Textarea
                      value={currentCoverLetter}
                      onChange={(e) => setCurrentCoverLetter(e.target.value)}
                      className="min-h-[400px] font-mono"
                      placeholder="Your cover letter will appear here..."
                    />
                                     ) : (
                     <div className="prose max-w-none whitespace-pre-wrap">
                       <ReactMarkdown
                         remarkPlugins={[remarkGfm]}
                       >
                         {currentCoverLetter || "Your cover letter will appear here..."}
                       </ReactMarkdown>
                     </div>
                   )}
                </CardContent>
              </Card>
            </div>

            {/* Right Side - Chat */}
            <div className="space-y-4">
              {/* Chat */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    AI Assistant
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <ToggleGroup type="single" value={mode} onValueChange={(value) => value && setMode(value as 'agent' | 'ask')}>
                      <ToggleGroupItem value="agent" className="text-xs">
                        Agent Mode
                      </ToggleGroupItem>
                      <ToggleGroupItem value="ask" className="text-xs">
                        Ask Mode
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Messages */}
                    <div className="h-64 overflow-y-auto space-y-3 p-3 bg-muted/50 rounded-lg">
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                            msg.type === 'user' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-background border'
                          }`}>
                            <p className="text-sm">{msg.content}</p>
                            <p className="text-xs opacity-70 mt-1">{formatTime(msg.timestamp)}</p>
                          </div>
                        </div>
                      ))}
                      {isProcessing && (
                        <div className="flex justify-start">
                          <div className="bg-background border rounded-lg px-3 py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Input */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ask me to improve your cover letter..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        disabled={isProcessing}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleSendMessage}
                        disabled={isProcessing || !newMessage.trim()}
                        size="icon"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </AuthProvider>
  )
} 