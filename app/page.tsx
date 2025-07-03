"use client"

import { useState, useEffect } from "react"
import { JobSearch } from "@/components/job-search"
import { JobResults } from "@/components/job-results"
import { Header } from "@/components/header"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

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

export default function HomePage() {
  const [searchResults, setSearchResults] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [defaultResume, setDefaultResume] = useState<string>("")
  const { user } = useAuth()

  // Load the user's default resume from Firestore
  useEffect(() => {
    const fetchDefaultResume = async () => {
      if (user?.defaultResumeId && db) {
        const resumeDoc = await getDoc(doc(db, "resumes", user.defaultResumeId))
        if (resumeDoc.exists()) {
          setDefaultResume(resumeDoc.data().content || "")
        }
      }
    }
    fetchDefaultResume()
  }, [user])

  const handleSearch = async (query: string, location: string) => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, location, resume: defaultResume }),
      })
      const data = await res.json()
      setSearchResults(data.jobs || [])
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('lastJobResults', JSON.stringify(data.jobs || []))
      }
    } catch (err) {
      setSearchResults([])
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('lastJobResults')
      }
      // Optionally show a toast or error message here
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gray-900">Find Your Perfect Job Match</h1>
            <p className="text-xl text-gray-600">AI-powered job search that matches your skills and experience</p>
          </div>

          <JobSearch onSearch={handleSearch} isLoading={isLoading} />

          {searchResults.length > 0 && <JobResults results={searchResults} />}
        </div>
      </main>
    </div>
  )
}
