#!/bin/bash

# Ensure you are authenticated with gcloud and have set your project
# gcloud auth login
# gcloud config set project YOUR_PROJECT_ID

echo "Starting Google Cloud Build..."

PROJECT_ID="myresume-457817"
REGION="us-west1"
SERVICE_NAME="myjob-service"
IMAGE_TAG=${1:-$(git rev-parse --short HEAD)}

# Submit build to Cloud Build
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions=SHORT_SHA=$IMAGE_TAG \
  --project $PROJECT_ID

echo "Deployment triggered for $SERVICE_NAME with image tag $IMAGE_TAG in project $PROJECT_ID ($REGION)" %   