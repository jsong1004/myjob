"use client"

import { use, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Send, Loader2, Save, Download, MessageSquare, FileText, Sparkles, Edit3 } from "lucide-react"
import Link from "next/link"
import { Header } from "@/components/header"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { ChatMessage, Resume } from "@/lib/types"
import { auth } from "@/lib/firebase"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface ResumeEditPageProps {
  params: Promise<{ id: string }>
}

export default function ResumeEditPage({ params }: ResumeEditPageProps) {
  const { id } = use(params)
  const { user } = useAuth()

  const [resume, setResume] = useState<Resume | null>(null)
  const [currentResume, setCurrentResume] = useState<string>("")
  const [resumeName, setResumeName] = useState<string>("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'agent' | 'ask'>("agent")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [isEditMode, setIsEditMode] = useState(false)

  // Fetch resume data on mount
  useEffect(() => {
    const fetchResume = async () => {
      if (!user || !auth?.currentUser) return

      setLoading(true)
      try {
        const token = await auth.currentUser.getIdToken()
        const res = await fetch(`/api/resumes/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (res.ok) {
          const data = await res.json()
          setResume(data.resume)
          setResumeName(data.resume.name)
          setCurrentResume(data.resume.content)
          
          // Welcome message
          setChatMessages([
            {
              id: "1",
              type: "ai",
              content: `Hi! I'm here to help you improve your resume "${data.resume.name}". You can edit the resume directly in the preview or ask me to make specific changes. What would you like to work on?`,
              timestamp: new Date(),
            },
          ])
        } else {
          setError('Failed to load resume')
        }
      } catch (err) {
        setError('Failed to load resume')
      } finally {
        setLoading(false)
      }
    }

    fetchResume()
  }, [id, user])

  // Generate AI suggestions for general resume improvement
  useEffect(() => {
    const generateSuggestions = async () => {
      if (!currentResume || !user || !auth?.currentUser) return
      
      try {
        const token = await auth.currentUser.getIdToken()
        const res = await fetch("/api/openrouter/resume-edit", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            message: "Generate 3 short, specific suggestions for improving this resume. Each suggestion should be one sentence and actionable. Format as a JSON array of strings.",
            resume: currentResume,
            mode: "ask",
          }),
        })
        
        if (res.ok) {
          const data = await res.json()
          try {
            const suggestions = JSON.parse(data.reply)
            if (Array.isArray(suggestions)) {
              setAiSuggestions(suggestions.slice(0, 3))
            }
          } catch {
            setAiSuggestions([
              "Make the professional summary more impactful",
              "Add more quantifiable achievements",
              "Improve the formatting and structure"
            ])
          }
        }
      } catch (err) {
        setAiSuggestions([
          "Make the professional summary more impactful",
          "Add more quantifiable achievements", 
          "Improve the formatting and structure"
        ])
      }
    }
    
    generateSuggestions()
  }, [currentResume])

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

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
      if (!auth?.currentUser) {
        throw new Error("User not authenticated")
      }
      const token = await auth.currentUser.getIdToken()
      const res = await fetch("/api/openrouter/resume-edit", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: newMessage,
          resume: currentResume, // Use the current resume content (including manual edits)
          mode,
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

  const handleSaveResume = async () => {
    if (!user || !auth?.currentUser || !currentResume || !resumeName) {
      setError("Please ensure resume content is available")
      return
    }

    setSaving(true)
    try {
      const token = await auth.currentUser.getIdToken()
      const res = await fetch(`/api/resumes/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: resumeName,
          content: currentResume,
          isDefault: resume?.isDefault || false
        })
      })

      if (res.ok) {
        setChatMessages((prev) => [...prev, {
          id: Date.now().toString(),
          type: "ai",
          content: "✅ Resume saved successfully!",
          timestamp: new Date(),
        }])
      } else {
        setError('Failed to save resume')
      }
    } catch (err) {
      setError('Failed to save resume')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadResume = async () => {
    if (!currentResume || !resumeName) return
    
    try {
      // Create markdown content with title
      const markdownContent = `# ${resumeName}\n\n${currentResume}`
      
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
      link.download = `${resumeName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
      setError('Failed to download resume as PDF. Please try again.')
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto text-center py-20 text-gray-500">
              Loading resume...
            </div>
          </div>
        </div>
      </AuthProvider>
    )
  }

  if (error || !resume) {
    return (
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto text-center py-20 text-red-500">
              {error || 'Resume not found'}
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
              <Link href="/resumes">
                <Button variant="ghost" className="mb-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Resumes
                </Button>
              </Link>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="h-8 w-8 text-blue-600" />
                    AI Resume Editor
                  </h1>
                  <p className="text-gray-600">
                    AI-powered resume editing and improvement
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
                    disabled={!currentResume || !resumeName || saving}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Resume"}
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
                      Resume Preview
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
                    <Badge variant="secondary" className={resume.type === 'tailored' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}>
                      {resume.type === 'tailored' ? 'Tailored' : 'Original'}
                    </Badge>
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
                    <div className="bg-white border rounded-lg p-6 max-h-[600px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">{currentResume}</pre>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Chat Interface */}
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
                      : 'Ask questions about your resume or career advice. Example: "What skills should I highlight?"'}
                  </p>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
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
                          <p className="text-sm">{message.content}</p>
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
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Ask me to improve your resume..."
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      disabled={isProcessing}
                    />
                    <Button onClick={handleSendMessage} disabled={isProcessing || !newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>

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