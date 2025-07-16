"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, AlertCircle, ArrowUpDown, Activity } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { auth } from "@/lib/firebase"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

// Define the structure of an activity log
interface ActivityLog {
  id: string
  userId: string
  userName: string
  activityType: string
  tokenUsage: number
  timeTaken: number
  timestamp: string // Now a string (ISO format)
  metadata?: Record<string, any>
}

type SortKey = keyof ActivityLog | 'userName'

export function AdminActivities() {
  const { user } = useAuth()
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // State for filtering
  const [userNameFilter, setUserNameFilter] = useState("")
  const [activityTypeFilter, setActivityTypeFilter] = useState("")

  // State for sorting
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({
    key: 'timestamp',
    direction: 'descending',
  })

  const isAdmin = user?.email === "jsong@koreatous.com"

  useEffect(() => {
    const fetchActivities = async () => {
      if (!user || !auth?.currentUser || !isAdmin) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const token = await auth.currentUser.getIdToken()
        const response = await fetch("/api/admin/activities", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          setActivities(data.activities || [])
        } else {
          const errorData = await response.json()
          setError(errorData.error || "Failed to fetch activities.")
        }
      } catch (err) {
        setError("An error occurred while fetching activities.")
      } finally {
        setLoading(false)
      }
    }

    if (isAdmin) {
      fetchActivities()
    }
  }, [user, isAdmin])
  
  // Get unique activity types for the filter dropdown
  const activityTypes = useMemo(() => {
    const types = new Set(activities.map(a => a.activityType))
    return Array.from(types).sort()
  }, [activities])

  // Memoized filtering and sorting
  const sortedAndFilteredActivities = useMemo(() => {
    let filtered = [...activities]

    if (userNameFilter) {
      filtered = filtered.filter(a => a.userName.toLowerCase().includes(userNameFilter.toLowerCase()))
    }
    if (activityTypeFilter) {
      filtered = filtered.filter(a => a.activityType === activityTypeFilter)
    }
    
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof ActivityLog] ?? ''
        const bValue = b[sortConfig.key as keyof ActivityLog] ?? ''

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }

    return filtered
  }, [activities, userNameFilter, activityTypeFilter, sortConfig])

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending'
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
    }
    return sortConfig.direction === 'ascending' ? '▲' : '▼'
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          All User Activities
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filtering Controls */}
        <div className="flex items-center gap-4 mb-6">
          <Input
            placeholder="Filter by User Name..."
            value={userNameFilter}
            onChange={(e) => setUserNameFilter(e.target.value)}
            className="max-w-xs"
          />
          <Select
            value={activityTypeFilter}
            onValueChange={(value) => setActivityTypeFilter(value === "all" ? "" : value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {activityTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : activities.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold mb-2">No Activities Found</h3>
            <p className="text-muted-foreground">There are no user activities to display yet.</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('userName')}>
                      User {getSortIcon('userName')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('activityType')}>
                      Activity Type {getSortIcon('activityType')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('timestamp')}>
                      Timestamp {getSortIcon('timestamp')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" onClick={() => requestSort('tokenUsage')}>
                      Token Usage {getSortIcon('tokenUsage')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" onClick={() => requestSort('timeTaken')}>
                      Time Taken (s) {getSortIcon('timeTaken')}
                    </Button>
                  </TableHead>
                  <TableHead>Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div className="font-medium">{activity.userName}</div>
                      <div className="font-mono text-xs text-muted-foreground">{activity.userId}</div>
                    </TableCell>
                    <TableCell>{activity.activityType}</TableCell>
                    <TableCell>{formatDate(activity.timestamp)}</TableCell>
                    <TableCell className="text-right">{activity.tokenUsage}</TableCell>
                    <TableCell className="text-right">{activity.timeTaken.toFixed(2)}</TableCell>
                    <TableCell>
                      <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto max-w-xs">
                        {JSON.stringify(activity.metadata, null, 2)}
                      </pre>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}