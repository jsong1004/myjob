#!/usr/bin/env npx tsx
/**
 * Script to actually clean up duplicate jobs
 * Run with: npx tsx cleanup-duplicates.ts
 */

async function cleanupDuplicates() {
  try {
    console.log('🧹 Starting duplicate cleanup...')
    console.log('⚠️  This will actually DELETE duplicate jobs from the database!')
    
    // Ask for confirmation
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to proceed...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    console.log('🔄 Proceeding with cleanup...')
    
    // For testing, we'll call the GET endpoint with dryRun=false
    // In production, you'd use the POST endpoint with proper auth
    const response = await fetch('http://localhost:3000/api/admin/deduplicate-jobs?dryRun=false&similarityThreshold=85', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error('❌ API request failed:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error details:', errorText)
      return
    }
    
    const result = await response.json()
    
    console.log('\n🎉 Cleanup Results:')
    console.log(`Total jobs analyzed: ${result.totalJobs}`)
    console.log(`Duplicates found: ${result.duplicatesFound}`)
    console.log(`Duplicates removed: ${result.duplicatesRemoved}`)
    console.log(`Execution time: ${result.executionTime}ms`)
    
    if (result.success && result.duplicatesRemoved > 0) {
      console.log(`\n✅ Successfully removed ${result.duplicatesRemoved} duplicate jobs!`)
      console.log('You should now see fewer duplicates in your job search results.')
    } else if (result.duplicatesFound === 0) {
      console.log('\n✨ No duplicates found to remove.')
    } else {
      console.log('\n⚠️  Cleanup may not have completed successfully.')
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  }
}

// Run the cleanup
cleanupDuplicates()