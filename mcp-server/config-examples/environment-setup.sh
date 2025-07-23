#!/bin/bash

# Environment Setup Script for MyJob MCP Server
# Copy this file and update with your actual values

# Firebase Configuration
export NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-firebase-project-id"
export NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-firebase-storage-bucket.appspot.com"
export NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-firebase-project-id.firebaseapp.com"
export NEXT_PUBLIC_FIREBASE_API_KEY="your-firebase-api-key"
export NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
export NEXT_PUBLIC_FIREBASE_APP_ID="your-firebase-app-id"

# Firebase Admin Service Account (get this from Firebase Console > Project Settings > Service accounts)
export FIREBASE_SERVICE_ACCOUNT_KEY='{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project-id.iam.gserviceaccount.com"
}'

# MyJob Application Configuration
export API_BASE_URL="http://localhost:3000"  # Update if your app runs on a different port
export NODE_ENV="development"

echo "Environment variables set for MyJob MCP Server"
echo "Next steps:"
echo "1. Update the values above with your actual Firebase configuration"
echo "2. Source this file: source environment-setup.sh"
echo "3. Start the MCP server: ./start.sh"