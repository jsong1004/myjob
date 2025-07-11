import { NextRequest, NextResponse } from "next/server"
import createClient from '@thecompaniesapi/sdk'

export async function GET(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const companyName = decodeURIComponent(params.name)
    
    // Check if API token is configured
    const apiToken = process.env.THE_COMPANIES_API_TOKEN
    if (!apiToken) {
      return NextResponse.json(
        { error: "The Companies API token not configured" }, 
        { status: 500 }
      )
    }

    const tca = createClient({ apiToken })

    const response = await tca.searchCompaniesByName({
      name: companyName,
      size: 1 // Get the first/best match
    })

    if (!response.data.companies || response.data.companies.length === 0) {
      return NextResponse.json(
        { error: "Company not found" }, 
        { status: 404 }
      )
    }

    const company = response.data.companies[0]
    return NextResponse.json({ company })
    
  } catch (error) {
    console.error("[Companies][GET] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch company data" }, 
      { status: 500 }
    )
  }
}