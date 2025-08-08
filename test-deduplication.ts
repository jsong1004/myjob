#!/usr/bin/env npx tsx
/**
 * Test script to check deduplication API
 * Run with: npx tsx test-deduplication.ts
 */

async function testDeduplication() {
  try {
    console.log('🔍 Testing deduplication API...')
    
    // Test dry run first
    const response = await fetch('http://localhost:3000/api/admin/deduplicate-jobs?dryRun=true&similarityThreshold=85', {
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
    
    console.log('\n📊 Deduplication Analysis Results:')
    console.log(`Total jobs analyzed: ${result.totalJobs}`)
    console.log(`Duplicates found: ${result.duplicatesFound}`)
    console.log(`Duplicate groups: ${result.details?.totalGroups || 0}`)
    console.log(`Execution time: ${result.executionTime}ms`)
    
    if (result.details?.duplicateGroups && result.details.duplicateGroups.length > 0) {
      console.log('\n🔍 Sample duplicate groups:')
      result.details.duplicateGroups.slice(0, 5).forEach((group: any, index: number) => {
        console.log(`\nGroup ${index + 1} (${group.similarity}% similar, ${group.reason}):`)
        console.log(`  ✅ KEEP: "${group.keepJob.title}" at "${group.keepJob.company}"`)
        group.removedJobs.forEach((job: any) => {
          console.log(`  ❌ REMOVE: "${job.title}" at "${job.company}" (${job.similarity || group.similarity}% similar)`)
        })
      })
    } else {
      console.log('\n✨ No duplicates found!')
    }
    
    if (result.duplicatesFound > 0) {
      console.log(`\n⚠️  Found ${result.duplicatesFound} duplicates to remove.`)
      console.log('To actually remove them, you would run:')
      console.log('curl -X POST "http://localhost:3000/api/admin/deduplicate-jobs" \\')
      console.log('  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"')
    }
    
  } catch (error) {
    console.error('❌ Error testing deduplication:', error)
  }
}

// Run the test
testDeduplication()