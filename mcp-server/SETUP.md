# MyJob MCP Server Setup Guide

This guide will help you set up and configure the MyJob MCP Server to work with your AI clients.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Firebase Project** with Firestore enabled
3. **MyJob Application** running on localhost:3000
4. **Firebase Service Account Key**

## Quick Start

### 1. Install Dependencies

```bash
cd mcp-server
npm install
```

### 2. Build the Server

```bash
npm run build
```

### 3. Configure Environment

Copy and customize the environment setup:

```bash
cp config-examples/environment-setup.sh .env.sh
# Edit .env.sh with your Firebase configuration
source .env.sh
```

### 4. Start the Server

```bash
./start.sh
```

## Firebase Setup

### Getting Your Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Either:
   - Place it as `../service-account-key.json` (relative to mcp-server directory)
   - Or set `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable with the JSON content

### Required Environment Variables

```bash
# Firebase Project Configuration
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-bucket.appspot.com"

# Firebase Admin Service Account
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# MyJob Application
API_BASE_URL="http://localhost:3000"
```

## Client Configuration

### Claude Desktop

Add to your Claude Desktop MCP settings (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "myjob": {
      "command": "node",
      "args": ["/absolute/path/to/myjob-mcp-server/dist/index.js"],
      "env": {
        "API_BASE_URL": "http://localhost:3000",
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID": "your-project-id",
        "FIREBASE_SERVICE_ACCOUNT_KEY": "{\"type\":\"service_account\",...}"
      }
    }
  }
}
```

### Other MCP Clients

The server uses STDIO transport and follows MCP protocol standards. Configure your client to:
- Execute: `node /path/to/dist/index.js`
- Use STDIO for communication
- Set required environment variables

## Authentication

All operations require a Firebase authentication token. Get a token from your Firebase client:

```javascript
// In your web application
import { getAuth } from 'firebase/auth'

const user = getAuth().currentUser
if (user) {
  const token = await user.getIdToken()
  // Use this token in MCP tool calls
}
```

Pass the token in the `_auth` parameter for all tool calls:

```json
{
  "name": "search_jobs",
  "arguments": {
    "query": "software engineer",
    "_auth": "your-firebase-token"
  }
}
```

## Testing

Run the test suite to verify everything works:

```bash
node test-server.js
```

## Troubleshooting

### Common Issues

1. **"Firebase Admin not initialized"**
   - Check your service account key is valid
   - Ensure `NEXT_PUBLIC_FIREBASE_PROJECT_ID` is set
   - Verify the service account has proper permissions

2. **"Authentication failed"**
   - Check your Firebase auth token is valid and not expired
   - Ensure the token is from the same Firebase project

3. **"Failed to fetch jobs"**
   - Ensure your MyJob application is running on port 3000
   - Check `API_BASE_URL` environment variable
   - Verify API endpoints are accessible

4. **"Unknown tool/resource/prompt"**
   - Rebuild the server: `npm run build`
   - Check server logs for initialization errors

### Debug Mode

Set environment variable for detailed logging:

```bash
export DEBUG=mcp-server:*
./start.sh
```

## Available Capabilities

### Tools (8 total)
- `search_jobs` - Search for job opportunities
- `score_jobs` - AI job matching scores
- `upload_resume` - Upload new resumes
- `delete_resume` - Remove resumes
- `set_default_resume` - Set default resume
- `tailor_resume` - AI resume tailoring
- `cover_letter` - Generate/edit cover letters
- `get_company_info` - Company information
- `save_job` - Save jobs to collection

### Resources (3 total)
- `myjob://saved-jobs` - Access saved jobs
- `myjob://resumes` - Access resume collection
- `myjob://profile` - User profile data

### Prompts (2 total)
- `career_advisor` - Career guidance
- `job_match_analysis` - Job fit analysis

## Security Notes

- Never commit service account keys to version control
- Use environment variables for sensitive configuration
- The server validates all authentication tokens
- All API calls require proper Firebase authentication

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review server logs for error messages
3. Ensure all prerequisites are met
4. Test with a minimal configuration first