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

function HomePage() {
  const [searchResults, setSearchResults] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [defaultResume, setDefaultResume] = useState<string>("")
  const { user } = useAuth()

  // Load the user's default resume from the API
  useEffect(() => {
    const fetchDefaultResume = async () => {
      if (!user || !auth?.currentUser) {
        console.log('[HomePage] No user authenticated, skipping default resume fetch')
        return
      }

      try {
        console.log('[HomePage] Fetching default resume for user:', user.email)
        const token = await auth.currentUser.getIdToken()
        
        const response = await fetch('/api/resumes', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          console.log('[HomePage] Fetched resumes:', data.resumes?.length || 0)
          
          // Find the default resume
          const defaultResumeData = data.resumes?.find((resume: any) => resume.isDefault)
          if (defaultResumeData) {
            console.log('[HomePage] Found default resume:', defaultResumeData.name, 'Content length:', defaultResumeData.content?.length || 0)
            setDefaultResume(defaultResumeData.content || "")
          } else {
            console.log('[HomePage] No default resume found')
            setDefaultResume("")
          }
        } else {
          console.error('[HomePage] Failed to fetch resumes:', response.status, response.statusText)
          setDefaultResume("")
        }
      } catch (error) {
        console.error('[HomePage] Error fetching default resume:', error)
        setDefaultResume("")
      }
    }

    fetchDefaultResume()
  }, [user])

  const handleSearch = async (query: string, location: string) => {
    console.log('[HomePage] Starting job search:', { query, location, resumeLength: defaultResume.length })
    setIsLoading(true)
    
    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, location, resume: defaultResume }),
      })
      
      console.log('[HomePage] Job search API response status:', res.status)
      
      if (res.ok) {
        const data = await res.json()
        console.log('[HomePage] Job search results:', data.jobs?.length || 0, 'jobs')
        setSearchResults(data.jobs || [])
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('lastJobResults', JSON.stringify(data.jobs || []))
        }
      } else {
        const errorText = await res.text()
        console.error('[HomePage] Job search API error:', res.status, res.statusText, errorText)
        setSearchResults([])
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('lastJobResults')
        }
      }
    } catch (err) {
      console.error('[HomePage] Job search error:', err)
      setSearchResults([])
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('lastJobResults')
      }
    }
    setIsLoading(false)
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold text-gray-900">Find Your Perfect Job Match</h1>
              <p className="text-xl text-gray-600">AI-powered job search that matches your skills and experience</p>
              {user && (
                <div className="text-sm text-gray-500">
                  {defaultResume ? 
                    `✅ Default resume loaded (${defaultResume.length} characters)` : 
                    '⚠️ No default resume found - please upload a resume in "My Resumes" page'
                  }
                </div>
              )}
            </div>

            <JobSearch onSearch={handleSearch} isLoading={isLoading} />

            {searchResults.length > 0 && <JobResults results={searchResults} />}
          </div>
        </main>
      </div>
    </AuthProvider>
  )
}

export default function HomePageWithAuth() {
  return (
    <AuthProvider>
      <HomePage />
    </AuthProvider>
  )
}
