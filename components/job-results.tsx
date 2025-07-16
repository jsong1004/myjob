"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bookmark, Sparkles, TrendingUp, Eye } from "lucide-react"
import { MatchingScoreDialog } from "@/components/matching-score-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AuthModal } from "@/components/auth-modal"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { useAuth } from "@/components/auth-provider"
import { auth } from "@/lib/firebase"
import { useToast } from "@/components/ui/use-toast"

interface Job {
  id: string
  title: string
  company: string
  location: string
  description: string
  qualifications: string[]
  responsibilities: string[]
  benefits: string[]
  salary: string
  postedAt: string
  applyUrl: string
  source: string
  matchingScore: number // AI score, required
  matchingSummary?: string
  summary?: string // Add this for job summary
}

interface JobResultsProps {
  results: Job[]
}

export function JobResults({ results }: JobResultsProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set())
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [jobDetailsOpen, setJobDetailsOpen] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [pendingJobToSave, setPendingJobToSave] = useState<Job | null>(null)
  const [pendingAction, setPendingAction] = useState<'save' | 'tailor' | null>(null)

  useEffect(() => {
    const fetchSavedJobs = async () => {
      if (!user || !auth?.currentUser) {
        setLoadingSaved(false)
        return
      }
      setLoadingSaved(true)
      try {
        const token = await auth.currentUser.getIdToken()
        const response = await fetch("/api/saved-jobs", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          const savedSet = new Set<string>(
            (data.savedJobs || []).map((job: any) => job.jobId)
          )
          setSavedJobs(savedSet)
        } 
      } catch (err) {
        // Error is not critical to user experience
      } finally {
        setLoadingSaved(false)
      }
    }
    fetchSavedJobs()
  }, [user])

  const handleSaveJob = useCallback(async (job: Job) => {
    if (!user || !auth?.currentUser) {
      // Store the job to save and show auth modal
      setPendingJobToSave(job)
      setPendingAction('save')
      setAuthMode('signin')
      setShowAuthModal(true)
      return
    }
    const isSaved = savedJobs.has(job.id)
    
    // Optimistic update - change UI immediately
    setSavedJobs(prev => {
      const newSet = new Set(prev)
      if (isSaved) {
        newSet.delete(job.id)
      } else {
        newSet.add(job.id)
      }
      return newSet
    })
    
    // Show immediate feedback
    toast({ title: isSaved ? "Job unsaved" : "Job saved" })
    
    try {
      const token = await auth.currentUser.getIdToken()
      const method = isSaved ? "DELETE" : "POST"
      const url = isSaved ? `/api/saved-jobs/${job.id}` : "/api/saved-jobs"
      
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: isSaved ? undefined : JSON.stringify({
          jobId: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          summary: job.summary || job.description?.slice(0, 200) || "",
          salary: job.salary || "",
          matchingScore: job.matchingScore ?? 0,
          matchingSummary: job.matchingSummary || "",
          originalData: job,
        }),
      })

      if (response.ok) {
        if (!isSaved) {
          const savedJob = await response.json()
          // Update the job with the calculated score
          if (savedJob.matchingScore) {
            job.matchingScore = savedJob.matchingScore
            job.matchingSummary = savedJob.matchingSummary || ""
            // Show updated toast with score information
            toast({ title: "Job saved and scored!" })
          }
        }
      } else {
        // Revert optimistic update on failure
        setSavedJobs(prev => {
          const newSet = new Set(prev)
          if (isSaved) {
            newSet.add(job.id) // Revert - add it back
          } else {
            newSet.delete(job.id) // Revert - remove it
          }
          return newSet
        })
        toast({ title: `Failed to ${isSaved ? 'unsave' : 'save'} job`, variant: "destructive" })
      }
    } catch (err) {
      // Revert optimistic update on error
      setSavedJobs(prev => {
        const newSet = new Set(prev)
        if (isSaved) {
          newSet.add(job.id) // Revert - add it back
        } else {
          newSet.delete(job.id) // Revert - remove it
        }
        return newSet
      })
      toast({ title: "Error saving job", variant: "destructive" })
    }
  }, [user, auth, savedJobs, toast])

  // Handle pending actions after authentication
  useEffect(() => {
    if (user && pendingJobToSave && pendingAction) {
      if (pendingAction === 'save') {
        handleSaveJob(pendingJobToSave)
      } else if (pendingAction === 'tailor') {
        handleTailorResume(pendingJobToSave)
      }
      setPendingJobToSave(null)
      setPendingAction(null)
    }
  }, [user, pendingJobToSave, pendingAction, handleSaveJob])

  const handleTailorResume = async (job: Job) => {
    if (!user || !auth?.currentUser) {
      // Store the job to save and show auth modal
      setPendingJobToSave(job)
      setPendingAction('tailor')
      setAuthMode('signin')
      setShowAuthModal(true)
      return
    }

    // Check if job is already saved
    const isAlreadySaved = savedJobs.has(job.id)
    
    // If not saved, save it first
    if (!isAlreadySaved) {
      try {
        const token = await auth.currentUser.getIdToken()
        const response = await fetch("/api/saved-jobs", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jobId: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            summary: job.matchingSummary || job.description?.slice(0, 200) || "",
            salary: job.salary || "",
            matchingScore: job.matchingScore ?? 0,
            originalData: job,
          }),
        })

        if (response.ok) {
          // Update saved jobs state
          setSavedJobs(prev => new Set(prev).add(job.id))
          toast({ title: "Job saved automatically" })
        } else {
          // Continue to tailor resume even if save fails
          toast({ title: "Failed to save job, but continuing to tailor resume", variant: "destructive" })
        }
      } catch (err) {
        // Continue to tailor resume even if save fails
        toast({ title: "Error saving job, but continuing to tailor resume", variant: "destructive" })
      }
    }

    // Mark job as having resume tailored
    try {
      const token = await auth.currentUser.getIdToken()
      await fetch(`/api/saved-jobs/${job.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeTailored: true,
        }),
      })
    } catch (err) {
      // Don't block navigation if status update fails
      console.error("Failed to update resume tailored status:", err)
    }

    // Navigate to tailor resume page
    router.push(`/tailor-resume/${job.id}`)
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50 border-green-200"
    if (score >= 80) return "text-blue-600 bg-blue-50 border-blue-200"
    return "text-amber-600 bg-amber-50 border-amber-200"
  }

  const truncateDescription = (description: string, wordLimit: number = 50) => {
    const words = description.split(' ')
    if (words.length <= wordLimit) return description
    return words.slice(0, wordLimit).join(' ') + '...'
  }

  if (!results || results.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardHeader>
          <CardTitle>No Jobs Found</CardTitle>
          <p className="text-muted-foreground">Try adjusting your search terms.</p>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Job Matches ({results.length} found)
        </CardTitle>
        <p className="text-sm text-muted-foreground">Showing jobs with the highest match scores based on your resume.</p>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead className="text-center">Details</TableHead>
                <TableHead className="text-center w-36">
                  Actions
                  {!user && (
                    <div className="text-xs text-orange-500 font-semibold mt-1 text-center">
                      (Sign In Required)
                    </div>
                  )}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((job) => (
                <TableRow key={job.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="font-medium">
                      {job.applyUrl ? (
                        <a
                          href={job.applyUrl}
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
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{job.company}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">{job.location}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {job.postedAt || "Not specified"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {job.salary || "Not specified"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setJobDetailsOpen(job.id)}
                      className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1 bg-yellow-300 rounded-md p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveJob(job)}
                        className={`gap-2 ${savedJobs.has(job.id) ? "text-blue-600 hover:text-blue-700" : "text-green-600 hover:text-green-700"}`}
                        disabled={loadingSaved}
                      >
                        <Bookmark className={`h-5 w-5 ${savedJobs.has(job.id) ? "fill-current" : ""}`} />
                        {savedJobs.has(job.id) ? "Unsave Job" : "Save Job"}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleTailorResume(job)}
                        className="gap-2 text-purple-600 hover:text-purple-700"
                      >
                        <Sparkles className="h-5 w-5" />
                        Tailor Resume
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {selectedJob && (
          <MatchingScoreDialog 
            job={selectedJob}
            isOpen={!!selectedJob} 
            onClose={() => setSelectedJob(null)} 
          />
        )}

        {jobDetailsOpen && (
          <Dialog open={!!jobDetailsOpen} onOpenChange={() => setJobDetailsOpen(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {results.find(job => job.id === jobDetailsOpen)?.title} at {results.find(job => job.id === jobDetailsOpen)?.company}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {(() => {
                  const job = results.find(job => job.id === jobDetailsOpen)
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
                          <p className="text-muted-foreground">{job.postedAt || "Not specified"}</p>
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">Salary</h3>
                          <Badge variant="secondary">{job.salary || "Not specified"}</Badge>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold mb-2">Description</h3>
                        <p className="text-muted-foreground whitespace-pre-wrap">{job.description || job.summary || "No description available"}</p>
                      </div>
                      
                      {job.qualifications && job.qualifications.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2">Qualifications</h3>
                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            {job.qualifications.map((qual, index) => (
                              <li key={index}>{qual}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {job.responsibilities && job.responsibilities.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2">Responsibilities</h3>
                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            {job.responsibilities.map((resp, index) => (
                              <li key={index}>{resp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {job.benefits && job.benefits.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2">Benefits</h3>
                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            {job.benefits.map((benefit, index) => (
                              <li key={index}>{benefit}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {job.applyUrl && (
                        <div className="pt-4 border-t">
                          <Button asChild>
                            <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
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

        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false)
            setPendingJobToSave(null)
            setPendingAction(null)
          }}
          mode={authMode}
          onModeChange={setAuthMode}
        />
      </CardContent>
    </Card>
  )
}
