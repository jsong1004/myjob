#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js'

// Import tools
import { jobSearchTool } from './tools/job-search.js'
import { jobScoringTool } from './tools/job-scoring.js'
import { resumeManagementTools } from './tools/resume-management.js'
import { resumeTailoringTool } from './tools/resume-tailoring.js'
import { coverLetterTool } from './tools/cover-letter.js'
import { companyInfoTool } from './tools/company-info.js'
import { saveJobTool } from './tools/save-job.js'

// Import resources
import { savedJobsResource } from './resources/saved-jobs.js'
import { resumesResource } from './resources/resumes.js'
import { userProfileResource } from './resources/user-profile.js'

// Import prompts
import { careerAdvisorPrompt } from './prompts/career-advisor.js'
import { jobMatchingPrompt } from './prompts/job-matching.js'

// Server configuration
const SERVER_NAME = 'myjob-mcp-server'
const SERVER_VERSION = '1.0.0'

// Create server instance
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    },
  }
)

// Import Firebase auth
import { validateAuthToken } from './auth/firebase-auth.js'

// Authentication middleware
async function validateAuth(authToken?: string): Promise<string> {
  if (!authToken) {
    throw new McpError(ErrorCode.InvalidRequest, 'Authentication token required')
  }
  
  try {
    const userId = await validateAuthToken(authToken)
    return userId
  } catch (error) {
    throw new McpError(ErrorCode.InvalidRequest, 'Authentication failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
  }
}

// Tool definitions
const tools = [
  jobSearchTool,
  jobScoringTool,
  ...resumeManagementTools,
  resumeTailoringTool,
  coverLetterTool,
  companyInfoTool,
  saveJobTool
]

// Resource definitions
const resources = [
  savedJobsResource,
  resumesResource,
  userProfileResource
]

// Prompt definitions
const prompts = [
  careerAdvisorPrompt,
  jobMatchingPrompt
]

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  }
})

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  
  // Find the requested tool
  const tool = tools.find(t => t.name === name)
  if (!tool) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`)
  }
  
  try {
    // Extract auth token from arguments
    if (!args || typeof args !== 'object') {
      throw new McpError(ErrorCode.InvalidRequest, 'Invalid arguments')
    }
    
    const authToken = args._auth as string
    const userId = await validateAuth(authToken)
    
    // Remove auth token from args before passing to tool
    const toolArgs = { ...args }
    delete toolArgs._auth
    
    // Execute the tool with auth context
    const result = await tool.handler(toolArgs, { userId, authToken })
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error
    }
    
    console.error(`Error executing tool ${name}:`, error)
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
})

// Handle list resources request
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: resources.map(resource => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType
    }))
  }
})

// Handle read resource request
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params
  
  // Find the requested resource
  const resource = resources.find(r => r.uri === uri)
  if (!resource) {
    throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`)
  }
  
  try {
    // Extract auth token from URI parameters
    const url = new URL(uri)
    const authToken = url.searchParams.get('auth')
    const userId = await validateAuth(authToken || undefined)
    
    // Get resource data
    const data = await resource.handler(url.searchParams, { userId, authToken: authToken! })
    
    return {
      contents: [
        {
          uri,
          mimeType: resource.mimeType,
          text: JSON.stringify(data, null, 2)
        }
      ]
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error
    }
    
    console.error(`Error reading resource ${uri}:`, error)
    throw new McpError(
      ErrorCode.InternalError,
      `Resource read failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
})

// Handle list prompts request
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: prompts.map(prompt => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments
    }))
  }
})

// Handle get prompt request
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  
  // Find the requested prompt
  const prompt = prompts.find(p => p.name === name)
  if (!prompt) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown prompt: ${name}`)
  }
  
  try {
    // Generate the prompt with provided arguments
    const messages = await prompt.handler(args || {})
    
    return {
      description: prompt.description,
      messages
    }
  } catch (error) {
    console.error(`Error generating prompt ${name}:`, error)
    throw new McpError(
      ErrorCode.InternalError,
      `Prompt generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
})

// Start the server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  
  console.error(`${SERVER_NAME} v${SERVER_VERSION} started`)
  console.error('Connected to MCP client via stdio')
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error)
  process.exit(1)
})

// Run the server
main().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})