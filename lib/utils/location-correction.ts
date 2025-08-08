/**
 * Location spelling correction and normalization utilities
 */

// Common city misspellings and corrections
const CITY_CORRECTIONS: Record<string, string> = {
  // Seattle variations
  'seatle': 'Seattle',
  'seattel': 'Seattle',
  'seattle': 'Seattle',
  'seatlle': 'Seattle',
  
  // San Francisco variations
  'sanfrancisco': 'San Francisco',
  'san fran': 'San Francisco',
  'sf': 'San Francisco',
  'sanfran': 'San Francisco',
  'sanfranciso': 'San Francisco',
  
  // Los Angeles variations
  'losangeles': 'Los Angeles',
  'los angles': 'Los Angeles',
  'la': 'Los Angeles',
  'losangles': 'Los Angeles',
  
  // New York variations
  'newyork': 'New York',
  'new york city': 'New York',
  'nyc': 'New York',
  'ny': 'New York',
  'newyrok': 'New York',
  
  // Chicago variations
  'chicago': 'Chicago',
  'chicgo': 'Chicago',
  'chigaco': 'Chicago',
  
  // Austin variations
  'austin': 'Austin',
  'austine': 'Austin',
  'austn': 'Austin',
  
  // Boston variations
  'boston': 'Boston',
  'bosotn': 'Boston',
  'bostno': 'Boston',
  
  // Denver variations
  'denver': 'Denver',
  'dener': 'Denver',
  'denvor': 'Denver',
  
  // Dallas variations
  'dallas': 'Dallas',
  'dalas': 'Dallas',
  'dalls': 'Dallas',
  
  // Houston variations
  'houston': 'Houston',
  'houstan': 'Houston',
  'huston': 'Houston',
  
  // Phoenix variations
  'phoenix': 'Phoenix',
  'pheonix': 'Phoenix',
  'phenix': 'Phoenix',
  
  // Philadelphia variations
  'philadelphia': 'Philadelphia',
  'philly': 'Philadelphia',
  'philadephia': 'Philadelphia',
  'philadelfia': 'Philadelphia',
  
  // San Diego variations
  'sandiego': 'San Diego',
  'san deigo': 'San Diego',
  'sandeigo': 'San Diego',
  
  // San Jose variations
  'sanjose': 'San Jose',
  'san hose': 'San Jose',
  'sanhose': 'San Jose',
  
  // Portland variations
  'portland': 'Portland',
  'portlnd': 'Portland',
  'protland': 'Portland',
  
  // Miami variations
  'miami': 'Miami',
  'maimi': 'Miami',
  'mimai': 'Miami',
  
  // Atlanta variations
  'atlanta': 'Atlanta',
  'altanta': 'Atlanta',
  'atalanta': 'Atlanta',
  
  // Washington DC variations
  'washington dc': 'Washington DC',
  'washington d.c.': 'Washington DC',
  'dc': 'Washington DC',
  'washingtondc': 'Washington DC',
  
  // Remote/Anywhere variations
  'remote': 'Remote',
  'anywhere': 'Remote',
  'work from home': 'Remote',
  'wfh': 'Remote',
}

// State abbreviations and full names
const STATE_MAPPINGS: Record<string, string> = {
  // Full name to abbreviation
  'alabama': 'AL',
  'alaska': 'AK',
  'arizona': 'AZ',
  'arkansas': 'AR',
  'california': 'CA',
  'colorado': 'CO',
  'connecticut': 'CT',
  'delaware': 'DE',
  'florida': 'FL',
  'georgia': 'GA',
  'hawaii': 'HI',
  'idaho': 'ID',
  'illinois': 'IL',
  'indiana': 'IN',
  'iowa': 'IA',
  'kansas': 'KS',
  'kentucky': 'KY',
  'louisiana': 'LA',
  'maine': 'ME',
  'maryland': 'MD',
  'massachusetts': 'MA',
  'michigan': 'MI',
  'minnesota': 'MN',
  'mississippi': 'MS',
  'missouri': 'MO',
  'montana': 'MT',
  'nebraska': 'NE',
  'nevada': 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  'ohio': 'OH',
  'oklahoma': 'OK',
  'oregon': 'OR',
  'pennsylvania': 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  'tennessee': 'TN',
  'texas': 'TX',
  'utah': 'UT',
  'vermont': 'VT',
  'virginia': 'VA',
  'washington': 'WA',
  'west virginia': 'WV',
  'wisconsin': 'WI',
  'wyoming': 'WY',
  'district of columbia': 'DC',
  
  // Common misspellings of states
  'washignton': 'WA',
  'washingtion': 'WA',
  'californa': 'CA',
  'califronia': 'CA',
  'texes': 'TX',
  'flordia': 'FL',
  'gorgia': 'GA',
  'virgina': 'VA',
  'pensylvania': 'PA',
  'massachusets': 'MA',
  'conneticut': 'CT',
  'minesota': 'MN',
  'misouri': 'MO',
  'tenessee': 'TN',
  'wisconson': 'WI',
  'michagan': 'MI',
}

/**
 * Correct common location misspellings
 */
export function correctLocationSpelling(location: string | undefined | null): string {
  // Handle undefined, null, or empty location
  if (!location || location === 'undefined' || location === 'null' || location.trim() === '') {
    return 'Remote' // Default to Remote for anywhere/undefined
  }

  const originalLocation = location.trim()
  const locationLower = originalLocation.toLowerCase()

  // Check if it's a simple city name
  const correctedCity = CITY_CORRECTIONS[locationLower]
  if (correctedCity) {
    return correctedCity
  }

  // Try to parse city and state
  const parts = originalLocation.split(',').map(s => s.trim())
  
  if (parts.length === 1) {
    // Might be just a state
    const stateAbbr = STATE_MAPPINGS[locationLower]
    if (stateAbbr) {
      return stateAbbr
    }
    
    // Check if it's already a valid state abbreviation
    const validStateAbbrs = Object.values(STATE_MAPPINGS)
    if (validStateAbbrs.includes(parts[0].toUpperCase())) {
      return parts[0].toUpperCase()
    }
    
    // Return as-is if no correction found
    return originalLocation
  }
  
  if (parts.length >= 2) {
    const city = parts[0]
    const state = parts[1]
    
    // Correct city spelling
    const cityLower = city.toLowerCase()
    const correctedCityName = CITY_CORRECTIONS[cityLower] || city
    
    // Correct state spelling
    const stateLower = state.toLowerCase().trim()
    let correctedState = state
    
    // Check if state is already an abbreviation
    const validStateAbbrs = Object.values(STATE_MAPPINGS)
    if (validStateAbbrs.includes(state.toUpperCase())) {
      correctedState = state.toUpperCase()
    } else {
      // Try to find the state abbreviation
      correctedState = STATE_MAPPINGS[stateLower] || state
    }
    
    return `${correctedCityName}, ${correctedState}`
  }
  
  return originalLocation
}

/**
 * Normalize location format for consistency
 */
export function normalizeLocationFormat(location: string): string {
  // Already handled by correctLocationSpelling for undefined
  if (!location || location === 'Remote') {
    return location
  }

  // Ensure proper capitalization
  return location.split(',').map(part => {
    const trimmed = part.trim()
    
    // Check if it's a state abbreviation (all caps)
    if (trimmed.length === 2 && /^[A-Z]{2}$/.test(trimmed)) {
      return trimmed
    }
    
    // Otherwise, capitalize properly
    return trimmed.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  }).join(', ')
}

/**
 * Process location with corrections and normalization
 */
export function processLocation(location?: string | null): string {
  // Correct spelling first
  const corrected = correctLocationSpelling(location)
  
  // Then normalize format
  return normalizeLocationFormat(corrected)
}

/**
 * Check if location should search everywhere (remote/anywhere)
 */
export function isAnywhereLocation(location: string): boolean {
  const lower = location.toLowerCase()
  return lower === 'remote' || 
         lower === 'anywhere' || 
         lower === 'work from home' || 
         lower === 'wfh' ||
         lower === ''
}