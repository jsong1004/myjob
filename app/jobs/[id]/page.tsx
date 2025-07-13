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

  const absoluteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/jobs/${id}`;

  let job;
  try {
    const res = await fetch(absoluteUrl, { cache: "no-store" });
    if (!res.ok) {
      return notFound();
    }
    const data = await res.json();
    job = data.job;
    if (!job) {
      return notFound();
    }
  } catch (error) {
    return notFound();
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not specified"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    } catch (e) {
      return dateString
    }
  }

  const renderSection = (title: string, items: string[] | undefined) => {
    if (!items || items.length === 0) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 list-disc list-inside text-muted-foreground">
            {items.map((item: string, index: number) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    )
  }

  return (
    <AuthProvider>
      <Header />
      <main className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <Button asChild variant="ghost" className="mb-4">
              <Link href="/search">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Search
              </Link>
            </Button>

            <Card className="overflow-hidden">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-2">
                    <Badge variant="secondary" className="text-base">
                      {job.matchingScore}% Match
                    </Badge>
                    <CardTitle className="text-3xl font-bold">{job.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Building className="h-4 w-4" />
                        <span className="font-medium">{job.company}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4" />
                        <span>{job.salary || "Not specified"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-3 flex-shrink-0">
                     <div className="flex gap-2">
                      <Button variant="outline">
                        <Bookmark className="mr-2 h-4 w-4" />
                        Save
                      </Button>
                      <Button asChild>
                        <Link href={`/tailor-resume/${encodeURIComponent(job.jobId || id)}`}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Tailor Resume
                        </Link>
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Posted: {formatDate(job.postedAt)}
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
                {job.fullDescription || job.description}
              </div>
            </CardContent>
          </Card>

          {renderSection("Responsibilities", job.responsibilities)}
          {renderSection("Qualifications", job.qualifications)}
          {renderSection("Benefits", job.benefits)}

        </div>
      </main>
    </AuthProvider>
  )
}
