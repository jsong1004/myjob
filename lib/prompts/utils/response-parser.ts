// lib/prompts/utils/response-parser.ts
import { ResponseFormat } from '../types'

export class ResponseParser {
  /**
   * Parse API response based on the specified format
   */
  static parseResponse(response: any, format?: ResponseFormat): any {
    const content = response.choices?.[0]?.message?.content || ''
    
    if (!format || format.type === 'text') {
      return content
    }

    if (format.type === 'json') {
      return this.parseJsonResponse(content)
    }

    if (format.type === 'structured') {
      return this.parseStructuredResponse(content, format)
    }

    return content
  }

  /**
   * Parse JSON response with error handling
   */
  static parseJsonResponse(content: string): any {
    try {
      // Try to find JSON in the content if it's wrapped in text
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, content]
      
      const jsonStr = jsonMatch[1] || content
      return JSON.parse(jsonStr.trim())
    } catch (error) {
      console.error('Failed to parse JSON response:', error)
      console.error('Content:', content)
      throw new Error(`Failed to parse JSON response: ${error}`)
    }
  }

  /**
   * Parse structured response based on format definition
   */
  static parseStructuredResponse(content: string, format: ResponseFormat): any {
    // For structured responses, we can implement custom parsing logic
    // This is a placeholder for future structured response parsing
    return content
  }

  /**
   * Extract specific sections from text response
   */
  static extractSections(content: string, sections: string[]): Record<string, string> {
    const result: Record<string, string> = {}
    
    for (const section of sections) {
      const regex = new RegExp(`${section}:\\s*([\\s\\S]*?)(?=\\n\\n|$)`, 'i')
      const match = content.match(regex)
      result[section.toLowerCase()] = match ? match[1].trim() : ''
    }
    
    return result
  }

  /**
   * Extract resume and summary from agent response
   */
  static parseAgentResponse(content: string): { updatedContent?: string; summary?: string } {
    const resumeMatch = content.match(/UPDATED_RESUME:\s*([\s\S]*?)\s*CHANGE_SUMMARY:/i)
    const summaryMatch = content.match(/CHANGE_SUMMARY:\s*([\s\S]*?)$/i)
    
    const letterMatch = content.match(/COVER_LETTER:\s*([\s\S]*?)\s*SUMMARY:/i)
    const letterSummaryMatch = content.match(/SUMMARY:\s*([\s\S]*?)$/i)
    
    // Clean the updated content by removing ** artifacts at beginning and end
    let updatedContent = resumeMatch?.[1]?.trim() || letterMatch?.[1]?.trim()
    if (updatedContent) {
      // Remove ** at the very beginning and end of the content
      updatedContent = updatedContent.replace(/^\*\*/, '').replace(/\*\*$/, '')
    }
    
    return {
      updatedContent,
      summary: summaryMatch?.[1]?.trim() || letterSummaryMatch?.[1]?.trim()
    }
  }

  /**
   * Clean and format text response
   */
  static cleanTextResponse(content: string): string {
    return content
      .replace(/```[\w]*\n?/g, '') // Remove code fence markers
      .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
      .trim()
  }

  /**
   * Validate response against expected format
   */
  static validateResponse(response: any, format?: ResponseFormat): boolean {
    if (!format) return true

    if (format.type === 'json') {
      try {
        if (typeof response === 'string') {
          JSON.parse(response)
        }
        return true
      } catch {
        return false
      }
    }

    if (format.type === 'text') {
      return typeof response === 'string'
    }

    return true
  }
}