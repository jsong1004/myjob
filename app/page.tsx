"use client"

import { useState } from "react"
import { JobSearch } from "@/components/job-search"
import { JobResults } from "@/components/job-results"
import { Header } from "@/components/header"
import { AuthProvider } from "@/components/auth-provider"

export default function HomePage() {
  const [searchResults, setSearchResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (query: string, location: string) => {
    setIsLoading(true)
    // Mock search results - in real app, this would call SerpApi + AI analysis
    setTimeout(() => {
      const mockResults = [
        {
          id: "1",
          title: "Senior Frontend Developer",
          company: "TechCorp Inc.",
          location: "San Francisco, CA",
          summary:
            "Build scalable React applications with modern JavaScript. Lead frontend architecture decisions and mentor junior developers.",
          postedAt: "2024-07-01",
          salary: "$120,000 - $160,000",
          matchingScore: 92,
          fullDescription: "We are looking for a Senior Frontend Developer to join our growing team...",
        },
        {
          id: "2",
          title: "Full Stack Engineer",
          company: "StartupXYZ",
          location: "Remote",
          summary:
            "Work on both frontend and backend systems. Experience with React, Node.js, and cloud platforms required.",
          postedAt: "2024-06-28",
          salary: "$100,000 - $140,000",
          matchingScore: 87,
          fullDescription: "Join our dynamic team as a Full Stack Engineer...",
        },
        {
          id: "3",
          title: "React Developer",
          company: "Digital Agency",
          location: "New York, NY",
          summary:
            "Create responsive web applications using React and TypeScript. Collaborate with design team on user experiences.",
          postedAt: "2024-06-30",
          salary: "$90,000 - $120,000",
          matchingScore: 85,
          fullDescription: "We are seeking a talented React Developer...",
        },
      ]
      setSearchResults(mockResults)
      setIsLoading(false)
    }, 2000)
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
            </div>

            <JobSearch onSearch={handleSearch} isLoading={isLoading} />

            {searchResults.length > 0 && <JobResults results={searchResults} />}
          </div>
        </main>
      </div>
    </AuthProvider>
  )
}
