"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Plus, X, Upload, FileText, ChevronRight, ChevronLeft, Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useRouter } from "next/navigation"
import { validateFeedbackFile } from "@/lib/file-parser"
import { useToast } from "@/components/ui/use-toast"
import { auth } from "@/lib/firebase"

interface OnboardingData {
  targetJobTitles: string[]
  preferredWorkLocations: string[]
  openToRemote: boolean
  resumeFile: File | null
  yearsOfExperience: string
  employmentTypes: string[]
}

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [data, setData] = useState<OnboardingData>({
    targetJobTitles: [],
    preferredWorkLocations: [],
    openToRemote: false,
    resumeFile: null,
    yearsOfExperience: "",
    employmentTypes: []
  })
  
  // Step 1 form states
  const [newJobTitle, setNewJobTitle] = useState("")
  const [newWorkLocation, setNewWorkLocation] = useState("")
  const [showJobTitleSuggestions, setShowJobTitleSuggestions] = useState(false)
  const [filteredJobTitleSuggestions, setFilteredJobTitleSuggestions] = useState<string[]>([])
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
  const [filteredLocationSuggestions, setFilteredLocationSuggestions] = useState<string[]>([])
  
  // Step 2 form states
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  
  // Common job title suggestions (reused from profile page)
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

  // Location suggestions (reused from profile page)
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
    "Alaska", "Vermont", "Wyoming"
  ]

  // Job title autocomplete handlers
  const handleJobTitleInputChange = (value: string) => {
    setNewJobTitle(value)
    if (value.trim().length > 0) {
      const filtered = jobTitleSuggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(value.toLowerCase()) &&
        !data.targetJobTitles.includes(suggestion)
      ).slice(0, 8)
      setFilteredJobTitleSuggestions(filtered)
      setShowJobTitleSuggestions(filtered.length > 0)
    } else {
      setShowJobTitleSuggestions(false)
      setFilteredJobTitleSuggestions([])
    }
  }

  const selectJobTitleSuggestion = (suggestion: string) => {
    setData(prev => ({
      ...prev,
      targetJobTitles: [...prev.targetJobTitles, suggestion]
    }))
    setNewJobTitle("")
    setShowJobTitleSuggestions(false)
    setFilteredJobTitleSuggestions([])
  }

  const addJobTitle = () => {
    if (newJobTitle.trim() && !data.targetJobTitles.includes(newJobTitle.trim())) {
      setData(prev => ({
        ...prev,
        targetJobTitles: [...prev.targetJobTitles, newJobTitle.trim()]
      }))
      setNewJobTitle("")
      setShowJobTitleSuggestions(false)
      setFilteredJobTitleSuggestions([])
    }
  }

  const removeJobTitle = (title: string) => {
    setData(prev => ({
      ...prev,
      targetJobTitles: prev.targetJobTitles.filter(t => t !== title)
    }))
  }

  // Location autocomplete handlers
  const handleLocationInputChange = (value: string) => {
    setNewWorkLocation(value)
    if (value.trim().length > 0) {
      const filtered = locationSuggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(value.toLowerCase()) &&
        !data.preferredWorkLocations.includes(suggestion)
      ).slice(0, 8)
      setFilteredLocationSuggestions(filtered)
      setShowLocationSuggestions(filtered.length > 0)
    } else {
      setShowLocationSuggestions(false)
      setFilteredLocationSuggestions([])
    }
  }

  const selectLocationSuggestion = (suggestion: string) => {
    setData(prev => ({
      ...prev,
      preferredWorkLocations: [...prev.preferredWorkLocations, suggestion]
    }))
    setNewWorkLocation("")
    setShowLocationSuggestions(false)
    setFilteredLocationSuggestions([])
  }

  const addWorkLocation = () => {
    if (newWorkLocation.trim() && !data.preferredWorkLocations.includes(newWorkLocation.trim())) {
      setData(prev => ({
        ...prev,
        preferredWorkLocations: [...prev.preferredWorkLocations, newWorkLocation.trim()]
      }))
      setNewWorkLocation("")
      setShowLocationSuggestions(false)
      setFilteredLocationSuggestions([])
    }
  }

  const removeWorkLocation = (location: string) => {
    setData(prev => ({
      ...prev,
      preferredWorkLocations: prev.preferredWorkLocations.filter(l => l !== location)
    }))
  }

  // File upload handlers
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const processFile = (file: File) => {
    setFileError(null)
    
    // Validate file (allow PDF and DOCX only for resumes)
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      setFileError("Please upload a PDF or DOCX file")
      return
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB
      setFileError("File size must be less than 5MB")
      return
    }
    
    setData(prev => ({ ...prev, resumeFile: file }))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const removeFile = () => {
    setData(prev => ({ ...prev, resumeFile: null }))
    setFileError(null)
  }

  // Employment type handlers
  const toggleEmploymentType = (type: string) => {
    setData(prev => ({
      ...prev,
      employmentTypes: prev.employmentTypes.includes(type)
        ? prev.employmentTypes.filter(t => t !== type)
        : [...prev.employmentTypes, type]
    }))
  }

  // Navigation handlers
  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const canProceedFromStep = (step: number) => {
    switch (step) {
      case 1:
        return data.targetJobTitles.length > 0 || data.preferredWorkLocations.length > 0
      case 2:
        return true // Resume upload is optional
      case 3:
        return data.yearsOfExperience !== "" && data.employmentTypes.length > 0
      default:
        return false
    }
  }

  // Submit handler
  const handleSubmit = async () => {
    if (!user || !auth?.currentUser) return
    
    setIsSubmitting(true)
    try {
      const token = await auth.currentUser.getIdToken()
      
      // Upload resume if provided
      let resumeId = null
      if (data.resumeFile) {
        const resumeFormData = new FormData()
        resumeFormData.append('resume', data.resumeFile)
        resumeFormData.append('resumeName', data.resumeFile.name.split('.')[0])
        
        const resumeResponse = await fetch('/api/resumes', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: resumeFormData
        })
        
        if (resumeResponse.ok) {
          const resumeData = await resumeResponse.json()
          resumeId = resumeData.id
        }
      }
      
      // Save profile data
      const profileData = {
        displayName: user.name || "",
        email: user.email || "",
        targetJobTitles: data.targetJobTitles,
        preferredWorkLocations: data.preferredWorkLocations,
        openToRemote: data.openToRemote,
        yearsOfExperience: data.yearsOfExperience,
        employmentTypes: data.employmentTypes,
        defaultResumeId: resumeId,
        onboardingCompleted: true
      }
      
      const profileResponse = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      })
      
      if (profileResponse.ok) {
        toast({
          title: "Welcome aboard!",
          description: "Your profile has been set up successfully. Let's find your next job!",
        })
        
        // Close modal and redirect to job search
        onClose()
        
        // Redirect to job search with initial query
        if (data.targetJobTitles.length > 0) {
          const searchQuery = data.targetJobTitles[0]
          const searchLocation = data.preferredWorkLocations[0] || "United States"
          router.push(`/?q=${encodeURIComponent(searchQuery)}&location=${encodeURIComponent(searchLocation)}`)
        } else {
          router.push("/")
        }
      } else {
        throw new Error('Failed to save profile')
      }
    } catch (error) {
      console.error('Onboarding error:', error)
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Welcome! Let's find your next job.
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            Complete these 3 quick steps to get personalized job matches.
          </DialogDescription>
        </DialogHeader>
        
        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">Step {currentStep} of 3</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              Skip for Now
            </Button>
          </div>
          <Progress value={(currentStep / 3) * 100} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {/* Step 1: Core Job Preferences */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Tell us about your job preferences</h3>
                
                {/* Target Job Titles */}
                <div className="space-y-3 mb-6">
                  <Label className="text-sm font-medium">What job titles are you looking for?</Label>
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          placeholder="e.g., AI Engineer, Product Manager"
                          value={newJobTitle}
                          onChange={(e) => handleJobTitleInputChange(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addJobTitle()}
                          onFocus={() => {
                            if (newJobTitle.trim() && filteredJobTitleSuggestions.length > 0) {
                              setShowJobTitleSuggestions(true)
                            }
                          }}
                          onBlur={() => {
                            setTimeout(() => setShowJobTitleSuggestions(false), 200)
                          }}
                        />
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
                      <Button onClick={addJobTitle} size="sm" type="button">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.targetJobTitles.map((title) => (
                      <Badge key={title} variant="secondary" className="flex items-center gap-1">
                        {title}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeJobTitle(title)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Preferred Work Locations */}
                <div className="space-y-3 mb-6">
                  <Label className="text-sm font-medium">Where do you want to work?</Label>
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          placeholder="Enter a city or type 'Remote'"
                          value={newWorkLocation}
                          onChange={(e) => handleLocationInputChange(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addWorkLocation()}
                          onFocus={() => {
                            if (newWorkLocation.trim() && filteredLocationSuggestions.length > 0) {
                              setShowLocationSuggestions(true)
                            }
                          }}
                          onBlur={() => {
                            setTimeout(() => setShowLocationSuggestions(false), 200)
                          }}
                        />
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
                      <Button onClick={addWorkLocation} size="sm" type="button">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.preferredWorkLocations.map((location) => (
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
                    checked={data.openToRemote}
                    onCheckedChange={(checked) => setData(prev => ({ ...prev, openToRemote: !!checked }))}
                  />
                  <Label htmlFor="remote" className="text-sm font-medium">
                    Are you open to 100% remote roles?
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Resume Upload */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Upload Your Resume</h3>
                <p className="text-sm text-gray-600 mb-4">
                  PDF or DOCX, up to 5MB. This will be your default resume for applications.
                </p>
                
                {!data.resumeFile ? (
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragOver 
                        ? 'border-blue-400 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="resume-upload"
                    />
                    <label
                      htmlFor="resume-upload"
                      className="cursor-pointer flex flex-col items-center justify-center"
                    >
                      <Upload className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-lg font-medium text-gray-700 mb-2">
                        Drop your resume here or click to browse
                      </p>
                      <p className="text-sm text-gray-500">
                        PDF or DOCX files up to 5MB
                      </p>
                    </label>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-8 w-8 text-blue-500" />
                          <div>
                            <p className="font-medium">{data.resumeFile.name}</p>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(data.resumeFile.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeFile}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {fileError && (
                  <p className="text-sm text-red-600 mt-2">{fileError}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Professional Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Tell us about your experience</h3>
                
                {/* Years of Experience */}
                <div className="space-y-3 mb-6">
                  <Label className="text-sm font-medium">
                    How many years of professional experience do you have?
                  </Label>
                  <Select value={data.yearsOfExperience} onValueChange={(value) => setData(prev => ({ ...prev, yearsOfExperience: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your experience level" />
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

                {/* Employment Type */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    What type of employment are you looking for?
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Full-time', 'Part-time', 'Contract', 'Internship'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={data.employmentTypes.includes(type)}
                          onCheckedChange={() => toggleEmploymentType(type)}
                        />
                        <Label htmlFor={type} className="text-sm">{type}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex gap-2">
            {currentStep < 3 ? (
              <Button
                onClick={nextStep}
                disabled={!canProceedFromStep(currentStep)}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceedFromStep(currentStep) || isSubmitting}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}