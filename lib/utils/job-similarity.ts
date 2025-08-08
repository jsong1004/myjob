/**
 * Job Similarity Detection Utility
 * 
 * Provides functions to detect similar or duplicate jobs based on normalized
 * company names, job titles, and locations. Used primarily during migration
 * and batch processing to prevent duplicate job entries.
 */

/**
 * Common company suffixes and abbreviations to remove for normalization
 */
const COMPANY_SUFFIXES = [
  'incorporated', 'inc', 'corporation', 'corp', 'company', 'co',
  'limited', 'ltd', 'llc', 'llp', 'lp', 'plc', 'pllc',
  'technologies', 'tech', 'solutions', 'services', 'systems',
  'group', 'partners', 'associates', 'enterprises', 'holdings',
  'international', 'intl', 'global', 'worldwide',
  'america', 'usa', 'us', 'north america', 'na'
];

/**
 * Common abbreviations and their expansions
 */
const ABBREVIATION_MAP: Record<string, string> = {
  'med': 'medical',
  'ctr': 'center',
  'cntr': 'center',
  'hosp': 'hospital',
  'univ': 'university',
  'dept': 'department',
  'div': 'division',
  'mgmt': 'management',
  'mgt': 'management',
  'svcs': 'services',
  'svc': 'service',
  'sys': 'systems',
  'info': 'information',
  'tech': 'technology',
  'dev': 'development',
  'eng': 'engineering',
  'mfg': 'manufacturing',
  'dist': 'distribution',
  'natl': 'national',
  'intl': 'international',
  'assoc': 'associates',
  'bros': 'brothers',
  '&': 'and',
  'n': 'and', // for cases like "r&d" -> "r and d"
};

/**
 * Job title level indicators to normalize
 */
const TITLE_LEVELS = [
  'senior', 'sr', 'junior', 'jr', 'lead', 'principal', 'staff',
  'i', 'ii', 'iii', 'iv', 'v', '1', '2', '3', '4', '5',
  'entry level', 'entry-level', 'mid level', 'mid-level',
  'experienced', 'expert', 'specialist', 'associate'
];

/**
 * Normalize a company name for similarity comparison
 */
export function normalizeCompanyName(company: string): string {
  if (!company) return '';
  
  let normalized = company.toLowerCase().trim();
  
  // Remove special characters and extra spaces
  normalized = normalized
    .replace(/[^\w\s&]/g, ' ')  // Keep alphanumeric, spaces, and &
    .replace(/\s+/g, ' ')        // Multiple spaces to single space
    .trim();
  
  // Expand common abbreviations
  Object.entries(ABBREVIATION_MAP).forEach(([abbr, full]) => {
    // Use word boundaries to avoid partial replacements
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    normalized = normalized.replace(regex, full);
  });
  
  // Remove common suffixes
  COMPANY_SUFFIXES.forEach(suffix => {
    const regex = new RegExp(`\\b${suffix}\\b`, 'gi');
    normalized = normalized.replace(regex, '');
  });
  
  // Clean up extra spaces again after replacements
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Normalize a job title for similarity comparison
 */
export function normalizeJobTitle(title: string): string {
  if (!title) return '';
  
  let normalized = title.toLowerCase().trim();
  
  // Remove special characters except hyphens (common in titles)
  normalized = normalized
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Remove level indicators
  TITLE_LEVELS.forEach(level => {
    const regex = new RegExp(`\\b${level}\\b`, 'gi');
    normalized = normalized.replace(regex, '');
  });
  
  // Remove parenthetical content (often contains location or department)
  normalized = normalized.replace(/\([^)]*\)/g, '');
  
  // Clean up extra spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Normalize location for comparison
 */
export function normalizeLocation(location: string): string {
  if (!location) return '';
  
  let normalized = location.toLowerCase().trim();
  
  // Handle remote/anywhere cases
  if (normalized.includes('remote') || normalized.includes('anywhere') || 
      normalized.includes('work from home')) {
    return 'remote';
  }
  
  // Remove common location descriptors
  normalized = normalized
    .replace(/\b(greater|metro|metropolitan|area|region|downtown)\b/gi, '')
    .replace(/[^\w\s,]/g, ' ')  // Keep alphanumeric, spaces, and commas
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalized;
}

/**
 * Generate a content signature for a job
 * This creates a unique identifier based on normalized content
 */
export function generateJobSignature(
  title: string, 
  company: string, 
  location: string
): string {
  const normalizedTitle = normalizeJobTitle(title);
  const normalizedCompany = normalizeCompanyName(company);
  const normalizedLocation = normalizeLocation(location);
  
  // Create a composite key
  return `${normalizedTitle}|${normalizedCompany}|${normalizedLocation}`;
}

/**
 * Calculate string similarity using a simple algorithm
 * Returns a score between 0 and 100
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 100;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  // If one string is much longer, penalize the similarity
  if (longer.length > shorter.length * 2) {
    return 0;
  }
  
  // Check if one string contains the other
  if (longer.includes(shorter)) {
    return (shorter.length / longer.length) * 100;
  }
  
  // Simple character-by-character comparison
  let matches = 0;
  const minLength = Math.min(str1.length, str2.length);
  for (let i = 0; i < minLength; i++) {
    if (str1[i] === str2[i]) matches++;
  }
  
  return (matches / Math.max(str1.length, str2.length)) * 100;
}

/**
 * Calculate similarity between two jobs
 * Returns a score between 0 and 100
 */
export function calculateJobSimilarity(
  job1: { title: string; company: string; location: string },
  job2: { title: string; company: string; location: string }
): number {
  // Normalize all fields
  const title1 = normalizeJobTitle(job1.title);
  const title2 = normalizeJobTitle(job2.title);
  const company1 = normalizeCompanyName(job1.company);
  const company2 = normalizeCompanyName(job2.company);
  const location1 = normalizeLocation(job1.location);
  const location2 = normalizeLocation(job2.location);
  
  // Calculate individual similarities
  const titleSimilarity = calculateStringSimilarity(title1, title2);
  const companySimilarity = calculateStringSimilarity(company1, company2);
  const locationSimilarity = calculateStringSimilarity(location1, location2);
  
  // Weight the similarities (company and title are more important)
  const weightedScore = (
    titleSimilarity * 0.35 +      // 35% weight on title
    companySimilarity * 0.45 +    // 45% weight on company
    locationSimilarity * 0.20      // 20% weight on location
  );
  
  return Math.round(weightedScore);
}

/**
 * Check if two jobs are similar enough to be considered duplicates
 * Default threshold is 85%
 */
export function areJobsSimilar(
  job1: { title: string; company: string; location: string },
  job2: { title: string; company: string; location: string },
  threshold: number = 85
): boolean {
  const similarity = calculateJobSimilarity(job1, job2);
  return similarity >= threshold;
}

/**
 * Find similar jobs in a collection
 * Returns jobs that meet the similarity threshold
 */
export function findSimilarJobs(
  targetJob: { title: string; company: string; location: string },
  jobCollection: Array<{ id?: string; title: string; company: string; location: string }>,
  threshold: number = 85
): Array<{ job: typeof jobCollection[0]; similarity: number }> {
  const similarJobs: Array<{ job: typeof jobCollection[0]; similarity: number }> = [];
  
  for (const job of jobCollection) {
    const similarity = calculateJobSimilarity(targetJob, job);
    if (similarity >= threshold) {
      similarJobs.push({ job, similarity });
    }
  }
  
  // Sort by similarity score (highest first)
  return similarJobs.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Create a similarity index for efficient duplicate detection
 * Maps content signatures to job IDs
 */
export function createSimilarityIndex(
  jobs: Array<{ id?: string; job_id?: string; title: string; company: string; location: string }>
): Map<string, string> {
  const index = new Map<string, string>();
  
  for (const job of jobs) {
    const signature = generateJobSignature(job.title, job.company, job.location);
    const jobId = job.id || job.job_id || '';
    if (jobId && signature) {
      index.set(signature, jobId);
    }
  }
  
  return index;
}