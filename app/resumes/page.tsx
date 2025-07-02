"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FileText, Upload, Star, Edit, Trash2, Plus, Calendar, Download } from "lucide-react"

interface Resume {
  id: string
  name: string
  isDefault: boolean
  createdAt: string
  type: "original" | "tailored" | "draft"
  jobTitle?: string
  content: string
}

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([
    {
      id: "1",
      name: "My Default Resume",
      isDefault: true,
      createdAt: "2024-06-15",
      type: "original",
      content: "John Doe\nSenior Frontend Developer\n\nExperience:\n- 5 years of React development...",
    },
    {
      id: "2",
      name: "Senior Frontend Developer - TechCorp",
      isDefault: false,
      createdAt: "2024-07-01",
      type: "tailored",
      jobTitle: "Senior Frontend Developer",
      content: "John Doe\nSenior Frontend Developer\n\nTailored for TechCorp position...",
    },
    {
      id: "3",
      name: "Full Stack Engineer - StartupXYZ (Draft)",
      isDefault: false,
      createdAt: "2024-06-28",
      type: "draft",
      jobTitle: "Full Stack Engineer",
      content: "John Doe\nFull Stack Engineer\n\nDraft version for StartupXYZ...",
    },
  ])

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [editingResume, setEditingResume] = useState<Resume | null>(null)
  const [newResumeName, setNewResumeName] = useState("")
  const [newResumeContent, setNewResumeContent] = useState("")

  const handleSetDefault = (resumeId: string) => {
    setResumes(
      resumes.map((resume) => ({
        ...resume,
        isDefault: resume.id === resumeId,
      })),
    )
  }

  const handleDeleteResume = (resumeId: string) => {
    setResumes(resumes.filter((resume) => resume.id !== resumeId))
  }

  const handleUploadResume = () => {
    if (newResumeName && newResumeContent) {
      const newResume: Resume = {
        id: Date.now().toString(),
        name: newResumeName,
        isDefault: resumes.length === 0,
        createdAt: new Date().toISOString().split("T")[0],
        type: "original",
        content: newResumeContent,
      }
      setResumes([...resumes, newResume])
      setNewResumeName("")
      setNewResumeContent("")
      setIsUploadDialogOpen(false)
    }
  }

  const handleEditResume = (resume: Resume) => {
    setEditingResume(resume)
    setNewResumeName(resume.name)
    setNewResumeContent(resume.content)
  }

  const handleSaveEdit = () => {
    if (editingResume && newResumeName && newResumeContent) {
      setResumes(
        resumes.map((resume) =>
          resume.id === editingResume.id ? { ...resume, name: newResumeName, content: newResumeContent } : resume,
        ),
      )
      setEditingResume(null)
      setNewResumeName("")
      setNewResumeContent("")
    }
  }

  const getTypeColor = (type: Resume["type"]) => {
    switch (type) {
      case "original":
        return "bg-blue-50 text-blue-700"
      case "tailored":
        return "bg-green-50 text-green-700"
      case "draft":
        return "bg-orange-50 text-orange-700"
      default:
        return "bg-gray-50 text-gray-700"
    }
  }

  const getTypeLabel = (type: Resume["type"]) => {
    switch (type) {
      case "original":
        return "Original"
      case "tailored":
        return "Tailored"
      case "draft":
        return "Draft"
      default:
        return "Unknown"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Resumes</h1>
              <p className="text-gray-600">Manage your resumes and create tailored versions for specific jobs</p>
            </div>

            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Resume
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Resume</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Resume Name</label>
                    <Input
                      placeholder="e.g., My Default Resume"
                      value={newResumeName}
                      onChange={(e) => setNewResumeName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Resume Content</label>
                    <Textarea
                      placeholder="Paste your resume content here..."
                      value={newResumeContent}
                      onChange={(e) => setNewResumeContent(e.target.value)}
                      rows={10}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUploadResume}>
                      <Upload className="mr-2 h-4 w-4" />
                      Add Resume
                    </Button>
                    <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Resumes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume) => (
              <Card key={resume.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {resume.name}
                        {resume.isDefault && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                      </CardTitle>
                      {resume.jobTitle && <p className="text-sm text-gray-600 mt-1">For: {resume.jobTitle}</p>}
                    </div>
                    <Badge className={getTypeColor(resume.type)}>{getTypeLabel(resume.type)}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    Created {formatDate(resume.createdAt)}
                  </div>

                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <p className="line-clamp-3">{resume.content.substring(0, 150)}...</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!resume.isDefault && (
                      <Button variant="outline" size="sm" onClick={() => handleSetDefault(resume.id)}>
                        <Star className="mr-1 h-3 w-3" />
                        Set Default
                      </Button>
                    )}

                    <Button variant="outline" size="sm" onClick={() => handleEditResume(resume)}>
                      <Edit className="mr-1 h-3 w-3" />
                      Edit
                    </Button>

                    <Button variant="outline" size="sm">
                      <Download className="mr-1 h-3 w-3" />
                      Download
                    </Button>

                    {!resume.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteResume(resume.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Edit Resume Dialog */}
          <Dialog open={!!editingResume} onOpenChange={() => setEditingResume(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Resume</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Resume Name</label>
                  <Input value={newResumeName} onChange={(e) => setNewResumeName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Resume Content</label>
                  <Textarea value={newResumeContent} onChange={(e) => setNewResumeContent(e.target.value)} rows={10} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveEdit}>Save Changes</Button>
                  <Button variant="outline" onClick={() => setEditingResume(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Empty State */}
          {resumes.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No resumes yet</h3>
                <p className="text-gray-600 mb-4">
                  Upload your first resume to start finding matching jobs and creating tailored versions.
                </p>
                <Button onClick={() => setIsUploadDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Resume
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
