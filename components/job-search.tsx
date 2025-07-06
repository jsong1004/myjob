"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Search, MapPin, Loader2, Briefcase } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface JobSearchProps {
  onSearch: (query: string, location: string) => void
  isLoading: boolean
}

const majorCities = [
  "Seattle, Washington, United States",
  "New York, New York, United States",
  "San Francisco, California, United States",
  "Austin, Texas, United States",
  "Chicago, Illinois, United States",
  "Boston, Massachusetts, United States",
  "Los Angeles, California, United States",
  "Denver, Colorado, United States",
  "Washington, District of Columbia, United States",
  "Atlanta, Georgia, United States",
  "Anywhere"
];

const workArrangements = ["All", "Remote", "Hybrid"];

export function JobSearch({ onSearch, isLoading }: JobSearchProps) {
  const [query, setQuery] = useState("")
  const [location, setLocation] = useState("Seattle, Washington, United States")
  const [workArrangement, setWorkArrangement] = useState("All");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    let finalQuery = query.trim();
    if (workArrangement === "Remote") {
      finalQuery = `${finalQuery} remote`.trim();
    } else if (workArrangement === "Hybrid") {
      finalQuery = `${finalQuery} hybrid`.trim();
    }
    
    if (finalQuery) {
      onSearch(finalQuery, location)
    }
  }

  return (
    <Card className="shadow-lg border-2 border-border/50 rounded-xl">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
            <div className="relative lg:col-span-2">
              <Label htmlFor="job-query" className="sr-only">Job title, keywords, or company</Label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="job-query"
                type="text"
                placeholder="Job title, keywords, or company"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-11"
                required
              />
            </div>
            <div className="relative lg:col-span-2">
              <Label htmlFor="location" className="sr-only">Location</Label>
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
               <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="pl-10 h-11">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {majorCities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full h-11 lg:col-span-1" disabled={isLoading || !query.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
