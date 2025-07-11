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
  const [isEdit, setIsEdit] = useState(false)
  const [isReadyForGeneration, setIsReadyForGeneration] = useState(false)
  const { toast } = useToast()

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !auth || !auth.currentUser) return;

      setLoading(true)
      setGenerateError(null)
      const token = await auth.currentUser.getIdToken()

      try {
        // First, try to fetch as a Cover Letter ID
        const coverLetterRes = await fetch(`/api/cover-letters/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (coverLetterRes.ok) {
          // EDIT MODE
          setIsEdit(true)
          const coverLetterData = await coverLetterRes.json()
          
          setCurrentCoverLetter(coverLetterData.content)
          setLetterName(coverLetterData.name)
          
          // Fetch associated job data, but don't fail if it's not found
          if (coverLetterData.jobId) {
            const jobRes = await fetch(`/api/jobs/${coverLetterData.jobId}`, {
               headers: { 'Authorization': `Bearer ${token}` }
            })
            if (jobRes.ok) {
              const jobData = await jobRes.json()
              setJob(jobData.job || null)
            } else {
              // Job not found is not a fatal error for editing an existing CL
              console.warn(`Associated job with id ${coverLetterData.jobId} not found.`);
              setJob(null); // Explicitly set to null
            }
          }
        } else {
          // GENERATION MODE
          setIsEdit(false)
          // Fetch job data directly using id as jobId
          const res = await fetch(`/api/jobs/${id}`)
          if (res.ok) {
            const data = await res.json()
            const foundJob = data.job || null
            setJob(foundJob)
            if (foundJob) {
              setLetterName(`Cover Letter - ${foundJob.company}`)
            }
          } else {
             // If job isn't found in generation mode, it's a critical error
             setJob(null)
             // We will handle the display of "Job not found" in the render logic
          }
          
          // Fetch default resume for generation (only if job was found)
          if (res.ok) {
            const resumeRes = await fetch('/api/resumes', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            })
            if (resumeRes.ok) {
              const resumeData = await resumeRes.json()
              const defaultResume = resumeData.resumes?.find((r: any) => r.isDefault) || resumeData.resumes?.[0]
              if (defaultResume) {
                setDefaultResume(defaultResume.content)
                setIsReadyForGeneration(true) // Ready to generate now
              } else {
                  // No resume found, which is needed for generation
                  setGenerateError("Could not find a default resume to use for generating the cover letter. Please create or set a default resume.");
              }
            } else {
              throw new Error('Failed to fetch resume data.')
            }
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err)
        setGenerateError('Failed to load required data. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, user])

  // Generate cover letter automatically when in GENERATION mode
  useEffect(() => {
    // Only run if we are NOT in edit mode and have the necessary data
    if (!isReadyForGeneration || isEdit || !job || !defaultResume || !user) return

    const generateCoverLetter = async () => {
       if (!auth || !auth.currentUser) {
         setGenerateError("User not authenticated.");
         return;
       }
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
  }, [job, defaultResume, user, isEdit, isReadyForGeneration])



  const handleSendMessage = async () => {
    console.log("handleSendMessage called", { newMessage, job });
    if (!newMessage.trim() || !user) return

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
      if (!auth || !auth.currentUser) {
        throw new Error("User not authenticated.");
      }
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
          jobTitle: job?.title || 'N/A',
          company: job?.company || 'N/A',
          jobDescription: job?.fullDescription || job?.description || "",
          mode: mode,
          coverLetter: currentCoverLetter,
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

  const handleDownloadCoverLetter = async () => {
    if (!currentCoverLetter) return
    
    try {
      // Format cover letter content as markdown
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      })

      const markdownContent = `# Cover Letter

**Date:** ${currentDate}

**To:** ${job?.company || 'Company'}  
**Position:** ${job?.title || 'Position'}

---

${currentCoverLetter}`

      // Create a markdown file and convert to PDF
      const markdownFile = new File([markdownContent], 'temp.md', { type: 'text/markdown' })
      const formData = new FormData()
      formData.append('file', markdownFile)
      
      const response = await fetch('/api/convert/md-to-pdf', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('PDF conversion failed')
      }
      
      // Get the PDF blob
      const pdfBlob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${letterName || 'cover-letter'}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast({
        title: "Download successful",
        description: "Cover letter downloaded as PDF.",
      })
    } catch (err) {
      console.error('Download error:', err)
      toast({
        title: "Download failed", 
        description: "Please try again.",
        variant: "destructive",
      })
    }
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
    if (!user || !auth || !auth.currentUser || !currentCoverLetter || !letterName) {
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
      
      const coverLetterData = {
        name: letterName,
        content: currentCoverLetter,
        jobTitle: job?.title || 'N/A',
        company: job?.company || 'N/A',
        jobId: job?.id || (isEdit ? null : id),
      }

      // If we are in edit mode, we use PUT to update, otherwise POST to create
      const url = isEdit ? `/api/cover-letters/${id}` : "/api/cover-letters"
      const method = isEdit ? "PUT" : "POST"
      
      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(coverLetterData)
      })

      if (res.ok) {
        toast({
          title: "Success!",
          description: "Your cover letter has been saved.",
        })
        if (!isEdit) {
            const newCoverLetter = await res.json();
            // This is a bit complex, for now, we just update the state
            setIsEdit(true);
            // Ideally, we would redirect to the new URL:
            window.history.replaceState(null, '', `/cover-letter/${newCoverLetter.id}`)
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Failed to save cover letter.' }))
        throw new Error(errorData.error)
      }
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err.message || 'An unexpected error occurred.',
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
      <>
        <Header />
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </>
    )
  }

  // If in generation mode and job not found, show error.
  // In edit mode, we can still proceed.
  if (!isEdit && !job) {
    return (
      <>
        <Header />
        <main className="container mx-auto px-4 py-12 md:py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Job Not Found</h1>
            <p className="text-muted-foreground mt-2">The job you're looking for doesn't exist.</p>
            <Button asChild className="mt-6">
              <Link href="/saved-jobs">Back to Saved Jobs</Link>
            </Button>
          </div>
        </main>
      </>
    )
  }


  return (
    <>
      <Header />
      <main className="h-screen bg-muted/20 flex flex-col">
        <div className="flex-1 flex flex-col h-full">
          <header className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/cover-letters">
                  <Button variant="outline" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Cover Letter Generator</h1>
                  {job && <p className="text-muted-foreground">{job.title} - {job.company}</p>}
                </div>
              </div>
              <Input 
                className="max-w-xs"
                placeholder="Enter a name for this cover letter"
                value={letterName}
                onChange={(e) => setLetterName(e.target.value)}
              />
            </div>
          </header>

          <div className="p-6 flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              
              {/* Cover Letter Display */}
              <div className="lg:col-span-2 h-full flex flex-col">
                <Card className="flex-1 flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Cover Letter</CardTitle>
                    <div className="flex items-center gap-2">
                       <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={() => setIsEditMode(!isEditMode)}>
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Edit</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={handleCopyCoverLetter}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Copy</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                             <Button variant="outline" size="icon" onClick={handleDownloadCoverLetter}>
                                <Download className="h-4 w-4" />
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Download</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <Button onClick={handleSaveCoverLetter} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save
                      </Button>
                    </div>
                  </CardHeader>
                  <Separator />
                  <CardContent className="p-6 flex-1">
                    {generating ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="ml-4">Generating your cover letter...</p>
                      </div>
                    ) : generateError ? (
                      <div className="text-destructive text-center h-full flex flex-col items-center justify-center">
                        <p className="mb-4">{generateError}</p>
                         <Button onClick={() => window.location.reload()}>Try Again</Button>
                      </div>
                    ) : isEditMode ? (
                      <Textarea
                        className="w-full h-full min-h-[60vh] text-base"
                        value={currentCoverLetter}
                        onChange={(e) => setCurrentCoverLetter(e.target.value)}
                      />
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                        >
                          {currentCoverLetter}
                        </ReactMarkdown>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* AI Assistant Chat */}
              <div className="h-full flex flex-col">
                <Card className="flex-1 flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> AI Assistant</CardTitle>
                     <ToggleGroup 
                        type="single" 
                        defaultValue="agent"
                        value={mode}
                        onValueChange={(value) => setMode(value as 'agent' | 'ask')}
                        className="mt-2"
                      >
                        <ToggleGroupItem value="agent" aria-label="Agent Mode">Agent Mode</ToggleGroupItem>
                        <ToggleGroupItem value="ask" aria-label="Ask Mode">Ask Mode</ToggleGroupItem>
                      </ToggleGroup>
                  </CardHeader>
                  <Separator />
                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                     {chatMessages.length === 0 && !generating && (
                        <div className="text-center text-muted-foreground pt-8">
                          {isEdit 
                            ? "You can ask the assistant to make changes to your cover letter."
                            : "Your generated cover letter will appear here. You can then ask for edits."
                          }
                        </div>
                      )}
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex items-start gap-3 ${
                          message.type === "user" ? "justify-end" : ""
                        }`}
                      >
                        <div
                          className={`rounded-lg px-4 py-2 max-w-[80%] ${
                            message.type === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs text-muted-foreground/80 mt-1 text-right">
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                     {isProcessing && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Assistant is typing...</span>
                        </div>
                    )}
                  </CardContent>
                  <div className="p-4 border-t">
                    <div className="relative">
                      <Textarea
                        placeholder="Ask me to improve your cover letter..."
                        className="pr-16"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                      />
                      <Button
                        type="submit"
                        size="icon"
                        className="absolute top-1/2 -translate-y-1/2 right-3"
                        onClick={handleSendMessage}
                        disabled={isProcessing || !newMessage.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
} 