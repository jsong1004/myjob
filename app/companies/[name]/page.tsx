"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Building2, Users, Calendar, DollarSign, MapPin, Globe, ExternalLink, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Header } from "@/components/header"
import { AuthProvider } from "@/components/auth-provider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface CompanyData {
  about: {
    businessType?: string
    industries?: string[]
    industry?: string
    name: string
    nameAlts?: string[]
    nameLegal?: string
    totalEmployees?: string
    totalEmployeesExact?: number
    yearFounded?: number
    yearFoundedPlace?: string
  }
  analytics?: {
    monthlyVisitors?: string
  }
  assets?: {
    logoSquare?: {
      src: string
      height: number
      width: number
    }
  }
  descriptions?: {
    primary?: string
    tagline?: string
    website?: string
  }
  domain?: {
    domain: string
    state?: string
  }
  finances?: {
    revenue?: string
    stockExchange?: string
    stockSymbol?: string
  }
  locations?: {
    headquarters?: {
      city?: { name: string }
      country?: { name: string }
      state?: { name: string }
    }
  }
  socials?: {
    linkedin?: { url: string }
    twitter?: { url: string }
    facebook?: { url: string }
  }
}

export default function CompanyDetailPage() {
  return (
    <AuthProvider>
      <CompanyDetailContent />
    </AuthProvider>
  )
}

function CompanyDetailContent() {
  const params = useParams()
  const companyName = params.name as string
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!companyName) return
      
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/companies/${encodeURIComponent(companyName)}`)
        if (response.ok) {
          const data = await response.json()
          setCompany(data.company)
        } else if (response.status === 404) {
          setError("Company not found")
        } else {
          setError("Failed to fetch company data")
        }
      } catch (err) {
        setError("Error loading company information")
      } finally {
        setLoading(false)
      }
    }

    fetchCompanyData()
  }, [companyName])

  const formatEmployeeCount = (count?: string, exact?: number) => {
    if (exact) {
      return exact.toLocaleString()
    }
    if (count) {
      return count.replace(/-/g, ' to ').replace(/over-/, 'Over ')
    }
    return 'Unknown'
  }

  const formatRevenue = (revenue?: string) => {
    if (!revenue) return 'Unknown'
    return revenue.replace(/-/g, ' to ').replace(/over-/, 'Over ')
  }

  const getHeadquartersLocation = (locations?: CompanyData['locations']) => {
    if (!locations?.headquarters) return 'Unknown'
    const hq = locations.headquarters
    const parts = [hq.city?.name, hq.state?.name, hq.country?.name].filter(Boolean)
    return parts.join(', ') || 'Unknown'
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/saved-jobs">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Saved Jobs
              </Link>
            </Button>
            
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : company ? (
              <div className="space-y-6">
                {/* Company Header */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-6">
                      {company.assets?.logoSquare && (
                        <img
                          src={company.assets.logoSquare.src}
                          alt={`${company.about.name} logo`}
                          className="w-24 h-24 rounded-lg object-cover bg-muted"
                        />
                      )}
                      <div className="flex-1">
                        <h1 className="text-3xl font-bold tracking-tight mb-2">
                          {company.about.name}
                        </h1>
                        {company.about.nameLegal && company.about.nameLegal !== company.about.name && (
                          <p className="text-lg text-muted-foreground mb-2">
                            Legal Name: {company.about.nameLegal}
                          </p>
                        )}
                        {company.descriptions?.tagline && (
                          <p className="text-lg text-muted-foreground mb-4">
                            {company.descriptions.tagline}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {company.about.businessType && (
                            <Badge variant="secondary">
                              {company.about.businessType}
                            </Badge>
                          )}
                          {company.about.industry && (
                            <Badge variant="outline">
                              {company.about.industry.replace(/-/g, ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {company.domain && (
                          <Button asChild variant="outline">
                            <a
                              href={`https://${company.domain.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Globe className="h-4 w-4 mr-2" />
                              Visit Website
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Company Description */}
                {company.descriptions?.primary && (
                  <Card>
                    <CardHeader>
                      <CardTitle>About</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {company.descriptions.primary}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Key Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Company Size */}
                  <Card>
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Company Size</CardTitle>
                      <Users className="h-4 w-4 ml-auto text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatEmployeeCount(company.about.totalEmployees, company.about.totalEmployeesExact)}
                      </div>
                      <p className="text-xs text-muted-foreground">employees</p>
                    </CardContent>
                  </Card>

                  {/* Founded */}
                  {company.about.yearFounded && (
                    <Card>
                      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Founded</CardTitle>
                        <Calendar className="h-4 w-4 ml-auto text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{company.about.yearFounded}</div>
                        {company.about.yearFoundedPlace && (
                          <p className="text-xs text-muted-foreground">{company.about.yearFoundedPlace}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Revenue */}
                  {company.finances?.revenue && (
                    <Card>
                      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 ml-auto text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatRevenue(company.finances.revenue)}</div>
                        {company.finances.stockSymbol && (
                          <p className="text-xs text-muted-foreground">
                            {company.finances.stockExchange}: {company.finances.stockSymbol}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Location */}
                  <Card>
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Headquarters</CardTitle>
                      <MapPin className="h-4 w-4 ml-auto text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{getHeadquartersLocation(company.locations)}</div>
                    </CardContent>
                  </Card>

                  {/* Monthly Visitors */}
                  {company.analytics?.monthlyVisitors && (
                    <Card>
                      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Visitors</CardTitle>
                        <Globe className="h-4 w-4 ml-auto text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {company.analytics.monthlyVisitors.replace(/-/g, ' to ').replace(/over-/, 'Over ')}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Industries */}
                {company.about.industries && company.about.industries.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Industries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {company.about.industries.slice(0, 10).map((industry, index) => (
                          <Badge key={index} variant="outline">
                            {industry.replace(/-/g, ' ')}
                          </Badge>
                        ))}
                        {company.about.industries.length > 10 && (
                          <Badge variant="secondary">
                            +{company.about.industries.length - 10} more
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Social Links */}
                {company.socials && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Social Media</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3">
                        {company.socials.linkedin && (
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={company.socials.linkedin.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              LinkedIn
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </Button>
                        )}
                        {company.socials.twitter && (
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={company.socials.twitter.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Twitter
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </Button>
                        )}
                        {company.socials.facebook && (
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={company.socials.facebook.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Facebook
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </>
  )
}