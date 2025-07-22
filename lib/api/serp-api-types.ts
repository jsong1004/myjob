// SerpAPI Response Types for type safety
export interface SerpApiJobResult {
  position: number
  title: string
  company_name: string
  location: string
  description: string
  extensions?: string[]
  detected_extensions?: {
    posted_at?: string
    schedule_type?: string
    work_from_home?: boolean
    salary?: string
  }
  job_id: string
  thumbnail?: string
  related_links?: Array<{
    link: string
    text: string
  }>
  apply_options?: Array<{
    title: string
    link: string
  }>
}

export interface SerpApiResponse {
  search_metadata: {
    id: string
    status: string
    json_endpoint: string
    created_at: string
    processed_at: string
    google_jobs_url: string
    raw_html_file: string
    total_time_taken: number
  }
  search_parameters: {
    engine: string
    q: string
    location: string
    hl: string
    start: number
  }
  search_information: {
    organic_jobs_state: string
  }
  jobs_results?: SerpApiJobResult[]
  chips?: Array<{
    type: string
    param: string
    options: Array<{
      text: string
      value: string
    }>
  }>
  error?: string
}