#!/bin/bash

# Setup script for Google Cloud Scheduler for batch job processing
# This script creates the necessary Cloud Scheduler jobs for nightly batch processing

set -e

# Configuration
PROJECT_ID="myresume-457817"
REGION="us-west1"
SERVICE_NAME="myjob-service"
CRON_SCHEDULE="0 2 * * 1-5"  # Monday-Friday at 2 AM
TIMEZONE="America/Los_Angeles"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up Cloud Scheduler for Batch Job Processing${NC}"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"
echo "Schedule: $CRON_SCHEDULE"
echo "Timezone: $TIMEZONE"
echo ""

# Check if gcloud is authenticated
echo -e "${YELLOW}Checking Google Cloud authentication...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1 > /dev/null; then
    echo -e "${RED}Error: Not authenticated with Google Cloud${NC}"
    echo "Please run: gcloud auth login"
    exit 1
fi

# Set the project
echo -e "${YELLOW}Setting project to $PROJECT_ID...${NC}"
gcloud config set project $PROJECT_ID

# Check and enable required APIs
echo -e "${YELLOW}Checking required Google Cloud APIs...${NC}"

# Check if APIs are already enabled
SCHEDULER_ENABLED=$(gcloud services list --enabled --filter="name:cloudscheduler.googleapis.com" --format="value(name)" 2>/dev/null)
RUN_ENABLED=$(gcloud services list --enabled --filter="name:cloudrun.googleapis.com" --format="value(name)" 2>/dev/null)

if [[ -n "$SCHEDULER_ENABLED" && -n "$RUN_ENABLED" ]]; then
    echo -e "${GREEN}Required APIs are already enabled${NC}"
else
    echo -e "${YELLOW}Enabling required APIs...${NC}"
    if gcloud services enable cloudscheduler.googleapis.com cloudrun.googleapis.com 2>/dev/null; then
        echo -e "${GREEN}APIs enabled successfully${NC}"
    else
        echo -e "${YELLOW}Warning: Could not enable APIs. Please ensure they are enabled manually:${NC}"
        echo "  - Cloud Scheduler API (cloudscheduler.googleapis.com)"
        echo "  - Cloud Run API (cloudrun.googleapis.com)"
        echo -e "${YELLOW}Continuing with setup (APIs may already be enabled)...${NC}"
    fi
fi

# Get the Cloud Run service URL
echo -e "${YELLOW}Getting Cloud Run service URL...${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

if [ -z "$SERVICE_URL" ]; then
    echo -e "${RED}Error: Could not find Cloud Run service '$SERVICE_NAME' in region '$REGION'${NC}"
    echo "Make sure the service is deployed first."
    exit 1
fi

echo "Service URL: $SERVICE_URL"

# Get the CRON_SECRET from Secret Manager
echo -e "${YELLOW}Retrieving CRON_SECRET from Secret Manager...${NC}"
CRON_SECRET=$(gcloud secrets versions access latest --secret="CRON_SECRET")

if [ -z "$CRON_SECRET" ]; then
    echo -e "${RED}Error: Could not retrieve CRON_SECRET from Secret Manager${NC}"
    echo "Please create the secret first:"
    echo "  gcloud secrets create CRON_SECRET --data-file=<(echo -n 'your-secret-here')"
    exit 1
fi

# Create the batch job scheduler
JOB_NAME="batch-jobs-nightly"
ENDPOINT_URL="$SERVICE_URL/api/cron/batch-jobs"

echo -e "${YELLOW}Creating Cloud Scheduler job: $JOB_NAME${NC}"

# Delete existing job if it exists (ignore errors)
gcloud scheduler jobs delete $JOB_NAME --location=$REGION --quiet 2>/dev/null || true

# Create the new scheduler job
gcloud scheduler jobs create http $JOB_NAME \
    --location=$REGION \
    --schedule="$CRON_SCHEDULE" \
    --uri="$ENDPOINT_URL" \
    --http-method=GET \
    --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
    --time-zone="$TIMEZONE" \
    --description="Nightly batch job processing for job search system" \
    --attempt-deadline="300s" \
    --max-retry-attempts=3 \
    --max-retry-duration="600s" \
    --min-backoff="60s" \
    --max-backoff="300s"

echo -e "${GREEN}Cloud Scheduler job created successfully!${NC}"

# Verify the job was created
echo -e "${YELLOW}Verifying the scheduled job...${NC}"
gcloud scheduler jobs describe $JOB_NAME --location=$REGION

echo ""
echo -e "${GREEN}Setup completed successfully!${NC}"
echo ""
echo "Job Details:"
echo "  Name: $JOB_NAME"
echo "  Schedule: $CRON_SCHEDULE ($TIMEZONE)"
echo "  Endpoint: $ENDPOINT_URL"
echo "  Next run: $(gcloud scheduler jobs describe $JOB_NAME --location=$REGION --format='value(scheduleTime)')"
echo ""
echo "To manually trigger the job for testing:"
echo "  gcloud scheduler jobs run $JOB_NAME --location=$REGION"
echo ""
echo "To view job execution logs:"
echo "  gcloud scheduler jobs describe $JOB_NAME --location=$REGION"
echo "  gcloud logging read 'resource.type=\"cloud_scheduler_job\" resource.labels.job_id=\"$JOB_NAME\"' --limit=10"
echo ""
echo -e "${YELLOW}Important: Make sure your Cloud Run service has proper IAM permissions for Cloud Scheduler to invoke it.${NC}"