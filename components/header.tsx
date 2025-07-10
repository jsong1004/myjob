"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { User, FileText, Bookmark, LogOut, Settings, Github } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { AuthModal } from "@/components/auth-modal"

import Image from "next/image"

export function Header() {
  const { user, loading, signOut } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')

  const handleSignIn = () => {
    setAuthMode('signin')
    setShowAuthModal(true)
  }

  const handleSignUp = () => {
    setAuthMode('signup')
    setShowAuthModal(true)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      
      // Check if on protected route and redirect with clean page reload
      const protectedRoutes = ['/profile', '/resumes', '/saved-jobs', '/cover-letters', '/my-activities', '/admin']
      const currentPath = window.location.pathname
      const isOnProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route))
      
      if (isOnProtectedRoute) {
        // Use replace to avoid back button issues and ensure clean reload
        window.location.replace('/')
      }
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase()
  }

  const isAdmin = user?.email === 'jsong@koreatous.com';

  return (
    <>
      <header className="bg-background/75 backdrop-blur-lg sticky top-0 z-50 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 text-xl font-semibold">
              <Image src="/logo.svg" alt="myJob logo" width={24} height={24} />
              myJob
            </Link>

            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                Search Jobs
              </Link>
              {user && (
                <>
                  <Link href="/saved-jobs" className="text-muted-foreground hover:text-foreground transition-colors">
                    Saved Jobs
                  </Link>
                  <Link href="/resumes" className="text-muted-foreground hover:text-foreground transition-colors">
                    My Resumes
                  </Link>
                  <Link href="/cover-letters" className="text-muted-foreground hover:text-foreground transition-colors">
                    My Cover Letters
                  </Link>
                  {isAdmin && <Link href="/admin/activities" className="text-primary font-semibold">Admin</Link>}
                </>
              )}
            </nav>

            <div className="flex items-center space-x-2">
              {loading ? (
                <Skeleton className="h-9 w-24" />
              ) : !user ? (
                <div className="space-x-2">
                  <Button variant="ghost" onClick={handleSignIn}>
                    Sign In
                  </Button>
                  <Button onClick={handleSignUp}>Sign Up</Button>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.photoURL} alt={user.name} />
                        <AvatarFallback>
                          {getUserInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link href="/saved-jobs" className="flex items-center">
                        <Bookmark className="mr-2 h-4 w-4" />
                        <span>Saved Jobs</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/resumes" className="flex items-center">
                        <FileText className="mr-2 h-4 w-4" />
                        <span>My Resumes</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/cover-letters" className="flex items-center">
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Cover Letters</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link href="/my-activities" className="flex items-center">
                        <FileText className="mr-2 h-4 w-4" />
                        <span>My Activities</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link href="/feedback" className="flex items-center">
                        <Github className="mr-2 h-4 w-4" />
                        <span>Submit Feedback</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </>
  )
}
