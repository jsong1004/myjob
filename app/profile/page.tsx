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
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Camera, Upload, Save, Loader2, CheckCircle, Plus, X } from "lucide-react"
import { Header } from "@/components/header"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { Resume } from "@/lib/types"
import { auth, storage } from "@/lib/firebase"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { useToast } from "@/components/ui/use-toast"

interface UserProfile {
  displayName: string
  email: string
  phoneNumber: string
  location: string
  currentJobTitle: string
  yearsOfExperience: string
  professionalBio: string
  linkedinProfile: string
  githubProfile: string
  portfolioWebsite: string
  targetJobTitles: string[]
  preferredWorkLocations: string[]
  openToRemote: boolean
  desiredSalary: string
  salaryCurrency: string
  salaryFrequency: string
  employmentTypes: string[]
  visaSponsorshipRequired: string
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
  const { toast } = useToast()
  const [profile, setProfile] = useState<UserProfile>({
    displayName: "",
    email: "",
    phoneNumber: "",
    location: "",
    currentJobTitle: "",
    yearsOfExperience: "",
    professionalBio: "",
    linkedinProfile: "",
    githubProfile: "",
    portfolioWebsite: "",
    targetJobTitles: [],
    preferredWorkLocations: [],
    openToRemote: false,
    desiredSalary: "",
    salaryCurrency: "USD",
    salaryFrequency: "per Year",
    employmentTypes: [],
    visaSponsorshipRequired: "",
    defaultResumeId: "",
    emailNotifications: true,
    jobAlerts: true,
    photoURL: "",
  })
  
  const [resumes, setResumes] = useState<Resume[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [newJobTitle, setNewJobTitle] = useState("")
  const [newWorkLocation, setNewWorkLocation] = useState("")
  const [showJobTitleSuggestions, setShowJobTitleSuggestions] = useState(false)
  const [filteredJobTitleSuggestions, setFilteredJobTitleSuggestions] = useState<string[]>([])
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
  const [filteredLocationSuggestions, setFilteredLocationSuggestions] = useState<string[]>([])

  // Common job title suggestions
  const jobTitleSuggestions = [
    "AI Engineer", "AI Developer", "AI Solutions Architect", "AI Research Scientist", "AI Product Manager",
    "Machine Learning Engineer", "Machine Learning Scientist", "ML Ops Engineer", "Data Scientist", "Data Engineer",
    "Software Engineer", "Senior Software Engineer", "Lead Software Engineer", "Principal Software Engineer",
    "Frontend Developer", "Backend Developer", "Full Stack Developer", "React Developer", "Node.js Developer",
    "DevOps Engineer", "Site Reliability Engineer", "Platform Engineer", "Cloud Engineer", "Cloud Architect",
    "Product Manager", "Senior Product Manager", "Technical Product Manager", "Product Owner",
    "UX Designer", "UI Designer", "UX/UI Designer", "Product Designer", "Design Lead",
    "Data Analyst", "Business Analyst", "Systems Analyst", "Financial Analyst",
    "QA Engineer", "Test Engineer", "QA Automation Engineer", "Quality Assurance Lead",
    "Cybersecurity Engineer", "Security Analyst", "Information Security Specialist",
    "Mobile Developer", "iOS Developer", "Android Developer", "React Native Developer",
    "Database Administrator", "Database Engineer", "Systems Administrator",
    "Technical Writer", "Documentation Specialist", "Developer Advocate",
    "Engineering Manager", "Technical Lead", "Team Lead", "CTO", "VP of Engineering",
    "Sales Engineer", "Solutions Engineer", "Customer Success Manager",
    "Research Scientist", "Research Engineer", "Applied Scientist"
  ]

  // Location suggestions including major cities, states, and remote options
  const locationSuggestions = [
    "Remote", "Anywhere", "Hybrid",
    // Major US Cities
    "Seattle, Washington", "San Francisco, California", "Los Angeles, California", "San Diego, California",
    "New York, New York", "Boston, Massachusetts", "Philadelphia, Pennsylvania",
    "Austin, Texas", "Dallas, Texas", "Houston, Texas",
    "Chicago, Illinois", "Detroit, Michigan", "Minneapolis, Minnesota",
    "Denver, Colorado", "Phoenix, Arizona", "Las Vegas, Nevada",
    "Portland, Oregon", "Salt Lake City, Utah",
    "Atlanta, Georgia", "Miami, Florida", "Tampa, Florida", "Orlando, Florida",
    "Charlotte, North Carolina", "Raleigh, North Carolina",
    "Nashville, Tennessee", "Memphis, Tennessee",
    "Washington, District of Columbia", "Baltimore, Maryland",
    "Richmond, Virginia", "Norfolk, Virginia",
    "Pittsburgh, Pennsylvania", "Cleveland, Ohio", "Columbus, Ohio", "Cincinnati, Ohio",
    "Indianapolis, Indiana", "Milwaukee, Wisconsin", "Kansas City, Missouri", "St. Louis, Missouri",
    "New Orleans, Louisiana", "Oklahoma City, Oklahoma",
    "Albuquerque, New Mexico", "Tucson, Arizona",
    "Sacramento, California", "Fresno, California", "San Jose, California", "Oakland, California",
    "Honolulu, Hawaii", "Anchorage, Alaska",
    // States
    "California", "New York", "Texas", "Florida", "Washington", "Illinois", "Pennsylvania",
    "Ohio", "Georgia", "North Carolina", "Michigan", "New Jersey", "Virginia", "Tennessee",
    "Indiana", "Arizona", "Massachusetts", "Maryland", "Missouri", "Wisconsin", "Colorado",
    "Minnesota", "Louisiana", "Alabama", "Kentucky", "Oregon", "Oklahoma", "Connecticut",
    "South Carolina", "Iowa", "Kansas", "Utah", "Nevada", "Arkansas", "Mississippi",
    "New Mexico", "Nebraska", "West Virginia", "Idaho", "Hawaii", "New Hampshire",
    "Maine", "Montana", "Rhode Island", "Delaware", "South Dakota", "North Dakota",
    "Alaska", "Vermont", "Wyoming",
    // International locations
    "Toronto, Canada", "Vancouver, Canada", "Montreal, Canada",
    "London, United Kingdom", "Berlin, Germany", "Amsterdam, Netherlands",
    "Dublin, Ireland", "Stockholm, Sweden", "Copenhagen, Denmark",
    "Zurich, Switzerland", "Vienna, Austria", "Barcelona, Spain", "Madrid, Spain",
    "Paris, France", "Milan, Italy", "Rome, Italy",
    "Tokyo, Japan", "Singapore", "Hong Kong", "Sydney, Australia", "Melbourne, Australia"
  ]

  // Filter job title suggestions based on input
  const handleJobTitleInputChange = (value: string) => {
    setNewJobTitle(value)
    if (value.trim().length > 0) {
      const filtered = jobTitleSuggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(value.toLowerCase()) &&
        !profile.targetJobTitles.includes(suggestion)
      ).slice(0, 8) // Limit to 8 suggestions
      setFilteredJobTitleSuggestions(filtered)
      setShowJobTitleSuggestions(filtered.length > 0)
    } else {
      setShowJobTitleSuggestions(false)
      setFilteredJobTitleSuggestions([])
    }
  }

  const selectJobTitleSuggestion = (suggestion: string) => {
    setProfile(prev => ({
      ...prev,
      targetJobTitles: [...prev.targetJobTitles, suggestion]
    }))
    setNewJobTitle("")
    setShowJobTitleSuggestions(false)
    setFilteredJobTitleSuggestions([])
  }

  // Filter location suggestions based on input
  const handleLocationInputChange = (value: string) => {
    setNewWorkLocation(value)
    if (value.trim().length > 0) {
      const filtered = locationSuggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(value.toLowerCase()) &&
        !profile.preferredWorkLocations.includes(suggestion)
      ).slice(0, 8) // Limit to 8 suggestions
      setFilteredLocationSuggestions(filtered)
      setShowLocationSuggestions(filtered.length > 0)
    } else {
      setShowLocationSuggestions(false)
      setFilteredLocationSuggestions([])
    }
  }

  const selectLocationSuggestion = (suggestion: string) => {
    setProfile(prev => ({
      ...prev,
      preferredWorkLocations: [...prev.preferredWorkLocations, suggestion]
    }))
    setNewWorkLocation("")
    setShowLocationSuggestions(false)
    setFilteredLocationSuggestions([])
  }

  // Load profile data and resumes
  useEffect(() => {
    if (user && auth?.currentUser) {
      loadProfile()
      loadResumes()
    }
  }, [user])

  const loadProfile = async () => {
    try {
      const token = await auth.currentUser.getIdToken()
      const response = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        const profileData = data.profile || data // Handle both nested and direct response
        setProfile(prevProfile => ({
          ...prevProfile,
          displayName: profileData.displayName || "",
          email: profileData.email || "",
          phoneNumber: profileData.phoneNumber || "",
          location: profileData.location || "",
          currentJobTitle: profileData.currentJobTitle || profileData.jobTitle || "",
          yearsOfExperience: profileData.yearsOfExperience || profileData.experience || "",
          professionalBio: profileData.professionalBio || profileData.bio || "",
          linkedinProfile: profileData.linkedinProfile || profileData.linkedinUrl || "",
          githubProfile: profileData.githubProfile || profileData.githubUrl || "",
          portfolioWebsite: profileData.portfolioWebsite || profileData.portfolioUrl || "",
          targetJobTitles: profileData.targetJobTitles || [],
          preferredWorkLocations: profileData.preferredWorkLocations || [],
          openToRemote: profileData.openToRemote || false,
          desiredSalary: profileData.desiredSalary || "",
          salaryCurrency: profileData.salaryCurrency || "USD",
          salaryFrequency: profileData.salaryFrequency || "per Year",
          employmentTypes: profileData.employmentTypes || [],
          visaSponsorshipRequired: profileData.visaSponsorshipRequired || "",
          defaultResumeId: profileData.defaultResumeId || "",
          emailNotifications: profileData.emailNotifications !== false,
          jobAlerts: profileData.jobAlerts !== false,
          photoURL: profileData.photoURL || "",
        }))
      }
    } catch (error) {
      console.error("Error loading profile:", error)
    }
  }

  const loadResumes = async () => {
    try {
      const token = await auth.currentUser.getIdToken()
      const response = await fetch("/api/resumes", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        console.log("Loaded resumes:", data.resumes || [])
        setResumes(data.resumes || [])
      } else {
        console.error("Failed to load resumes:", response.status, response.statusText)
      }
    } catch (error) {
      console.error("Error loading resumes:", error)
    }
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      const token = await auth.currentUser.getIdToken()
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profile),
      })

      if (response.ok) {
        setShowSuccessAlert(true)
        setTimeout(() => setShowSuccessAlert(false), 3000)
        toast({
          title: "Profile Updated",
          description: "Your changes have been saved successfully.",
        })
      }
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({
        title: "Error",
        description: "Failed to save profile changes.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, or WebP image.",
        variant: "destructive",
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      })
      return
    }

    setIsUploadingPhoto(true)
    try {
      const storageRef = ref(storage, `profile-photos/${user.uid}/${Date.now()}-${file.name}`)
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)
      
      setProfile(prev => ({ ...prev, photoURL: downloadURL }))
      toast({
        title: "Photo uploaded",
        description: "Your profile photo has been updated.",
      })
    } catch (error) {
      console.error("Error uploading photo:", error)
      toast({
        title: "Upload failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const addJobTitle = () => {
    if (newJobTitle.trim() && !profile.targetJobTitles.includes(newJobTitle.trim())) {
      setProfile(prev => ({
        ...prev,
        targetJobTitles: [...prev.targetJobTitles, newJobTitle.trim()]
      }))
      setNewJobTitle("")
      setShowJobTitleSuggestions(false)
      setFilteredJobTitleSuggestions([])
    }
  }

  const removeJobTitle = (title: string) => {
    setProfile(prev => ({
      ...prev,
      targetJobTitles: prev.targetJobTitles.filter(t => t !== title)
    }))
  }

  const addWorkLocation = () => {
    if (newWorkLocation.trim() && !profile.preferredWorkLocations.includes(newWorkLocation.trim())) {
      setProfile(prev => ({
        ...prev,
        preferredWorkLocations: [...prev.preferredWorkLocations, newWorkLocation.trim()]
      }))
      setNewWorkLocation("")
      setShowLocationSuggestions(false)
      setFilteredLocationSuggestions([])
    }
  }

  const removeWorkLocation = (location: string) => {
    setProfile(prev => ({
      ...prev,
      preferredWorkLocations: prev.preferredWorkLocations.filter(l => l !== location)
    }))
  }

  const toggleEmploymentType = (type: string) => {
    setProfile(prev => ({
      ...prev,
      employmentTypes: prev.employmentTypes.includes(type)
        ? prev.employmentTypes.filter(t => t !== type)
        : [...prev.employmentTypes, type]
    }))
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-600">Please sign in to access your profile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
              <p className="text-gray-600 mt-2">Manage your account information and job search preferences.</p>
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Success Alert */}
        {showSuccessAlert && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Profile Updated</strong> - Your changes have been saved successfully.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Card 1: Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Photo */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.photoURL} alt="Profile photo" />
                  <AvatarFallback>
                    <Camera className="h-8 w-8 text-gray-400" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button
                    variant="outline"
                    disabled={isUploadingPhoto}
                    className="relative"
                  >
                    {isUploadingPhoto ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Change Photo
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={isUploadingPhoto}
                    />
                  </Button>
                  <p className="text-sm text-gray-500 mt-1">JPEG, PNG, or WebP. Max 5MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={profile.displayName}
                    onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="Enter your phone number"
                    value={profile.phoneNumber}
                    onChange={(e) => setProfile(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Seattle, Washington"
                    value={profile.location}
                    onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                  />
                  <p className="text-sm text-gray-500">Your current city of residence.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Professional Profile */}
          <Card>
            <CardHeader>
              <CardTitle>Professional Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Current Job Title</Label>
                  <Input
                    id="jobTitle"
                    placeholder="e.g., AI Engineer"
                    value={profile.currentJobTitle}
                    onChange={(e) => setProfile(prev => ({ ...prev, currentJobTitle: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Select value={profile.yearsOfExperience} onValueChange={(value) => setProfile(prev => ({ ...prev, yearsOfExperience: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="less-than-1">Less than 1 year</SelectItem>
                      <SelectItem value="1-3">1-3 years</SelectItem>
                      <SelectItem value="3-5">3-5 years</SelectItem>
                      <SelectItem value="5-10">5-10 years</SelectItem>
                      <SelectItem value="10+">10+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell recruiters what makes you stand out. Describe your passions, key achievements, and what you're looking for in your next role."
                  value={profile.professionalBio}
                  onChange={(e) => setProfile(prev => ({ ...prev, professionalBio: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn Profile</Label>
                  <Input
                    id="linkedin"
                    placeholder="https://www.linkedin.com/in/your-profile"
                    value={profile.linkedinProfile}
                    onChange={(e) => setProfile(prev => ({ ...prev, linkedinProfile: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="github">GitHub Profile</Label>
                  <Input
                    id="github"
                    placeholder="https://github.com/your-username"
                    value={profile.githubProfile}
                    onChange={(e) => setProfile(prev => ({ ...prev, githubProfile: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portfolio">Portfolio Website</Label>
                  <Input
                    id="portfolio"
                    placeholder="https://your-portfolio.com"
                    value={profile.portfolioWebsite}
                    onChange={(e) => setProfile(prev => ({ ...prev, portfolioWebsite: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Job Search Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Job Search Preferences</CardTitle>
              <p className="text-sm text-gray-600">This information helps us find the best job matches for you. It is not displayed on a public profile.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Target Job Titles */}
              <div className="space-y-2">
                <Label>Target Job Titles</Label>
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Type to add a job title (e.g., AI Engineer)"
                        value={newJobTitle}
                        onChange={(e) => handleJobTitleInputChange(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addJobTitle()}
                        onFocus={() => {
                          if (newJobTitle.trim() && filteredJobTitleSuggestions.length > 0) {
                            setShowJobTitleSuggestions(true)
                          }
                        }}
                        onBlur={() => {
                          // Delay hiding suggestions to allow for clicks
                          setTimeout(() => setShowJobTitleSuggestions(false), 200)
                        }}
                      />
                      {/* Autocomplete Suggestions */}
                      {showJobTitleSuggestions && filteredJobTitleSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {filteredJobTitleSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-sm"
                              onClick={() => selectJobTitleSuggestion(suggestion)}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button onClick={addJobTitle} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.targetJobTitles.map((title) => (
                    <Badge key={title} variant="secondary" className="flex items-center gap-1">
                      {title}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeJobTitle(title)} />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Preferred Work Locations */}
              <div className="space-y-2">
                <Label>Preferred Work Locations</Label>
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Type a city, state, or select 'Remote' (e.g., Seattle, Washington)"
                        value={newWorkLocation}
                        onChange={(e) => handleLocationInputChange(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addWorkLocation()}
                        onFocus={() => {
                          if (newWorkLocation.trim() && filteredLocationSuggestions.length > 0) {
                            setShowLocationSuggestions(true)
                          }
                        }}
                        onBlur={() => {
                          // Delay hiding suggestions to allow for clicks
                          setTimeout(() => setShowLocationSuggestions(false), 200)
                        }}
                      />
                      {/* Autocomplete Suggestions */}
                      {showLocationSuggestions && filteredLocationSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {filteredLocationSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-sm"
                              onClick={() => selectLocationSuggestion(suggestion)}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button onClick={addWorkLocation} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.preferredWorkLocations.map((location) => (
                    <Badge key={location} variant="secondary" className="flex items-center gap-1">
                      {location}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeWorkLocation(location)} />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Remote Work Preference */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remote"
                  checked={profile.openToRemote}
                  onCheckedChange={(checked) => setProfile(prev => ({ ...prev, openToRemote: !!checked }))}
                />
                <Label htmlFor="remote">Open to 100% remote roles</Label>
              </div>

              {/* Desired Compensation */}
              <div className="space-y-2">
                <Label>Desired Compensation</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    placeholder="Minimum Base Salary"
                    value={profile.desiredSalary}
                    onChange={(e) => setProfile(prev => ({ ...prev, desiredSalary: e.target.value }))}
                  />
                  <Select value={profile.salaryCurrency} onValueChange={(value) => setProfile(prev => ({ ...prev, salaryCurrency: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={profile.salaryFrequency} onValueChange={(value) => setProfile(prev => ({ ...prev, salaryFrequency: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per Year">per Year</SelectItem>
                      <SelectItem value="per Hour">per Hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-gray-500">Providing a salary helps us filter roles that don't meet your expectations.</p>
              </div>

              {/* Employment Type */}
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['Full-time', 'Part-time', 'Contract', 'Internship'].map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={type}
                        checked={profile.employmentTypes.includes(type)}
                        onCheckedChange={() => toggleEmploymentType(type)}
                      />
                      <Label htmlFor={type}>{type}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Work Authorization */}
              <div className="space-y-2">
                <Label>Will you require visa sponsorship for employment in your preferred locations?</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="visa-yes"
                      name="visa"
                      checked={profile.visaSponsorshipRequired === 'Yes'}
                      onChange={() => setProfile(prev => ({ ...prev, visaSponsorshipRequired: 'Yes' }))}
                    />
                    <Label htmlFor="visa-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="visa-no"
                      name="visa"
                      checked={profile.visaSponsorshipRequired === 'No'}
                      onChange={() => setProfile(prev => ({ ...prev, visaSponsorshipRequired: 'No' }))}
                    />
                    <Label htmlFor="visa-no">No</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-gray-500">Receive updates about your job applications.</p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={profile.emailNotifications}
                  onCheckedChange={(checked) => setProfile(prev => ({ ...prev, emailNotifications: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="job-alerts">Job Alerts</Label>
                  <p className="text-sm text-gray-500">Get notified about new job opportunities that match your preferences.</p>
                </div>
                <Switch
                  id="job-alerts"
                  checked={profile.jobAlerts}
                  onCheckedChange={(checked) => setProfile(prev => ({ ...prev, jobAlerts: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © 2025 Startup Consulting Inc. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="/privacy-policy" className="text-sm text-gray-500 hover:text-gray-700">
                Privacy Policy
              </a>
              <a href="/terms-of-service" className="text-sm text-gray-500 hover:text-gray-700">
                Terms of Service
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}