# Component Architecture Guide

Complete guide to the component system in MyJob application.

## 🏗️ Architecture Overview

The MyJob application follows a modular component architecture built on:

- **shadcn/ui**: Base UI component library (45 components)
- **Radix UI**: Accessibility-first primitives
- **Tailwind CSS**: Utility-first styling
- **TypeScript**: Type-safe component interfaces
- **React 19**: Latest React features with Server Components

## 📁 Component Organization

```
components/
├── 🎨 ui/                        # shadcn/ui base components (45)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
├── 👤 admin/                     # Admin panel components (4)
│   ├── admin-activities.tsx
│   ├── admin-github-issues.tsx
│   ├── admin-user-management.tsx
│   └── batch-jobs-admin.tsx
├── 🔐 auth-provider.tsx          # Firebase Auth context
├── 🔑 auth-modal.tsx             # Authentication modal
├── 🎯 onboarding-modal.tsx       # User onboarding flow
├── 🔍 job-search.tsx             # Main job search interface
├── 📊 enhanced-job-search.tsx    # Advanced search with filters
├── 📋 job-results.tsx            # Search results display
├── 🎛️ advanced-job-filters.tsx   # Filter components
├── 📈 matching-score-dialog.tsx  # Job match analysis
├── ⏳ *-loading-info.tsx         # Educational loading states (3)
├── 🎨 enhanced-score-display.tsx # Multi-agent scoring visualization
├── 🧭 header.tsx                 # Main navigation
├── 🦶 footer.tsx                 # Site footer
└── 🏠 landing-page.tsx           # Marketing homepage
```

## 🎨 Base UI Components (shadcn/ui)

### Core Building Blocks

#### Button Component
```typescript
// components/ui/button.tsx
interface ButtonProps {
  variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}

// Usage Examples
<Button variant="default" size="lg">Primary Action</Button>
<Button variant="outline" size="sm">Secondary</Button>
<Button variant="ghost" size="icon"><Icon /></Button>
```

#### Card Component
```typescript
// components/ui/card.tsx
interface CardProps {
  className?: string
  children: React.ReactNode
}

// Usage Pattern
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
  <CardFooter>
    Footer actions
  </CardFooter>
</Card>
```

#### Dialog Component
```typescript
// components/ui/dialog.tsx
interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// Usage Pattern
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    Dialog content
    <DialogFooter>
      <Button onClick={() => setIsOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Form Components

#### Input Component
```typescript
// components/ui/input.tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

// Usage with react-hook-form
<Input
  placeholder="Enter search keywords"
  {...register("query", { required: true })}
  className="w-full"
/>
```

#### Select Component
```typescript
// components/ui/select.tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

#### Textarea Component
```typescript
// components/ui/textarea.tsx
<Textarea
  placeholder="Enter your message"
  rows={4}
  {...register("message")}
/>
```

### Data Display Components

#### Table Component
```typescript
// components/ui/table.tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column 1</TableHead>
      <TableHead>Column 2</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Data 1</TableCell>
      <TableCell>Data 2</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

#### Badge Component
```typescript
// components/ui/badge.tsx
interface BadgeProps {
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
}

<Badge variant="default">Active</Badge>
<Badge variant="secondary">Pending</Badge>
<Badge variant="destructive">Error</Badge>
```

---

## 🔐 Authentication Components

### AuthProvider
Global authentication context using Firebase Auth.

```typescript
// components/auth-provider.tsx
interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

// Usage in app layout
<AuthProvider>
  <App />
</AuthProvider>
```

### AuthModal
Unified authentication modal for sign-in and sign-up.

```typescript
// components/auth-modal.tsx
interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'signin' | 'signup'
  onModeChange: (mode: 'signin' | 'signup') => void
}

// Features
- Email/password authentication
- Google OAuth integration
- Form validation with react-hook-form
- Loading states and error handling
- Automatic redirect after authentication
```

### OnboardingModal
New user onboarding flow with 3-step process.

```typescript
// components/onboarding-modal.tsx
interface OnboardingModalProps {
  isOpen: boolean
  onComplete: () => void
  user: User
}

// Onboarding Steps
1. Job Preferences (target roles, locations, remote work)
2. Resume Upload (optional, drag-and-drop)
3. Professional Details (experience, employment type)
```

---

## 🔍 Job Search Components

### JobSearch
Main job search interface with real-time search.

```typescript
// components/job-search.tsx
interface JobSearchProps {
  initialQuery?: string
  initialLocation?: string
  showFilters?: boolean
}

// Features
- Real-time search with debouncing
- Location autocomplete
- Advanced filter integration
- Pagination support
- Loading states with educational content
- Results caching for performance
```

### EnhancedJobSearch
Advanced search with AI-powered filtering and authentication-aware features.

```typescript
// components/enhanced-job-search.tsx
interface EnhancedJobSearchProps {
  user?: User
  defaultResumeId?: string
}

// Features
- Multi-page result fetching (up to 10 pages)
- Smart deduplication logic
- Authentication-aware filtering
- Job saving with optimistic updates
- Enhanced search filters
- Location-based filtering with remote work support
```

### JobResults
Display component for job search results with interactive features.

```typescript
// components/job-results.tsx
interface JobResultsProps {
  jobs: JobSearchResult[]
  loading: boolean
  user?: User
  onSaveJob: (job: JobSearchResult) => void
  onJobDetails: (job: JobSearchResult) => void
}

// Features
- Sortable columns (title, company, location, date, salary)
- Job details modal with full descriptions
- Save job functionality with visual feedback
- Authentication prompts for unauthenticated users
- Responsive table design with horizontal scrolling
- Color-coded action buttons (green for save, purple for tailor)
```

### AdvancedJobFilters
Comprehensive filtering system for job search refinement.

```typescript
// components/advanced-job-filters.tsx
interface AdvancedJobFiltersProps {
  filters: JobFilters
  onFiltersChange: (filters: JobFilters) => void
  onReset: () => void
}

// Available Filters
- Date Posted (today, 3 days, week, month)
- Job Type (full-time, part-time, contract, internship)
- Experience Level (entry, mid, senior)
- Salary Range (min/max sliders)
- Company Size (startup, small, medium, large)
- Remote Work Options
```

### MatchingScoreDialog
Interactive dialog for displaying job match analysis.

```typescript
// components/matching-score-dialog.tsx
interface MatchingScoreDialogProps {
  job: JobSearchResult
  matchingScore?: number
  breakdown?: MatchingBreakdown
  enhancedAnalysis?: EnhancedJobAnalysis
  onClose: () => void
  onGenerateScore: () => void
}

// Features
- Basic and enhanced scoring display
- Multi-agent analysis visualization
- Skills breakdown with matched/missing indicators
- Experience and education analysis
- PDF download functionality
- Loading states during score generation
```

---

## ⏳ Loading State Components

### JobSearchLoadingInfo
Educational content during job search operations.

```typescript
// components/job-search-loading-info.tsx
interface JobSearchLoadingInfoProps {
  query?: string
  location?: string
  user?: User
}

// Features
- Rotating tips carousel (changes every 3 seconds)
- Real-time progress indicators
- Job market insights (salaries, demand, companies)
- Platform statistics and confidence builders
- Personalized content for authenticated users
- Related job title suggestions
```

### ResumeTailoringLoadingInfo
Educational content during AI resume tailoring.

```typescript
// components/resume-tailoring-loading-info.tsx
interface ResumeTailoringLoadingInfoProps {
  jobTitle?: string
  company?: string
}

// Features
- Resume optimization tips
- ATS compatibility advice
- Keyword optimization guidance
- Achievement formatting best practices
- Company-specific tailoring insights
- Processing stage indicators
```

### CoverLetterLoadingInfo
Educational content during AI cover letter generation.

```typescript
// components/cover-letter-loading-info.tsx
interface CoverLetterLoadingInfoProps {
  jobTitle?: string
  company?: string
}

// Features
- Cover letter writing best practices
- Personalization strategies
- Company culture matching tips
- Opening hook suggestions
- Professional formatting guidance
- Success rate statistics
```

---

## 📊 Data Visualization Components

### EnhancedScoreDisplay
Comprehensive visualization for multi-agent job scoring.

```typescript
// components/enhanced-score-display.tsx
interface EnhancedScoreDisplayProps {
  analysis: EnhancedJobAnalysis
  compact?: boolean
}

// Features
- Overall score with color-coded progress ring
- Individual agent score breakdowns
- Skills analysis with matched/missing indicators
- Experience depth visualization
- Achievement highlights
- Education matching display
- Strengths and improvement areas
- Hiring manager perspective insights
```

---

## 🛡️ Admin Components

### AdminActivities
User activity monitoring dashboard for administrators.

```typescript
// components/admin/admin-activities.tsx
interface AdminActivitiesProps {
  activities: Activity[]
  loading: boolean
  onRefresh: () => void
}

// Features
- Real-time activity feed
- User activity filtering
- Activity type categorization
- Time-based filtering
- Export functionality
- Activity statistics and trends
```

### AdminUserManagement
Comprehensive user management interface.

```typescript
// components/admin/admin-user-management.tsx
interface AdminUserManagementProps {
  users: AdminUserInfo[]
  loading: boolean
  onDeleteUser: (userId: string) => void
  onRefresh: () => void
}

// Features
- User list with sortable columns
- User statistics (resumes, jobs, letters)
- User deletion with confirmation dialog
- Search and filtering
- User activity overview
- Data export capabilities
```

### AdminGithubIssues
GitHub repository integration for issue tracking.

```typescript
// components/admin/admin-github-issues.tsx
interface AdminGithubIssuesProps {
  issues: GitHubIssue[]
  loading: boolean
  onRefresh: () => void
}

// Features
- Real-time GitHub issue sync
- Issue filtering by state and labels
- Assignee management
- Issue statistics dashboard
- Direct links to GitHub
- Issue creation from admin panel
```

### BatchJobsAdmin
Batch processing monitoring and management.

```typescript
// components/admin/batch-jobs-admin.tsx
interface BatchJobsAdminProps {
  batchRuns: BatchRun[]
  loading: boolean
  onTriggerBatch: () => void
}

// Features
- Batch run history and statistics
- Manual batch job triggering
- Success rate monitoring
- Error tracking and debugging
- Performance metrics
- Scheduling management
```

---

## 🧭 Navigation Components

### Header
Main application navigation with user context.

```typescript
// components/header.tsx
interface HeaderProps {
  user?: User
}

// Features
- Responsive navigation menu
- User profile dropdown
- Authentication state handling
- Route-based active states
- Search integration
- Mobile-friendly hamburger menu
```

### Footer
Site footer with links and information.

```typescript
// components/footer.tsx
// Features
- Company information
- Legal links (Terms, Privacy)
- Social media links
- Contact information
- Version information
```

### LandingPage
Marketing homepage for unauthenticated users.

```typescript
// components/landing-page.tsx
interface LandingPageProps {
  onGetStarted: () => void
}

// Features
- Hero section with value proposition
- Feature highlights with icons
- Benefits overview
- Success stories/testimonials
- Call-to-action buttons
- Responsive design
```

---

## 🎯 Component Patterns & Best Practices

### 1. Component Composition Pattern
```typescript
// Prefer composition over large monolithic components
const UserDashboard = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <UserStats user={user} />
    <RecentActivity activities={activities} />
    <QuickActions user={user} />
  </div>
)
```

### 2. Custom Hook Integration
```typescript
// Use custom hooks for complex state logic
const useJobSearch = (initialQuery: string) => {
  const [jobs, setJobs] = useState<JobSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  // ... search logic
  return { jobs, loading, search, refetch }
}
```

### 3. Error Boundary Pattern
```typescript
// Wrap components with error boundaries
<ErrorBoundary fallback={<ErrorDisplay />}>
  <JobSearchResults />
</ErrorBoundary>
```

### 4. Loading State Management
```typescript
// Consistent loading states across components
const DataComponent = () => {
  if (loading) return <Skeleton className="h-4 w-full" />
  if (error) return <ErrorDisplay error={error} />
  return <DataDisplay data={data} />
}
```

### 5. Form Validation Pattern
```typescript
// Use react-hook-form with zod validation
const schema = z.object({
  query: z.string().min(1, "Search query is required"),
  location: z.string().optional()
})

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema)
})
```

### 6. Responsive Design Pattern
```typescript
// Mobile-first responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <Card key={item.id} className="w-full">
      <CardContent className="p-4 md:p-6">
        {item.content}
      </CardContent>
    </Card>
  ))}
</div>
```

### 7. Accessibility Pattern
```typescript
// Include proper ARIA labels and keyboard navigation
<Button 
  aria-label="Save job to your collection"
  onClick={handleSave}
  disabled={saving}
>
  {saving ? <Spinner /> : <BookmarkIcon />}
  Save Job
</Button>
```

---

## 🎨 Styling Guidelines

### Tailwind CSS Classes
```typescript
// Use consistent spacing scale
const spacingClasses = {
  xs: "p-1 gap-1",      // 4px
  sm: "p-2 gap-2",      // 8px  
  md: "p-4 gap-4",      // 16px
  lg: "p-6 gap-6",      // 24px
  xl: "p-8 gap-8"       // 32px
}

// Color system
const colorClasses = {
  primary: "bg-blue-600 text-white",
  secondary: "bg-gray-200 text-gray-900",
  success: "bg-green-600 text-white",
  warning: "bg-yellow-500 text-white",
  error: "bg-red-600 text-white"
}
```

### Component Variants
```typescript
// Use cva (class-variance-authority) for variant management
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      }
    }
  }
)
```

---

## 🔧 Development Workflow

### Component Development Checklist
- [ ] TypeScript interfaces defined
- [ ] Props validation with default values
- [ ] Accessibility attributes (ARIA labels, keyboard navigation)
- [ ] Responsive design implementation
- [ ] Loading and error states
- [ ] Unit tests (if applicable)
- [ ] Storybook stories (if applicable)
- [ ] Documentation updates

### Testing Patterns
```typescript
// Component testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react'
import { JobSearchButton } from './job-search'

test('triggers search on button click', () => {
  const handleSearch = jest.fn()
  render(<JobSearchButton onSearch={handleSearch} />)
  
  fireEvent.click(screen.getByRole('button', { name: /search jobs/i }))
  expect(handleSearch).toHaveBeenCalled()
})
```

---

*For implementation examples and integration guides, see the specific component files in the `/components` directory and refer to the main [README](../README.md) for setup instructions.*