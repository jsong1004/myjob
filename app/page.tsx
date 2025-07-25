"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { JobSearch } from "@/components/job-search"
import { JobResults } from "@/components/job-results"
import { Header } from "@/components/header"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { AuthModal } from "@/components/auth-modal"
import { OnboardingModal } from "@/components/onboarding-modal"
import { JobSearchLoadingInfo } from "@/components/job-search-loading-info"
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
  summary?: string
}

function HomePageContent() {
  const [searchResults, setSearchResults] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup')
  const [currentSearchQuery, setCurrentSearchQuery] = useState("")
  const [currentSearchLocation, setCurrentSearchLocation] = useState("")
  const { user, showOnboarding, setShowOnboarding } = useAuth()
  const searchParams = useSearchParams()

  // Handle initial search from URL parameters (e.g., from onboarding)
  useEffect(() => {
    const query = searchParams.get('q')
    const location = searchParams.get('location')
    
    if (query && location && user && !hasSearched) {
      handleSearch(query, location)
    }
  }, [searchParams, user, hasSearched])


  const handleSearch = async (query: string, location: string) => {
    setIsLoading(true)
    setSearchResults([])
    setHasSearched(true)
    setCurrentSearchQuery(query)
    setCurrentSearchLocation(location)
    
    try {
      const searchPayload = {
        query,
        location,
        resume: "" // No resume for unauthenticated search
      }
      
      const token = user && auth?.currentUser ? await auth.currentUser.getIdToken() : null
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch('/api/jobs/search', {
        method: 'POST',
        headers,
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
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
              Find Your Next Opportunity
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Search for jobs and opportunities. Sign in to get personalized job matches based on your resume.
            </p>
          </div>
          
          <JobSearch 
            onSearch={handleSearch} 
            isLoading={isLoading}
            initialQuery={searchParams.get('q') || ""}
            initialLocation={searchParams.get('location') || "Seattle, Washington, United States"}
          />
          
          {isLoading && (
            <JobSearchLoadingInfo 
              searchQuery={currentSearchQuery} 
              location={currentSearchLocation} 
            />
          )}

          {searchResults.length > 0 && (
            <div className="mt-10">
              <JobResults results={searchResults} />
            </div>
          )}
          
          {!isLoading && searchResults.length === 0 && (
            <div className="mt-10 text-center text-muted-foreground">
              <p>
                {hasSearched 
                  ? "No new jobs are found. Please search again later." 
                  : "Your job search results will appear here."}
              </p>
            </div>
          )}
        </div>
      </main>

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />
      
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </>
  )
}

function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePageContent />
    </Suspense>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <HomePage />
    </AuthProvider>
  )
}
