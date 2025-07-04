import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, Calendar, DollarSign, Building, Bookmark, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Header } from "@/components/header"
import { AuthProvider } from "@/components/auth-provider"

interface JobDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;

  const res = await fetch(`/api/jobs/${id}`, { cache: "no-store" });

  if (!res.ok) return notFound();
  const { job } = await res.json();

  const formatDate = (dateString: string) => {
    if (!dateString) return "-"
    const d = new Date(dateString)
    return isNaN(d.getTime()) ? dateString : d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
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
                    <Link href={`/tailor-resume/${encodeURIComponent(job.jobId || id)}`}>
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
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{job.fullDescription || job.description}</p>
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
                {(job.qualifications || []).map((qualification: string, index: number) => (
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
                {(job.responsibilities || []).map((responsibility: string, index: number) => (
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
                {(job.benefits || []).map((benefit: string, index: number) => (
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
                  <Link href={`/tailor-resume/${encodeURIComponent(job.jobId || id)}`}>
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
    </AuthProvider>
  )
}
