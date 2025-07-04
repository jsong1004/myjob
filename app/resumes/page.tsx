"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FileText, Upload, Star, Edit, Trash2, Plus, Calendar, Download, Loader2, AlertCircle } from "lucide-react"
import { Header } from "@/components/header"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { Resume } from "@/lib/types"
import { auth } from "@/lib/firebase"
import Link from "next/link"

export default function ResumesPage() {
  return (
    <AuthProvider>
      <ResumesPageContent />
    </AuthProvider>
  )
}

function ResumesPageContent() {
  const { user } = useAuth()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [editingResume, setEditingResume] = useState<Resume | null>(null)
  const [newResumeName, setNewResumeName] = useState("")
  const [newResumeContent, setNewResumeContent] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadMethod, setUploadMethod] = useState<'file' | 'text'>('file')
  const [error, setError] = useState<string | null>(null)

  // Fetch resumes on component mount
  useEffect(() => {
    if (user) {
      fetchResumes()
    }
  }, [user])

  const getAuthToken = async () => {
    if (!auth?.currentUser) return null
    try {
      return await auth.currentUser.getIdToken()
    } catch (error) {
      console.error('Failed to get auth token:', error)
      return null
    }
  }

  const fetchResumes = async () => {
    try {
      console.log('fetchResumes: Starting, user:', user?.email)
      console.log('fetchResumes: auth.currentUser:', auth?.currentUser?.email)
      
      const token = await getAuthToken()
      if (!token) {
        console.log('fetchResumes: No auth token available')
        return
      }

      console.log('fetchResumes: Got auth token, making API call')
      const response = await fetch('/api/resumes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('fetchResumes: API response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('fetchResumes: Success, got resumes:', data.resumes?.length || 0)
        setResumes(data.resumes || [])
      } else {
        const errorText = await response.text()
        console.error('fetchResumes: API error:', response.status, response.statusText, errorText)
        
        let errorData = {}
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          console.error('Failed to parse error response as JSON:', errorText)
        }
        
        setError(`Failed to fetch resumes (${response.status}): ${errorData.error || errorText || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('fetchResumes: Exception:', error)
      setError(`Error fetching resumes: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = async (resumeId: string) => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`/api/resumes/${resumeId}/set-default`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setResumes(
          resumes.map((resume) => ({
            ...resume,
            isDefault: resume.id === resumeId,
          })),
        )
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to set default resume')
      }
    } catch (error) {
      console.error('Error setting default resume:', error)
      setError('Failed to set default resume')
    }
  }

  const handleDeleteResume = async (resumeId: string) => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setResumes(resumes.filter((resume) => resume.id !== resumeId))
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to delete resume')
      }
    } catch (error) {
      console.error('Error deleting resume:', error)
      setError('Failed to delete resume')
    }
  }

  const handleUploadResume = async () => {
    if (!newResumeName || (!selectedFile && !newResumeContent)) {
      setError('Please provide a name and either upload a file or enter text content')
      return
    }

    console.log('handleUploadResume: Starting upload', { 
      user: user?.email, 
      fileName: selectedFile?.name, 
      hasTextContent: !!newResumeContent 
    })

    setUploading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      if (!token) {
        console.log('handleUploadResume: No auth token')
        setError('Authentication required. Please log in.')
        return
      }

      console.log('handleUploadResume: Got auth token, preparing form data')

      const formData = new FormData()
      formData.append('name', newResumeName)
      formData.append('makeDefault', (resumes.length === 0).toString())

      if (uploadMethod === 'file' && selectedFile) {
        console.log('handleUploadResume: Adding file to form data')
        formData.append('file', selectedFile)
      } else if (uploadMethod === 'text' && newResumeContent) {
        console.log('handleUploadResume: Creating text file from content')
        const textFile = new File([newResumeContent], `${newResumeName}.md`, { type: 'text/markdown' })
        formData.append('file', textFile)
      }

      console.log('handleUploadResume: Making API call')
      const response = await fetch('/api/resumes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      console.log('handleUploadResume: API response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('handleUploadResume: Upload successful', data)
        setResumes([data.resume, ...resumes])
        setNewResumeName('')
        setNewResumeContent('')
        setSelectedFile(null)
        setIsUploadDialogOpen(false)
        setUploadMethod('file')
        setError(null)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('handleUploadResume: API error:', response.status, errorData)
        setError(errorData.error || 'Failed to upload resume')
      }
    } catch (error) {
      console.error('handleUploadResume: Exception:', error)
      setError(`Failed to upload resume: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleEditResume = (resume: Resume) => {
    setEditingResume(resume)
    setNewResumeName(resume.name)
    setNewResumeContent(resume.content)
    setError(null)
  }

  const handleSaveEdit = async () => {
    if (!editingResume || !newResumeName || !newResumeContent) {
      setError('Please provide both name and content')
      return
    }

    try {
      const token = await getAuthToken()
      if (!token) {
        setError('Authentication required')
        return
      }

      const response = await fetch(`/api/resumes/${editingResume.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newResumeName,
          content: newResumeContent,
          isDefault: editingResume.isDefault
        })
      })

      if (response.ok) {
        setResumes(
          resumes.map((resume) =>
            resume.id === editingResume.id 
              ? { ...resume, name: newResumeName, content: newResumeContent, updatedAt: new Date() }
              : resume
          )
        )
        setEditingResume(null)
        setNewResumeName('')
        setNewResumeContent('')
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update resume')
      }
    } catch (error) {
      console.error('Error updating resume:', error)
      setError('Failed to update resume')
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

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown', 'text/plain']
      const allowedExtensions = ['pdf', 'docx', 'md', 'markdown']
      const extension = file.name.split('.').pop()?.toLowerCase()
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension || '')) {
        setError('Please upload a PDF, DOCX, or Markdown file')
        return
      }
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      
      setSelectedFile(file)
      setError(null)
      
      // Auto-generate name from filename if empty
      if (!newResumeName) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        setNewResumeName(nameWithoutExt)
      }
    }
  }

  const handleDownloadResume = (resume: Resume) => {
    try {
      // Create a downloadable text file with the resume content
      const content = resume.content || 'No content available'
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      
      // Create a temporary link element and trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = `${resume.name}.txt`
      document.body.appendChild(link)
      link.click()
      
      // Clean up
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading resume:', error)
      setError('Failed to download resume')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading resumes...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <h3 className="font-medium text-red-900">Error</h3>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setError(null)}
                    className="ml-auto"
                  >
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-800">{error}</span>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium">Resume Name</label>
                    <Input
                      placeholder="e.g., My Default Resume"
                      value={newResumeName}
                      onChange={(e) => setNewResumeName(e.target.value)}
                      disabled={uploading}
                    />
                  </div>
                  
                  {/* Upload method toggle */}
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                    <Button
                      variant={uploadMethod === 'file' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setUploadMethod('file')}
                      disabled={uploading}
                    >
                      Upload File
                    </Button>
                    <Button
                      variant={uploadMethod === 'text' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setUploadMethod('text')}
                      disabled={uploading}
                    >
                      Paste Text
                    </Button>
                  </div>
                  
                  {uploadMethod === 'file' ? (
                    <div>
                      <label className="text-sm font-medium">Upload Resume File</label>
                      <div className="mt-1">
                        <Input
                          type="file"
                          accept=".pdf,.docx,.md,.markdown"
                          onChange={handleFileChange}
                          disabled={uploading}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Supported formats: PDF, DOCX, Markdown (max 10MB)
                        </p>
                        {selectedFile && (
                          <p className="text-sm text-green-600 mt-1">
                            Selected: {selectedFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm font-medium">Resume Content</label>
                      <Textarea
                        placeholder="Paste your resume content here..."
                        value={newResumeContent}
                        onChange={(e) => setNewResumeContent(e.target.value)}
                        rows={10}
                        disabled={uploading}
                      />
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button onClick={handleUploadResume} disabled={uploading}>
                      {uploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {uploading ? 'Processing...' : 'Add Resume'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsUploadDialogOpen(false)
                        setError(null)
                        setSelectedFile(null)
                        setNewResumeName('')
                        setNewResumeContent('')
                        setUploadMethod('file')
                      }}
                      disabled={uploading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Default Resume Section */}
          {resumes.filter(r => r.isDefault).length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">My Default Resume</h2>
              <div className="grid grid-cols-1 gap-6">
                {resumes.filter(r => r.isDefault).map((resume) => (
                  <Card key={resume.id} className="border-2 border-blue-200 bg-blue-50/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {resume.name}
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
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

                      <div className="text-sm text-gray-600 bg-white p-3 rounded-lg border">
                        <p className="line-clamp-3">{resume.content?.substring(0, 200) || 'No content available'}...</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link href={`/resumes/${resume.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                        </Link>

                        <Button variant="outline" size="sm" onClick={() => handleDownloadResume(resume)}>
                          <Download className="mr-1 h-3 w-3" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Other Resumes Section */}
          {resumes.filter(r => !r.isDefault).length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Other Resumes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resumes.filter(r => !r.isDefault).map((resume) => (
                  <Card key={resume.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {resume.name}
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
                        <p className="line-clamp-3">{resume.content?.substring(0, 150) || 'No content available'}...</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleSetDefault(resume.id)}>
                          <Star className="mr-1 h-3 w-3" />
                          Set Default
                        </Button>

                        <Link href={`/resumes/${resume.id}/edit`}>
                          <Button variant="outline" size="sm">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                        </Link>

                        <Button variant="outline" size="sm" onClick={() => handleDownloadResume(resume)}>
                          <Download className="mr-1 h-3 w-3" />
                          Download
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteResume(resume.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Edit Resume Dialog */}
          <Dialog open={!!editingResume} onOpenChange={() => setEditingResume(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Resume</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-800">{error}</span>
                  </div>
                )}
                
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
                  <Button variant="outline" onClick={() => {
                    setEditingResume(null)
                    setError(null)
                    setNewResumeName('')
                    setNewResumeContent('')
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Authentication Notice */}
          {!user && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <div>
                    <h3 className="font-medium text-orange-900">Authentication Required</h3>
                    <p className="text-sm text-orange-700">Please log in to upload and manage your resumes.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {user && resumes.length === 0 && (
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