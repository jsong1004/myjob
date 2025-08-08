#!/usr/bin/env npx tsx
/**
 * Test script for job similarity detection
 * Run with: npx tsx test-similarity.ts
 */

import {
  normalizeCompanyName,
  normalizeJobTitle,
  normalizeLocation,
  generateJobSignature,
  calculateJobSimilarity,
  areJobsSimilar,
  findSimilarJobs
} from './lib/utils/job-similarity'

// Color output for better readability
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function testSection(title: string) {
  console.log('\n' + '='.repeat(60))
  log(title, 'cyan')
  console.log('='.repeat(60))
}

function assert(condition: boolean, message: string) {
  if (condition) {
    log(`✓ ${message}`, 'green')
  } else {
    log(`✗ ${message}`, 'red')
  }
  return condition
}

// Test company name normalization
testSection('Testing Company Name Normalization')

const companyTests = [
  { input: "Children's Health", expected: "children health" },
  { input: "Children's Medical Center", expected: "children medical center" },
  { input: "ABC Inc.", expected: "abc" },
  { input: "ABC Corporation", expected: "abc" },
  { input: "Tech Co., LLC", expected: "tech" },
  { input: "Tech Company", expected: "tech" },
  { input: "Microsoft Corporation", expected: "microsoft" },
  { input: "Google LLC", expected: "google" },
  { input: "Meta Platforms, Inc.", expected: "meta platforms" },
  { input: "Amazon.com Inc", expected: "amazon com" },
  { input: "International Business Machines Corp", expected: "business machines" },
  { input: "Med Ctr Hospital", expected: "medical center hospital" },
  { input: "R&D Technologies", expected: "r and d" },
  { input: "Smith & Associates", expected: "smith and" },
]

companyTests.forEach(test => {
  const result = normalizeCompanyName(test.input)
  const passed = assert(
    result === test.expected,
    `"${test.input}" → "${result}" ${result !== test.expected ? `(expected: "${test.expected}")` : ''}`
  )
  if (!passed) {
    log(`  Details: Got "${result}", Expected "${test.expected}"`, 'gray')
  }
})

// Test job title normalization
testSection('Testing Job Title Normalization')

const titleTests = [
  { input: "Senior Software Engineer", expected: "software engineer" },
  { input: "Software Engineer III", expected: "software engineer" },
  { input: "Jr. Developer", expected: "developer" },
  { input: "Lead Data Scientist", expected: "data scientist" },
  { input: "Principal Architect", expected: "architect" },
  { input: "Entry Level Marketing Assistant", expected: "marketing assistant" },
  { input: "Staff Engineer (Remote)", expected: "engineer" },
  { input: "Software Developer I", expected: "software developer" },
  { input: "Mid-Level Product Manager", expected: "product manager" },
]

titleTests.forEach(test => {
  const result = normalizeJobTitle(test.input)
  const passed = assert(
    result === test.expected,
    `"${test.input}" → "${result}" ${result !== test.expected ? `(expected: "${test.expected}")` : ''}`
  )
  if (!passed) {
    log(`  Details: Got "${result}", Expected "${test.expected}"`, 'gray')
  }
})

// Test location normalization
testSection('Testing Location Normalization')

const locationTests = [
  { input: "Remote", expected: "remote" },
  { input: "Anywhere", expected: "remote" },
  { input: "Work from Home", expected: "remote" },
  { input: "New York, NY", expected: "new york ny" },
  { input: "Greater Boston Area", expected: "boston" },
  { input: "San Francisco Bay Area", expected: "san francisco bay" },
  { input: "Metropolitan Dallas", expected: "dallas" },
  { input: "Downtown Seattle", expected: "seattle" },
]

locationTests.forEach(test => {
  const result = normalizeLocation(test.input)
  const passed = assert(
    result === test.expected,
    `"${test.input}" → "${result}" ${result !== test.expected ? `(expected: "${test.expected}")` : ''}`
  )
  if (!passed) {
    log(`  Details: Got "${result}", Expected "${test.expected}"`, 'gray')
  }
})

// Test similarity scoring
testSection('Testing Similarity Scoring')

const similarityTests = [
  {
    name: "Children's Health vs Children's Medical Center",
    job1: { title: "Data Engineer", company: "Children's Health", location: "Dallas, TX" },
    job2: { title: "Data Engineer", company: "Children's Medical Center", location: "Dallas, TX" },
    expectedMin: 85,
    shouldBeDuplicate: true
  },
  {
    name: "ABC Inc vs ABC Corporation",
    job1: { title: "Software Engineer", company: "ABC Inc", location: "NYC" },
    job2: { title: "Software Engineer", company: "ABC Corporation", location: "NYC" },
    expectedMin: 90,
    shouldBeDuplicate: true
  },
  {
    name: "Senior vs Regular title with same company",
    job1: { title: "Senior Software Engineer", company: "Google", location: "Mountain View" },
    job2: { title: "Software Engineer", company: "Google", location: "Mountain View" },
    expectedMin: 85,
    shouldBeDuplicate: true
  },
  {
    name: "Different companies, same title",
    job1: { title: "Data Analyst", company: "Facebook", location: "Menlo Park" },
    job2: { title: "Data Analyst", company: "Google", location: "Mountain View" },
    expectedMin: 0,
    shouldBeDuplicate: false
  },
  {
    name: "Tech Co variations",
    job1: { title: "DevOps Engineer", company: "Tech Co., LLC", location: "Remote" },
    job2: { title: "DevOps Engineer", company: "Tech Company", location: "Anywhere" },
    expectedMin: 85,
    shouldBeDuplicate: true
  },
  {
    name: "Medical Center abbreviations",
    job1: { title: "Nurse", company: "Med Ctr", location: "Houston" },
    job2: { title: "Nurse", company: "Medical Center", location: "Houston" },
    expectedMin: 90,
    shouldBeDuplicate: true
  },
]

similarityTests.forEach(test => {
  const similarity = calculateJobSimilarity(test.job1, test.job2)
  const isDuplicate = areJobsSimilar(test.job1, test.job2, 85)
  
  const similarityPassed = assert(
    similarity >= test.expectedMin,
    `${test.name}: ${similarity}% similarity (min expected: ${test.expectedMin}%)`
  )
  
  const duplicatePassed = assert(
    isDuplicate === test.shouldBeDuplicate,
    `  Duplicate detection: ${isDuplicate ? 'YES' : 'NO'} (expected: ${test.shouldBeDuplicate ? 'YES' : 'NO'})`
  )
  
  if (!similarityPassed || !duplicatePassed) {
    log(`  Job 1: ${JSON.stringify(test.job1)}`, 'gray')
    log(`  Job 2: ${JSON.stringify(test.job2)}`, 'gray')
    log(`  Normalized 1: ${generateJobSignature(test.job1.title, test.job1.company, test.job1.location)}`, 'gray')
    log(`  Normalized 2: ${generateJobSignature(test.job2.title, test.job2.company, test.job2.location)}`, 'gray')
  }
})

// Test finding similar jobs in a collection
testSection('Testing Find Similar Jobs')

const jobCollection = [
  { id: '1', title: 'Software Engineer', company: 'Google', location: 'Mountain View' },
  { id: '2', title: 'Senior Software Engineer', company: 'Google LLC', location: 'Mountain View, CA' },
  { id: '3', title: 'Data Engineer', company: "Children's Health", location: 'Dallas' },
  { id: '4', title: 'Data Engineer', company: "Children's Medical Center", location: 'Dallas, TX' },
  { id: '5', title: 'Product Manager', company: 'Meta', location: 'Menlo Park' },
  { id: '6', title: 'DevOps Engineer', company: 'Amazon', location: 'Seattle' },
]

const targetJob = { 
  title: 'Sr Software Engineer', 
  company: 'Google Corporation', 
  location: 'Mountain View' 
}

const similarJobs = findSimilarJobs(targetJob, jobCollection, 80)

log(`\nSearching for jobs similar to:`, 'yellow')
log(`  ${JSON.stringify(targetJob)}`, 'gray')
log(`\nFound ${similarJobs.length} similar job(s):`, 'yellow')

similarJobs.forEach(({ job, similarity }) => {
  log(`  [${similarity}%] ID: ${job.id} - ${job.title} at ${job.company}`, 'green')
})

// Test edge cases
testSection('Testing Edge Cases')

const edgeCases = [
  {
    name: "Empty strings",
    job1: { title: "", company: "", location: "" },
    job2: { title: "", company: "", location: "" },
    expectedSimilarity: 100
  },
  {
    name: "One empty, one filled",
    job1: { title: "Engineer", company: "Google", location: "NYC" },
    job2: { title: "", company: "", location: "" },
    expectedSimilarity: 0
  },
  {
    name: "Special characters",
    job1: { title: "C++ Developer", company: "@Tech!", location: "NYC #1" },
    job2: { title: "C Developer", company: "Tech", location: "NYC 1" },
    expectedSimilarity: 70
  },
  {
    name: "Very long vs short names",
    job1: { title: "A", company: "B", location: "C" },
    job2: { title: "A very long job title with many words and descriptions", company: "B", location: "C" },
    expectedSimilarity: 0 // Should be low due to length difference
  },
]

edgeCases.forEach(test => {
  const similarity = calculateJobSimilarity(test.job1, test.job2)
  const passed = assert(
    Math.abs(similarity - test.expectedSimilarity) <= 10, // Allow 10% variance
    `${test.name}: ${similarity}% (expected: ~${test.expectedSimilarity}%)`
  )
  if (!passed) {
    log(`  Job 1: ${JSON.stringify(test.job1)}`, 'gray')
    log(`  Job 2: ${JSON.stringify(test.job2)}`, 'gray')
  }
})

// Summary
testSection('Test Summary')

const totalTests = 
  companyTests.length + 
  titleTests.length + 
  locationTests.length + 
  similarityTests.length * 2 + 
  edgeCases.length + 
  1 // find similar jobs

log(`\nAll tests completed!`, 'cyan')
log(`Run these tests after any changes to the similarity algorithm.`, 'yellow')
log(`\nTo test with real data, use:`, 'blue')
log(`  - Migration dry run: curl -X GET "http://localhost:3000/api/cron/migrate-batch-jobs?dryRun=true"`, 'gray')
log(`  - Debug endpoint: curl -X GET "http://localhost:3000/api/admin/debug-duplicates?company=children&title=data"`, 'gray')