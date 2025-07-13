"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AdminActivitiesPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new admin page
    router.replace('/admin')
  }, [router])

  return null
} 