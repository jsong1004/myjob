/**
 * Safe JSON parsing utilities with proper error handling
 */

export interface ParseResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Safely parse JSON string with error handling
 * @param jsonString - String to parse as JSON
 * @param fallback - Optional fallback value if parsing fails
 * @returns ParseResult with success status and data or error
 */
export function safeJsonParse<T = any>(jsonString: string, fallback?: T): ParseResult<T> {
  try {
    if (!jsonString || typeof jsonString !== 'string') {
      return {
        success: false,
        error: 'Invalid input: expected non-empty string',
        data: fallback
      }
    }

    const trimmed = jsonString.trim()
    if (trimmed.length === 0) {
      return {
        success: false,
        error: 'Empty JSON string',
        data: fallback
      }
    }

    const parsed = JSON.parse(trimmed) as T
    return {
      success: true,
      data: parsed
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      data: fallback
    }
  }
}

/**
 * Parse JSON with automatic fallback to default value
 * @param jsonString - String to parse as JSON
 * @param fallback - Default value to return on error
 * @returns Parsed data or fallback value
 */
export function parseJsonWithFallback<T>(jsonString: string, fallback: T): T {
  const result = safeJsonParse<T>(jsonString, fallback)
  return result.data ?? fallback
}

/**
 * Parse JSON and throw on error (for cases where error handling is done elsewhere)
 * @param jsonString - String to parse as JSON
 * @param context - Optional context for better error messages
 * @returns Parsed data
 * @throws Error with descriptive message
 */
export function parseJsonStrict<T = any>(jsonString: string, context?: string): T {
  const result = safeJsonParse<T>(jsonString)
  if (!result.success) {
    const contextMsg = context ? ` (${context})` : ''
    throw new Error(`JSON parsing failed${contextMsg}: ${result.error}`)
  }
  return result.data as T
}

/**
 * Validate that a parsed object has required properties
 * @param obj - Object to validate
 * @param requiredKeys - Array of required property names
 * @returns True if all keys exist, false otherwise
 */
export function validateRequiredKeys(obj: any, requiredKeys: string[]): boolean {
  if (!obj || typeof obj !== 'object') {
    return false
  }

  return requiredKeys.every(key => key in obj)
}

/**
 * Type guard for checking if a value is a valid JSON object
 * @param value - Value to check
 * @returns True if value is a non-null object
 */
export function isJsonObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}