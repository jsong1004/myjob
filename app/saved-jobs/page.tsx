"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bookmark, ExternalLink, Loader2, AlertCircle, FileText, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { auth } from "@/lib/firebase"
import type { SavedJob } from "@/lib/types"
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

  const handleToggleApplied = async (jobId: string, currentlyApplied: boolean) => {
    if (!user || !auth?.currentUser) return
    try {
      const token = await auth.currentUser.getIdToken()
      const response = await fetch(`/api/saved-jobs/${jobId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ applied: !currentlyApplied }),
      })
      if (response.ok) {
        const data = await response.json()
        setSavedJobs((prev) => 
          prev.map((job) => 
            job.jobId === jobId 
              ? { ...job, appliedAt: data.appliedAt }
              : job
          )
        )
      } else {
        alert("Failed to update applied status.")
      }
    } catch {
      alert("Error updating applied status.")
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

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Saved Jobs</h1>
            <p className="text-muted-foreground">Review and manage the jobs you've saved.</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : savedJobs.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Saved Jobs</h3>
                <p className="text-muted-foreground mb-4">You haven't saved any jobs yet.</p>
                <Button asChild>
                  <Link href="/">Find Jobs</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead>Matching Summary</TableHead>
                      <TableHead className="min-w-[160px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div className="font-medium">
                            {job.originalData?.applyUrl ? (
                              <a
                                href={job.originalData.applyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {job.title}
                              </a>
                            ) : (
                              job.title
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{job.location}</div>
                        </TableCell>
                        <TableCell>
                          <Link 
                            href={`/companies/${encodeURIComponent(job.company)}`}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {job.company}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-sm text-muted-foreground line-clamp-2 cursor-help">
                                  {job.originalData?.summary || "No summary available."}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-md p-4 whitespace-pre-line">
                                <p>{job.originalData?.summary || "No summary available."}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className={`font-bold ${getScoreColor(job.matchingScore ?? 0)}`}
                            onClick={() => setSelectedJob(job)}
                          >
                            {job.matchingScore ?? "-"}%
                          </Button>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-sm text-muted-foreground line-clamp-2 cursor-help">
                                  {job.summary || "No matching summary."}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-md p-4 whitespace-pre-line">
                                <p>{job.summary || "No matching summary available."}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleToggleApplied(job.jobId, !!job.appliedAt)}
                                  >
                                    <CheckCircle className={`h-4 w-4 ${
                                      job.appliedAt 
                                        ? 'text-green-600' 
                                        : 'text-muted-foreground'
                                    }`} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{job.appliedAt ? 'Mark as Not Applied' : 'Mark as Applied'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleUnsaveJob(job.jobId)}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <Bookmark className="h-4 w-4 fill-current text-primary" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Unsave Job</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleTailorResume(job)}
                                  >
                                    <ExternalLink className={`h-4 w-4 ${
                                      job.resumeTailoredAt 
                                        ? 'text-green-600' 
                                        : 'text-muted-foreground'
                                    }`} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{job.resumeTailoredAt ? 'Resume Tailored ✓' : 'Tailor Resume'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleCreateCoverLetter(job)}
                                  >
                                    <FileText className={`h-4 w-4 ${
                                      job.coverLetterCreatedAt 
                                        ? 'text-blue-600' 
                                        : 'text-muted-foreground'
                                    }`} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{job.coverLetterCreatedAt ? 'Cover Letter Created ✓' : 'Create Cover Letter'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {selectedJob && (
            <MatchingScoreDialog 
              job={{
                ...selectedJob.originalData,
                id: selectedJob.jobId,
                title: selectedJob.title,
                company: selectedJob.company,
                matchingScore: selectedJob.matchingScore ?? 0,
                matchingSummary: selectedJob.originalData?.matchingSummary || selectedJob.summary,
                summary: selectedJob.originalData?.summary,
              }} 
              isOpen={!!selectedJob} 
              onClose={() => setSelectedJob(null)} 
            />
          )}
        </div>
      </main>
    </>
  )
} 