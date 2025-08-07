"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Play, 
  Pause, 
  RefreshCw, 
  Calendar, 
  TrendingUp, 
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ArrowRightLeft
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { auth } from "@/lib/firebase"

interface BatchRun {
  id: string
  batchId: string
  completedAt: string
  totalJobs: number
  newJobs: number
  duplicates: number
  queriesProcessed: number
  executionTime: number
  errors: string[]
}

interface BatchStats {
  totalRuns: number
  totalJobsProcessed: number
  averageExecutionTime: number
  successRate: number
  lastRunDate: string
  upcomingRunDate: string
}

export function BatchJobsAdmin() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  const [batchRuns, setBatchRuns] = useState<BatchRun[]>([])
  const [stats, setStats] = useState<BatchStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean
    migratedCount: number
    duplicatesSkipped: number
    deletedCount: number
  } | null>(null)

  useEffect(() => {
    if (user) {
      loadBatchData()
    }
  }, [user])

  const loadBatchData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      if (!auth?.currentUser) return
      
      const token = await auth.currentUser.getIdToken()
      
      // Load recent batch runs from API
      const response = await fetch('/api/admin/batch-runs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load batch data')
      }
      
      setBatchRuns(data.batchRuns || [])
      setStats(data.stats || null)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load batch data')
    } finally {
      setIsLoading(false)
    }
  }

  const triggerManualBatch = async (dryRun: boolean = false) => {
    setIsLoading(true)
    setError(null)
    
    try {
      if (!auth?.currentUser) return
      
      const token = await auth.currentUser.getIdToken()
      
      const response = await fetch('/api/cron/batch-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dryRun,
          forceRun: true,
          maxJobsPerQuery: 20 // Smaller limit for manual runs
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Batch processing failed')
      }
      
      // Refresh data after successful run
      await loadBatchData()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger batch job')
    } finally {
      setIsLoading(false)
    }
  }

  const triggerMigration = async (dryRun: boolean = false) => {
    setIsMigrating(true)
    setError(null)
    setMigrationResult(null)
    
    try {
      if (!auth?.currentUser) return
      
      const token = await auth.currentUser.getIdToken()
      
      const response = await fetch('/api/cron/migrate-batch-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dryRun,
          force: true
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Migration failed')
      }
      
      // Show migration results
      setMigrationResult({
        success: result.success,
        migratedCount: result.migratedCount || 0,
        duplicatesSkipped: result.duplicatesSkipped || 0,
        deletedCount: result.deletedCount || 0
      })
      
      // Clear result after 10 seconds
      setTimeout(() => setMigrationResult(null), 10000)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger migration')
    } finally {
      setIsMigrating(false)
    }
  }

  const getNextRunDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(2, 0, 0, 0)
    return tomorrow.toISOString()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ${seconds % 60}s`
  }

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Batch Jobs Management</h2>
          <p className="text-muted-foreground">
            Monitor and manage nightly job scraping operations
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={loadBatchData}
            disabled={isLoading || isMigrating}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button 
            onClick={() => triggerManualBatch(true)}
            disabled={isLoading || isMigrating}
            variant="secondary"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Dry Run
          </Button>
          
          <Button 
            onClick={() => triggerManualBatch(false)}
            disabled={isLoading || isMigrating}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Run Now
          </Button>
          
          <Button 
            onClick={() => triggerMigration(false)}
            disabled={isLoading || isMigrating}
            variant="outline"
          >
            {isMigrating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
            Migrate Batch Jobs
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {migrationResult && migrationResult.success && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Migration completed successfully! 
            Migrated: {migrationResult.migratedCount} jobs, 
            Skipped: {migrationResult.duplicatesSkipped} duplicates, 
            Deleted: {migrationResult.deletedCount} batch_jobs
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRuns}</div>
              <p className="text-xs text-muted-foreground">
                Last run: {formatDate(stats.lastRunDate)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jobs Processed</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalJobsProcessed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Across all batch runs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Runtime</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(stats.averageExecutionTime)}</div>
              <p className="text-xs text-muted-foreground">
                Per batch run
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats.successRate * 100)}%</div>
              <p className="text-xs text-muted-foreground">
                No errors encountered
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="recent-runs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent-runs">Recent Runs</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="recent-runs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Batch Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Jobs Found</TableHead>
                    <TableHead>New Jobs</TableHead>
                    <TableHead>Runtime</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchRuns.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="font-mono text-sm">
                        {run.batchId}
                      </TableCell>
                      <TableCell>
                        {formatDate(run.completedAt)}
                      </TableCell>
                      <TableCell>
                        {run.totalJobs.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {run.newJobs} new
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDuration(run.executionTime)}
                      </TableCell>
                      <TableCell>
                        {run.errors.length === 0 ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Success
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            {run.errors.length} errors
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Batch Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Nightly Job Scraping</h3>
                  <p className="text-sm text-muted-foreground">
                    Runs daily at 2:00 AM (Monday-Friday)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Next run: {stats ? formatDate(stats.upcomingRunDate) : 'Unknown'}
                  </p>
                </div>
                <Badge variant="secondary">
                  <Play className="mr-1 h-3 w-3" />
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Batch Jobs Migration</h3>
                  <p className="text-sm text-muted-foreground">
                    Migrates batch_jobs to jobs collection
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Can be triggered manually or via scheduler
                  </p>
                </div>
                <Badge variant="secondary">
                  <ArrowRightLeft className="mr-1 h-3 w-3" />
                  Manual
                </Badge>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Batch Processing Details:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Runs Monday through Friday at 2:00 AM UTC</li>
                  <li>• Searches 25+ popular job titles</li>
                  <li>• Covers 12 major tech locations</li>
                  <li>• Processes up to 50 jobs per query</li>
                  <li>• Automatic duplicate detection</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Migration Process:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Moves jobs from batch_jobs to main jobs collection</li>
                  <li>• Preserves all job metadata and batch information</li>
                  <li>• Skips duplicates automatically</li>
                  <li>• Deletes processed batch_jobs after successful migration</li>
                  <li>• Can be run manually or scheduled after batch processing</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Configuration changes require application restart and may affect scheduled jobs.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Job Queries (25 active)</h4>
                  <div className="text-xs text-muted-foreground">
                    software engineer, senior software engineer, full stack engineer, data scientist, 
                    machine learning engineer, product manager, devops engineer, and 18 more...
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Target Locations (12 active)</h4>
                  <div className="text-xs text-muted-foreground">
                    United States (Remote), Seattle, San Francisco, New York, Austin, Boston, 
                    Los Angeles, Chicago, Denver, Washington DC, Atlanta, and more...
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">API Configuration</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Max jobs per query: 50</li>
                    <li>• Request timeout: 20 seconds</li>
                    <li>• Rate limiting: 1 request per second</li>
                    <li>• Batch retention: 30 days</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}