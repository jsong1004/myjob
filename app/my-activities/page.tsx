"use client"

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle, SlidersHorizontal, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { auth } from '@/lib/firebase';

interface Activity {
  id: string;
  activityType: string;
  timestamp: any; // Can be Date, Firestore Timestamp, or object with seconds
  timeTaken: number;
  tokenUsage: number;
  description?: string;
  metadata?: Record<string, any>;
}

export default function MyActivitiesPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ type: 'all', dateRange: 'all' });
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user]);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!auth?.currentUser) throw new Error('Authentication required');
      
      const token = await auth.currentUser.getIdToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch('/api/activity', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const data = await response.json();
      setActivities(data.activities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedActivities = useMemo(() => {
    let filtered = activities;

    if (filters.type !== 'all') {
      filtered = filtered.filter(a => a.activityType === filters.type);
    }

    // Date range filtering can be added here

    return filtered.sort((a, b) => {
      const aValue = a[sortBy as keyof Activity];
      const bValue = b[sortBy as keyof Activity];

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [activities, filters, sortBy, sortOrder]);

  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'Unknown';
    
    try {
      // Handle ISO string (most common case now)
      if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString();
      }
      
      // Handle Firestore Timestamp objects (fallback)
      if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
        return timestamp.toDate().toLocaleString();
      }
      
      // Handle objects with seconds and nanoseconds (serialized Firestore Timestamp)
      if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
        const date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString();
      }
      
      // Handle number (milliseconds)
      if (typeof timestamp === 'number') {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString();
      }
      
      // Handle Date object
      if (timestamp instanceof Date) {
        return isNaN(timestamp.getTime()) ? 'Invalid Date' : timestamp.toLocaleString();
      }
      
      // Last resort: try to construct Date directly
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString();
      
    } catch (error) {
      console.error('Error parsing timestamp:', error);
      return 'Invalid Date';
    }
  };

  const handleExport = () => {
    const data = JSON.stringify(filteredAndSortedActivities, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'user_activities.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Activities</h1>
              <p className="text-muted-foreground">Track your usage and activities across the platform.</p>
            </div>
            <Button onClick={handleExport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Activity Log</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={filters.type} onValueChange={value => setFilters(f => ({ ...f, type: value }))}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="resume_generation">Resume Generation</SelectItem>
                      <SelectItem value="resume_edit">Resume Edit</SelectItem>
                      <SelectItem value="job_search">Job Search</SelectItem>
                      <SelectItem value="job_matching">Job Matching</SelectItem>
                      <SelectItem value="job_summary">Job Summary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activity Type</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Time Taken (s)</TableHead>
                      <TableHead>Token Usage</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedActivities.map(activity => (
                      <TableRow key={activity.id}>
                        <TableCell>{activity.activityType.replace(/_/g, ' ')}</TableCell>
                        <TableCell>{formatTimestamp(activity.timestamp)}</TableCell>
                        <TableCell>{activity.timeTaken.toFixed(2)}</TableCell>
                        <TableCell>{activity.tokenUsage || 'N/A'}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
