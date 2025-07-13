"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { AlertCircle, User, FileText, Settings, Star, Upload, Save, Loader2, CheckCircle, Camera } from "lucide-react"
import { Header } from "@/components/header"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { Resume } from "@/lib/types"
import { auth, storage } from "@/lib/firebase"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"

interface UserProfile {
  displayName: string
  email: string
  phoneNumber: string
  location: string
  linkedinUrl: string
  githubUrl: string
  portfolioUrl: string
  bio: string
  jobTitle: string
  experience: string
  skills: string[]
  defaultResumeId: string
  emailNotifications: boolean
  jobAlerts: boolean
  photoURL: string
}

export default function ProfilePage() {
  return (
    <AuthProvider>
      <ProfilePageContent />
    </AuthProvider>
  )
}

function ProfilePageContent() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile>({
    displayName: "",
    email: "",
    phoneNumber: "",
    location: "",
    linkedinUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    bio: "",
    jobTitle: "",
    experience: "",
    skills: [],
    defaultResumeId: "",
    emailNotifications: true,
    jobAlerts: true,
    photoURL: "",
  })
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [newSkill, setNewSkill] = useState("")
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  useEffect(() => {
    if (user) {
      fetchProfile()
      fetchResumes()
    } else {
      setLoading(false)
    }
  }, [user])

  const getAuthToken = async () => {
    if (!auth?.currentUser) return null
    try {
      return await auth.currentUser.getIdToken()
    } catch (error) {
      console.error('Failed to get auth token:', error)
      return null
    }
  }

  const fetchProfile = async () => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(prev => ({ ...prev, ...data.profile }))
      } else if (response.status === 404) {
        setProfile(prev => ({
          ...prev,
          displayName: user?.displayName || "",
          email: user?.email || "",
          photoURL: user?.photoURL || "",
        }))
      }
    } catch (error) {
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const fetchResumes = async () => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch('/api/resumes', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setResumes(data.resumes || [])
      }
    } catch (error) {
      console.error('Error fetching resumes:', error)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const token = await getAuthToken()
      if (!token) {
        setError('Authentication required')
        return
      }

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      })

      if (response.ok) {
        setSuccess('Profile saved successfully!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to save profile')
      }
    } catch (error) {
      setError('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleAddSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }))
      setNewSkill("")
    }
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile(prev => ({ ...prev, skills: prev.skills.filter(skill => skill !== skillToRemove) }))
  }

  const handleInputChange = (field: keyof UserProfile, value: string | boolean) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    if (!user?.uid) {
      setError('User not authenticated.')
      return
    }
    
    if (!storage) {
      setError('Storage not available. Please check your Firebase configuration.')
      return
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a JPEG, PNG, or WebP image.')
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setError('Image size must be less than 5MB.')
      return
    }

    setUploadingPhoto(true)
    setError(null)

    try {
      console.log('Starting photo upload...', { fileSize: file.size, fileType: file.type })
      
      // Create a storage reference
      const storageRef = ref(storage, `profile-photos/${user.uid}/${Date.now()}-${file.name}`)
      console.log('Storage reference created:', storageRef)
      
      // Upload the file
      console.log('Uploading file...')
      const snapshot = await uploadBytes(storageRef, file)
      console.log('Upload completed:', snapshot)
      
      // Get the download URL
      console.log('Getting download URL...')
      const downloadURL = await getDownloadURL(snapshot.ref)
      console.log('Download URL obtained:', downloadURL)
      
      // Update profile state
      setProfile(prev => ({ ...prev, photoURL: downloadURL }))
      
      setSuccess('Photo uploaded successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      console.error('Error uploading photo:', error)
      if (error instanceof Error) {
        setError(`Upload failed: ${error.message}`)
      } else {
        setError('Failed to upload photo. Please check your internet connection and try again.')
      }
    } finally {
      setUploadingPhoto(false)
      // Clear the file input
      event.target.value = ''
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading profile...</span>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
              <p className="text-muted-foreground">Manage your account information and preferences.</p>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.photoURL || user?.photoURL || ""} />
                    <AvatarFallback className="text-2xl">
                      {getInitials(profile.displayName || user?.displayName || "U")}
                    </AvatarFallback>
                  </Avatar>
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handlePhotoUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploadingPhoto}
                    />
                    <Button variant="outline" disabled={uploadingPhoto}>
                      {uploadingPhoto ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="mr-2 h-4 w-4" />
                      )}
                      {uploadingPhoto ? "Uploading..." : "Change Photo"}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    JPEG, PNG, or WebP. Max 5MB.
                    {uploadingPhoto && <span className="block text-blue-600 mt-1">Upload in progress...</span>}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Full Name</Label>
                  <Input id="displayName" value={profile.displayName} onChange={(e) => handleInputChange('displayName', e.target.value)} placeholder="Your full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={profile.email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder="your.email@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input id="phoneNumber" value={profile.phoneNumber} onChange={(e) => handleInputChange('phoneNumber', e.target.value)} placeholder="+1 (555) 123-4567" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={profile.location} onChange={(e) => handleInputChange('location', e.target.value)} placeholder="San Francisco, CA" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Current Job Title</Label>
                  <Input id="jobTitle" value={profile.jobTitle} onChange={(e) => handleInputChange('jobTitle', e.target.value)} placeholder="Senior Software Engineer" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Select value={profile.experience} onValueChange={(value) => handleInputChange('experience', value)}>
                    <SelectTrigger><SelectValue placeholder="Select experience level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-1">0-1 years</SelectItem>
                      <SelectItem value="2-3">2-3 years</SelectItem>
                      <SelectItem value="4-6">4-6 years</SelectItem>
                      <SelectItem value="7-10">7-10 years</SelectItem>
                      <SelectItem value="10+">10+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea id="bio" value={profile.bio} onChange={(e) => handleInputChange('bio', e.target.value)} placeholder="Tell us about yourself..." className="min-h-[120px]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Professional Links</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
                <Input id="linkedinUrl" value={profile.linkedinUrl} onChange={(e) => handleInputChange('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/yourprofile" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="githubUrl">GitHub Profile</Label>
                <Input id="githubUrl" value={profile.githubUrl} onChange={(e) => handleInputChange('githubUrl', e.target.value)} placeholder="https://github.com/yourusername" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portfolioUrl">Portfolio Website</Label>
                <Input id="portfolioUrl" value={profile.portfolioUrl} onChange={(e) => handleInputChange('portfolioUrl', e.target.value)} placeholder="https://yourportfolio.com" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl"><FileText className="h-5 w-5" />Default Resume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="defaultResume">Default Resume for Job Applications</Label>
                <Select value={profile.defaultResumeId} onValueChange={(value) => handleInputChange('defaultResumeId', value)}>
                  <SelectTrigger><SelectValue placeholder="Select your default resume" /></SelectTrigger>
                  <SelectContent>
                    {resumes.map((resume) => (
                      <SelectItem key={resume.id} value={resume.id}>
                        <div className="flex items-center gap-2">
                          {resume.name}
                          {resume.isDefault && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl"><Settings className="h-5 w-5" />Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label htmlFor="emailNotifications" className="font-medium">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates about your job applications.</p>
                </div>
                <Switch id="emailNotifications" checked={profile.emailNotifications} onCheckedChange={(checked) => handleInputChange('emailNotifications', checked)} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label htmlFor="jobAlerts" className="font-medium">Job Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified about relevant job opportunities.</p>
                </div>
                <Switch id="jobAlerts" checked={profile.jobAlerts} onCheckedChange={(checked) => handleInputChange('jobAlerts', checked)} />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
} 