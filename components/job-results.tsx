"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bookmark, ExternalLink, TrendingUp } from "lucide-react"
import { MatchingScoreDialog } from "@/components/matching-score-dialog"
import Link from "next/link"
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
}

interface JobResultsProps {
  results: Job[]
}

export function JobResults({ results }: JobResultsProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set())
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [loadingSaved, setLoadingSaved] = useState(false)

  useEffect(() => {
    const fetchSavedJobs = async () => {
      if (!user || !auth?.currentUser) return
      setLoadingSaved(true)
      try {
        const token = await auth.currentUser.getIdToken()
        const response = await fetch("/api/saved-jobs", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
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
        // Ignore for now
      } finally {
        setLoadingSaved(false)
      }
    }
    fetchSavedJobs()
  }, [user])

  const handleSaveJob = async (job: Job) => {
    if (!user || !auth?.currentUser) {
      toast({ title: "Sign in required", description: "Please sign in to save jobs.", variant: "destructive" })
      return
    }
    const isSaved = savedJobs.has(job.id)
    try {
      const token = await auth.currentUser.getIdToken()
      if (isSaved) {
        // Unsave
        const response = await fetch(`/api/saved-jobs/${job.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        if (response.ok) {
          setSavedJobs(prev => {
            const newSet = new Set(prev)
            newSet.delete(job.id)
            return newSet
          })
          toast({ title: "Job unsaved" })
        } else {
          toast({ title: "Failed to unsave job", variant: "destructive" })
        }
      } else {
        // Save
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
          setSavedJobs(prev => {
            const newSet = new Set(prev)
            newSet.add(job.id)
            return newSet
          })
          toast({ title: "Job saved" })
        } else if (response.status === 409) {
          toast({ title: "Job already saved" })
        } else {
          toast({ title: "Failed to save job", variant: "destructive" })
        }
      }
    } catch (err) {
      toast({ title: "Error saving job", variant: "destructive" })
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50"
    if (score >= 85) return "text-blue-600 bg-blue-50"
    return "text-orange-600 bg-orange-50"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  if (!results || results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No jobs found</CardTitle>
          <p className="text-sm text-gray-600">Try adjusting your search or check back later.</p>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Job Matches ({results.length} found)
        </CardTitle>
        <p className="text-sm text-gray-600">Showing jobs with 60+ matching score based on your default resume (if available)</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Score</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="max-w-xs">Score Summary</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`font-bold ${getScoreColor(job.matchingScore ?? 0)}`}
                      onClick={() => setSelectedJob(job)}
                    >
                      {typeof job.matchingScore === "number" ? `${job.matchingScore}%` : "-"}
                    </Button>
                  </TableCell>
                  <TableCell>
                    {job.applyUrl ? (
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {job.title}
                      </a>
                    ) : (
                      <span className="font-medium">{job.title}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{job.company}</TableCell>
                  <TableCell>{job.location}</TableCell>
                  <TableCell className="max-w-xs">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p
                            className="text-sm text-gray-600 line-clamp-2 cursor-pointer"
                            tabIndex={0}
                          >
                            {job.matchingSummary?.length
                              ? job.matchingSummary
                              : job.description?.slice(0, 200) || "No summary available."}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-md whitespace-pre-line">
                          {job.matchingSummary?.length
                            ? job.matchingSummary
                            : job.description || "No summary available."}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {job.postedAt || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {job.salary || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSaveJob(job)}
                              className={savedJobs.has(job.id) ? "text-blue-600" : ""}
                              disabled={loadingSaved}
                            >
                              <Bookmark className={`h-4 w-4 ${savedJobs.has(job.id) ? "fill-current" : ""}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {savedJobs.has(job.id) ? "Unsave job" : "Save job"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/tailor-resume/${job.id}`}>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Tailor my resume for this job
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {selectedJob && (
          <MatchingScoreDialog job={selectedJob} isOpen={!!selectedJob} onClose={() => setSelectedJob(null)} />
        )}
      </CardContent>
    </Card>
  )
}
