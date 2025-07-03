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
  const [resumeLoading, setResumeLoading] = useState(false)
  const { user } = useAuth()

  // Fetch default resume when user is authenticated
  useEffect(() => {
    const fetchDefaultResume = async () => {
      if (!user || !auth?.currentUser) return
      
      setResumeLoading(true)
      console.log('[HomePage] Fetching default resume for user:', user.email)
      
      try {
        const token = await auth.currentUser.getIdToken()
        const response = await fetch('/api/resumes', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('[HomePage] Resumes fetched:', data.resumes?.length || 0)
          
          // Find the default resume
          const defaultResumeData = data.resumes?.find((r: Resume) => r.isDefault)
          if (defaultResumeData) {
            console.log('[HomePage] Default resume found:', defaultResumeData.name)
            setDefaultResume(defaultResumeData)
          } else {
            // If no default, use the first resume
            const firstResume = data.resumes?.[0]
            if (firstResume) {
              console.log('[HomePage] No default resume, using first resume:', firstResume.name)
              setDefaultResume(firstResume)
            } else {
              console.log('[HomePage] No resumes found for user')
            }
          }
        } else {
          console.error('[HomePage] Failed to fetch resumes:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('[HomePage] Error fetching default resume:', error)
      } finally {
        setResumeLoading(false)
      }
    }

    fetchDefaultResume()
  }, [user])

  const handleSearch = async (query: string, location: string) => {
    console.log('[HomePage] Starting job search:', { query, location, hasDefaultResume: !!defaultResume })
    setIsLoading(true)
    setSearchResults([])
    
    try {
      const searchPayload = {
        query,
        location,
        resume: defaultResume?.content || ""
      }
      
      console.log('[HomePage] Search payload:', {
        query: searchPayload.query,
        location: searchPayload.location,
        resumeLength: searchPayload.resume.length,
        resumePreview: searchPayload.resume.substring(0, 100) + '...'
      })
      
      const response = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchPayload),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('[HomePage] Job search results:', data.jobs?.length || 0, 'jobs')
        setSearchResults(data.jobs || [])
      } else {
        console.error('[HomePage] Job search failed:', response.status, response.statusText)
        const errorData = await response.text()
        console.error('[HomePage] Error response:', errorData)
      }
    } catch (error) {
      console.error('[HomePage] Job search error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Find Your Perfect Job Match
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              AI-powered job search tailored to your resume
            </p>
          </div>
          
          <JobSearch onSearch={handleSearch} isLoading={isLoading} />
          
          {searchResults.length > 0 && (
            <div className="mt-8">
              <JobResults results={searchResults} />
            </div>
          )}
          
          {!isLoading && searchResults.length === 0 && (
            <div className="mt-8 text-center text-gray-500">
              <p>Start your search to find amazing job opportunities!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <HomePage />
    </AuthProvider>
  )
}
