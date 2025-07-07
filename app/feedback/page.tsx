"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Header } from "@/components/header";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { Loader2, Send, Github } from "lucide-react";

export default function FeedbackPage() {
  const { user } = useAuth();
  const [type, setType] = useState("feature");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      setError("Please fill out all fields.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/github/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          description,
          user: user || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong.");
      }

      const data = await res.json();
      setSuccess(`Successfully created issue! You can view it here: ${data.url}`);
      setTitle("");
      setDescription("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
             <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-2xl">
                   <Github className="mr-3 h-6 w-6" />
                    Submit Feedback
                  </CardTitle>
                  <CardDescription>
                    Have a feature request or a bug to report? Let us know!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Feedback Type</label>
                        <Select value={type} onValueChange={setType}>
                          <SelectTrigger id="type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="feature">Feature Request</SelectItem>
                            <SelectItem value="bug">Bug Report</SelectItem>
                            <SelectItem value="enhancement">Enhancement</SelectItem>
                            <SelectItem value="help wanted">Help Wanted</SelectItem>
                            <SelectItem value="question">Question</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                     <div>
                       <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <Input
                          id="title"
                          type="text"
                          placeholder="e.g., Add session timeout"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <Textarea
                           id="description"
                           placeholder="Describe the feature or bug in detail..."
                           value={description}
                           onChange={(e) => setDescription(e.target.value)}
                           required
                           rows={6}
                        />
                      </div>
                    
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    {success && <p className="text-sm text-green-600">{success}</p>}

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Submit to GitHub
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
          </div>
        </main>
      </div>
    </AuthProvider>
  );
} 