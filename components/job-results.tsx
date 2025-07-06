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
  const [loadingSaved, setLoadingSaved] = useState(true)

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

  const handleSaveJob = async (job: Job) => {
    if (!user || !auth?.currentUser) {
      toast({ title: "Sign in required", description: "Please sign in to save jobs.", variant: "destructive" })
      return
    }
    const isSaved = savedJobs.has(job.id)
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
          summary: job.matchingSummary || job.description?.slice(0, 200) || "",
          salary: job.salary || "",
          matchingScore: job.matchingScore ?? 0,
          originalData: job,
        }),
      })

      if (response.ok) {
        setSavedJobs(prev => {
          const newSet = new Set(prev)
          if (isSaved) {
            newSet.delete(job.id)
          } else {
            newSet.add(job.id)
          }
          return newSet
        })
        toast({ title: isSaved ? "Job unsaved" : "Job saved" })
      } else {
        toast({ title: `Failed to ${isSaved ? 'unsave' : 'save'} job`, variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Error saving job", variant: "destructive" })
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50 border-green-200"
    if (score >= 80) return "text-blue-600 bg-blue-50 border-blue-200"
    return "text-amber-600 bg-amber-50 border-amber-200"
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
                <TableHead className="w-24 text-center">Score</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="max-w-xs">AI Summary</TableHead>
                <TableHead className="text-right w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((job) => (
                <TableRow key={job.id} className="hover:bg-muted/50">
                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`font-bold text-base border ${getScoreColor(job.matchingScore ?? 0)}`}
                      onClick={() => setSelectedJob(job)}
                    >
                      {job.matchingScore ?? 0}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {job.applyUrl ? (
                        <a
                          href={job.applyUrl}
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
                    <div className="text-sm text-muted-foreground">{job.company}</div>
                  </TableCell>
                  <TableCell>
                     <div className="text-sm text-muted-foreground">{job.location}</div>
                     <Badge variant="secondary" className="mt-1 font-mono text-xs">
                      {job.salary || "Not specified"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm text-muted-foreground line-clamp-2 cursor-help">
                            {job.matchingSummary || "No summary available."}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-md p-4 whitespace-pre-line">
                          <p>{job.matchingSummary || "No summary available."}</p>
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
                              onClick={() => handleSaveJob(job)}
                              className={savedJobs.has(job.id) ? "text-blue-600 hover:text-blue-700" : "text-muted-foreground"}
                              disabled={loadingSaved}
                            >
                              <Bookmark className={`h-5 w-5 ${savedJobs.has(job.id) ? "fill-current" : ""}`} />
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
                            <Link href={`/tailor-resume/${job.id}`} passHref>
                              <Button asChild variant="ghost" size="icon">
                                <a><ExternalLink className="h-5 w-5 text-muted-foreground" /></a>
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Tailor resume for this job
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
          <MatchingScoreDialog 
            job={selectedJob}
            isOpen={!!selectedJob} 
            onClose={() => setSelectedJob(null)} 
          />
        )}
      </CardContent>
    </Card>
  )
}
