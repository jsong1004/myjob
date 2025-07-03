"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bookmark, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Header } from "@/components/header"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { auth } from "@/lib/firebase"
import type { SavedJob } from "@/lib/types"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"

export default function SavedJobsPage() {
  const { user } = useAuth()
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSavedJobs = async () => {
      if (!user || !auth?.currentUser) return
      setLoading(true)
      setError(null)
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
          "Content-Type": "application/json",
        },
      })
      if (response.ok) {
        setSavedJobs((prev) => prev.filter((job) => job.id !== jobId))
      } else {
        alert("Failed to unsave job.")
      }
    } catch {
      alert("Error unsaving job.")
    }
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">Saved Jobs</h1>
            {loading ? (
              <Card>
                <CardHeader>
                  <CardTitle>Loading...</CardTitle>
                </CardHeader>
              </Card>
            ) : error ? (
              <Card>
                <CardHeader>
                  <CardTitle>Error</CardTitle>
                  <p className="text-sm text-red-600">{error}</p>
                </CardHeader>
              </Card>
            ) : savedJobs.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No saved jobs</CardTitle>
                  <p className="text-sm text-gray-600">You haven't saved any jobs yet.</p>
                </CardHeader>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {savedJobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>
                            {job.originalData?.applyUrl ? (
                              <a
                                href={job.originalData.applyUrl}
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
                          <TableCell>{job.company}</TableCell>
                          <TableCell>{job.location}</TableCell>
                          <TableCell>{job.matchingScore ?? "-"}%</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnsaveJob(job.id)}
                                className="text-blue-600"
                                title="Unsave job"
                              >
                                <Bookmark className="h-4 w-4 fill-current" />
                              </Button>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Link href={`/tailor-resume/${job.jobId}`}>
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
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </AuthProvider>
  )
} 