#!/bin/bash

# MyJob MCP Server Startup Script

# Set environment variables if not already set
export API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
export NODE_ENV="${NODE_ENV:-development}"

# Check if required environment variables are set
if [ -z "$FIREBASE_SERVICE_ACCOUNT_KEY" ] && [ ! -f "../service-account-key.json" ]; then
    echo "Error: FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set and service-account-key.json not found"
    echo "Please set the FIREBASE_SERVICE_ACCOUNT_KEY environment variable or place service-account-key.json in the parent directory"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_FIREBASE_PROJECT_ID" ]; then
    echo "Error: NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable not set"
    echo "Please set this environment variable with your Firebase project ID"
    exit 1
fi

# Build the server if not already built
if [ ! -d "dist" ]; then
    echo "Building MCP server..."
    npm run build
fi

# Start the server
echo "Starting MyJob MCP Server..."
echo "API Base URL: $API_BASE_URL"
echo "Environment: $NODE_ENV"
echo "Project ID: $NEXT_PUBLIC_FIREBASE_PROJECT_ID"
echo ""
echo "Server is ready to accept MCP connections via stdio"
echo "Press Ctrl+C to stop the server"
echo ""

node dist/index.js