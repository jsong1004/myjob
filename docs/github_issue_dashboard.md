# Add Dashboard for User Activities

## Description
Implement a user activities dashboard to track and display user interactions with the system, particularly for resume generation and other AI-assisted tasks.

## Feature Requirements

### Data Structure
The dashboard should capture and display the following activity data:

```json
{
  "activityType": "resume_generation",
  "metadata": {
    "mode": "ask",
    "model": "openai/gpt-4o-mini",
    "user_prompt": "Generate 3 short, specific suggestions for improving a resume for this job. Each suggestion should be one sentence and actionable. Format as a JSON array of strings."
  },
  "timeTaken": 3.008,
  "timestamp": "July 7, 2025 at 5:49:36.693 AM UTC-7",
  "tokenUsage": 907,
  "userId": "pmlvQ4Y2J6a8l8SeXLCCtZujFkK2"
}
```

### Data Fields Specification
- **activityType** (string): Type of activity performed (e.g., "resume_generation", "cover_letter", "interview_prep")
- **metadata** (object): Contains activity-specific details
  - **mode** (string): Interaction mode (e.g., "ask", "generate", "edit")
  - **model** (string): AI model used (e.g., "openai/gpt-4o-mini")
  - **user_prompt** (string): User's input prompt or request
- **timeTaken** (number): Processing time in seconds
- **timestamp** (timestamp): When the activity occurred
- **tokenUsage** (number): Number of tokens consumed
- **userId** (string): Unique identifier for the user

## Acceptance Criteria

### Backend Requirements 
This is alread implemented. Add the following to existing  api/activity api endpoint 
- [ ] Filtering activities by type, date range, user
- [ ] Implement proper indexing for efficient queries

### Frontend Requirements
- [ ] Create dashboard page accessible to users
- [ ] Display activity timeline with key metrics
- [ ] Show activity breakdown by type (charts/graphs)
- [ ] Filter options:
  - [ ] Date range picker
  - [ ] Activity type filter
  - [ ] Search by prompt keywords
- [ ] Activity details view for each entry
- [ ] Export functionality (CSV/JSON)

### Analytics & Metrics
- [ ] Total activities count
- [ ] Average processing time
- [ ] Token usage statistics
- [ ] Most common activity types
- [ ] Usage patterns over time

## Technical Considerations

### Performance
- Implement pagination for large activity lists
- Add caching for frequently accessed data
- Consider data archiving strategy for old activities

### Security
- Ensure users can only access their own activity data
- Implement proper authentication/authorization
- Sanitize user prompts before storing

### Privacy
- Consider data retention policies
- Anonymize sensitive information in prompts if needed

## UI/UX Mockups
- [ ] Dashboard overview page
- [ ] Activity detail modal/page
- [ ] Filter and search interface
- [ ] Mobile-responsive design

## Labels
`enhancement` `dashboard` `analytics` `user-experience`

## Priority
**Medium** - This feature will improve user engagement and provide valuable insights into system usage.

## Estimated Effort
**Medium** (1-2 sprints)

## Dependencies
- User authentication system
- Database infrastructure
- Analytics/charting library integration