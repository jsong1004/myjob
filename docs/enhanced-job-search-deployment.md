# Enhanced Job Search System - Deployment Guide

This guide covers the deployment and configuration of the enhanced job search system with batch processing and advanced filtering.

## Overview

The enhanced job search system includes:
- **Batch Processing**: Nightly scraping of popular job titles
- **Advanced Filtering**: Multi-criteria job filtering with UI
- **Enhanced Search API**: Batch-first search with live API fallback
- **Admin Panel**: Monitoring and management of batch operations

## Deployment Steps

### 1. Environment Variables

Ensure the following environment variables are configured in your deployment platform:

```env
# Core Application
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (required for batch processing)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...} # JSON string

# External APIs
SERPAPI_KEY=your_serpapi_key
OPENROUTER_API_KEY=your_openrouter_key
THE_COMPANIES_API_TOKEN=your_companies_api_token

# Cron Security (recommended for production)
CRON_SECRET=your_secure_random_string
```

### 2. Database Indexes

Deploy the required Firestore indexes using Firebase CLI:

```bash
# Deploy indexes to Firestore
firebase deploy --only firestore:indexes

# Or manually create indexes via Firebase Console
# See docs/firestore-indexes.md for details
```

**Required Collections:**
- `batch_jobs` - Stores scraped job data
- `batch_runs` - Tracks batch processing history

### 3. Google Cloud Functions Deployment Configuration

The system can be deployed to Google Cloud Platform using Cloud Functions for serverless execution:

#### Prerequisites

1. **Install Google Cloud CLI**:
```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

2. **Enable Required APIs**:
```bash
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable cloudrun.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

#### Configuration Files

**functions-framework.json** (create in project root):
```json
{
  "functions": [
    {
      "name": "batch-process",
      "source": "app/api/batch/process",
      "runtime": "nodejs20",
      "timeout": "300s",
      "memory": "512MB"
    },
    {
      "name": "cron-batch-jobs", 
      "source": "app/api/cron/batch-jobs",
      "runtime": "nodejs20",
      "timeout": "300s",
      "memory": "256MB"
    },
    {
      "name": "search-enhanced",
      "source": "app/api/jobs/search-enhanced",
      "runtime": "nodejs20",
      "timeout": "30s",
      "memory": "256MB"
    },
    {
      "name": "filters",
      "source": "app/api/jobs/filters",
      "runtime": "nodejs20",
      "timeout": "10s",
      "memory": "128MB"
    },
    {
      "name": "admin-batch-runs",
      "source": "app/api/admin/batch-runs",
      "runtime": "nodejs20",
      "timeout": "30s",
      "memory": "128MB"
    }
  ]
}
```

### 4. Deploy to Google Cloud Functions

#### Option 1: Individual Function Deployment

```bash
# Set your project ID
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# Deploy batch processing function
gcloud functions deploy batch-process \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --timeout 300s \
  --memory 512MB \
  --source app/api/batch/process \
  --entry-point handler \
  --set-env-vars "FIREBASE_SERVICE_ACCOUNT_KEY=$FIREBASE_SERVICE_ACCOUNT_KEY,SERPAPI_KEY=$SERPAPI_KEY,OPENROUTER_API_KEY=$OPENROUTER_API_KEY"

# Deploy enhanced search function
gcloud functions deploy search-enhanced \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --timeout 30s \
  --memory 256MB \
  --source app/api/jobs/search-enhanced \
  --entry-point handler \
  --set-env-vars "FIREBASE_SERVICE_ACCOUNT_KEY=$FIREBASE_SERVICE_ACCOUNT_KEY,SERPAPI_KEY=$SERPAPI_KEY,OPENROUTER_API_KEY=$OPENROUTER_API_KEY"

# Deploy cron batch job function
gcloud functions deploy cron-batch-jobs \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --timeout 300s \
  --memory 256MB \
  --source app/api/cron/batch-jobs \
  --entry-point handler \
  --set-env-vars "FIREBASE_SERVICE_ACCOUNT_KEY=$FIREBASE_SERVICE_ACCOUNT_KEY,CRON_SECRET=$CRON_SECRET"

# Deploy filters function
gcloud functions deploy filters \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --timeout 10s \
  --memory 128MB \
  --source app/api/jobs/filters \
  --entry-point handler \
  --set-env-vars "FIREBASE_SERVICE_ACCOUNT_KEY=$FIREBASE_SERVICE_ACCOUNT_KEY"

# Deploy admin batch runs function
gcloud functions deploy admin-batch-runs \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --timeout 30s \
  --memory 128MB \
  --source app/api/admin/batch-runs \
  --entry-point handler \
  --set-env-vars "FIREBASE_SERVICE_ACCOUNT_KEY=$FIREBASE_SERVICE_ACCOUNT_KEY"
```

#### Option 2: Cloud Run Deployment (Recommended for Next.js)

The project is already configured for Google Cloud deployment using Cloud Build and Cloud Run. 

**Using Cloud Build (Current Configuration)**:
```bash
# The project includes cloudbuild.yaml with the following configuration:
# - Project: myresume-457817
# - Region: us-west1  
# - Service: myjob-service
# - Artifact Registry: us-west1-docker.pkg.dev/myresume-457817/myjob-service

# Deploy using Cloud Build trigger or manual build
gcloud builds submit --config cloudbuild.yaml .

# Or trigger from GitHub integration (if set up)
git push origin main  # Triggers automatic deployment
```

**Manual Cloud Run Deployment**:
```bash
# Alternative: Direct deployment to Cloud Run
gcloud run deploy myjob-service \
  --source . \
  --platform managed \
  --region us-west1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --set-env-vars "NODE_ENV=production" \
  --update-secrets "FIREBASE_SERVICE_ACCOUNT_KEY=projects/711582759542/secrets/ServiceAccountKey:latest,OPENROUTER_API_KEY=projects/711582759542/secrets/OPENROUTER_API_KEY:latest,SERPAPI_KEY=projects/711582759542/secrets/SERPAPI_KEY:latest,THE_COMPANIES_API_TOKEN=projects/711582759542/secrets/THE_COMPANIES_API_TOKEN:latest,CRON_SECRET=projects/711582759542/secrets/CRON_SECRET:latest"
```

### 5. Set up Cloud Scheduler for Batch Jobs

**Automated Setup** (Recommended):
```bash
# Use the provided setup script
./scripts/setup-cloud-scheduler.sh
```

**Manual Setup**:
```bash
# Enable Cloud Scheduler API
gcloud services enable cloudscheduler.googleapis.com

# Get your Cloud Run service URL
SERVICE_URL=$(gcloud run services describe myjob-service --region=us-west1 --format="value(status.url)")

# Create the scheduler job
gcloud scheduler jobs create http batch-jobs-nightly \
  --location=us-west1 \
  --schedule="0 2 * * 1-5" \
  --uri="$SERVICE_URL/api/cron/batch-jobs" \
  --http-method=GET \
  --headers="Authorization=Bearer $(gcloud secrets versions access latest --secret='CRON_SECRET')" \
  --time-zone="America/Los_Angeles" \
  --description="Nightly batch job processing for job search system" \
  --attempt-deadline="300s" \
  --max-retry-attempts=3

# Verify the job was created
gcloud scheduler jobs describe batch-jobs-nightly --location=us-west1

# Test the job manually
gcloud scheduler jobs run batch-jobs-nightly --location=us-west1
```

### 6. Initial Batch Data Setup

After deployment, initialize the system:

1. **Admin Access**: Login with admin email (`jsong@koreatous.com`)
2. **Navigate to Admin Panel**: `/admin` → "Batch Jobs" tab
3. **Run Initial Batch**: Click "Run Now" to populate initial job data
4. **Verify Cron Schedule**: Check that nightly runs are scheduled

## System Architecture

### API Endpoints

#### Batch Processing
- `POST /api/batch/process` - Manual batch job processing
- `GET/POST /api/cron/batch-jobs` - Scheduled batch processing

#### Enhanced Search
- `POST /api/jobs/search-enhanced` - Batch-first job search with filters
- `GET /api/jobs/filters` - Dynamic filter options with job counts

#### Admin
- `GET /api/admin/batch-runs` - Batch processing statistics
- `POST /api/admin/batch-runs` - Create batch run records

### Components

#### Search Interface
- `EnhancedJobSearch` - Main search component with basic/advanced modes
- `AdvancedJobFilters` - Comprehensive filtering UI
- `QuickFilters` - Pre-configured filter shortcuts
- `ActiveFilters` - Display and manage active filters

#### Admin Interface
- `BatchJobsAdmin` - Complete batch processing management
- Admin dashboard integration at `/admin`

## Monitoring and Maintenance

### Performance Monitoring
- **Search Performance**: Track batch hit rates and execution times
- **Batch Processing**: Monitor nightly run success rates
- **API Limits**: Watch SerpAPI usage to avoid rate limits

### Database Maintenance
- **Index Usage**: Monitor Firestore index performance
- **Data Cleanup**: Consider retention policies for old batch data
- **Cost Optimization**: Review and optimize expensive queries

### Troubleshooting

#### Common Issues

**1. Batch Processing Failures**
- Check SerpAPI key and usage limits
- Verify Firebase Admin service account permissions
- Review Google Cloud Function timeout settings
- Check Cloud Function memory allocation

**2. Search Performance Issues**
- Ensure Firestore indexes are deployed
- Monitor complex filter query performance
- Check batch data availability
- Review Cloud Function cold start times

**3. Cron Job Not Running**
- Verify `CRON_SECRET` environment variable
- Check Cloud Scheduler configuration
- Review Cloud Function execution logs
- Ensure proper IAM permissions for Cloud Scheduler

#### Debug Endpoints

For troubleshooting, use these admin endpoints:

```bash
# For Cloud Functions deployment:
# Check batch runs
curl -H "Authorization: Bearer $TOKEN" https://your-region-your-project.cloudfunctions.net/admin-batch-runs

# Manual batch processing (dry run)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -d '{"dryRun": true}' \
  https://your-region-your-project.cloudfunctions.net/batch-process

# Test enhanced search
curl -X POST -H "Content-Type: application/json" \
  -d '{"query": "software engineer", "location": "Seattle", "limit": 10}' \
  https://your-region-your-project.cloudfunctions.net/search-enhanced

# For Cloud Run deployment:
# Check batch runs
curl -H "Authorization: Bearer $TOKEN" https://your-cloud-run-url/api/admin/batch-runs

# Manual batch processing (dry run)
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -d '{"dryRun": true}' \
  https://your-cloud-run-url/api/batch/process

# Test enhanced search
curl -X POST -H "Content-Type: application/json" \
  -d '{"query": "software engineer", "location": "Seattle", "limit": 10}' \
  https://your-cloud-run-url/api/jobs/search-enhanced
```

## Feature Usage

### For Users
1. **Basic Search**: Use the "Basic Search" tab for simple queries
2. **Advanced Search**: Switch to "Advanced Search" for detailed filtering
3. **Quick Filters**: Use pre-configured filters for common searches
4. **Results**: View enhanced job results with batch/live source indicators

### For Admins
1. **Batch Management**: Monitor nightly batch processing via admin panel
2. **Manual Triggers**: Run batch processing manually for testing
3. **Performance Metrics**: Track search performance and system health
4. **Configuration**: Review system settings and schedule

## System Limits

### API Constraints
- **SerpAPI**: 100 searches/month on free plan, 1 request/second rate limit
- **OpenRouter**: Usage-based pricing for AI matching
- **Google Cloud Functions**: 540-second timeout for batch processing (9 minutes max)
- **Google Cloud Run**: No timeout limit, better for long-running processes
- **Firestore**: Usage-based pricing, optimize query patterns

### Performance Expectations
- **Batch Hit Rate**: 70-90% for common job searches
- **Search Response**: <3 seconds with mixed batch/live results
- **Batch Processing**: ~3-5 minutes for full nightly run
- **Filter Loading**: <1 second for dynamic options

## Success Metrics

### User Experience
- **Search Speed**: <3s average response time
- **Result Relevance**: >80% user satisfaction with filtering
- **Cache Effectiveness**: >70% batch hit rate

### System Health
- **Uptime**: >99% availability for search functionality
- **Batch Success**: >95% successful nightly runs
- **Error Rates**: <1% API failure rate

## Next Steps

After successful deployment:

1. **Monitor Usage**: Track search patterns and optimize popular queries
2. **Expand Locations**: Add more cities to batch processing
3. **Enhance Filters**: Add more sophisticated filtering options
4. **Performance Tuning**: Optimize slow queries based on usage data
5. **User Feedback**: Collect feedback on search experience and results