// lib/prompts/utils/prompt-builder.ts

export class PromptBuilder {
  /**
   * Replace variables in template string with provided values
   */
  static buildUserContent(template: string, variables: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      const value = variables[key]
      if (value === undefined || value === null) {
        console.warn(`Missing variable: ${key}`)
        return match // Return the placeholder if variable is missing
      }
      return String(value)
    })
  }

  /**
   * Validate that all required variables are present in the template
   */
  static validateVariables(template: string, variables: Record<string, any>): string[] {
    const requiredVariables = template.match(/\{(\w+)\}/g) || []
    const missingVariables: string[] = []

    console.log('[PromptBuilder] Validating variables:', {
      templateLength: template.length,
      requiredVariables,
      variableKeys: Object.keys(variables),
      templateStart: template.substring(0, 200)
    })

    for (const placeholder of requiredVariables) {
      const key = placeholder.slice(1, -1) // Remove { and }
      const value = variables[key]
      const isMissing = value === undefined || value === null || value === ''
      
      console.log(`[PromptBuilder] Checking variable ${key}:`, {
        value: typeof value === 'string' ? value.substring(0, 50) + '...' : value,
        type: typeof value,
        length: typeof value === 'string' ? value.length : 'N/A',
        isMissing
      })
      
      if (isMissing) {
        missingVariables.push(key)
      }
    }

    console.log('[PromptBuilder] Validation result:', { missingVariables })
    return missingVariables
  }

  /**
   * Build complete prompt with system role and user content
   */
  static buildCompletePrompt(
    systemRole: string,
    userTemplate: string,
    variables: Record<string, any>
  ): { systemRole: string; userContent: string } {
    const missingVariables = this.validateVariables(userTemplate, variables)
    if (missingVariables.length > 0) {
      throw new Error(`Missing required variables: ${missingVariables.join(', ')}`)
    }

    return {
      systemRole,
      userContent: this.buildUserContent(userTemplate, variables)
    }
  }

  /**
   * Combine multiple templates into one
   */
  static combineTemplates(templates: string[], separator: string = '\n\n'): string {
    return templates.filter(Boolean).join(separator)
  }

  /**
   * Add context to existing template
   */
  static addContext(template: string, context: string, position: 'before' | 'after' = 'before'): string {
    if (position === 'before') {
      return `${context}\n\n${template}`
    } else {
      return `${template}\n\n${context}`
    }
  }
}