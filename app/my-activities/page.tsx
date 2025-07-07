"use client"

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Header } from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle, SlidersHorizontal, Download, Calendar as CalendarIcon, PieChart, BarChart2, Eye } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { auth } from '@/lib/firebase';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Pie, Cell } from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";

interface Activity {
  id: string;
  activityType: string;
  timestamp: string;
  timeTaken: number;
  tokenUsage: number;
  description?: string;
  metadata?: Record<string, any>;
}

interface AnalyticsData {
  totalActivities: number;
  averageTimeTaken: number;
  totalTokenUsage: number;
  activityDistribution: { name: string; value: number }[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export default function MyActivitiesPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [datePreset, setDatePreset] = useState('all');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    let newDateRange: DateRange | undefined;

    switch (preset) {
      case 'today':
        newDateRange = { from: startOfToday(), to: endOfToday() };
        break;
      case 'this_week':
        newDateRange = { from: startOfWeek(today), to: endOfWeek(today) };
        break;
      case 'this_month':
        newDateRange = { from: startOfMonth(today), to: endOfMonth(today) };
        break;
      case 'this_quarter':
        newDateRange = { from: startOfQuarter(today), to: endOfQuarter(today) };
        break;
      case 'this_year':
        newDateRange = { from: startOfYear(today), to: endOfYear(today) };
        break;
      case 'all':
      default:
        newDateRange = undefined;
        break;
    }
    setDateRange(newDateRange);
  };

  const fetchActivities = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      if (!auth?.currentUser) throw new Error('Authentication required');
      
      const token = await auth.currentUser.getIdToken();
      if (!token) throw new Error('Authentication required');

      const params = new URLSearchParams();
      if (activityTypeFilter !== 'all') {
        params.append('activityType', activityTypeFilter);
      }
      if (dateRange?.from) {
        params.append('startDate', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.append('endDate', dateRange.to.toISOString());
      }

      const response = await fetch(`/api/activity?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch activities');
      }

      const data = await response.json();
      setActivities(data.activities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user, activityTypeFilter, dateRange]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const analytics = useMemo((): AnalyticsData => {
    const totalActivities = activities.length;
    const totalTokenUsage = activities.reduce((sum, a) => sum + (a.tokenUsage || 0), 0);
    const totalTimeTaken = activities.reduce((sum, a) => sum + a.timeTaken, 0);
    const averageTimeTaken = totalActivities > 0 ? totalTimeTaken / totalActivities : 0;
    
    const distribution = activities.reduce((acc, activity) => {
        const type = activity.activityType.replace(/_/g, ' ') || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const activityDistribution = Object.entries(distribution).map(([name, value]) => ({ name, value }));

    return { totalActivities, averageTimeTaken, totalTokenUsage, activityDistribution };
  }, [activities]);

  const formatTimestamp = (timestamp: string): string => {
    if (!timestamp) return 'Unknown';
    try {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString();
    } catch (error) {
      console.error('Error parsing timestamp:', error);
      return 'Invalid Date';
    }
  };
  
  const handleExport = () => {
    const data = JSON.stringify(activities, null, 2);
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
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Activities</h1>
              <p className="text-muted-foreground">Track your usage and activities across the platform.</p>
            </div>
          </div>
          
          <Card>
            <CardHeader>
                <CardTitle>Analytics Overview</CardTitle>
                <CardDescription>A summary of your activities based on the current filters.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalActivities}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Time Taken</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.averageTimeTaken.toFixed(2)}s</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Token Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalTokenUsage.toLocaleString()}</div>
                    </CardContent>
                </Card>
            </CardContent>
            <CardHeader className="border-t pt-6 mt-6">
              <CardTitle>Activity Distribution</CardTitle>
              <CardDescription>
                A breakdown of your activities by type for the selected period.
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                    data={analytics.activityDistribution}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                    <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                        dataKey="name"
                        type="category"
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        width={120}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            border: "1px solid #d1d5db",
                            borderRadius: "0.5rem"
                        }}
                    />
                    <Legend iconSize={12} wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }} />
                    <Bar dataKey="value" name="Activity Count" fill="currentColor" radius={[0, 4, 4, 0]} className="fill-primary" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>Activity Log</CardTitle>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
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
                  <Select value={datePreset} onValueChange={handleDatePresetChange}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="this_week">This Week</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="this_quarter">This Quarter</SelectItem>
                      <SelectItem value="this_year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleExport} variant="outline" className="w-full sm:w-auto">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
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
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : activities.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <p>No activities found for the selected filters.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activity Type</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead className="hidden md:table-cell">Time Taken (s)</TableHead>
                      <TableHead className="hidden md:table-cell">Token Usage</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map(activity => (
                      <TableRow key={activity.id}>
                        <TableCell>
                            <span className="font-medium capitalize">{activity.activityType.replace(/_/g, ' ')}</span>
                        </TableCell>
                        <TableCell>{formatTimestamp(activity.timestamp)}</TableCell>
                        <TableCell className="hidden md:table-cell">{activity.timeTaken.toFixed(2)}</TableCell>
                        <TableCell className="hidden md:table-cell">{activity.tokenUsage || 'N/A'}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setSelectedActivity(activity)}>
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
        {selectedActivity && (
             <Dialog open={!!selectedActivity} onOpenChange={(isOpen) => !isOpen && setSelectedActivity(null)}>
                <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                    <DialogTitle className="capitalize">{selectedActivity.activityType.replace(/_/g, ' ')}</DialogTitle>
                    <DialogDescription>
                        {formatTimestamp(selectedActivity.timestamp)}
                    </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <p className="text-sm font-medium text-muted-foreground col-span-1">Time Taken</p>
                            <p className="col-span-3 text-sm">{selectedActivity.timeTaken.toFixed(2)}s</p>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <p className="text-sm font-medium text-muted-foreground col-span-1">Token Usage</p>
                            <p className="col-span-3 text-sm">{selectedActivity.tokenUsage?.toLocaleString() || 'N/A'}</p>
                        </div>
                        {selectedActivity.metadata && Object.entries(selectedActivity.metadata).map(([key, value]) => (
                            <div className="grid grid-cols-4 items-start gap-4" key={key}>
                                <p className="text-sm font-medium text-muted-foreground col-span-1 capitalize">{key.replace(/_/g, ' ')}</p>
                                <p className="col-span-3 text-sm break-all">{typeof value === 'object' ? JSON.stringify(value, null, 2) : value.toString()}</p>
                            </div>
                        ))}
                    </div>
                </DialogContent>
             </Dialog>
        )}
      </main>
    </>
  );
}
