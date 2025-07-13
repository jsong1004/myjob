"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldCheck, AlertCircle, Activity, Users } from "lucide-react"
import { Header } from "@/components/header"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AdminActivities } from "@/components/admin/admin-activities"
import { AdminUserManagement } from "@/components/admin/admin-user-management"

type AdminSection = 'activities' | 'users'

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
    }
  ]

  const renderContent = () => {
    switch (activeSection) {
      case 'activities':
        return <AdminActivities />
      case 'users':
        return <AdminUserManagement />
      default:
        return <AdminActivities />
    }
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Manage and monitor the platform.</p>
          </div>
          
          {/* Two Column Layout - 3:7 ratio */}
          <div className="grid grid-cols-10 gap-6">
            {/* Left Sidebar - 3/10 columns */}
            <div className="col-span-3">
              <Card>
                <CardContent className="p-4">
                  <h2 className="font-semibold mb-4">Admin Actions</h2>
                  <nav className="space-y-2">
                    {adminSections.map((section) => {
                      const Icon = section.icon
                      return (
                        <Button
                          key={section.id}
                          variant={activeSection === section.id ? "default" : "ghost"}
                          className="w-full justify-start h-auto p-3"
                          onClick={() => setActiveSection(section.id)}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                            <div className="text-left">
                              <div className="font-medium">{section.title}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {section.description}
                              </div>
                            </div>
                          </div>
                        </Button>
                      )
                    })}
                  </nav>
                </CardContent>
              </Card>
            </div>
            
            {/* Right Content Area - 7/10 columns */}
            <div className="col-span-7">
              {renderContent()}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}