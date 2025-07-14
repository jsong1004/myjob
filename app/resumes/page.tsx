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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { FileText, Upload, Star, Edit, Trash2, Plus, Calendar, Download, Loader2, AlertCircle, MoreVertical, ChevronUp, ChevronDown } from "lucide-react"
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
  const [sortField, setSortField] = useState<'name' | 'createdAt'>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

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

  const handleSort = (field: 'name' | 'createdAt') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedResumes = [...resumes].sort((a, b) => {
    // Always put default resume on top, regardless of sort
    if (a.isDefault && !b.isDefault) return -1
    if (!a.isDefault && b.isDefault) return 1

    let aValue: any
    let bValue: any

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'createdAt':
        aValue = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt.seconds * 1000)
        bValue = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt.seconds * 1000)
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const SortableHeader = ({ field, children }: { field: 'name' | 'createdAt', children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? 
            <ChevronUp className="h-4 w-4" /> : 
            <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  )

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
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto space-y-4">
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
              <h1 className="text-2xl font-bold tracking-tight">My Resumes</h1>
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
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader field="name">Resume Name</SortableHeader>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Content Preview</TableHead>
                      <SortableHeader field="createdAt">Created</SortableHeader>
                      <TableHead className="min-w-[200px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedResumes.map((resume) => (
                      <TableRow key={resume.id} className={resume.isDefault ? "bg-primary/5" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div className="font-medium">{resume.name}</div>
                            {resume.isDefault && (
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {resume.jobTitle || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="max-w-xs">
                                  <p className="text-sm text-muted-foreground line-clamp-2 cursor-help">
                                    {resume.content ? resume.content.substring(0, 100) + (resume.content.length > 100 ? "..." : "") : "No content available."}
                                  </p>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-md p-4 whitespace-pre-line">
                                <p>{resume.content || "No content available."}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(resume.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button asChild variant="ghost" size="icon">
                                    <Link href={`/resumes/${resume.id}/edit`}>
                                      <Edit className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Edit Resume</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleDownloadResume(resume)}>
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Download PDF</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!resume.isDefault && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleSetDefault(resume.id)}>
                                      <Star className="mr-2 h-4 w-4" />Set as Default
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <DropdownMenuItem onClick={() => handleDeleteResume(resume.id)} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">No Resumes Yet</h3>
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