"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, AlertCircle, ArrowUpDown, Users, Mail, Calendar } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { auth } from "@/lib/firebase"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// Define the structure of a user
interface UserData {
  id: string
  uid: string
  email: string
  name: string
  photoURL?: string
  createdAt: string
  updatedAt: string
  defaultResumeId?: string
  resumeCount?: number
  savedJobsCount?: number
  coverLettersCount?: number
}

type SortKey = keyof UserData

export function AdminUserManagement() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // State for filtering
  const [emailFilter, setEmailFilter] = useState("")
  const [nameFilter, setNameFilter] = useState("")

  // State for sorting
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({
    key: 'createdAt',
    direction: 'descending',
  })

  const isAdmin = user?.email === "jsong@koreatous.com"

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user || !auth?.currentUser || !isAdmin) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const token = await auth.currentUser.getIdToken()
        const response = await fetch("/api/admin/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          setUsers(data.users || [])
        } else {
          const errorData = await response.json()
          setError(errorData.error || "Failed to fetch users.")
        }
      } catch (err) {
        setError("An error occurred while fetching users.")
      } finally {
        setLoading(false)
      }
    }

    if (isAdmin) {
      fetchUsers()
    }
  }, [user, isAdmin])

  // Memoized filtering and sorting
  const sortedAndFilteredUsers = useMemo(() => {
    let filtered = [...users]

    if (emailFilter) {
      filtered = filtered.filter(u => u.email.toLowerCase().includes(emailFilter.toLowerCase()))
    }
    if (nameFilter) {
      filtered = filtered.filter(u => u.name.toLowerCase().includes(nameFilter.toLowerCase()))
    }
    
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? ''
        const bValue = b[sortConfig.key] ?? ''

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
  }, [users, emailFilter, nameFilter, sortConfig])

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
    return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filtering Controls */}
        <div className="flex items-center gap-4 mb-6">
          <Input
            placeholder="Filter by Email..."
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            className="max-w-xs"
          />
          <Input
            placeholder="Filter by Name..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="max-w-xs"
          />
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
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold mb-2">No Users Found</h3>
            <p className="text-muted-foreground">There are no users to display yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Total Users</span>
                  </div>
                  <div className="text-2xl font-bold">{users.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Active Today</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {users.filter(u => {
                      const today = new Date().toDateString()
                      return new Date(u.updatedAt).toDateString() === today
                    }).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">New This Week</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {users.filter(u => {
                      const weekAgo = new Date()
                      weekAgo.setDate(weekAgo.getDate() - 7)
                      return new Date(u.createdAt) > weekAgo
                    }).length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Users Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('name')}>
                        Name {getSortIcon('name')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('email')}>
                        Email {getSortIcon('email')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('createdAt')}>
                        Joined {getSortIcon('createdAt')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => requestSort('updatedAt')}>
                        Last Active {getSortIcon('updatedAt')}
                      </Button>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAndFilteredUsers.map((userData) => (
                    <TableRow key={userData.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {userData.photoURL && (
                            <img 
                              src={userData.photoURL} 
                              alt={userData.name}
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <div>
                            <div className="font-medium">{userData.name}</div>
                            <div className="font-mono text-xs text-muted-foreground">{userData.uid}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{userData.email}</TableCell>
                      <TableCell>{formatDate(userData.createdAt)}</TableCell>
                      <TableCell>{formatDate(userData.updatedAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {userData.defaultResumeId && (
                            <Badge variant="secondary" className="text-xs">Has Resume</Badge>
                          )}
                          {userData.photoURL && (
                            <Badge variant="outline" className="text-xs">With Photo</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          <div>Resumes: {userData.resumeCount || 0}</div>
                          <div>Saved Jobs: {userData.savedJobsCount || 0}</div>
                          <div>Cover Letters: {userData.coverLettersCount || 0}</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}