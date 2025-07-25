"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Loader2, Download, Eye, AlertCircle, Trash2, ChevronUp, ChevronDown } from "lucide-react"
import { Header } from "@/components/header"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { auth } from "@/lib/firebase"
import type { CoverLetter } from "@/lib/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"

export default function CoverLettersPage() {
  return (
    <AuthProvider>
      <CoverLettersPageContent />
    </AuthProvider>
  )
}

function CoverLettersPageContent() {
  const { user } = useAuth()
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const [sortField, setSortField] = useState<'name' | 'jobTitle' | 'company' | 'createdAt'>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    const fetchCoverLetters = async () => {
      if (!user || !auth?.currentUser) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const token = await auth.currentUser.getIdToken()
        const response = await fetch("/api/cover-letters", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          setCoverLetters(data.coverLetters || [])
        } else {
          setError("Failed to fetch cover letters.")
        }
      } catch (err) {
        setError("Error loading cover letters.")
      } finally {
        setLoading(false)
      }
    }
    fetchCoverLetters()
  }, [user])

  const formatCoverLetterAsMarkdown = (coverLetter: CoverLetter): string => {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Create markdown formatted content
    const markdownContent = `# Cover Letter

**Date:** ${currentDate}

**To:** ${coverLetter.company}  
**Position:** ${coverLetter.jobTitle}

---

${coverLetter.content}`

    return markdownContent
  }

  const handleDownloadCoverLetter = async (coverLetter: CoverLetter) => {
    try {
      const markdownContent = formatCoverLetterAsMarkdown(coverLetter)
      
      // Create a markdown file and convert to PDF
      const markdownFile = new File([markdownContent], 'temp.md', { type: 'text/markdown' })
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
      const sanitizedName = coverLetter.name.replace(/[^a-zA-Z0-9\s-_]/g, '').trim()
      link.download = `${sanitizedName}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast({
        title: "Download successful",
        description: "Cover letter downloaded as PDF.",
      })
    } catch (err) {
      console.error("Download error:", err)
      toast({
        title: "Download failed",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCoverLetter = async (coverLetterId: string) => {
    if (!confirm("Are you sure you want to delete this cover letter? This action cannot be undone.")) {
      return
    }

    try {
      const token = await auth?.currentUser?.getIdToken()
      if (!token) {
        toast({ title: "Error", description: "Authentication required.", variant: "destructive" })
        return
      }
      const response = await fetch(`/api/cover-letters/${coverLetterId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        setCoverLetters((prev) => prev.filter((cl) => cl.id !== coverLetterId))
        toast({ title: "Success", description: "Cover letter deleted successfully." })
      } else {
        const data = await response.json()
        toast({ title: "Error", description: data.error || "Failed to delete cover letter.", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" })
    }
  }

  const formatDate = (date: any) => {
    // Handle Firestore Timestamp or Date objects
    if (date?.toDate) {
      return date.toDate().toLocaleDateString()
    }
    return new Date(date).toLocaleDateString()
  }

  const handleSort = (field: 'name' | 'jobTitle' | 'company' | 'createdAt') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedCoverLetters = [...coverLetters].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'jobTitle':
        aValue = a.jobTitle.toLowerCase()
        bValue = b.jobTitle.toLowerCase()
        break
      case 'company':
        aValue = a.company.toLowerCase()
        bValue = b.company.toLowerCase()
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

  const SortableHeader = ({ field, children }: { field: 'name' | 'jobTitle' | 'company' | 'createdAt', children: React.ReactNode }) => (
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

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4">
            <h1 className="text-2xl font-bold tracking-tight">My Cover Letters</h1>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : coverLetters.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">No Cover Letters</h3>
                <p className="text-muted-foreground mb-4">You haven't saved any cover letters yet.</p>
                <Button asChild>
                  <a href="/saved-jobs">Create Cover Letter</a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader field="name">Name</SortableHeader>
                      <SortableHeader field="jobTitle">Job Title</SortableHeader>
                      <SortableHeader field="company">Company</SortableHeader>
                      <SortableHeader field="createdAt">Created</SortableHeader>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCoverLetters.map((coverLetter) => (
                      <TableRow key={coverLetter.id}>
                        <TableCell>
                          <a
                            href={`/cover-letter/${coverLetter.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {coverLetter.name}
                          </a>
                        </TableCell>
                        <TableCell>{coverLetter.jobTitle}</TableCell>
                        <TableCell>
                          <Link 
                            href={`/companies/${encodeURIComponent(coverLetter.company)}?from=cover-letters`}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {coverLetter.company}
                          </Link>
                        </TableCell>
                        <TableCell>{formatDate(coverLetter.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDownloadCoverLetter(coverLetter)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Download as PDF</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteCoverLetter(coverLetter.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Delete</p>
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
    </>
  )
} 