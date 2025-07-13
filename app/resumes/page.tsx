"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { FileText, Upload, Star, Edit, Trash2, Plus, Calendar, Download, Loader2, AlertCircle, MoreVertical } from "lucide-react"
import { Header } from "@/components/header"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { Resume } from "@/lib/types"
import { auth } from "@/lib/firebase"
import Link from "next/link"

export default function ResumesPage() {
  return (
    <AuthProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <ResumesPageContent />
      </Suspense>
    </AuthProvider>
  )
}

function ResumesPageContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [newResumeName, setNewResumeName] = useState("")
  const [newResumeContent, setNewResumeContent] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadMethod, setUploadMethod] = useState<'file' | 'text'>('file')
  const [error, setError] = useState<string | null>(null)
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchResumes()
    } else {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // Check for redirect message from URL parameters
    const message = searchParams.get('message')
    const onboarding = searchParams.get('onboarding')
    
    if (message) {
      setRedirectMessage(message)
      // Auto-open the upload dialog if user was redirected here
      setIsUploadDialogOpen(true)
    }
    
    // Auto-open upload dialog for new users during onboarding
    if (onboarding === 'true') {
      setRedirectMessage('Welcome! To get started with job matching, please upload your resume.')
      setIsUploadDialogOpen(true)
    }
  }, [searchParams])

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
    setLoading(true)
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch('/api/resumes', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setResumes(data.resumes || [])
      } else {
        setError(`Failed to fetch resumes: ${response.statusText}`)
      }
    } catch (error) {
      setError(`Error fetching resumes: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        fetchResumes() // Re-fetch to update the list with new default
      } else {
        setError((await response.json()).error || 'Failed to set default resume')
      }
    } catch (error) {
      setError('Failed to set default resume')
    }
  }

  const handleDeleteResume = async (resumeId: string) => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setResumes(resumes.filter((resume) => resume.id !== resumeId))
      } else {
        setError((await response.json()).error || 'Failed to delete resume')
      }
    } catch (error) {
      setError('Failed to delete resume')
    }
  }

  const handleUploadResume = async () => {
    if (!newResumeName || (!selectedFile && !newResumeContent)) {
      setError('Please provide a name and either upload a file or enter text content')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      if (!token) {
        setError('Authentication required. Please log in.')
        return
      }

      const formData = new FormData()
      formData.append('name', newResumeName)
      formData.append('makeDefault', (resumes.length === 0).toString())

      if (uploadMethod === 'file' && selectedFile) {
        formData.append('file', selectedFile)
      } else if (uploadMethod === 'text' && newResumeContent) {
        const textFile = new File([newResumeContent], `${newResumeName}.md`, { type: 'text/markdown' })
        formData.append('file', textFile)
      }

      const response = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setResumes([data.resume, ...resumes])
        setIsUploadDialogOpen(false)
        // Reset form state
        setNewResumeName('')
        setNewResumeContent('')
        setSelectedFile(null)
        setUploadMethod('file')
      } else {
        setError((await response.json()).error || 'Failed to upload resume')
      }
    } catch (error) {
      setError(`Failed to upload resume: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown', 'text/plain']
      const allowedExtensions = ['pdf', 'docx', 'md', 'markdown']
      const extension = file.name.split('.').pop()?.toLowerCase()
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension || '')) {
        setError('Please upload a PDF, DOCX, or Markdown file')
        return
      }
      
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      
      setSelectedFile(file)
      setError(null)
      
      if (!newResumeName) {
        setNewResumeName(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const handleDownloadResume = async (resume: Resume) => {
    try {
      // Create a markdown file and convert to PDF
      const markdownFile = new File([resume.content || 'No content'], 'temp.md', { type: 'text/markdown' })
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
      link.download = `${resume.name}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      setError('Failed to download resume')
    }
  }

  const getTypeUI = (type: Resume["type"]) => {
    const styles = {
      original: "bg-blue-100 text-blue-800",
      tailored: "bg-green-100 text-green-800",
      draft: "bg-amber-100 text-amber-800",
      default: "bg-gray-100 text-gray-800"
    }
    return {
      label: type.charAt(0).toUpperCase() + type.slice(1),
      className: styles[type] || styles.default
    }
  }

  const formatDate = (date: Date | string | any) => {
    if (date && typeof date === 'object' && 'toDate' in date) {
      return date.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    }
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-6xl mx-auto space-y-8">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {redirectMessage && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{redirectMessage}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Resumes</h1>
              <p className="text-muted-foreground">Manage your resumes and create tailored versions for specific jobs.</p>
            </div>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Add Resume</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Add New Resume</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
                  
                  <div className="space-y-2">
                    <Label htmlFor="resume-name">Resume Name</Label>
                    <Input id="resume-name" placeholder="e.g., My Default Resume" value={newResumeName} onChange={(e) => setNewResumeName(e.target.value)} disabled={uploading} />
                  </div>
                  
                  <div className="flex gap-2 p-1 bg-muted rounded-lg">
                    <Button variant={uploadMethod === 'file' ? 'secondary' : 'ghost'} className="flex-1" onClick={() => setUploadMethod('file')} disabled={uploading}>Upload File</Button>
                    <Button variant={uploadMethod === 'text' ? 'secondary' : 'ghost'} className="flex-1" onClick={() => setUploadMethod('text')} disabled={uploading}>Paste Text</Button>
                  </div>
                  
                  {uploadMethod === 'file' ? (
                    <div className="space-y-2">
                      <Label htmlFor="resume-file">Upload Resume File</Label>
                      <Input id="resume-file" type="file" accept=".pdf,.docx,.md,.markdown" onChange={handleFileChange} disabled={uploading} />
                      <p className="text-xs text-muted-foreground">Supported formats: PDF, DOCX, Markdown (max 10MB).</p>
                      {selectedFile && <p className="text-sm text-green-600">Selected: {selectedFile.name}</p>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="resume-content">Resume Content</Label>
                      <Textarea id="resume-content" placeholder="Paste your resume content here..." value={newResumeContent} onChange={(e) => setNewResumeContent(e.target.value)} rows={10} disabled={uploading} />
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button onClick={handleUploadResume} disabled={uploading || !newResumeName}>
                      {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      {uploading ? 'Processing...' : 'Add Resume'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)} disabled={uploading}>Cancel</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {resumes.length > 0 ? (
            <div className="space-y-8">
              {resumes.filter(r => r.isDefault).map(resume => (
                <div key={resume.id}>
                  <h2 className="text-xl font-semibold mb-4">Default Resume</h2>
                  <Card className="border-2 border-primary/50 bg-primary/5">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="flex items-center gap-3 text-lg">
                          <FileText className="h-5 w-5" />
                          {resume.name}
                          <Badge className={getTypeUI(resume.type).className}>{getTypeUI(resume.type).label}</Badge>
                        </CardTitle>
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-500" />
                      </div>
                      {resume.jobTitle && <p className="text-sm text-muted-foreground pt-1">For: {resume.jobTitle}</p>}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-3 bg-background p-3 rounded-md border">{resume.content || 'No content available.'}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground"><Calendar className="inline h-3 w-3 mr-1.5" />Created {formatDate(resume.createdAt)}</p>
                        <div className="flex gap-2">
                          <Button asChild variant="default" size="sm"><Link href={`/resumes/${resume.id}/edit`}><Edit className="mr-2 h-4 w-4" />Edit</Link></Button>
                          <Button variant="outline" size="sm" onClick={() => handleDownloadResume(resume)}><Download className="mr-2 h-4 w-4" />Download</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}

              {resumes.filter(r => !r.isDefault).length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Other Resumes</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {resumes.filter(r => !r.isDefault).map(resume => (
                      <Card key={resume.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle className="flex items-center gap-2 text-base">
                              <FileText className="h-5 w-5" />
                              {resume.name}
                            </CardTitle>
                            <Badge variant="secondary" className={getTypeUI(resume.type).className}>{getTypeUI(resume.type).label}</Badge>
                          </div>
                          {resume.jobTitle && <p className="text-sm text-muted-foreground pt-1">For: {resume.jobTitle}</p>}
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground line-clamp-3 bg-muted/50 p-3 rounded-md">{resume.content || 'No content available.'}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground"><Calendar className="inline h-3 w-3 mr-1.5" />{formatDate(resume.createdAt)}</p>
                            <div className="flex gap-2">
                              <Button asChild variant="default" size="sm"><Link href={`/resumes/${resume.id}/edit`}><Edit className="mr-2 h-4 w-4" />Edit</Link></Button>
                              <Button variant="outline" size="sm" onClick={() => handleDownloadResume(resume)}><Download className="mr-2 h-4 w-4" />Download</Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleSetDefault(resume.id)}>
                                    <Star className="mr-2 h-4 w-4" />Set as Default
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDeleteResume(resume.id)} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card className="text-center py-16">
              <CardContent>
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Resumes Yet</h3>
                <p className="text-muted-foreground mb-4">Upload your first resume to get started.</p>
                <Button onClick={() => setIsUploadDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Resume</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  )
}