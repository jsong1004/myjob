"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { LandingPage } from "@/components/landing-page"

function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Redirect authenticated users to search page
    if (!loading && user) {
      router.replace('/search')
    }
  }, [user, loading, router])

  // Show loading state while checking auth
  if (loading) {
    return (
      <>
        <Header />
        <main className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-pulse">
              <div className="h-12 bg-muted rounded mb-4"></div>
              <div className="h-6 bg-muted rounded mb-8 mx-auto max-w-2xl"></div>
            </div>
          </div>
        </main>
      </>
    )
  }

  // Show landing page for unauthenticated users
  if (!user) {
    return (
      <>
        <Header />
        <LandingPage />
      </>
    )
  }

  // This won't be reached due to the redirect, but just in case
  return null
}

export default function Home() {
  return (
    <AuthProvider>
      <HomePage />
    </AuthProvider>
  )
}
