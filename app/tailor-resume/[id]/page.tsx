"use client"

import { use, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Send, Loader2, Save, Download, MessageSquare, FileText, Sparkles } from "lucide-react"
import Link from "next/link"

interface ChatMessage {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: Date
}

interface TailorResumePageProps {
  params: Promise<{ id: string }>
}

export default function TailorResumePage({ params }: TailorResumePageProps) {
  const { id } = use(params)

  // Mock job data
  const job = {
    id: "1",
    title: "Senior Frontend Developer",
    company: "TechCorp Inc.",
    location: "San Francisco, CA",
  }

  const [currentResume, setCurrentResume] = useState(`John Doe
Senior Frontend Developer
Email: john.doe@email.com | Phone: (555) 123-4567
LinkedIn: linkedin.com/in/johndoe | GitHub: github.com/johndoe

PROFESSIONAL SUMMARY
Experienced Frontend Developer with 4+ years of expertise in React, JavaScript, and modern web technologies. Passionate about creating responsive, user-friendly applications with clean, maintainable code.

TECHNICAL SKILLS
• Frontend: React, TypeScript, JavaScript (ES6+), HTML5, CSS3, Sass
• State Management: Redux, Context API
• Testing: Jest, React Testing Library
• Tools: Git, Webpack, npm/yarn, VS Code
• Design: Responsive Design, CSS Grid, Flexbox

PROFESSIONAL EXPERIENCE

Frontend Developer | WebSolutions Inc. | 2020 - Present
• Developed and maintained 5+ React applications serving 10,000+ users
• Collaborated with UX/UI designers to implement pixel-perfect designs
• Improved application performance by 30% through code optimization
• Mentored 2 junior developers on React best practices

Junior Frontend Developer | StartupTech | 2019 - 2020
• Built responsive web components using React and CSS
• Participated in agile development process and daily standups
• Contributed to company's design system and component library

EDUCATION
Bachelor of Science in Computer Science
State University | 2015 - 2019

PROJECTS
• Personal Portfolio Website - React, TypeScript, Tailwind CSS
• E-commerce Dashboard - React, Redux, Chart.js
• Weather App - React, API Integration, Responsive Design`)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "ai",
      content: `I've created a tailored version of your resume for the ${job.title} position at ${job.company}. Here are the key improvements I made:

• Enhanced your professional summary to emphasize 4+ years of React experience
• Highlighted relevant technical skills that match the job requirements
• Emphasized your experience with responsive design and performance optimization
• Added specific metrics to demonstrate your impact

The resume is now better aligned with the job requirements. You can review it and ask me to make any adjustments!`,
      timestamp: new Date(),
    },
  ])

  const [newMessage, setNewMessage] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [resumeName, setResumeName] = useState(`${job.title} - ${job.company}`)

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

    // Mock AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: `I've updated your resume based on your request: "${newMessage}". The changes have been applied to the resume content. You can review the updated version and let me know if you need any further adjustments.`,
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, aiResponse])
      setIsProcessing(false)
    }, 2000)
  }

  const handleSaveResume = () => {
    // Mock save functionality
    alert(`Resume saved as "${resumeName}"`)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
                  AI-powered resume customization for {job.title} at {job.company}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button onClick={handleSaveResume}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Resume
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Resume Preview */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Tailored Resume Preview
                </CardTitle>
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
                <div className="bg-white border rounded-lg p-6 max-h-[600px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">{currentResume}</pre>
                </div>
              </CardContent>
            </Card>

            {/* Chat Interface */}
            <Card className="flex flex-col h-[700px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  AI Resume Assistant
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Chat with AI to refine your resume. Try commands like "make the summary shorter" or "emphasize my
                  React experience"
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
                    placeholder="Ask me to modify your resume..."
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    disabled={isProcessing}
                  />
                  <Button onClick={handleSendMessage} disabled={isProcessing || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewMessage("Make the professional summary more concise")}
                    disabled={isProcessing}
                  >
                    Shorten summary
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewMessage("Emphasize my React and TypeScript experience")}
                    disabled={isProcessing}
                  >
                    Highlight React skills
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewMessage("Add more specific metrics and achievements")}
                    disabled={isProcessing}
                  >
                    Add metrics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
