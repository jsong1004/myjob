"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldCheck, AlertCircle, Activity, Users, GitBranch, Database } from "lucide-react"
import { Header } from "@/components/header"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AdminActivities } from "@/components/admin/admin-activities"
import { AdminUserManagement } from "@/components/admin/admin-user-management"
import { AdminGitHubIssues } from "@/components/admin/admin-github-issues"
import { BatchJobsAdmin } from "@/components/admin/batch-jobs-admin"

type AdminSection = 'activities' | 'users' | 'issues' | 'batch-jobs'

export default function AdminPage() {
  return (
    <AuthProvider>
      <AdminPageContent />
    </AuthProvider>
  )
}

function AdminPageContent() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState<AdminSection>('activities')

  const isAdmin = user?.email === "jsong@koreatous.com"

  if (!user || !isAdmin) {
    return (
      <>
        <Header />
        <main className="container mx-auto px-4 py-12">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>You do not have permission to view this page.</AlertDescription>
          </Alert>
        </main>
      </>
    )
  }

  const adminSections = [
    {
      id: 'activities' as AdminSection,
      title: 'All User Activities',
      icon: Activity,
      description: 'View and monitor all user activities'
    },
    {
      id: 'users' as AdminSection,
      title: 'User Management',
      icon: Users,
      description: 'Manage users and their data'
    },
    {
      id: 'issues' as AdminSection,
      title: 'GitHub Issues',
      icon: GitBranch,
      description: 'View and manage GitHub issues'
    },
    {
      id: 'batch-jobs' as AdminSection,
      title: 'Batch Jobs',
      icon: Database,
      description: 'Monitor and manage nightly job scraping'
    }
  ]

  const renderContent = () => {
    switch (activeSection) {
      case 'activities':
        return <AdminActivities />
      case 'users':
        return <AdminUserManagement />
      case 'issues':
        return <AdminGitHubIssues />
      case 'batch-jobs':
        return <BatchJobsAdmin />
      default:
        return <AdminActivities />
    }
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-primary" />
              Admin Dashboard
            </h1>
          </div>
          
          {/* Stacked Card Layout */}
          <div className="space-y-4">
            {/* Admin Actions Card at the top */}
            <Card>
              <CardContent className="p-4">
                <nav className="flex items-center gap-6">
                  {adminSections.map((section) => {
                    const Icon = section.icon
                    return (
                      <button
                        key={section.id}
                        className={`flex items-center gap-2 text-sm transition-colors ${
                          activeSection === section.id 
                            ? 'text-primary font-medium' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={() => setActiveSection(section.id)}
                      >
                        <Icon className="h-4 w-4" />
                        {section.title}
                      </button>
                    )
                  })}
                </nav>
              </CardContent>
            </Card>
            
            {/* Content Card below */}
            <div>
              {renderContent()}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}