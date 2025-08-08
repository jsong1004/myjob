# Job Deduplication System

This document describes the intelligent job deduplication system implemented to prevent and clean up duplicate job listings in the myJob platform.

## Overview

The job deduplication system uses advanced similarity detection algorithms to identify and eliminate duplicate job listings that appear from different sources with slight variations in company names, job titles, or other details.

## Problem Addressed

Previously, the system would show multiple listings for the same job when:
- Different job boards listed the same position with slight company name variations (e.g., "Children's Health" vs "Children's Medical Center")
- Job titles had minor differences in seniority levels or formatting
- The same job was scraped multiple times from different sources

## Solution Architecture

### 1. Job Similarity Detection Engine

Located in `lib/utils/job-similarity.ts`, this utility provides:

#### Company Name Normalization
- Removes punctuation and special characters
- Converts to lowercase
- Removes common suffixes (Inc, LLC, Corp, Ltd, Co, Company, etc.)
- Expands abbreviations (Med → Medical, Ctr → Center, Tech → Technology, etc.)
- Handles international variations and common business terms

#### Job Title Normalization  
- Removes seniority indicators (Senior, Jr, I, II, III, Lead, Principal, etc.)
- Standardizes common variations
- Removes parenthetical content (often location or department specific)
- Normalizes spacing and punctuation

#### Location Normalization
- Standardizes remote work indicators (Remote, Anywhere, Work from Home → remote)
- Removes descriptive terms (Greater, Metro, Downtown, etc.)
- Normalizes city/state formatting

#### Content Signature Generation
Creates unique signatures by combining normalized title, company, and location for fast duplicate detection.

#### Similarity Scoring Algorithm
Uses weighted scoring system:
- **Company similarity**: 45% weight
- **Job title similarity**: 35% weight  
- **Location similarity**: 20% weight

Returns similarity score from 0-100%, with configurable threshold (default: 85%) for duplicate detection.

### 2. Integration Points

The similarity detection is integrated at three key stages:

#### A. Migration Stage (`app/api/cron/migrate-batch-jobs/route.ts`)
- **Purpose**: Prevents duplicates when migrating from `batch_jobs` to `jobs` collection
- **Process**: 
  - Builds similarity index from existing jobs
  - Checks each batch job for similarity before migration
  - Skips jobs exceeding similarity threshold
  - Logs detailed similarity information
- **Configuration**: Similarity threshold configurable via `similarityThreshold` parameter

#### B. Batch Processing Stage (`app/api/batch/process/route.ts`)  
- **Purpose**: Prevents duplicates during nightly job scraping from SerpAPI
- **Process**:
  - Builds similarity index from recent jobs (last 7 days)
  - Checks new jobs against existing ones
  - Updates similarity index in real-time during batch processing
  - Skips similar jobs before saving to database
- **Configuration**: Built-in 85% similarity threshold

#### C. Runtime Deduplication (`app/api/jobs/search/route.ts`)
- **Purpose**: Final deduplication layer for search results
- **Process**: Uses Map-based deduplication by job ID to ensure unique results
- **Fallback**: Provides additional safety net for any duplicates that make it through

### 3. Database Cleanup System

#### Deduplication API (`app/api/admin/deduplicate-jobs/route.ts`)
Comprehensive API for cleaning existing duplicates in the `jobs` collection.

**Features:**
- **Smart Duplicate Detection**: Finds both exact matches and high-similarity duplicates
- **Preservation Logic**: Keeps older jobs when duplicates are found
- **Safety Features**: Dry run mode, authentication requirements, detailed logging
- **Batch Processing**: Efficiently handles large datasets
- **Audit Trail**: Logs all deduplication operations

**Usage:**
```bash
# Preview duplicates (safe - no changes)
curl "http://localhost:3000/api/admin/deduplicate-jobs?dryRun=true"

# Remove duplicates (requires authentication)
curl -X POST "http://localhost:3000/api/admin/deduplicate-jobs" \
  -H "Authorization: Bearer FIREBASE_TOKEN"
```

**Configuration Options:**
- `similarityThreshold`: Similarity percentage for duplicate detection (default: 85%)
- `onlyRecent`: Only process jobs from last 30 days (default: false)
- `batchSize`: Jobs to process per batch (default: 1000)

## Testing & Debugging Tools

### 1. Similarity Test Script (`test-similarity.ts`)
Comprehensive test suite for validating similarity algorithms:
```bash
npx tsx test-similarity.ts
```

Tests include:
- Company name normalization accuracy
- Job title normalization
- Location standardization  
- Similarity scoring with known duplicates
- Edge cases and boundary conditions

### 2. Interactive Testing API (`app/api/admin/test-similarity/route.ts`)
RESTful endpoint for testing similarity between job pairs:

```bash
# Test with custom jobs
curl -X POST http://localhost:3000/api/admin/test-similarity \
  -H "Content-Type: application/json" \
  -d '{
    "job1": {"title": "Data Engineer", "company": "Children'\''s Health", "location": "Dallas"},
    "job2": {"title": "Data Engineer", "company": "Children'\''s Medical Center", "location": "Dallas"},
    "threshold": 85
  }'

# Test with default examples
curl http://localhost:3000/api/admin/test-similarity

# Test against real database
curl http://localhost:3000/api/admin/test-similarity?testDb=true
```

### 3. Enhanced Debug Endpoint (`app/api/admin/debug-duplicates/route.ts`)
Analyzes specific job patterns in the database:

```bash
# Search for specific duplicates
curl "http://localhost:3000/api/admin/debug-duplicates?company=children&title=data&threshold=85"
```

Provides detailed analysis:
- Exact duplicates (identical composite keys)
- Signature duplicates (identical normalized signatures) 
- Similarity matches with scores
- Summary statistics

## Configuration

### Similarity Thresholds
- **Conservative (90%+)**: Only catches very similar jobs
- **Standard (85%)**: Recommended default, catches most duplicates
- **Aggressive (70-80%)**: Catches more variations but may over-deduplicate

### Performance Tuning
- **Batch sizes**: Adjust based on database size and performance needs
- **Time windows**: Use `onlyRecent` for incremental cleanup
- **Caching**: Similarity indexes are built in-memory for performance

## Monitoring & Maintenance

### Logging
All deduplication operations are logged with:
- Timestamp and execution time
- Number of jobs processed and duplicates found
- Similarity scores and reasoning
- Performance metrics

### Audit Trail
Database collections track:
- `migration_runs`: Migration deduplication history
- `deduplication_runs`: Manual cleanup operations  
- `batch_runs`: Batch processing statistics

### Performance Metrics
Current performance (as of implementation):
- **2,636 jobs analyzed** in ~70 seconds
- **275 duplicates identified and removed** (10.4% duplicate rate)
- Memory efficient processing with batch operations

## Examples of Detected Duplicates

### Company Name Variations
- "Children's Health" ↔ "Children's Medical Center" (89% similar)
- "ABC Inc." ↔ "ABC Corporation" (95% similar)
- "Tech Co., LLC" ↔ "Tech Company" (92% similar)

### Job Title Variations  
- "Senior Software Engineer" ↔ "Software Engineer III" (88% similar)
- "Data Scientist" ↔ "Sr. Data Scientist" (91% similar)
- "DevOps Engineer" ↔ "Lead DevOps Engineer" (86% similar)

### Location Variations
- "Remote" ↔ "Anywhere" ↔ "Work from Home" (100% similar)
- "New York, NY" ↔ "NYC" (87% similar)
- "San Francisco Bay Area" ↔ "SF Bay Area" (91% similar)

## Implementation Results

### Before Implementation
- Multiple duplicate job listings in search results
- User confusion from seeing the same job multiple times
- Database bloat from redundant job records
- Poor user experience

### After Implementation  
- **275 duplicate jobs removed** from existing database
- **Clean search results** with unique job listings
- **Automatic prevention** of future duplicates
- **Improved user experience** and data quality

## Future Enhancements

### Potential Improvements
1. **Machine Learning Enhancement**: Use ML models for better similarity detection
2. **Dynamic Thresholds**: Adjust similarity thresholds based on job categories
3. **User Feedback Integration**: Allow users to report missed duplicates
4. **Real-time Processing**: Process duplicates as they're added rather than in batches
5. **Advanced Normalization**: Handle more complex company name variations and acquisitions

### Maintenance Tasks
1. **Regular Cleanup**: Schedule periodic deduplication runs
2. **Threshold Tuning**: Monitor and adjust similarity thresholds based on results
3. **Performance Optimization**: Optimize algorithms as database grows
4. **Algorithm Updates**: Enhance normalization rules based on new patterns

## Troubleshooting

### Common Issues

#### High False Positive Rate
- **Symptom**: Different jobs being marked as duplicates
- **Solution**: Increase similarity threshold, review normalization rules

#### Missed Duplicates
- **Symptom**: Obvious duplicates not being detected
- **Solution**: Decrease similarity threshold, enhance normalization algorithms

#### Performance Issues  
- **Symptom**: Slow deduplication processing
- **Solution**: Reduce batch sizes, use `onlyRecent` flag, optimize indexes

### Debug Commands
```bash
# Test similarity between specific jobs
curl -X POST http://localhost:3000/api/admin/test-similarity -d '...'

# Analyze specific company patterns
curl "http://localhost:3000/api/admin/debug-duplicates?company=TARGET&title=TITLE"

# Preview deduplication results
curl "http://localhost:3000/api/admin/deduplicate-jobs?dryRun=true"

# Run comprehensive similarity tests
npx tsx test-similarity.ts
```

## Security Considerations

### Authentication Requirements
- POST endpoints require Firebase authentication
- GET endpoints with `dryRun=false` should be restricted
- Admin-only access for deduplication operations

### Data Safety
- Dry run mode for testing
- Detailed logging for audit trails
- Batch processing limits to prevent resource exhaustion
- Preservation of older jobs when deduplicating

## API Reference

### Primary Endpoints

#### `GET /api/admin/deduplicate-jobs`
- **Purpose**: Analyze or clean duplicate jobs
- **Parameters**: `dryRun`, `similarityThreshold`, `onlyRecent`, `batchSize`
- **Authentication**: None (for analysis), Required (for deletion)

#### `POST /api/admin/test-similarity`  
- **Purpose**: Test similarity between two jobs
- **Body**: `{job1, job2, threshold}`
- **Authentication**: None

#### `GET /api/admin/debug-duplicates`
- **Purpose**: Debug specific duplicate patterns  
- **Parameters**: `company`, `title`, `threshold`
- **Authentication**: None

#### `GET /api/cron/migrate-batch-jobs`
- **Purpose**: Migrate batch jobs with deduplication
- **Parameters**: `dryRun`, `similarityThreshold`, `force`
- **Authentication**: None (cron service)

### Response Formats

All endpoints return standardized JSON responses with:
- `success`: Boolean indicating operation success
- `message`: Human-readable status message  
- `executionTime`: Processing time in milliseconds
- `data`: Endpoint-specific response data
- `errors`: Array of error messages if any

## Conclusion

The job deduplication system significantly improves data quality and user experience by intelligently identifying and eliminating duplicate job listings. The system operates at multiple stages to prevent duplicates from entering the database and provides tools to clean existing duplicates.

The implementation has proven effective, removing 275 duplicates (10.4% of the database) while maintaining data integrity and providing comprehensive debugging and monitoring capabilities.