import { z } from 'zod'
import fetch from 'node-fetch'
import { CompanyInfoSchema, AuthContext } from '../types/index.js'

export const companyInfoTool = {
  name: 'get_company_info',
  description: 'Get detailed information about a company',
  inputSchema: {
    type: 'object',
    properties: {
      companyName: {
        type: 'string',
        description: 'Company name to get information for'
      },
      _auth: {
        type: 'string',
        description: 'Authentication token (required)'
      }
    },
    required: ['companyName', '_auth']
  },
  handler: async (args: any, context: AuthContext): Promise<{
    company: {
      name: string,
      description?: string,
      headquarters?: string,
      website?: string,
      industry?: string,
      employeeCount?: string,
      founded?: string,
      revenue?: string,
      publiclyTraded?: boolean,
      stockSymbol?: string
    }
  }> => {
    // Validate input
    const input = CompanyInfoSchema.parse(args)
    
    // Call the company info API
    const response = await fetch(
      `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/companies/${encodeURIComponent(input.companyName)}`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`
        }
      }
    )
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get company info: ${error}`)
    }
    
    const data = await response.json() as any
    
    return {
      company: {
        name: data.name || input.companyName,
        description: data.description,
        headquarters: data.headquarters?.city && data.headquarters?.country 
          ? `${data.headquarters.city}, ${data.headquarters.country}`
          : undefined,
        website: data.website,
        industry: data.industry,
        employeeCount: data.employeeCount?.toString(),
        founded: data.founded?.toString(),
        revenue: data.revenue,
        publiclyTraded: data.publiclyTraded,
        stockSymbol: data.stockSymbol
      }
    }
  }
}