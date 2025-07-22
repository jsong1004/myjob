# Google Cloud Setup Checklist for Enhanced Job Search System

Complete setup checklist for deploying the enhanced job search system to Google Cloud Platform.

## ✅ Pre-Deployment Checklist

### 1. Google Cloud Project Setup
- [ ] Google Cloud project created: `myresume-457817`
- [ ] Billing account linked to project
- [ ] Required APIs enabled:
  - [ ] Cloud Run API
  - [ ] Cloud Build API  
  - [ ] Cloud Scheduler API
  - [ ] Artifact Registry API
  - [ ] Secret Manager API
  - [ ] Firestore API

### 2. Secret Manager Configuration
Ensure all required secrets are stored in Google Cloud Secret Manager:

- [ ] `ServiceAccountKey` - Firebase service account JSON
- [ ] `OPENROUTER_API_KEY` - OpenRouter API key for AI services
- [ ] `SERPAPI_KEY` - SerpAPI key for job searches  
- [ ] `THE_COMPANIES_API_TOKEN` - Company information API token
- [ ] `GITHUB_TOKEN` - GitHub API token (if using GitHub features)
- [ ] `CRON_SECRET` - Secure random string for cron job authentication

**Create missing secrets**:
```bash
# Example: Create CRON_SECRET
openssl rand -base64 32 | gcloud secrets create CRON_SECRET --data-file=-
```

### 3. Firebase Configuration
- [ ] Firestore database created and configured
- [ ] Firebase Admin service account created and key stored in Secret Manager
- [ ] Firestore security rules configured
- [ ] Firestore indexes deployed: `firebase deploy --only firestore:indexes`

### 4. Artifact Registry Setup
- [ ] Docker repository created: `us-west1-docker.pkg.dev/myresume-457817/myjob-service`
- [ ] Proper IAM permissions for Cloud Build to push images

## 🚀 Deployment Steps

### 1. Deploy Application
**Option A: Using Cloud Build (Recommended)**
```bash
# Deploy with existing cloudbuild.yaml configuration
gcloud builds submit --config cloudbuild.yaml .
```

**Option B: Manual Deployment**
```bash
gcloud run deploy myjob-service \
  --source . \
  --platform managed \
  --region us-west1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2
```

### 2. Set Up Cloud Scheduler
```bash
# Run the automated setup script
./scripts/setup-cloud-scheduler.sh
```

### 3. Verify Deployment
- [ ] Cloud Run service is running: `gcloud run services list`
- [ ] Application accessible via URL
- [ ] Admin panel accessible at `/admin`
- [ ] Cloud Scheduler job created: `gcloud scheduler jobs list`

## 🧪 Testing & Validation

### 1. Basic Functionality Test
- [ ] Frontend loads without errors
- [ ] User authentication works (sign in/sign up)
- [ ] Basic job search returns results
- [ ] Enhanced search with filters works

### 2. Batch Processing Test
```bash
# Get your service URL
SERVICE_URL=$(gcloud run services describe myjob-service --region=us-west1 --format="value(status.url)")

# Test batch processing manually (dry run)
curl -X POST "$SERVICE_URL/api/batch/process" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true, "maxJobsPerQuery": 5}'
```

### 3. Admin Panel Test
- [ ] Access admin panel: `$SERVICE_URL/admin`
- [ ] Login with admin credentials
- [ ] Navigate to "Batch Jobs" tab
- [ ] Trigger manual batch run
- [ ] Verify batch processing statistics

### 4. Scheduled Job Test
```bash
# Manually trigger the scheduled job
gcloud scheduler jobs run batch-jobs-nightly --location=us-west1

# Check execution logs
gcloud logging read 'resource.type="cloud_scheduler_job" resource.labels.job_id="batch-jobs-nightly"' --limit=5
```

## 📊 Monitoring & Maintenance

### 1. Set Up Monitoring
- [ ] Enable Cloud Run logging
- [ ] Set up log-based metrics for batch processing
- [ ] Configure alerting for failed batch runs
- [ ] Monitor API usage for SerpAPI limits

### 2. Performance Monitoring
- [ ] Track search response times
- [ ] Monitor batch hit rates (target: >70%)
- [ ] Watch Cloud Run memory/CPU usage
- [ ] Review cold start performance

### 3. Cost Optimization
- [ ] Monitor Cloud Run usage and costs
- [ ] Review SerpAPI usage patterns
- [ ] Optimize batch processing schedule if needed
- [ ] Consider Cloud Run minimum instances for performance

## 🔧 Configuration Updates

### 1. Environment Variables
Current configuration includes:
- Firebase configuration (public keys)
- NODE_ENV=production
- All sensitive data via Secret Manager

### 2. Resource Allocation
Current settings:
- Memory: 2Gi
- CPU: 2 cores  
- Timeout: 300s (5 minutes)
- Concurrency: 80 requests per instance

### 3. Scaling Configuration
- Min instances: 0 (cost optimization)
- Max instances: 10 (prevent runaway costs)
- Auto-scaling based on request volume

## 🚨 Troubleshooting Guide

### Common Issues

**1. Deployment Failures**
- Check Cloud Build logs: `gcloud builds log`
- Verify all secrets exist in Secret Manager
- Ensure proper IAM permissions

**2. Batch Processing Issues**  
- Check Cloud Run logs: `gcloud run logs tail myjob-service --region=us-west1`
- Verify SerpAPI key and usage limits
- Test Firebase Admin connectivity

**3. Scheduler Not Running**
- Check scheduler job status: `gcloud scheduler jobs describe batch-jobs-nightly --location=us-west1`
- Verify CRON_SECRET matches between scheduler and application
- Review Cloud Scheduler logs

**4. Performance Issues**
- Monitor Cloud Run metrics in Console
- Check Firestore query performance
- Review batch data freshness

### Support Resources
- Cloud Run documentation: https://cloud.google.com/run/docs
- Cloud Scheduler documentation: https://cloud.google.com/scheduler/docs  
- Firestore documentation: https://cloud.google.com/firestore/docs

## 📈 Success Metrics

After deployment, monitor these key metrics:

### User Experience
- [ ] Search response time < 3 seconds
- [ ] Batch hit rate > 70%
- [ ] Application uptime > 99%

### System Performance  
- [ ] Batch processing success rate > 95%
- [ ] API error rate < 1%
- [ ] Cold start times < 2 seconds

### Cost Management
- [ ] Monthly Cloud Run costs within budget
- [ ] SerpAPI usage within limits
- [ ] No unexpected resource spikes

## 🎯 Post-Deployment Tasks

### Week 1
- [ ] Monitor all systems for stability
- [ ] Collect initial usage metrics
- [ ] Test batch processing consistency
- [ ] Verify search result quality

### Month 1  
- [ ] Review performance metrics
- [ ] Optimize batch processing queries based on usage
- [ ] Fine-tune resource allocation
- [ ] Plan capacity for growth

### Ongoing
- [ ] Regular security updates
- [ ] Performance optimization based on usage patterns
- [ ] Feature enhancements based on user feedback
- [ ] Cost optimization reviews