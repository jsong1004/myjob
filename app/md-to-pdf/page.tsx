"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileText, Download, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { Header } from "@/components/header"
import { AuthProvider } from "@/components/auth-provider"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function MdToPdfPage() {
  return (
    <AuthProvider>
      <MdToPdfContent />
    </AuthProvider>
  )
}

function MdToPdfContent() {
  const [file, setFile] = useState<File | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setError(null)
      setSuccess(null)
      
      if (!selectedFile.name.endsWith('.md')) {
        setError("Please select a Markdown (.md) file")
        setFile(null)
        return
      }
      
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        setError("File size must be less than 5MB")
        setFile(null)
        return
      }
      
      setFile(selectedFile)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const droppedFile = event.dataTransfer.files[0]
    if (droppedFile) {
      setError(null)
      setSuccess(null)
      
      if (!droppedFile.name.endsWith('.md')) {
        setError("Please select a Markdown (.md) file")
        return
      }
      
      if (droppedFile.size > 5 * 1024 * 1024) { // 5MB limit
        setError("File size must be less than 5MB")
        return
      }
      
      setFile(droppedFile)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleConvert = async () => {
    if (!file) return
    
    setIsConverting(true)
    setError(null)
    setSuccess(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/convert/md-to-pdf', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Conversion failed')
      }
      
      // Get the PDF blob
      const pdfBlob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.name.replace(/\.md$/, '.pdf')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      setSuccess(`Successfully converted ${file.name} to PDF and started download!`)
      
    } catch (err) {
      console.error('Conversion error:', err)
      setError(err instanceof Error ? err.message : 'Failed to convert file')
    } finally {
      setIsConverting(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setError(null)
    setSuccess(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight mb-4">
              Markdown to PDF Converter
            </h1>
            <p className="text-muted-foreground text-lg">
              Convert your Markdown resume files to professionally formatted PDF documents
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Upload Markdown File
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {file ? (
                  <div className="space-y-2">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                    <p className="text-lg font-medium text-green-800">{file.name}</p>
                    <p className="text-sm text-green-600">
                      {(file.size / 1024).toFixed(1)} KB • Ready to convert
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium">
                        Drop your Markdown file here, or{" "}
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-700 underline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          browse
                        </button>
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Supports .md files up to 5MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden File Input */}
              <Input
                ref={fileInputRef}
                type="file"
                accept=".md"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Error Message */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Success Message */}
              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center">
                {file && (
                  <>
                    <Button
                      onClick={handleConvert}
                      disabled={isConverting}
                      className="min-w-[120px]"
                    >
                      {isConverting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Converting...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Convert to PDF
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      disabled={isConverting}
                    >
                      Reset
                    </Button>
                  </>
                )}
                {!file && (
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Select File
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>About the Converter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Features:</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Professional PDF formatting optimized for resumes</li>
                  <li>• Supports all standard Markdown syntax</li>
                  <li>• Clean typography and consistent styling</li>
                  <li>• Proper page margins and print-ready output</li>
                  <li>• File size limit: 5MB</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Supported Markdown Elements:</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Headers (H1, H2, H3)</li>
                  <li>• Bold and italic text</li>
                  <li>• Lists (ordered and unordered)</li>
                  <li>• Links and code blocks</li>
                  <li>• Tables and blockquotes</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}