"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Search,
  MapPin,
  Building2,
  Clock,
  DollarSign,
  User,
  Briefcase,
  Home,
  Trash2
} from "lucide-react"
import { 
  JobFilters, 
  FilterOptions, 
  ExperienceLevel, 
  JobType, 
  WorkArrangement, 
  CompanySize,
  PostedWithin 
} from "@/lib/types"

interface AdvancedJobFiltersProps {
  filters: JobFilters
  onFiltersChange: (filters: JobFilters) => void
  filterOptions?: FilterOptions
  isLoading?: boolean
  className?: string
}

export function AdvancedJobFilters({
  filters,
  onFiltersChange,
  filterOptions,
  isLoading = false,
  className = ""
}: AdvancedJobFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)
  const [salaryRange, setSalaryRange] = useState<[number, number]>([
    filters.salaryMin || 40000,
    filters.salaryMax || 200000
  ])

  // Calculate active filters count
  useEffect(() => {
    let count = 0
    if (filters.searchQuery) count++
    if (filters.locations?.length) count++
    if (filters.salaryMin || filters.salaryMax) count++
    if (filters.experienceLevel?.length) count++
    if (filters.jobType?.length) count++
    if (filters.workArrangement?.length) count++
    if (filters.companySize?.length) count++
    if (filters.companies?.length) count++
    if (filters.skillsRequired?.length) count++
    if (filters.postedWithin) count++
    
    setActiveFiltersCount(count)
  }, [filters])

  const updateFilter = useCallback((key: keyof JobFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }, [filters, onFiltersChange])

  const toggleArrayFilter = useCallback((
    key: keyof JobFilters, 
    value: string, 
    currentArray?: string[]
  ) => {
    const array = currentArray || []
    const newArray = array.includes(value)
      ? array.filter(item => item !== value)
      : [...array, value]
    
    updateFilter(key, newArray.length > 0 ? newArray : undefined)
  }, [updateFilter])

  const clearAllFilters = useCallback(() => {
    onFiltersChange({})
    setSalaryRange([40000, 200000])
  }, [onFiltersChange])

  const applySalaryRange = useCallback(() => {
    updateFilter('salaryMin', salaryRange[0])
    updateFilter('salaryMax', salaryRange[1])
  }, [salaryRange, updateFilter])

  if (!filterOptions && !isLoading) {
    return (
      <Card className={`border-border/50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Loading filters...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-border/50 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Advanced Filters</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount} active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear all
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            
            {/* Quick Search */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Search className="h-4 w-4" />
                Keywords
              </Label>
              <Input
                placeholder="Search within results..."
                value={filters.searchQuery || ''}
                onChange={(e) => updateFilter('searchQuery', e.target.value || undefined)}
                className="h-9"
              />
            </div>

            {/* Location Filter */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                Locations
              </Label>
              <ScrollArea className="h-32 border rounded-md p-2">
                <div className="space-y-2">
                  {filterOptions?.locations.map((location) => (
                    <div key={location.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`location-${location.value}`}
                        checked={filters.locations?.includes(location.value) || false}
                        onCheckedChange={() => 
                          toggleArrayFilter('locations', location.value, filters.locations)
                        }
                      />
                      <Label 
                        htmlFor={`location-${location.value}`}
                        className="text-sm flex-1 cursor-pointer"
                      >
                        {location.label}
                        <span className="text-muted-foreground ml-1">({location.count})</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Salary Range */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="h-4 w-4" />
                Salary Range
              </Label>
              <div className="space-y-4">
                <Slider
                  value={salaryRange}
                  onValueChange={setSalaryRange}
                  min={filterOptions?.salaryRanges.min || 40000}
                  max={filterOptions?.salaryRanges.max || 300000}
                  step={5000}
                  className="w-full"
                />
                <div className="flex items-center justify-between text-sm">
                  <span>${salaryRange[0].toLocaleString()}</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={applySalaryRange}
                    disabled={
                      salaryRange[0] === (filters.salaryMin || 40000) &&
                      salaryRange[1] === (filters.salaryMax || 300000)
                    }
                  >
                    Apply
                  </Button>
                  <span>${salaryRange[1].toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Experience Level */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4" />
                Experience Level
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {filterOptions?.experienceLevels.map((level) => (
                  <div key={level.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`exp-${level.value}`}
                      checked={filters.experienceLevel?.includes(level.value) || false}
                      onCheckedChange={() => 
                        toggleArrayFilter('experienceLevel', level.value, filters.experienceLevel)
                      }
                    />
                    <Label 
                      htmlFor={`exp-${level.value}`}
                      className="text-sm flex-1 cursor-pointer"
                    >
                      {level.label}
                      <span className="text-muted-foreground ml-1">({level.count})</span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Job Type */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Briefcase className="h-4 w-4" />
                Job Type
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {filterOptions?.jobTypes.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type.value}`}
                      checked={filters.jobType?.includes(type.value) || false}
                      onCheckedChange={() => 
                        toggleArrayFilter('jobType', type.value, filters.jobType)
                      }
                    />
                    <Label 
                      htmlFor={`type-${type.value}`}
                      className="text-sm flex-1 cursor-pointer"
                    >
                      {type.label}
                      <span className="text-muted-foreground ml-1">({type.count})</span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Work Arrangement */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Home className="h-4 w-4" />
                Work Arrangement
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {filterOptions?.workArrangements.map((arrangement) => (
                  <div key={arrangement.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`work-${arrangement.value}`}
                      checked={filters.workArrangement?.includes(arrangement.value) || false}
                      onCheckedChange={() => 
                        toggleArrayFilter('workArrangement', arrangement.value, filters.workArrangement)
                      }
                    />
                    <Label 
                      htmlFor={`work-${arrangement.value}`}
                      className="text-sm flex-1 cursor-pointer"
                    >
                      {arrangement.label}
                      <span className="text-muted-foreground ml-1">({arrangement.count})</span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Company Size */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-4 w-4" />
                Company Size
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {filterOptions?.companySizes.map((size) => (
                  <div key={size.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`size-${size.value}`}
                      checked={filters.companySize?.includes(size.value) || false}
                      onCheckedChange={() => 
                        toggleArrayFilter('companySize', size.value, filters.companySize)
                      }
                    />
                    <Label 
                      htmlFor={`size-${size.value}`}
                      className="text-sm flex-1 cursor-pointer"
                    >
                      {size.label}
                      <span className="text-muted-foreground ml-1">({size.count})</span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Posted Date */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                Posted Within
              </Label>
              <Select
                value={filters.postedWithin || ''}
                onValueChange={(value) => updateFilter('postedWithin', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any time</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="3d">Last 3 days</SelectItem>
                  <SelectItem value="1w">Last week</SelectItem>
                  <SelectItem value="2w">Last 2 weeks</SelectItem>
                  <SelectItem value="1m">Last month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Top Companies */}
            {filterOptions?.companies && filterOptions.companies.length > 0 && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4" />
                  Top Companies
                </Label>
                <ScrollArea className="h-32 border rounded-md p-2">
                  <div className="space-y-2">
                    {filterOptions.companies.slice(0, 15).map((company) => (
                      <div key={company.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`company-${company.value}`}
                          checked={filters.companies?.includes(company.value) || false}
                          onCheckedChange={() => 
                            toggleArrayFilter('companies', company.value, filters.companies)
                          }
                        />
                        <Label 
                          htmlFor={`company-${company.value}`}
                          className="text-sm flex-1 cursor-pointer"
                        >
                          {company.label}
                          <span className="text-muted-foreground ml-1">({company.count})</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Skills */}
            {filterOptions?.skills && filterOptions.skills.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Required Skills</Label>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.skills.slice(0, 15).map((skill) => (
                    <Badge 
                      key={skill.value}
                      variant={filters.skillsRequired?.includes(skill.value) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/20"
                      onClick={() => 
                        toggleArrayFilter('skillsRequired', skill.value, filters.skillsRequired)
                      }
                    >
                      {skill.label}
                      <span className="ml-1 text-xs">({skill.count})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

// Quick filter chips component
interface QuickFiltersProps {
  onQuickFilter: (filters: Partial<JobFilters>) => void
  className?: string
}

export function QuickFilters({ onQuickFilter, className = "" }: QuickFiltersProps) {
  const quickFilters = [
    {
      label: "Remote Only",
      filters: { workArrangement: ['remote' as WorkArrangement] },
      icon: Home
    },
    {
      label: "Senior Level",
      filters: { experienceLevel: ['senior' as ExperienceLevel] },
      icon: User
    },
    {
      label: "High Salary ($150k+)",
      filters: { salaryMin: 150000 },
      icon: DollarSign
    },
    {
      label: "Full Time",
      filters: { jobType: ['full-time' as JobType] },
      icon: Briefcase
    },
    {
      label: "Posted Recently",
      filters: { postedWithin: '1w' as PostedWithin },
      icon: Clock
    },
    {
      label: "Large Companies",
      filters: { companySize: ['large' as CompanySize, 'enterprise' as CompanySize] },
      icon: Building2
    }
  ]

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {quickFilters.map((filter) => {
        const Icon = filter.icon
        return (
          <Button
            key={filter.label}
            variant="outline"
            size="sm"
            onClick={() => onQuickFilter(filter.filters)}
            className="h-8 text-xs"
          >
            <Icon className="h-3 w-3 mr-1" />
            {filter.label}
          </Button>
        )
      })}
    </div>
  )
}

// Active filters display component
interface ActiveFiltersProps {
  filters: JobFilters
  onRemoveFilter: (key: keyof JobFilters, value?: string) => void
  className?: string
}

export function ActiveFilters({ filters, onRemoveFilter, className = "" }: ActiveFiltersProps) {
  const activeFilters: { key: keyof JobFilters; label: string; value?: string }[] = []

  if (filters.searchQuery) {
    activeFilters.push({ key: 'searchQuery', label: `Keywords: "${filters.searchQuery}"` })
  }

  filters.locations?.forEach(location => {
    activeFilters.push({ key: 'locations', label: `Location: ${location}`, value: location })
  })

  if (filters.salaryMin || filters.salaryMax) {
    const min = filters.salaryMin ? `$${filters.salaryMin.toLocaleString()}` : '0'
    const max = filters.salaryMax ? `$${filters.salaryMax.toLocaleString()}` : '∞'
    activeFilters.push({ key: 'salaryMin', label: `Salary: ${min} - ${max}` })
  }

  filters.experienceLevel?.forEach(level => {
    activeFilters.push({ key: 'experienceLevel', label: `Level: ${level}`, value: level })
  })

  filters.jobType?.forEach(type => {
    activeFilters.push({ key: 'jobType', label: `Type: ${type}`, value: type })
  })

  filters.workArrangement?.forEach(arrangement => {
    activeFilters.push({ key: 'workArrangement', label: `Work: ${arrangement}`, value: arrangement })
  })

  filters.companySize?.forEach(size => {
    activeFilters.push({ key: 'companySize', label: `Size: ${size}`, value: size })
  })

  if (filters.postedWithin) {
    activeFilters.push({ key: 'postedWithin', label: `Posted: ${filters.postedWithin}` })
  }

  if (activeFilters.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {activeFilters.map((filter, index) => (
        <Badge key={`${filter.key}-${filter.value}-${index}`} variant="secondary" className="gap-1">
          {filter.label}
          <X 
            className="h-3 w-3 cursor-pointer hover:bg-destructive/20 rounded" 
            onClick={() => onRemoveFilter(filter.key, filter.value)}
          />
        </Badge>
      ))}
    </div>
  )
}