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
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/header";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { Loader2, Send, Github, Upload, X, FileText, Image } from "lucide-react";
import { validateFeedbackFile } from "@/lib/file-parser";

export default function FeedbackPage() {
  const { user } = useAuth();
  const [type, setType] = useState("feature");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setFileError(null);
    
    // Validate each file
    const validFiles: File[] = [];
    for (const file of files) {
      const validation = validateFeedbackFile(file);
      if (!validation.valid) {
        setFileError(validation.error || "Invalid file");
        return;
      }
      validFiles.push(file);
    }
    
    // Check total files limit (max 5 files)
    if (attachedFiles.length + validFiles.length > 5) {
      setFileError("You can attach a maximum of 5 files");
      return;
    }
    
    setAttachedFiles(prev => [...prev, ...validFiles]);
    // Clear the input
    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.toLowerCase().split('.').pop();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    
    if (imageExtensions.includes(extension || '')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
      // Create FormData for file uploads
      const formData = new FormData();
      formData.append('type', type);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('user', JSON.stringify(user || null));
      
      // Add files to FormData
      attachedFiles.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      const res = await fetch("/api/github/issue", {
        method: "POST",
        body: formData, // Use FormData instead of JSON
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong.");
      }

      const data = await res.json();
      setSuccess(`Successfully created issue! You can view it here: ${data.url}`);
      setTitle("");
      setDescription("");
      setAttachedFiles([]);
      setFileError(null);
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

                      {/* File Upload Section */}
                      <div>
                        <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-1">
                          Attachments (Optional)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                          <input
                            id="file-upload"
                            type="file"
                            multiple
                            accept=".pdf,.docx,.txt,.md,.jpg,.jpeg,.png,.gif,.bmp,.webp"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <label
                            htmlFor="file-upload"
                            className="cursor-pointer flex flex-col items-center justify-center"
                          >
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              PDF, DOCX, TXT, MD, or images (max 5MB each, 5 files total)
                            </p>
                          </label>
                        </div>
                        
                        {/* File Error */}
                        {fileError && (
                          <p className="text-sm text-red-600 mt-2">{fileError}</p>
                        )}
                        
                        {/* Attached Files List */}
                        {attachedFiles.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-sm font-medium text-gray-700">Attached Files:</p>
                            {attachedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                <div className="flex items-center space-x-2">
                                  {getFileIcon(file.name)}
                                  <span className="text-sm text-gray-700">{file.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {formatFileSize(file.size)}
                                  </Badge>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
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