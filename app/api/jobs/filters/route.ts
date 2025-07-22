import { NextRequest, NextResponse } from "next/server"
import { initFirebaseAdmin } from "@/lib/firebase-admin-init"
import { getFirestore } from "firebase-admin/firestore"
import { 
  FilterOptions, 
  ExperienceLevel, 
  JobType, 
  WorkArrangement, 
  CompanySize 
} from "@/lib/types"
import { generateBatchId } from "@/lib/batch-job-utils"

/**
 * Get available filter options with counts for the filter UI
 * This endpoint analyzes batch jobs to provide realistic filter options
 */

export async function GET(req: NextRequest) {
  try {
    console.log(`[FiltersAPI] Getting filter options...`)
    
    initFirebaseAdmin()
    const db = getFirestore()
    
    // Get recent batch jobs (today and yesterday)
    const today = generateBatchId()
    const yesterday = generateBatchId(new Date(Date.now() - 24 * 60 * 60 * 1000))
    
    console.log(`[FiltersAPI] Querying batch jobs for ${yesterday} and ${today}`)
    
    const snapshot = await db.collection('batch_jobs')
      .where('batchId', 'in', [today, yesterday])
      .limit(5000) // Limit to prevent timeout
      .get()
    
    console.log(`[FiltersAPI] Found ${snapshot.size} batch jobs to analyze`)
    
    // Aggregate data for filter options
    const locations = new Map<string, number>()
    const companies = new Map<string, number>()
    const experienceLevels = new Map<ExperienceLevel, number>()
    const jobTypes = new Map<JobType, number>()
    const workArrangements = new Map<WorkArrangement, number>()
    const companySizes = new Map<CompanySize, number>()
    const industries = new Map<string, number>()
    const skills = new Map<string, number>()
    const salaries: number[] = []
    
    snapshot.forEach(doc => {
      const job = doc.data()
      
      // Count locations
      if (job.location) {
        // Extract state/region from location
        const locationParts = job.location.split(',').map((part: string) => part.trim())
        const primaryLocation = locationParts[locationParts.length - 1] || job.location
        locations.set(primaryLocation, (locations.get(primaryLocation) || 0) + 1)
      }
      
      // Count companies
      if (job.company) {
        companies.set(job.company, (companies.get(job.company) || 0) + 1)
      }
      
      // Count experience levels
      if (job.experienceLevel) {
        experienceLevels.set(
          job.experienceLevel, 
          (experienceLevels.get(job.experienceLevel) || 0) + 1
        )
      }
      
      // Count job types
      if (job.jobType) {
        jobTypes.set(job.jobType, (jobTypes.get(job.jobType) || 0) + 1)
      }
      
      // Count work arrangements
      if (job.workArrangement) {
        workArrangements.set(
          job.workArrangement, 
          (workArrangements.get(job.workArrangement) || 0) + 1
        )
      }
      
      // Count company sizes
      if (job.companySize) {
        companySizes.set(
          job.companySize, 
          (companySizes.get(job.companySize) || 0) + 1
        )
      }
      
      // Count industries (from industry tags)
      if (job.industryTags && Array.isArray(job.industryTags)) {
        job.industryTags.forEach((tag: string) => {
          industries.set(tag, (industries.get(tag) || 0) + 1)
        })
      }
      
      // Count skills (from skill tags)
      if (job.skillTags && Array.isArray(job.skillTags)) {
        job.skillTags.forEach((skill: string) => {
          skills.set(skill, (skills.get(skill) || 0) + 1)
        })
      }
      
      // Collect salary data for range calculation
      if (job.salaryMin && job.salaryMin > 0) {
        salaries.push(job.salaryMin)
      }
      if (job.salaryMax && job.salaryMax > job.salaryMin) {
        salaries.push(job.salaryMax)
      }
    })
    
    // Convert maps to sorted arrays with labels
    const filterOptions: FilterOptions = {
      locations: Array.from(locations.entries())
        .sort((a, b) => b[1] - a[1]) // Sort by count descending
        .slice(0, 20) // Top 20
        .map(([value, count]) => ({
          value,
          label: formatLocationLabel(value),
          count
        })),
        
      companies: Array.from(companies.entries())
        .filter(([_, count]) => count >= 2) // Only companies with 2+ jobs
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50) // Top 50 companies
        .map(([value, count]) => ({
          value,
          label: value,
          count
        })),
        
      experienceLevels: Array.from(experienceLevels.entries())
        .sort((a, b) => getExperienceLevelOrder(a[0]) - getExperienceLevelOrder(b[0]))
        .map(([value, count]) => ({
          value,
          label: formatExperienceLevelLabel(value),
          count
        })),
        
      jobTypes: Array.from(jobTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value, count]) => ({
          value,
          label: formatJobTypeLabel(value),
          count
        })),
        
      workArrangements: Array.from(workArrangements.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value, count]) => ({
          value,
          label: formatWorkArrangementLabel(value),
          count
        })),
        
      companySizes: Array.from(companySizes.entries())
        .sort((a, b) => getCompanySizeOrder(a[0]) - getCompanySizeOrder(b[0]))
        .map(([value, count]) => ({
          value,
          label: formatCompanySizeLabel(value),
          count
        })),
        
      industries: Array.from(industries.entries())
        .filter(([_, count]) => count >= 5) // Only industries with 5+ jobs
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([value, count]) => ({
          value,
          label: value,
          count
        })),
        
      skills: Array.from(skills.entries())
        .filter(([_, count]) => count >= 3) // Only skills with 3+ mentions
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([value, count]) => ({
          value,
          label: value,
          count
        })),
        
      salaryRanges: calculateSalaryRanges(salaries)
    }
    
    console.log(`[FiltersAPI] Generated filter options:`)
    console.log(`- Locations: ${filterOptions.locations.length}`)
    console.log(`- Companies: ${filterOptions.companies.length}`)
    console.log(`- Experience levels: ${filterOptions.experienceLevels.length}`)
    console.log(`- Job types: ${filterOptions.jobTypes.length}`)
    console.log(`- Work arrangements: ${filterOptions.workArrangements.length}`)
    console.log(`- Skills: ${filterOptions.skills.length}`)
    
    return NextResponse.json({
      success: true,
      filterOptions,
      metadata: {
        totalJobs: snapshot.size,
        generatedAt: new Date().toISOString(),
        batchDates: [yesterday, today]
      }
    })
    
  } catch (error) {
    console.error("[FiltersAPI] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      filterOptions: getDefaultFilterOptions() // Fallback options
    }, { status: 500 })
  }
}

// Helper functions for formatting and sorting

function formatLocationLabel(location: string): string {
  if (location === 'United States') return 'Remote (US)'
  if (location.length === 2) return `${location} (State)` // State abbreviation
  return location
}

function formatExperienceLevelLabel(level: ExperienceLevel): string {
  const labels: Record<ExperienceLevel, string> = {
    'entry': 'Entry Level (0-2 years)',
    'mid': 'Mid Level (2-5 years)',
    'senior': 'Senior Level (5-8 years)',
    'lead': 'Lead/Staff Level (8+ years)',
    'executive': 'Executive/Director Level'
  }
  return labels[level] || level
}

function formatJobTypeLabel(type: JobType): string {
  const labels: Record<JobType, string> = {
    'full-time': 'Full Time',
    'part-time': 'Part Time',
    'contract': 'Contract/Freelance',
    'internship': 'Internship'
  }
  return labels[type] || type
}

function formatWorkArrangementLabel(arrangement: WorkArrangement): string {
  const labels: Record<WorkArrangement, string> = {
    'remote': 'Remote',
    'hybrid': 'Hybrid',
    'on-site': 'On-site'
  }
  return labels[arrangement] || arrangement
}

function formatCompanySizeLabel(size: CompanySize): string {
  const labels: Record<CompanySize, string> = {
    'startup': 'Startup (1-10 employees)',
    'small': 'Small (11-100 employees)',
    'medium': 'Medium (101-1000 employees)',
    'large': 'Large (1001-10000 employees)',
    'enterprise': 'Enterprise (10000+ employees)'
  }
  return labels[size] || size
}

function getExperienceLevelOrder(level: ExperienceLevel): number {
  const order: Record<ExperienceLevel, number> = {
    'entry': 1,
    'mid': 2,
    'senior': 3,
    'lead': 4,
    'executive': 5
  }
  return order[level] || 0
}

function getCompanySizeOrder(size: CompanySize): number {
  const order: Record<CompanySize, number> = {
    'startup': 1,
    'small': 2,
    'medium': 3,
    'large': 4,
    'enterprise': 5
  }
  return order[size] || 0
}

function calculateSalaryRanges(salaries: number[]) {
  if (salaries.length === 0) {
    return {
      min: 40000,
      max: 300000,
      q25: 80000,
      q50: 120000,
      q75: 160000
    }
  }
  
  salaries.sort((a, b) => a - b)
  
  return {
    min: Math.max(salaries[0], 30000), // Minimum wage consideration
    max: Math.min(salaries[salaries.length - 1], 500000), // Cap at reasonable max
    q25: salaries[Math.floor(salaries.length * 0.25)],
    q50: salaries[Math.floor(salaries.length * 0.50)],
    q75: salaries[Math.floor(salaries.length * 0.75)]
  }
}

function getDefaultFilterOptions(): FilterOptions {
  return {
    locations: [
      { value: 'United States', label: 'Remote (US)', count: 100 },
      { value: 'CA', label: 'California', count: 50 },
      { value: 'NY', label: 'New York', count: 40 },
      { value: 'TX', label: 'Texas', count: 35 },
      { value: 'WA', label: 'Washington', count: 30 }
    ],
    companies: [
      { value: 'Google', label: 'Google', count: 10 },
      { value: 'Microsoft', label: 'Microsoft', count: 8 },
      { value: 'Amazon', label: 'Amazon', count: 12 }
    ],
    experienceLevels: [
      { value: 'entry', label: 'Entry Level (0-2 years)', count: 25 },
      { value: 'mid', label: 'Mid Level (2-5 years)', count: 40 },
      { value: 'senior', label: 'Senior Level (5-8 years)', count: 30 },
      { value: 'lead', label: 'Lead/Staff Level (8+ years)', count: 15 },
      { value: 'executive', label: 'Executive/Director Level', count: 5 }
    ],
    jobTypes: [
      { value: 'full-time', label: 'Full Time', count: 80 },
      { value: 'contract', label: 'Contract/Freelance', count: 15 },
      { value: 'part-time', label: 'Part Time', count: 3 },
      { value: 'internship', label: 'Internship', count: 7 }
    ],
    workArrangements: [
      { value: 'remote', label: 'Remote', count: 50 },
      { value: 'hybrid', label: 'Hybrid', count: 30 },
      { value: 'on-site', label: 'On-site', count: 20 }
    ],
    companySizes: [
      { value: 'startup', label: 'Startup (1-10 employees)', count: 15 },
      { value: 'small', label: 'Small (11-100 employees)', count: 25 },
      { value: 'medium', label: 'Medium (101-1000 employees)', count: 35 },
      { value: 'large', label: 'Large (1001-10000 employees)', count: 20 },
      { value: 'enterprise', label: 'Enterprise (10000+ employees)', count: 10 }
    ],
    industries: [
      { value: 'Technology', label: 'Technology', count: 60 },
      { value: 'Finance', label: 'Finance', count: 20 },
      { value: 'Healthcare', label: 'Healthcare', count: 15 }
    ],
    skills: [
      { value: 'JavaScript', label: 'JavaScript', count: 40 },
      { value: 'Python', label: 'Python', count: 35 },
      { value: 'React', label: 'React', count: 30 },
      { value: 'AWS', label: 'AWS', count: 25 },
      { value: 'Docker', label: 'Docker', count: 20 }
    ],
    salaryRanges: {
      min: 40000,
      max: 300000,
      q25: 80000,
      q50: 120000,
      q75: 160000
    }
  }
}