import { z } from 'zod'
import fetch from 'node-fetch'
import { ResumeUploadSchema, AuthContext, Resume } from '../types/index.js'

export const uploadResumeTool = {
  name: 'upload_resume',
  description: 'Upload a new resume in markdown format',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name for the resume'
      },
      content: {
        type: 'string',
        description: 'Resume content in markdown format'
      },
      setAsDefault: {
        type: 'boolean',
        description: 'Set this resume as default'
      },
      _auth: {
        type: 'string',
        description: 'Authentication token (required)'
      }
    },
    required: ['name', 'content', '_auth']
  },
  handler: async (args: any, context: AuthContext): Promise<{ resume: Resume }> => {
    // Validate input
    const input = ResumeUploadSchema.parse(args)
    
    // Create form data for file upload
    const formData = new FormData()
    const blob = new Blob([input.content], { type: 'text/markdown' })
    formData.append('file', blob, `${input.name}.md`)
    formData.append('name', input.name)
    if (input.setAsDefault) {
      formData.append('setAsDefault', 'true')
    }
    
    // Upload resume
    const response = await fetch(
      `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/resumes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${context.authToken}`
        },
        body: formData
      }
    )
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Resume upload failed: ${error}`)
    }
    
    const data = await response.json() as any
    
    return {
      resume: {
        id: data.id,
        name: data.name,
        content: data.content,
        isDefault: data.isDefault,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      }
    }
  }
}

export const deleteResumeTool = {
  name: 'delete_resume',
  description: 'Delete a resume',
  inputSchema: {
    type: 'object',
    properties: {
      resumeId: {
        type: 'string',
        description: 'ID of the resume to delete'
      },
      _auth: {
        type: 'string',
        description: 'Authentication token (required)'
      }
    },
    required: ['resumeId', '_auth']
  },
  handler: async (args: any, context: AuthContext): Promise<{ success: boolean }> => {
    const { resumeId } = args
    
    const response = await fetch(
      `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/resumes/${resumeId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${context.authToken}`
        }
      }
    )
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Resume deletion failed: ${error}`)
    }
    
    return { success: true }
  }
}

export const setDefaultResumeTool = {
  name: 'set_default_resume',
  description: 'Set a resume as the default',
  inputSchema: {
    type: 'object',
    properties: {
      resumeId: {
        type: 'string',
        description: 'ID of the resume to set as default'
      },
      _auth: {
        type: 'string',
        description: 'Authentication token (required)'
      }
    },
    required: ['resumeId', '_auth']
  },
  handler: async (args: any, context: AuthContext): Promise<{ success: boolean }> => {
    const { resumeId } = args
    
    const response = await fetch(
      `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/resumes/${resumeId}/set-default`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${context.authToken}`
        }
      }
    )
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Setting default resume failed: ${error}`)
    }
    
    return { success: true }
  }
}

export const resumeManagementTools = [
  uploadResumeTool,
  deleteResumeTool,
  setDefaultResumeTool
]