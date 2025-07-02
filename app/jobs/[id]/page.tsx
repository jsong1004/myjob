"use client"

import { use } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, Calendar, DollarSign, Building, Bookmark, ExternalLink } from "lucide-react"
import Link from "next/link"

// Mock job data - in real app, this would come from API/database
const mockJob = {
  id: "1",
  title: "Senior Frontend Developer",
  company: "TechCorp Inc.",
  location: "San Francisco, CA",
  salary: "$120,000 - $160,000",
  postedAt: "2024-07-01",
  matchingScore: 92,
  fullDescription: `We are looking for a Senior Frontend Developer to join our growing team and help build the next generation of our web applications.

As a Senior Frontend Developer, you will be responsible for developing and maintaining high-quality, scalable web applications using modern JavaScript frameworks and libraries. You will work closely with our design and backend teams to create exceptional user experiences.`,

  qualifications: [
    "5+ years of experience in frontend development",
    "Expert knowledge of React, TypeScript, and modern JavaScript",
    "Experience with state management libraries (Redux, Zustand)",
    "Strong understanding of responsive design and CSS frameworks",
    "Experience with testing frameworks (Jest, React Testing Library)",
    "Knowledge of build tools and bundlers (Webpack, Vite)",
    "Familiarity with version control systems (Git)",
    "Bachelor's degree in Computer Science or related field",
  ],

  responsibilities: [
    "Develop and maintain responsive web applications using React and TypeScript",
    "Collaborate with UX/UI designers to implement pixel-perfect designs",
    "Write clean, maintainable, and well-documented code",
    "Participate in code reviews and provide constructive feedback",
    "Optimize applications for maximum speed and scalability",
    "Stay up-to-date with the latest frontend technologies and best practices",
    "Mentor junior developers and contribute to team knowledge sharing",
    "Work with backend developers to integrate APIs and services",
  ],

  benefits: [
    "Competitive salary and equity package",
    "Comprehensive health, dental, and vision insurance",
    "Flexible work arrangements and remote work options",
    "Professional development budget for conferences and courses",
    "Generous PTO and parental leave policies",
    "Modern office space with free meals and snacks",
    "401(k) with company matching",
    "Wellness programs and gym membership reimbursement",
  ],
}

interface JobDetailPageProps {
  params: Promise<{ id: string }>
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = use(params)

  // In real app, you would fetch job data based on ID
  const job = mockJob

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back Button */}
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Search
            </Button>
          </Link>

          {/* Job Header */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{job.title}</CardTitle>
                  <div className="flex items-center gap-4 text-gray-600">
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      <span className="font-medium">{job.company}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{job.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Posted {formatDate(job.postedAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span>{job.salary}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <Badge variant="secondary" className="text-lg px-3 py-1 bg-green-50 text-green-700">
                    {job.matchingScore}% Match
                  </Badge>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Bookmark className="mr-2 h-4 w-4" />
                      Save Job
                    </Button>
                    <Link href={`/tailor-resume/${job.id}`}>
                      <Button size="sm">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Tailor Resume
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Job Description */}
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{job.fullDescription}</p>
              </div>
            </CardContent>
          </Card>

          {/* Qualifications */}
          <Card>
            <CardHeader>
              <CardTitle>Qualifications</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {job.qualifications.map((qualification, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-gray-700">{qualification}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Responsibilities */}
          <Card>
            <CardHeader>
              <CardTitle>Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {job.responsibilities.map((responsibility, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-gray-700">{responsibility}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Benefits */}
          <Card>
            <CardHeader>
              <CardTitle>Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {job.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Apply Section */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold">Ready to Apply?</h3>
                <p className="text-gray-600">
                  Tailor your resume to this specific role to increase your chances of getting noticed.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href={`/tailor-resume/${job.id}`}>
                    <Button size="lg" className="w-full sm:w-auto">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Tailor Resume for This Job
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg" className="w-full sm:w-auto bg-transparent">
                    <Bookmark className="mr-2 h-4 w-4" />
                    Save for Later
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
