# Firestore Database Indexes

This document outlines the required Firestore database indexes for optimal performance of the enhanced job search system with batch processing.

## Required Indexes

### batch_jobs Collection

#### 1. Basic Query Index
**Fields**: `batchId` (Ascending), `location` (Ascending)
**Query coverage**: Location-based batch job queries
```javascript
// Example query this index supports:
db.collection('batch_jobs')
  .where('batchId', '==', '2025-07-22')
  .where('location', '==', 'Seattle, Washington, United States')
```

#### 2. Search Query Index
**Fields**: `searchQuery` (Ascending), `postedAt` (Descending)
**Query coverage**: Search term filtering with recency sorting
```javascript
// Example query this index supports:
db.collection('batch_jobs')
  .where('searchQuery', '==', 'software engineer')
  .orderBy('postedAt', 'desc')
```

#### 3. Experience Level Filter Index
**Fields**: `experienceLevel` (Ascending), `location` (Ascending), `postedAt` (Descending)
**Query coverage**: Experience-based filtering with location and sorting
```javascript
// Example query this index supports:
db.collection('batch_jobs')
  .where('experienceLevel', '==', 'senior')
  .where('location', '==', 'Seattle, Washington, United States')
  .orderBy('postedAt', 'desc')
```

#### 4. Job Type Filter Index
**Fields**: `jobType` (Ascending), `workArrangement` (Ascending), `postedAt` (Descending)
**Query coverage**: Job type and work arrangement filtering
```javascript
// Example query this index supports:
db.collection('batch_jobs')
  .where('jobType', '==', 'full-time')
  .where('workArrangement', '==', 'remote')
  .orderBy('postedAt', 'desc')
```

#### 5. Salary Range Index
**Fields**: `salaryMin` (Ascending), `salaryMax` (Ascending), `location` (Ascending)
**Query coverage**: Salary-based filtering with location
```javascript
// Example query this index supports:
db.collection('batch_jobs')
  .where('salaryMin', '>=', 100000)
  .where('location', '==', 'San Francisco, California, United States')
  .orderBy('salaryMin', 'asc')
```

#### 6. Company Size Filter Index
**Fields**: `companySize` (Ascending), `experienceLevel` (Ascending), `postedAt` (Descending)
**Query coverage**: Company size with experience level filtering
```javascript
// Example query this index supports:
db.collection('batch_jobs')
  .where('companySize', '==', 'large')
  .where('experienceLevel', '==', 'senior')
  .orderBy('postedAt', 'desc')
```

#### 7. Comprehensive Filter Index
**Fields**: `location` (Ascending), `experienceLevel` (Ascending), `jobType` (Ascending), `postedAt` (Descending)
**Query coverage**: Multi-filter queries with location, experience, and job type
```javascript
// Example query this index supports:
db.collection('batch_jobs')
  .where('location', '==', 'New York, New York, United States')
  .where('experienceLevel', '==', 'mid-level')
  .where('jobType', '==', 'full-time')
  .orderBy('postedAt', 'desc')
```

### batch_runs Collection

#### 1. Recent Runs Index
**Fields**: `completedAt` (Descending)
**Query coverage**: Fetching recent batch runs for admin panel
```javascript
// Example query this index supports:
db.collection('batch_runs')
  .orderBy('completedAt', 'desc')
  .limit(20)
```

#### 2. Batch Performance Index
**Fields**: `batchId` (Ascending), `completedAt` (Descending)
**Query coverage**: Historical batch performance analysis
```javascript
// Example query this index supports:
db.collection('batch_runs')
  .where('batchId', '>=', '2025-07-01')
  .orderBy('batchId', 'asc')
  .orderBy('completedAt', 'desc')
```

## Creating Indexes

### Via Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to Firestore Database > Indexes
4. Click "Create Index" for each index above

### Via Firebase CLI
```bash
# Deploy indexes from firestore.indexes.json
firebase deploy --only firestore:indexes
```

### Via Firestore Rules and Indexes File
Create `firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "batch_jobs",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "batchId", "order": "ASCENDING"},
        {"fieldPath": "location", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "batch_jobs",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "searchQuery", "order": "ASCENDING"},
        {"fieldPath": "postedAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "batch_jobs",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "experienceLevel", "order": "ASCENDING"},
        {"fieldPath": "location", "order": "ASCENDING"},
        {"fieldPath": "postedAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "batch_jobs",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "jobType", "order": "ASCENDING"},
        {"fieldPath": "workArrangement", "order": "ASCENDING"},
        {"fieldPath": "postedAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "batch_jobs",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "salaryMin", "order": "ASCENDING"},
        {"fieldPath": "salaryMax", "order": "ASCENDING"},
        {"fieldPath": "location", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "batch_jobs",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "companySize", "order": "ASCENDING"},
        {"fieldPath": "experienceLevel", "order": "ASCENDING"},
        {"fieldPath": "postedAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "batch_jobs",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "location", "order": "ASCENDING"},
        {"fieldPath": "experienceLevel", "order": "ASCENDING"},
        {"fieldPath": "jobType", "order": "ASCENDING"},
        {"fieldPath": "postedAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "batch_runs",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "completedAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "batch_runs",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "batchId", "order": "ASCENDING"},
        {"fieldPath": "completedAt", "order": "DESCENDING"}
      ]
    }
  ],
  "fieldOverrides": []
}
```

## Performance Considerations

### Index Selection Strategy
- **High Priority**: Indexes 1, 2, and 7 (basic queries, search, comprehensive)
- **Medium Priority**: Indexes 3, 4, 6 (common filter combinations)
- **Low Priority**: Index 5 (salary filtering is less common)

### Query Optimization Tips
1. **Order matters**: Place equality filters before range filters
2. **Limit results**: Always use `.limit()` for paginated results
3. **Composite queries**: Use compound indexes for multi-field filters
4. **Range queries**: Only one range filter per query is allowed

### Monitoring
- Use Firebase Console to monitor query performance
- Set up alerts for queries requiring new indexes
- Regular review of unused indexes to optimize costs

## Index Maintenance
- Review and update indexes quarterly based on usage patterns
- Remove unused indexes to reduce storage costs
- Monitor index build times for large collections