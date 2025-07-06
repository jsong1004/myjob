"use client"

import { useState, useEffect } from "react"
import { JobSearch } from "@/components/job-search"
import { JobResults } from "@/components/job-results"
import { Header } from "@/components/header"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { auth } from "@/lib/firebase"

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
  matchingScore: number
  matchingSummary?: string
}

interface Resume {
  id: string
  name: string
  content: string
  createdAt: string
  updatedAt: string
  isDefault?: boolean
}

function HomePage() {
  const [searchResults, setSearchResults] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [defaultResume, setDefaultResume] = useState<Resume | null>(null)
  const [resumeLoading, setResumeLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchDefaultResume = async () => {
      if (!user || !auth?.currentUser) {
        setResumeLoading(false)
        return
      }
      
      setResumeLoading(true)
      try {
        const token = await auth.currentUser.getIdToken()
        const response = await fetch('/api/resumes', {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          const defaultResumeData = data.resumes?.find((r: Resume) => r.isDefault)
          if (defaultResumeData) {
            setDefaultResume(defaultResumeData)
          } else {
            setDefaultResume(data.resumes?.[0] || null)
          }
        } else {
          console.error('Failed to fetch resumes:', response.statusText)
        }
      } catch (error) {
        console.error('Error fetching default resume:', error)
      } finally {
        setResumeLoading(false)
      }
    }

    fetchDefaultResume()
  }, [user])

  const handleSearch = async (query: string, location: string) => {
    setIsLoading(true)
    setSearchResults([])
    
    try {
      const searchPayload = {
        query,
        location,
        resume: defaultResume?.content || ""
      }
      
      const response = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchPayload),
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.jobs || [])
      } else {
        console.error('Job search failed:', await response.text())
      }
    } catch (error) {
      console.error('Job search error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
              Find Your Next Opportunity
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Leverage AI to match your resume with the perfect job. Search, score, and tailor your application all in one place.
            </p>
          </div>
          
          <JobSearch onSearch={handleSearch} isLoading={isLoading} />
          
          {isLoading && (
            <div className="mt-8 text-center">
              <p className="text-muted-foreground">Searching for jobs...</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="mt-10">
              <JobResults results={searchResults} />
            </div>
          )}
          
          {!isLoading && searchResults.length === 0 && (
            <div className="mt-10 text-center text-muted-foreground">
              <p>Your job search results will appear here.</p>
            </div>
          )}
        </div>
      </main>
    </>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <HomePage />
    </AuthProvider>
  )
}
