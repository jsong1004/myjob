"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ExternalLink, AlertCircle, Search, Filter, GitBranch, Calendar, MessageSquare, User, ChevronUp, ChevronDown } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { auth } from "@/lib/firebase"

interface GitHubIssue {
  id: number
  number: number
  title: string
  state: 'open' | 'closed'
  author: string
  authorAvatar: string
  labels: Array<{
    name: string
    color: string
  }>
  assignees: Array<{
    login: string
    avatar_url: string
  }>
  body: string
  createdAt: string
  updatedAt: string
  closedAt: string | null
  htmlUrl: string
  commentsCount: number
  milestone: {
    title: string
    state: string
  } | null
}

interface AdminGitHubIssuesProps {}

export function AdminGitHubIssues({}: AdminGitHubIssuesProps) {
  const { user } = useAuth()
  const [issues, setIssues] = useState<GitHubIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [stateFilter, setStateFilter] = useState<'all' | 'open' | 'closed'>('all')
  const [labelFilter, setLabelFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<'number' | 'title' | 'state' | 'author' | 'createdAt' | 'commentsCount'>('number')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    const fetchIssues = async () => {
      if (!user || !auth?.currentUser) return

      setLoading(true)
      setError(null)

      try {
        const token = await auth.currentUser.getIdToken()
        const response = await fetch('/api/admin/github-issues', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch issues')
        }

        const data = await response.json()
        setIssues(data.issues)
      } catch (err) {
        console.error('Error fetching GitHub issues:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch issues')
      } finally {
        setLoading(false)
      }
    }

    fetchIssues()
  }, [user])

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         issue.body?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         issue.author.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesState = stateFilter === 'all' || issue.state === stateFilter
    
    const matchesLabel = labelFilter === 'all' || 
                        issue.labels.some(label => label.name === labelFilter)
    
    return matchesSearch && matchesState && matchesLabel
  }).sort((a, b) => {
    let aValue: any
    let bValue: any
    
    switch (sortField) {
      case 'number':
        aValue = a.number
        bValue = b.number
        break
      case 'title':
        aValue = a.title.toLowerCase()
        bValue = b.title.toLowerCase()
        break
      case 'state':
        aValue = a.state
        bValue = b.state
        break
      case 'author':
        aValue = a.author.toLowerCase()
        bValue = b.author.toLowerCase()
        break
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime()
        bValue = new Date(b.createdAt).getTime()
        break
      case 'commentsCount':
        aValue = a.commentsCount
        bValue = b.commentsCount
        break
      default:
        aValue = a.number
        bValue = b.number
    }
    
    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }

  const getUniqueLabels = () => {
    const labels = new Set<string>()
    issues.forEach(issue => {
      issue.labels.forEach(label => labels.add(label.name))
    })
    return Array.from(labels).sort()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStateColor = (state: string) => {
    return state === 'open' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
  }

  const getLabelColor = (color: string) => {
    return `#${color}`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading GitHub issues...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Issues</p>
                <p className="text-2xl font-bold">{issues.length}</p>
              </div>
              <GitBranch className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Issues</p>
                <p className="text-2xl font-bold text-green-600">
                  {issues.filter(i => i.state === 'open').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Closed Issues</p>
                <p className="text-2xl font-bold text-purple-600">
                  {issues.filter(i => i.state === 'closed').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Comments</p>
                <p className="text-2xl font-bold">
                  {issues.reduce((sum, issue) => sum + issue.commentsCount, 0)}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search issues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={stateFilter} onValueChange={(value) => setStateFilter(value as 'all' | 'open' | 'closed')}>
              <SelectTrigger className="w-full md:w-32">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={labelFilter} onValueChange={setLabelFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Label" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Labels</SelectItem>
                {getUniqueLabels().map(label => (
                  <SelectItem key={label} value={label}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Issues Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            GitHub Issues ({filteredIssues.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredIssues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No issues found matching your criteria
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <button 
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => handleSort('number')}
                      >
                        #
                        {getSortIcon('number')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button 
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => handleSort('title')}
                      >
                        Title
                        {getSortIcon('title')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button 
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => handleSort('state')}
                      >
                        State
                        {getSortIcon('state')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button 
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => handleSort('author')}
                      >
                        Author
                        {getSortIcon('author')}
                      </button>
                    </TableHead>
                    <TableHead>Labels</TableHead>
                    <TableHead>
                      <button 
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => handleSort('createdAt')}
                      >
                        Created
                        {getSortIcon('createdAt')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button 
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => handleSort('commentsCount')}
                      >
                        Comments
                        {getSortIcon('commentsCount')}
                      </button>
                    </TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIssues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell className="font-medium">#{issue.number}</TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={issue.title}>
                          {issue.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStateColor(issue.state)}>
                          {issue.state}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <img 
                            src={issue.authorAvatar} 
                            alt={issue.author}
                            className="h-6 w-6 rounded-full"
                          />
                          <span className="text-sm">{issue.author}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {issue.labels.slice(0, 3).map((label) => (
                            <Badge 
                              key={label.name}
                              variant="outline"
                              style={{ 
                                backgroundColor: getLabelColor(label.color) + '20',
                                borderColor: getLabelColor(label.color),
                                color: getLabelColor(label.color)
                              }}
                              className="text-xs"
                            >
                              {label.name}
                            </Badge>
                          ))}
                          {issue.labels.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{issue.labels.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(issue.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {issue.commentsCount}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => window.open(issue.htmlUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}