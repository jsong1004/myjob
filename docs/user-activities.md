📌 Objective
Enable activity tracking within the application, recording details such as what the user did, when it was done, token usage, and time taken for the task. All activity data will be saved to Firestore and displayed in a dedicated “My Activities” page.

🗂 Implementation Plan
1. Define the Data Model
A Firestore document schema for user activity logs:

Collection: user-activities
Field Name	Type	Description
userId	string	Unique identifier of the user
activityType	string	Type of activity (e.g., resume_generation, job_match)
description	string	Optional: Additional info about the task
timestamp	timestamp	Date and time of action initiation
tokenUsage	number	Number of tokens consumed
timeTaken	number	Duration in seconds or milliseconds
metadata	map	Optional contextual data (e.g., file type, model name, prompt type)

2. Create New API Endpoint
Endpoint: POST /api/activity
Purpose: Receives and saves user activity data

Input: JSON body with fields matching the above model

Response:

200 OK with confirmation message

400 Bad Request on validation failure

Database: Saves to Firestore under user-activities/{userId}/{autoGeneratedDocId}

Example Payload:

json
Copy
Edit
{
  "userId": "abc123",
  "activityType": "resume_generation",
  "description": "Tailored resume for Amazon job",
  "timestamp": "2025-07-06T10:05:00Z",
  "tokenUsage": 1420,
  "timeTaken": 3.2,
  "metadata": {
    "jobTitle": "Data Engineer",
    "resumeLength": "2 pages"
  }
}
3. Create “My Activities” Page
Route: /my-activities
Page Features:
Table View:

Columns: Activity Type | Timestamp | Time Taken | Token Usage | View Details

Pagination & Sorting (by date, duration, tokens)

Details Modal:

Expands to show metadata and description

Filters:

By activity type, date range, token usage

Export Button:

Download CSV or JSON of activity logs

Data Source:

Realtime Firestore query scoped to current userId

4. Integrate Activity Tracking
Embed logging into relevant parts of the app:

Add API call to POST /api/activity after each user action (e.g., resume generation, job match analysis)

Capture:

startTime and endTime

tokenUsage if applicable

Custom metadata depending on the feature

Handle gracefully with try/catch (non-blocking)

Example (client-side pseudocode):

ts
Copy
Edit
const startTime = Date.now();
// perform task (e.g., resume tailoring)
const endTime = Date.now();
const timeTaken = (endTime - startTime) / 1000;

await fetch('/api/activity', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId,
    activityType: 'resume_generation',
    timestamp: new Date().toISOString(),
    tokenUsage,
    timeTaken,
    metadata: { jobTitle: 'Data Engineer' }
  })
});
✅ Next Steps
 Finalize Firestore security rules to protect per-user data

 Develop and test /api/activity route

 Build /my-activities frontend page

 Add tracking logic to key workflows