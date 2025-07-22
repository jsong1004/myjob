import { NextRequest, NextResponse } from 'next/server';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { initFirebaseAdmin } from '@/lib/firebase-admin-init';

export interface AuthenticatedRequest extends NextRequest {
  user: DecodedIdToken;
}

/**
 * Get authenticated user from request headers
 * @param request - NextRequest with Authorization header
 * @returns DecodedIdToken if valid, null if unauthorized
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<DecodedIdToken | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      return null;
    }

    const adminInitialized = initFirebaseAdmin();
    if (!adminInitialized) {
      console.error('Firebase Admin initialization failed');
      return null;
    }

    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Auth verification failed:', error);
    return null;
  }
}

/**
 * Higher-order function to add authentication to API routes
 * @param handler - API route handler function that receives (request, user)
 * @returns Wrapped handler with authentication
 */
export function withAuth<T = any>(
  handler: (request: NextRequest, user: DecodedIdToken) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      ) as NextResponse<T>;
    }
    return handler(request, user);
  };
}

/**
 * Standard error responses for consistent API behavior
 */
export const ApiErrors = {
  unauthorized: () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  forbidden: () => NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
  notFound: (resource?: string) => NextResponse.json(
    { error: resource ? `${resource} not found` : 'Not found' }, 
    { status: 404 }
  ),
  badRequest: (message?: string) => NextResponse.json(
    { error: message || 'Bad request' }, 
    { status: 400 }
  ),
  internalError: (message?: string) => NextResponse.json(
    { error: message || 'Internal server error' }, 
    { status: 500 }
  ),
} as const;