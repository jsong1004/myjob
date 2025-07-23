import { AuthContext } from '../types/index.js'
import fetch from 'node-fetch'

export const userProfileResource = {
  uri: 'myjob://profile',
  name: 'User Profile',
  description: 'Access your user profile and preferences',
  mimeType: 'application/json',
  handler: async (params: URLSearchParams, context: AuthContext): Promise<{
    profile: {
      userId: string,
      displayName: string,
      email: string,
      phoneNumber?: string,
      location?: string,
      linkedinUrl?: string,
      githubUrl?: string,
      portfolioUrl?: string,
      bio?: string,
      jobTitle?: string,
      experience?: string,
      skills: string[],
      defaultResumeId?: string,
      emailNotifications: boolean,
      jobAlerts: boolean,
      createdAt: string,
      updatedAt: string
    }
  }> => {
    // Fetch user profile
    const response = await fetch(
      `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/profile`,
      {
        headers: {
          'Authorization': `Bearer ${context.authToken}`
        }
      }
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch user profile')
    }
    
    const data = await response.json() as any
    
    return {
      profile: {
        userId: data.userId || context.userId,
        displayName: data.displayName || data.name || '',
        email: data.email || '',
        phoneNumber: data.phoneNumber,
        location: data.location,
        linkedinUrl: data.linkedinUrl,
        githubUrl: data.githubUrl,
        portfolioUrl: data.portfolioUrl,
        bio: data.bio,
        jobTitle: data.jobTitle,
        experience: data.experience,
        skills: data.skills || [],
        defaultResumeId: data.defaultResumeId,
        emailNotifications: data.emailNotifications ?? true,
        jobAlerts: data.jobAlerts ?? true,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      }
    }
  }
}