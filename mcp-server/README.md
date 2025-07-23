# MyJob MCP Server

A Model Context Protocol (MCP) server that exposes the MyJob application's capabilities to AI agents and LLMs.

## Overview

This MCP server allows AI agents to interact with your job search application programmatically, enabling automated job searching, resume management, and career assistance.

## Features

### Tools (Actions)
- **search_jobs** - Search for job opportunities with filters
- **score_jobs** - Score job matches using multi-agent AI system
- **upload_resume** - Upload and manage resumes
- **delete_resume** - Remove resumes from collection
- **set_default_resume** - Set a resume as default
- **tailor_resume** - AI-powered resume tailoring for specific jobs
- **cover_letter** - Generate and edit cover letters
- **get_company_info** - Get detailed company information
- **save_job** - Save jobs to your collection

### Resources (Data Access)
- **myjob://saved-jobs** - Access saved jobs with status tracking
- **myjob://resumes** - Access resume collection
- **myjob://profile** - Access user profile and preferences

### Prompts (Templates)
- **career_advisor** - Get personalized career advice
- **job_match_analysis** - Analyze job fit and get detailed feedback

## Installation

1. Install dependencies:
```bash
cd mcp-server
npm install
```

2. Build the server:
```bash
npm run build
```

3. Set environment variables:
```bash
export API_BASE_URL=http://localhost:3000
export FIREBASE_SERVICE_ACCOUNT_KEY='{...your service account key...}'
```

## Usage

### With Claude Desktop

Add to your Claude Desktop MCP settings:

```json
{
  "mcpServers": {
    "myjob": {
      "command": "node",
      "args": ["/path/to/myjob-mcp-server/dist/index.js"],
      "env": {
        "API_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

### Authentication

All operations require authentication. Pass your Firebase auth token in the `_auth` parameter:

```javascript
// Example tool call
{
  "name": "search_jobs",
  "arguments": {
    "query": "software engineer",
    "location": "San Francisco, CA",
    "_auth": "your-firebase-auth-token"
  }
}
```

### Example Usage

#### Search for Jobs
```javascript
{
  "name": "search_jobs",
  "arguments": {
    "query": "data scientist",
    "location": "Remote",
    "filters": {
      "experienceLevel": ["mid", "senior"],
      "jobType": ["full-time"],
      "workArrangement": ["remote"]
    },
    "_auth": "your-auth-token"
  }
}
```

#### Score Jobs Against Resume
```javascript
{
  "name": "score_jobs",
  "arguments": {
    "jobIds": ["job123", "job456"],
    "resumeId": "resume789",
    "_auth": "your-auth-token"
  }
}
```

#### Tailor Resume for Job
```javascript
{
  "name": "tailor_resume",
  "arguments": {
    "resumeId": "resume123",
    "jobId": "job456",
    "mode": "agent",
    "request": "Optimize for ML engineer role, emphasize Python and TensorFlow experience",
    "_auth": "your-auth-token"
  }
}
```

#### Access Saved Jobs Resource
```
myjob://saved-jobs?auth=your-auth-token&status=saved&limit=10
```

#### Use Career Advisor Prompt
```javascript
{
  "name": "career_advisor",
  "arguments": {
    "topic": "interview_prep",
    "job_title": "Senior Software Engineer",
    "industry": "fintech",
    "experience_level": "senior",
    "context": "Have interview next week at a startup"
  }
}
```

## Development

### Run in Development Mode
```bash
npm run dev
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Error Handling

The server includes comprehensive error handling:
- Authentication validation
- Input validation with Zod schemas
- API error propagation
- Graceful fallbacks

## Security

- All operations require authentication
- Input validation on all parameters
- Secure API communication
- No credential storage in server

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

ISC License