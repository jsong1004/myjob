"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bookmark, ExternalLink, Loader2, AlertCircle, FileText, Edit, Calendar, StickyNote, ChevronUp, ChevronDown, Search, X, Plus, RefreshCw, Sparkles, PenTool, Eye } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { auth } from "@/lib/firebase"
import type { SavedJob, ApplicationStatus } from "@/lib/types"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { MatchingScoreDialog } from "@/components/matching-score-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SavedJobsPage() {
  return (
    <AuthProvider>
      <SavedJobsPageContent />
    </AuthProvider>
  )
}

function SavedJobsPageContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<SavedJob | null>(null)
  const [editingJob, setEditingJob] = useState<SavedJob | null>(null)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<ApplicationStatus>('saved')
  const [reminderDate, setReminderDate] = useState('')
  const [reminderNote, setReminderNote] = useState('')
  const [sortField, setSortField] = useState<'title' | 'company' | 'status' | 'savedAt' | 'matchingScore'>('savedAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [titleFilter, setTitleFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('saved')
  const [isAddJobDialogOpen, setIsAddJobDialogOpen] = useState(false)
  const [newJobTitle, setNewJobTitle] = useState('')
  const [newJobCompany, setNewJobCompany] = useState('')
  const [newJobLocation, setNewJobLocation] = useState('')
  const [newJobDescription, setNewJobDescription] = useState('')
  const [newJobApplyUrl, setNewJobApplyUrl] = useState('')
  const [newJobSalary, setNewJobSalary] = useState('')
  const [newJobSource, setNewJobSource] = useState('LinkedIn')
  const [isAddingJob, setIsAddingJob] = useState(false)
  const [rescoringJobId, setRescoringJobId] = useState<string | null>(null)
  const [jobDetailsOpen, setJobDetailsOpen] = useState<string | null>(null)

  useEffect(() => {
    const fetchSavedJobs = async () => {
      if (!user || !auth?.currentUser) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const token = await auth.currentUser.getIdToken()
        const response = await fetch("/api/saved-jobs", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          setSavedJobs(data.savedJobs || [])
        } else {
          setError("Failed to fetch saved jobs.")
        }
      } catch (err) {
        setError("Error loading saved jobs.")
      } finally {
        setLoading(false)
      }
    }
    fetchSavedJobs()
  }, [user])

  const handleUnsaveJob = async (jobId: string) => {
    if (!user || !auth?.currentUser) return
    try {
      const token = await auth.currentUser.getIdToken()
      const response = await fetch(`/api/saved-jobs/${jobId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        setSavedJobs((prev) => prev.filter((job) => job.jobId !== jobId))
      } else {
        alert("Failed to unsave job.")
      }
    } catch {
      alert("Error unsaving job.")
    }
  }


  const handleUpdateJobTracking = async (jobId: string, updates: Partial<SavedJob>) => {
    if (!user || !auth?.currentUser) return
    try {
      const token = await auth.currentUser.getIdToken()
      
      // If setting status to "No Longer Available", call special endpoint that updates both collections
      if (updates.status === 'nolongeravailable') {
        const response = await fetch(`/api/saved-jobs/${jobId}/mark-unavailable`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...updates,
            notes: updates.notes || `Marked as no longer available on ${new Date().toLocaleDateString()}`
          }),
        })
        
        if (response.ok) {
          setSavedJobs((prev) => 
            prev.map((job) => 
              job.jobId === jobId 
                ? { ...job, ...updates }
                : job
            )
          )
          setEditingJob(null)
          setNotes('')
          setReminderDate('')
          setReminderNote('')
        } else {
          const errorData = await response.json()
          alert(errorData.error || 'Failed to mark job as unavailable.')
        }
      } else {
        // Regular status update
        const response = await fetch(`/api/saved-jobs/${jobId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        })
        if (response.ok) {
          const data = await response.json()
          setSavedJobs((prev) => 
            prev.map((job) => 
              job.jobId === jobId 
                ? { ...job, ...updates }
                : job
            )
          )
          setEditingJob(null)
          setNotes('')
          setReminderDate('')
          setReminderNote('')
        } else {
          alert('Failed to update job tracking.')
        }
      }
    } catch {
      alert('Error updating job tracking.')
    }
  }

  const handleSort = (field: 'title' | 'company' | 'status' | 'savedAt' | 'matchingScore') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const filteredJobs = savedJobs.filter((job) => {
    const titleMatch = job.title.toLowerCase().includes(titleFilter.toLowerCase())
    const companyMatch = job.company.toLowerCase().includes(companyFilter.toLowerCase())
    const statusMatch = statusFilter === 'all' || (job.status || 'saved') === statusFilter
    
    return titleMatch && companyMatch && statusMatch
  })

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortField) {
      case 'title':
        aValue = a.title.toLowerCase()
        bValue = b.title.toLowerCase()
        break
      case 'company':
        aValue = a.company.toLowerCase()
        bValue = b.company.toLowerCase()
        break
      case 'status':
        aValue = a.status || 'saved'
        bValue = b.status || 'saved'
        break
      case 'savedAt':
        aValue = a.savedAt instanceof Date ? a.savedAt : new Date(a.savedAt.seconds * 1000)
        bValue = b.savedAt instanceof Date ? b.savedAt : new Date(b.savedAt.seconds * 1000)
        break
      case 'matchingScore':
        aValue = a.matchingScore || 0
        bValue = b.matchingScore || 0
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const SortableHeader = ({ field, children }: { field: 'title' | 'company' | 'status' | 'savedAt' | 'matchingScore', children: React.ReactNode }) => (
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

  const openEditDialog = (job: SavedJob) => {
    setEditingJob(job)
    setStatus(job.status || 'saved')
    setNotes(job.notes || '')
    setReminderNote(job.reminderNote || '')
    if (job.reminderDate) {
      const date = job.reminderDate instanceof Date ? job.reminderDate : new Date(job.reminderDate.seconds * 1000)
      setReminderDate(date.toISOString().split('T')[0])
    } else {
      setReminderDate('')
    }
  }

  const getStatusColor = (status: ApplicationStatus): string => {
    switch (status) {
      case 'saved': return 'bg-gray-100 text-gray-800'
      case 'notinterested': return 'bg-gray-100 text-gray-600'
      case 'applied': return 'bg-blue-100 text-blue-800'
      case 'interviewing': return 'bg-yellow-100 text-yellow-800'
      case 'offer': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'withdrawn': return 'bg-gray-100 text-gray-600'
      case 'nolongeravailable': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: ApplicationStatus): string => {
    switch (status) {
      case 'saved': return 'Saved'
      case 'notinterested': return 'Not Interested'
      case 'applied': return 'Applied'
      case 'interviewing': return 'Interviewing'
      case 'offer': return 'Offer'
      case 'rejected': return 'Rejected'
      case 'withdrawn': return 'Withdrawn'
      case 'nolongeravailable': return 'No Longer Available'
      default: return 'Saved'
    }
  }

  const handleTailorResume = async (job: SavedJob) => {
    if (!user || !auth?.currentUser) return
    
    // Mark job as having resume tailored
    try {
      const token = await auth.currentUser.getIdToken()
      await fetch(`/api/saved-jobs/${job.jobId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeTailored: true,
        }),
      })
      
      // Update local state
      setSavedJobs((prev) => 
        prev.map((savedJob) => 
          savedJob.jobId === job.jobId 
            ? { ...savedJob, resumeTailoredAt: new Date() }
            : savedJob
        )
      )
    } catch (err) {
      // Don't block navigation if status update fails
      console.error("Failed to update resume tailored status:", err)
    }

    // Navigate to tailor resume page
    router.push(`/tailor-resume/${job.jobId}`)
  }

  const handleCreateCoverLetter = async (job: SavedJob) => {
    if (!user || !auth?.currentUser) return
    
    // Mark job as having cover letter created
    try {
      const token = await auth.currentUser.getIdToken()
      await fetch(`/api/saved-jobs/${job.jobId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coverLetterCreated: true,
        }),
      })
      
      // Update local state
      setSavedJobs((prev) => 
        prev.map((savedJob) => 
          savedJob.jobId === job.jobId 
            ? { ...savedJob, coverLetterCreatedAt: new Date() }
            : savedJob
        )
      )
    } catch (err) {
      // Don't block navigation if status update fails
      console.error("Failed to update cover letter created status:", err)
    }

    // Navigate to cover letter page
    router.push(`/cover-letter/${job.jobId}`)
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-100 border-green-200"
    if (score >= 80) return "text-blue-600 bg-blue-100 border-blue-200"
    return "text-amber-600 bg-amber-100 border-amber-200"
  }

  const truncateDescription = (description: string, wordLimit: number = 50) => {
    const words = description.split(' ')
    if (words.length <= wordLimit) return description
    return words.slice(0, wordLimit).join(' ') + '...'
  }

  const handleAddJob = async () => {
    if (!newJobTitle || !newJobCompany) {
      setError('Title and company are required')
      return
    }

    setIsAddingJob(true)
    setError(null)

    try {
      const token = await auth?.currentUser?.getIdToken()
      if (!token) {
        setError('Authentication required. Please log in.')
        return
      }

      const response = await fetch('/api/saved-jobs/add-manual', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newJobTitle,
          company: newJobCompany,
          location: newJobLocation,
          description: newJobDescription,
          applyUrl: newJobApplyUrl,
          salary: newJobSalary,
          source: newJobSource,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSavedJobs([data.savedJob, ...savedJobs])
        setIsAddJobDialogOpen(false)
        // Reset form
        setNewJobTitle('')
        setNewJobCompany('')
        setNewJobLocation('')
        setNewJobDescription('')
        setNewJobApplyUrl('')
        setNewJobSalary('')
        setNewJobSource('LinkedIn')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to add job')
      }
    } catch (err) {
      setError('Failed to add job')
    } finally {
      setIsAddingJob(false)
    }
  }

  const handleRescoreJob = async (job: SavedJob) => {
    if (!user || !auth?.currentUser) return

    setRescoringJobId(job.jobId)
    setError(null)

    try {
      const token = await auth.currentUser.getIdToken()
      
      // First get the user's default resume
      const resumeResponse = await fetch('/api/resumes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!resumeResponse.ok) {
        setError('Failed to fetch resume for scoring')
        return
      }

      const resumeData = await resumeResponse.json()
      const defaultResume = resumeData.resumes?.find((r: any) => r.isDefault) || resumeData.resumes?.[0]
      
      if (!defaultResume || !defaultResume.content) {
        setError('No resume available for scoring. Please upload a resume first.')
        return
      }

      // Score the job
      const jobToScore = {
        id: job.jobId,
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.originalData?.description || job.summary || '',
        qualifications: job.originalData?.qualifications || [],
        responsibilities: job.originalData?.responsibilities || [],
        benefits: job.originalData?.benefits || [],
        salary: job.salary,
        postedAt: job.originalData?.postedAt || '',
        applyUrl: job.originalData?.applyUrl || '',
        source: job.originalData?.source || 'manual',
        matchingScore: 0,
        matchingSummary: '',
        summary: job.originalData?.summary || job.summary || ''
      }

      const scoreResponse = await fetch('/api/jobs/score', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobs: [jobToScore],
          resume: defaultResume.content,
          multiAgent: true,
        }),
      })

      if (scoreResponse.ok) {
        const scoreData = await scoreResponse.json()
        const scoredJob = scoreData.jobs[0]
        
        // Debug logging for scored job data
        console.log('🔍 [Rescore] Scored job data received:', {
          scoredJobKeys: scoredJob ? Object.keys(scoredJob) : [],
          scoredJobScore: scoredJob?.matchingScore,
          hasEnhancedScoreDetails: !!scoredJob?.enhancedScoreDetails,
          hasScoreDetails: !!scoredJob?.scoreDetails,
          enhancedScoreDetails: scoredJob?.enhancedScoreDetails
        })
        
        // Update the saved job with new score and enhanced details
        const updateResponse = await fetch(`/api/saved-jobs/${job.jobId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            matchingScore: scoredJob.matchingScore,
            matchingSummary: scoredJob.matchingSummary,
            originalData: {
              ...(job.originalData || {}),
              matchingScore: scoredJob.matchingScore,
              matchingSummary: scoredJob.matchingSummary,
              enhancedScoreDetails: scoredJob.enhancedScoreDetails,
              scoreDetails: scoredJob.scoreDetails
            }
          }),
        })

        if (updateResponse.ok) {
          // Update local state with full scoring data
          setSavedJobs((prev) => 
            prev.map((savedJob) => 
              savedJob.jobId === job.jobId 
                ? { 
                    ...savedJob, 
                    matchingScore: scoredJob.matchingScore,
                    matchingSummary: scoredJob.matchingSummary,
                    originalData: {
                      ...(savedJob.originalData || {}),
                      matchingScore: scoredJob.matchingScore,
                      matchingSummary: scoredJob.matchingSummary,
                      enhancedScoreDetails: scoredJob.enhancedScoreDetails,
                      scoreDetails: scoredJob.scoreDetails
                    }
                  }
                : savedJob
            )
          )
        } else {
          setError('Failed to update job score')
        }
      } else {
        const errorData = await scoreResponse.json()
        setError(errorData.error || 'Failed to score job')
      }
    } catch (err) {
      setError('Error rescoring job')
    } finally {
      setRescoringJobId(null)
    }
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">MyJobs</h1>
            </div>
            <Dialog open={isAddJobDialogOpen} onOpenChange={setIsAddJobDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Add Job</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Add New Job</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="job-title">Job Title *</Label>
                      <Input 
                        id="job-title" 
                        placeholder="e.g., Software Engineer" 
                        value={newJobTitle} 
                        onChange={(e) => setNewJobTitle(e.target.value)} 
                        disabled={isAddingJob} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="job-company">Company *</Label>
                      <Input 
                        id="job-company" 
                        placeholder="e.g., Google" 
                        value={newJobCompany} 
                        onChange={(e) => setNewJobCompany(e.target.value)} 
                        disabled={isAddingJob} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="job-location">Location</Label>
                      <Input 
                        id="job-location" 
                        placeholder="e.g., San Francisco, CA" 
                        value={newJobLocation} 
                        onChange={(e) => setNewJobLocation(e.target.value)} 
                        disabled={isAddingJob} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="job-salary">Salary</Label>
                      <Input 
                        id="job-salary" 
                        placeholder="e.g., $120,000 - $150,000" 
                        value={newJobSalary} 
                        onChange={(e) => setNewJobSalary(e.target.value)} 
                        disabled={isAddingJob} 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="job-apply-url">Apply URL</Label>
                    <Input 
                      id="job-apply-url" 
                      placeholder="https://company.com/jobs/123" 
                      value={newJobApplyUrl} 
                      onChange={(e) => setNewJobApplyUrl(e.target.value)} 
                      disabled={isAddingJob} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="job-source">Source *</Label>
                    <Select value={newJobSource} onValueChange={setNewJobSource} disabled={isAddingJob}>
                      <SelectTrigger id="job-source">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                        <SelectItem value="Indeed">Indeed</SelectItem>
                        <SelectItem value="Glassdoor">Glassdoor</SelectItem>
                        <SelectItem value="AngelList">AngelList</SelectItem>
                        <SelectItem value="Company Website">Company Website</SelectItem>
                        <SelectItem value="Referral">Referral</SelectItem>
                        <SelectItem value="Recruiter">Recruiter</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="job-description">Job Description</Label>
                    <Textarea 
                      id="job-description" 
                      placeholder="Enter job description, requirements, and other details..." 
                      value={newJobDescription} 
                      onChange={(e) => setNewJobDescription(e.target.value)} 
                      rows={6} 
                      disabled={isAddingJob} 
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleAddJob} disabled={isAddingJob || !newJobTitle || !newJobCompany}>
                      {isAddingJob ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                      {isAddingJob ? 'Adding...' : 'Add Job'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddJobDialogOpen(false)} disabled={isAddingJob}>Cancel</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="p-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <Label htmlFor="titleFilter" className="text-sm font-medium">Job Title</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="titleFilter"
                      placeholder="Search by job title..."
                      value={titleFilter}
                      onChange={(e) => setTitleFilter(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    {titleFilter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setTitleFilter('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <Label htmlFor="companyFilter" className="text-sm font-medium">Company</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="companyFilter"
                      placeholder="Search by company..."
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    {companyFilter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setCompanyFilter('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex-1 md:max-w-48">
                  <Label htmlFor="statusFilter" className="text-sm font-medium">Status</Label>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ApplicationStatus | 'all')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="saved">Saved</SelectItem>
                      <SelectItem value="notinterested">Not Interested</SelectItem>
                      <SelectItem value="applied">Applied</SelectItem>
                      <SelectItem value="interviewing">Interviewing</SelectItem>
                      <SelectItem value="offer">Offer</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="withdrawn">Withdrawn</SelectItem>
                      <SelectItem value="nolongeravailable">No Longer Available</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(titleFilter || companyFilter || statusFilter !== 'all') && (
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTitleFilter('')
                        setCompanyFilter('')
                        setStatusFilter('all')
                      }}
                      className="whitespace-nowrap"
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
              {(titleFilter || companyFilter || statusFilter !== 'all') && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Showing {filteredJobs.length} of {savedJobs.length} jobs
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reminder notifications */}
          {savedJobs.filter(job => job.reminderDate && new Date(job.reminderDate instanceof Date ? job.reminderDate : job.reminderDate.seconds * 1000) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length > 0 && (
            <Alert className="mb-4 border-blue-200 bg-blue-50">
              <Calendar className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <div className="font-medium text-blue-800 mb-2">Upcoming Reminders</div>
                <div className="space-y-1">
                  {savedJobs
                    .filter(job => job.reminderDate && new Date(job.reminderDate instanceof Date ? job.reminderDate : job.reminderDate.seconds * 1000) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
                    .map(job => (
                      <div key={job.id} className="text-sm text-blue-700">
                        <strong>{job.title}</strong> at {job.company} - {job.reminderNote || 'Follow up'} 
                        <span className="text-blue-600 ml-2">
                          ({new Date(job.reminderDate instanceof Date ? job.reminderDate : job.reminderDate.seconds * 1000).toLocaleDateString()})
                        </span>
                      </div>
                    ))
                  }
                </div>
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : savedJobs.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Bookmark className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">No Saved Jobs</h3>
                <p className="text-muted-foreground mb-4">You haven't saved any jobs yet.</p>
                <Button asChild>
                  <Link href="/search">Find Jobs</Link>
                </Button>
              </CardContent>
            </Card>
          ) : filteredJobs.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">No Jobs Match Your Filters</h3>
                <p className="text-muted-foreground mb-4">Try adjusting your search criteria or clear the filters.</p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setTitleFilter('')
                    setCompanyFilter('')
                    setStatusFilter('all')
                  }}
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-[1200px] table-fixed">
                    <TableHeader>
                      <TableRow>
                        <SortableHeader field="title">Job Title</SortableHeader>
                        <SortableHeader field="company">Company</SortableHeader>
                        <TableHead>Details</TableHead>
                        <SortableHeader field="matchingScore">
                          <div className="text-center">Score</div>
                        </SortableHeader>
                        <TableHead className="w-[320px] text-left">Actions</TableHead>
                        <SortableHeader field="status">Status</SortableHeader>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {sortedJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="px-3 py-2">
                          <div className="font-medium">
                            {(job.originalData?.applyUrl || job.applyUrl) ? (
                              <a
                                href={job.originalData?.applyUrl || job.applyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {job.title}
                              </a>
                            ) : (
                              job.title
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{job.location}</div>
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <Link 
                            href={`/companies/${encodeURIComponent(job.company)}`}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {job.company}
                          </Link>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setJobDetailsOpen(job.jobId)}
                            className="gap-2 text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </Button>
                        </TableCell>
                        <TableCell className="text-center px-3 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className={`font-bold ${getScoreColor(job.matchingScore ?? 0)}`}
                              onClick={() => setSelectedJob(job)}
                            >
                              {job.matchingScore ?? "-"}%
                            </Button>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRescoreJob(job)}
                                    disabled={rescoringJobId === job.jobId}
                                    className="p-1 h-auto"
                                  >
                                    {rescoringJobId === job.jobId ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <RefreshCw className="h-3 w-3" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Generate Match Score</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                        <TableCell className="text-left px-2 py-2 w-[320px]">
                          <div className="grid grid-cols-2 gap-1 w-[300px]">
                            {/* Top Row - Primary Actions */}
                            <Button 
                              variant={job.resumeTailoredAt ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleTailorResume(job)}
                              className={`flex items-center gap-1 text-xs px-2 py-1 h-7 relative w-full ${
                                job.resumeTailoredAt 
                                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                                  : (job.originalData?.enhancedScoreDetails)
                                    ? 'border-blue-200 text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 bg-gradient-to-r from-blue-50 to-purple-50'
                                    : 'border-blue-200 text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              <Sparkles className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">Resume</span>
                              {job.originalData?.enhancedScoreDetails && !job.resumeTailoredAt && (
                                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
                              )}
                            </Button>
                            <Button 
                              variant={job.coverLetterCreatedAt ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleCreateCoverLetter(job)}
                              className={`flex items-center gap-1 text-xs px-2 py-1 h-7 w-full ${
                                job.coverLetterCreatedAt 
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                                  : 'border-purple-200 text-purple-600 hover:bg-purple-50'
                              }`}
                            >
                              <PenTool className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">Cover</span>
                            </Button>
                            
                            {/* Bottom Row - Secondary Actions */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDialog(job)}
                                    className="text-xs px-2 py-1 h-6 text-muted-foreground hover:text-foreground w-full"
                                  >
                                    <Edit className="h-3 w-3 mr-1 flex-shrink-0" />
                                    <span className="truncate">Edit Status</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Edit status, notes, and reminders</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUnsaveJob(job.jobId)}
                                    className="text-xs px-2 py-1 h-6 text-muted-foreground hover:text-destructive w-full"
                                  >
                                    <Bookmark className="h-3 w-3 mr-1 flex-shrink-0 fill-current" />
                                    <span className="truncate">Remove Job</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Remove from saved jobs</p>
                                </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <Badge className={getStatusColor(job.status || 'saved')}>
                            {getStatusLabel(job.status || 'saved')}
                          </Badge>
                          {job.reminderDate && (
                            <div className="flex items-center gap-1 mt-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {new Date(job.reminderDate instanceof Date ? job.reminderDate : job.reminderDate.seconds * 1000).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <div className="max-w-xs">
                            {job.notes ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 cursor-help">
                                      <StickyNote className="h-4 w-4 text-blue-600" />
                                      <p className="text-sm text-muted-foreground line-clamp-2">
                                        {job.notes}
                                      </p>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-md p-4 whitespace-pre-line">
                                    <p>{job.notes}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">No notes</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {editingJob && (
            <Dialog open={!!editingJob} onOpenChange={(open) => !open && setEditingJob(null)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Application Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={status} onValueChange={(value) => setStatus(value as ApplicationStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="saved">Saved</SelectItem>
                        <SelectItem value="notinterested">Not Interested</SelectItem>
                        <SelectItem value="applied">Applied</SelectItem>
                        <SelectItem value="interviewing">Interviewing</SelectItem>
                        <SelectItem value="offer">Offer</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="withdrawn">Withdrawn</SelectItem>
                        <SelectItem value="nolongeravailable">No Longer Available</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this application..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reminderDate">Reminder Date</Label>
                    <Input
                      id="reminderDate"
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reminderNote">Reminder Note</Label>
                    <Input
                      id="reminderNote"
                      value={reminderNote}
                      onChange={(e) => setReminderNote(e.target.value)}
                      placeholder="What to follow up on..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditingJob(null)}>
                      Cancel
                    </Button>
                    <Button onClick={() => handleUpdateJobTracking(editingJob.jobId, {
                      status,
                      notes: notes || undefined,
                      reminderDate: reminderDate ? new Date(reminderDate) : undefined,
                      reminderNote: reminderNote || undefined,
                    })}>
                      Save Changes
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {selectedJob && (
            (() => {
              // Debug logging for job data
              console.log('🔍 [SavedJobs] Selected job data:', {
                jobId: selectedJob.jobId,
                title: selectedJob.title,
                hasOriginalData: !!selectedJob.originalData,
                originalDataKeys: selectedJob.originalData ? Object.keys(selectedJob.originalData) : [],
                enhancedScoreDetails: selectedJob.originalData?.enhancedScoreDetails,
                scoreDetails: selectedJob.originalData?.scoreDetails
              })
              
              return (
                <MatchingScoreDialog 
                  job={{
                    ...selectedJob.originalData,
                    id: selectedJob.jobId,
                    title: selectedJob.title,
                    company: selectedJob.company,
                    matchingScore: selectedJob.matchingScore ?? 0,
                    matchingSummary: selectedJob.originalData?.matchingSummary || selectedJob.summary,
                    summary: selectedJob.originalData?.summary,
                    enhancedScoreDetails: selectedJob.originalData?.enhancedScoreDetails,
                    scoreDetails: selectedJob.originalData?.scoreDetails,
                  }} 
                  isOpen={!!selectedJob} 
                  onClose={() => setSelectedJob(null)} 
                />
              )
            })()
          )}

          {jobDetailsOpen && (
            <Dialog open={!!jobDetailsOpen} onOpenChange={() => setJobDetailsOpen(null)}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {(() => {
                      const job = savedJobs.find(j => j.jobId === jobDetailsOpen)
                      return job ? `${job.title} at ${job.company}` : 'Job Details'
                    })()}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {(() => {
                    const job = savedJobs.find(j => j.jobId === jobDetailsOpen)
                    if (!job) return null
                    
                    return (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h3 className="font-semibold mb-2">Company</h3>
                            <p className="text-muted-foreground">{job.company}</p>
                          </div>
                          <div>
                            <h3 className="font-semibold mb-2">Location</h3>
                            <p className="text-muted-foreground">{job.location}</p>
                          </div>
                          <div>
                            <h3 className="font-semibold mb-2">Posted</h3>
                            <p className="text-muted-foreground">{job.originalData?.postedAt || "Not specified"}</p>
                          </div>
                          <div>
                            <h3 className="font-semibold mb-2">Salary</h3>
                            <Badge variant="secondary">{job.salary || "Not specified"}</Badge>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="font-semibold mb-2">Description</h3>
                          <p className="text-muted-foreground whitespace-pre-wrap">{job.originalData?.description || job.originalData?.summary || "No description available"}</p>
                        </div>
                        
                        {job.originalData?.qualifications && job.originalData.qualifications.length > 0 && (
                          <div>
                            <h3 className="font-semibold mb-2">Qualifications</h3>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1">
                              {job.originalData.qualifications.map((qual, index) => (
                                <li key={index}>{qual}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {job.originalData?.responsibilities && job.originalData.responsibilities.length > 0 && (
                          <div>
                            <h3 className="font-semibold mb-2">Responsibilities</h3>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1">
                              {job.originalData.responsibilities.map((resp, index) => (
                                <li key={index}>{resp}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {job.originalData?.benefits && job.originalData.benefits.length > 0 && (
                          <div>
                            <h3 className="font-semibold mb-2">Benefits</h3>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1">
                              {job.originalData.benefits.map((benefit, index) => (
                                <li key={index}>{benefit}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {job.originalData?.applyUrl && (
                          <div className="pt-4 border-t">
                            <Button asChild>
                              <a href={job.originalData.applyUrl} target="_blank" rel="noopener noreferrer">
                                Apply for this job
                              </a>
                            </Button>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </main>
    </>
  )
} 