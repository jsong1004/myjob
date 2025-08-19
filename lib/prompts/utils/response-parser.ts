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
      // Prefer fenced JSON blocks
      const fenceJson = content.match(/```json\s*([\s\S]*?)\s*```/i)
      if (fenceJson?.[1]) {
        return JSON.parse(fenceJson[1].trim())
      }

      // Any fenced block
      const anyFence = content.match(/```\s*([\s\S]*?)\s*```/)
      if (anyFence?.[1]) {
        const candidate = anyFence[1].trim()
        try {
          return JSON.parse(candidate)
        } catch { /* fall through */ }
      }

      // Heuristic: extract first balanced JSON object using brace counting (ignores braces inside strings)
      const balanced = this.extractBalancedJson(content)
      if (balanced) {
        // Sanitize common model issues before parsing
        const sanitized = this.sanitizeJsonString(balanced)
        return JSON.parse(sanitized)
      }

      // As a last resort, attempt to clean common artifacts
      const cleaned = content
        .replace(/^[^\{]*\{/, '{') // strip leading text before first '{'
        .replace(/\}[^\}]*$/, '}') // strip trailing text after last '}'
        .trim()
      const sanitized = this.sanitizeJsonString(cleaned)
      return JSON.parse(sanitized)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to parse JSON response:', error)
        console.error('Content:', content)
      }
      
      // Try aggressive repair for truncated responses
      try {
        const repaired = this.repairTruncatedJson(content)
        if (repaired) {
          return repaired
        }
      } catch (repairError) {
        // Repair failed, continue with original error
      }
      
      throw new Error(`Failed to parse JSON response: ${error}`)
    }
  }

  /**
   * Extract the first balanced JSON object from text using brace depth,
   * respecting string literals and escape characters
   */
  private static extractBalancedJson(text: string): string | null {
    let start = text.indexOf('{')
    if (start === -1) return null
    let depth = 0
    let inString = false
    let escape = false
    let lastValidEnd = -1
    
    for (let i = start; i < text.length; i++) {
      const ch = text[i]
      if (escape) { escape = false; continue }
      if (ch === '\\') { escape = true; continue }
      if (ch === '"') { inString = !inString; continue }
      if (inString) continue
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          return text.slice(start, i + 1)
        }
        // Keep track of last valid closing brace for truncated JSON
        if (depth > 0) {
          lastValidEnd = i
        }
      }
    }
    
    // If we didn't find a complete JSON but have a partial one,
    // try to repair it by closing open braces
    if (depth > 0 && lastValidEnd > start) {
      let repaired = text.slice(start, lastValidEnd + 1)
      // Add missing closing braces
      repaired += '}'.repeat(depth - 1)
      return repaired
    }
    
    return null
  }

  /**
   * Sanitize common JSON issues from LLMs:
   * - Replace raw newlines in string literals with \n
   * - Remove trailing commas before } or ]
   * - Close unclosed strings at the end
   */
  private static sanitizeJsonString(jsonLike: string): string {
    // Remove trailing commas before closing braces/brackets
    let s = jsonLike.replace(/,\s*([}\]])/g, '$1')

    // Replace unescaped newlines inside strings with \n via state machine
    let result = ''
    let inString = false
    let escape = false
    let openQuoteIndex = -1
    
    for (let i = 0; i < s.length; i++) {
      const ch = s[i]
      if (escape) { result += ch; escape = false; continue }
      if (ch === '\\') { result += ch; escape = true; continue }
      if (ch === '"') { 
        if (!inString) openQuoteIndex = result.length
        inString = !inString
        result += ch
        continue 
      }
      if (inString && (ch === '\n' || ch === '\r')) {
        result += '\\n'
        continue
      }
      result += ch
    }
    
    // If we ended with an unclosed string, close it
    if (inString && openQuoteIndex >= 0) {
      // Truncate incomplete string value and close it properly
      result += '"'
    }
    
    return result
  }

  /**
   * Attempt to repair truncated JSON responses
   */
  private static repairTruncatedJson(content: string): any | null {
    try {
      // Find the first JSON object
      const start = content.indexOf('{')
      if (start === -1) return null
      
      let jsonStr = content.substring(start)
      
      // Look for common truncation patterns and try to fix them
      const repairs = [
        // Case 1: Truncated string value - add closing quote and brace
        (str: string) => {
          if (str.includes('"reasoning": "') && !str.endsWith('}')) {
            // Find the last complete property before truncation
            const lastComma = str.lastIndexOf(',')
            if (lastComma > 0) {
              return str.substring(0, lastComma) + '}'
            }
            // If no comma, try to close the reasoning string
            const reasoningStart = str.indexOf('"reasoning": "')
            if (reasoningStart > 0) {
              const beforeReasoning = str.substring(0, reasoningStart)
              return beforeReasoning.slice(0, -1) + '}'  // Remove trailing comma and close
            }
          }
          return null
        },
        
        // Case 2: Missing closing quotes in array
        (str: string) => {
          if (str.includes('": [') && !str.endsWith('}')) {
            // Find last complete array
            const arrays = str.match(/": \[[^\]]*$/g)
            if (arrays) {
              const lastArrayStart = str.lastIndexOf('": [')
              const beforeArray = str.substring(0, lastArrayStart)
              return beforeArray.slice(0, -1) + '}' // Remove trailing comma and close
            }
          }
          return null
        },
        
        // Case 3: Simply add missing closing brace
        (str: string) => {
          const openBraces = (str.match(/\{/g) || []).length
          const closeBraces = (str.match(/\}/g) || []).length
          if (openBraces > closeBraces) {
            return str + '}'.repeat(openBraces - closeBraces)
          }
          return null
        }
      ]
      
      // Try each repair strategy
      for (const repair of repairs) {
        const repaired = repair(jsonStr)
        if (repaired) {
          try {
            const parsed = JSON.parse(this.sanitizeJsonString(repaired))
            console.log('🔧 Successfully repaired truncated JSON')
            return parsed
          } catch {
            continue
          }
        }
      }
      
      return null
    } catch {
      return null
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