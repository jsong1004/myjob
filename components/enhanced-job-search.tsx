"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, MapPin, Loader2, Filter, TrendingUp, Clock, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { JobSearch } from "@/components/job-search" // Keep the basic search as fallback
import { AdvancedJobFilters, QuickFilters, ActiveFilters } from "@/components/advanced-job-filters"
import { JobResults } from "@/components/job-results" // Reuse existing job results component
import { useAuth } from "@/components/auth-provider"
import { auth } from "@/lib/firebase"
import { 
  JobFilters, 
  FilterOptions, 
  EnhancedJobSearchResult 
} from "@/lib/types"

interface EnhancedJobSearchProps {
  onSearch?: (query: string, location: string) => void
  initialQuery?: string
  initialLocation?: string
  className?: string
}

interface SearchResponse {
  jobs: EnhancedJobSearchResult[]
  total: number
  batchHitRate: number
  executionTime: number
  appliedFilters: JobFilters
  suggestions?: {
    locations: string[]
    companies: string[]
    skills: string[]
  }
}

export function EnhancedJobSearch({
  onSearch,
  initialQuery = "",
  initialLocation = "Seattle, Washington, United States",
  className = ""
}: EnhancedJobSearchProps) {
  const { user } = useAuth()
  
  // Search state
  const [query, setQuery] = useState(initialQuery)
  const [location, setLocation] = useState(initialLocation)
  const [filters, setFilters] = useState<JobFilters>({})
  const [isLoading, setIsLoading] = useState(false)
  
  // Results state
  const [searchResults, setSearchResults] = useState<EnhancedJobSearchResult[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [batchHitRate, setBatchHitRate] = useState(0)
  const [executionTime, setExecutionTime] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)
  
  // Filter options
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [isLoadingFilters, setIsLoadingFilters] = useState(false)
  
  // UI state
  const [searchMode, setSearchMode] = useState<'basic' | 'advanced'>('basic')
  const [error, setError] = useState<string | null>(null)
  
  // Load filter options on component mount
  useEffect(() => {
    loadFilterOptions()
  }, [])

  const loadFilterOptions = async () => {
    setIsLoadingFilters(true)
    try {
      const response = await fetch('/api/jobs/filters')
      if (response.ok) {
        const data = await response.json()
        setFilterOptions(data.filterOptions)
      } else {
        console.warn('Failed to load filter options')
      }
    } catch (error) {
      console.error('Error loading filter options:', error)
    } finally {
      setIsLoadingFilters(false)
    }
  }

  const performSearch = useCallback(async () => {
    if (!query.trim()) return
    
    setIsLoading(true)
    setError(null)
    setHasSearched(true)
    
    // Notify parent component if provided
    if (onSearch) {
      onSearch(query, location)
    }
    
    try {
      console.log('Starting enhanced job search:', { query, location, filters })
      
      const searchPayload = {
        query: query.trim(),
        location: location,
        filters: filters,
        limit: 50,
        offset: 0,
        resume: "" // Could be populated from user's default resume
      }
      
      // Get auth token if available
      const token = user && auth?.currentUser ? await auth.currentUser.getIdToken() : null
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/jobs/search-enhanced', {
        method: 'POST',
        headers,
        body: JSON.stringify(searchPayload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Search failed')
      }

      const data: SearchResponse = await response.json()
      
      console.log('Enhanced search completed:', {
        totalJobs: data.total,
        batchHitRate: data.batchHitRate,
        executionTime: data.executionTime
      })

      setSearchResults(data.jobs)
      setTotalResults(data.total)
      setBatchHitRate(data.batchHitRate)
      setExecutionTime(data.executionTime)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed'
      console.error('Enhanced search error:', err)
      setError(errorMessage)
      setSearchResults([])
      setTotalResults(0)
    } finally {
      setIsLoading(false)
    }
  }, [query, location, filters, user, onSearch])

  const handleBasicSearch = (searchQuery: string, searchLocation: string) => {
    setQuery(searchQuery)
    setLocation(searchLocation)
    setFilters({}) // Reset filters for basic search
    // performSearch will be triggered by useEffect
  }

  const handleQuickFilter = (quickFilters: Partial<JobFilters>) => {
    setFilters(prev => ({ ...prev, ...quickFilters }))
  }

  const handleRemoveFilter = (key: keyof JobFilters, value?: string) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      
      if (value && Array.isArray(newFilters[key])) {
        // Remove specific value from array
        const array = newFilters[key] as string[]
        const filtered = array.filter(item => item !== value)
        newFilters[key] = filtered.length > 0 ? filtered as any : undefined
      } else {
        // Remove entire filter
        delete newFilters[key]
      }
      
      return newFilters
    })
  }

  // Trigger search when query, location, or filters change
  useEffect(() => {
    if (query.trim() && hasSearched) {
      const debounceTimer = setTimeout(() => {
        performSearch()
      }, 500) // Debounce rapid filter changes
      
      return () => clearTimeout(debounceTimer)
    }
  }, [query, location, filters, performSearch, hasSearched])

  // Convert results to format expected by JobResults component
  const convertedResults = searchResults.map(job => ({
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.description,
    qualifications: job.qualifications || [],
    responsibilities: job.responsibilities || [],
    benefits: job.benefits || [],
    salary: job.salary || '',
    postedAt: job.postedAt,
    applyUrl: job.applyUrl || '',
    source: job.source,
    matchingScore: job.matchingScore || 0,
    matchingSummary: job.matchingSummary,
    summary: job.summary
  }))

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Search Mode Tabs */}
      <Tabs value={searchMode} onValueChange={(value) => setSearchMode(value as 'basic' | 'advanced')}>
        <div className="flex items-center justify-between">
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="basic">Basic Search</TabsTrigger>
            <TabsTrigger value="advanced" className="relative">
              Advanced Search
              {Object.keys(filters).length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                  {Object.keys(filters).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          {/* Search Stats */}
          {hasSearched && !isLoading && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                <span>{Math.round(batchHitRate * 100)}% from cache</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{executionTime}ms</span>
              </div>
            </div>
          )}
        </div>

        <TabsContent value="basic" className="space-y-4">
          <JobSearch 
            onSearch={handleBasicSearch}
            isLoading={isLoading}
            initialQuery={query}
            initialLocation={location}
          />
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          {/* Advanced Search Form */}
          <Card className="shadow-lg border-2 border-border/50 rounded-xl">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="lg:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Job title, keywords, or company"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="pl-10 h-11"
                      onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                    <Select value={location} onValueChange={setLocation}>
                      <SelectTrigger className="pl-10 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Anywhere">Anywhere</SelectItem>
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="Seattle, Washington, United States">Seattle, WA</SelectItem>
                        <SelectItem value="San Francisco, California, United States">San Francisco, CA</SelectItem>
                        <SelectItem value="New York, New York, United States">New York, NY</SelectItem>
                        <SelectItem value="Austin, Texas, United States">Austin, TX</SelectItem>
                        <SelectItem value="Boston, Massachusetts, United States">Boston, MA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button 
                  onClick={performSearch} 
                  className="w-full h-11" 
                  disabled={isLoading || !query.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Filters */}
          <QuickFilters 
            onQuickFilter={handleQuickFilter}
            className="pb-2"
          />
          
          {/* Advanced Filters */}
          <AdvancedJobFilters
            filters={filters}
            onFiltersChange={setFilters}
            filterOptions={filterOptions || undefined}
            isLoading={isLoadingFilters}
          />
        </TabsContent>
      </Tabs>

      {/* Active Filters Display */}
      {Object.keys(filters).length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4" />
            Active Filters:
          </div>
          <ActiveFilters 
            filters={filters}
            onRemoveFilter={handleRemoveFilter}
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          
          {/* Results Summary */}
          {!isLoading && totalResults > 0 && (
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm font-medium">
                  Found {totalResults.toLocaleString()} jobs
                  {batchHitRate > 0 && (
                    <span className="text-muted-foreground ml-2">
                      ({Math.round(batchHitRate * 100)}% from our database)
                    </span>
                  )}
                </p>
                {query && (
                  <p className="text-xs text-muted-foreground">
                    for "{query}" in {location}
                  </p>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground">
                Search completed in {executionTime}ms
              </div>
            </div>
          )}
          
          {/* Job Results */}
          <JobResults results={convertedResults} />
          
          {/* No Results Message */}
          {!isLoading && totalResults === 0 && (
            <Card className="p-8 text-center">
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No jobs found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search criteria or filters to see more results.
                  </p>
                </div>
                <div className="flex justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setFilters({})
                      setQuery('')
                    }}
                  >
                    Clear all filters
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}