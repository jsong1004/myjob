"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  type User as FirebaseUser
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { User, AuthContextType } from '@/lib/types'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const googleProvider = new GoogleAuthProvider()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Check if Firebase is available
  const isFirebaseAvailable = auth !== null && db !== null

  // Convert Firebase user to our User type
  const convertFirebaseUser = async (firebaseUser: FirebaseUser): Promise<User> => {
    if (!db) throw new Error('Firestore not initialized')
    
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
    
    if (userDoc.exists()) {
      return userDoc.data() as User
    } else {
      // Create user document if it doesn't exist
      const newUser: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || '',
        photoURL: firebaseUser.photoURL || undefined,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      }
      
      await setDoc(doc(db, 'users', firebaseUser.uid), newUser)
      return newUser
    }
  }

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase Auth not initialized')
    
    try {
      setLoading(true)
      const result = await signInWithEmailAndPassword(auth, email, password)
      const userData = await convertFirebaseUser(result.user)
      setUser(userData)
    } catch (error: any) {
      console.error('Sign in error:', error)
      throw new Error(error.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  // Sign up with email and password
  const signUp = async (email: string, password: string, name: string) => {
    if (!auth || !db) throw new Error('Firebase not initialized')
    
    try {
      setLoading(true)
      const result = await createUserWithEmailAndPassword(auth, email, password)
      
      // Update the user's display name
      await firebaseUpdateProfile(result.user, { displayName: name })
      
      // Create user document in Firestore
      const newUser: User = {
        id: result.user.uid,
        email: email,
        name: name,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      }
      
      await setDoc(doc(db, 'users', result.user.uid), newUser)
      setUser(newUser)
    } catch (error: any) {
      console.error('Sign up error:', error)
      throw new Error(error.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Firebase Auth not initialized')
    
    try {
      setLoading(true)
      const result = await signInWithPopup(auth, googleProvider)
      const userData = await convertFirebaseUser(result.user)
      setUser(userData)
    } catch (error: any) {
      console.error('Google sign in error:', error)
      throw new Error(error.message || 'Failed to sign in with Google')
    } finally {
      setLoading(false)
    }
  }

  // Sign out
  const signOut = async () => {
    if (!auth) throw new Error('Firebase Auth not initialized')
    
    try {
      await firebaseSignOut(auth)
      setUser(null)
    } catch (error: any) {
      console.error('Sign out error:', error)
      throw new Error(error.message || 'Failed to sign out')
    }
  }

  // Update user profile
  const updateProfile = async (data: Partial<User>) => {
    if (!user) throw new Error('No user logged in')
    if (!auth || !db) throw new Error('Firebase not initialized')
    
    try {
      setLoading(true)
      
      // Update Firebase Auth profile if name is being changed
      if (data.name && auth.currentUser) {
        await firebaseUpdateProfile(auth.currentUser, { displayName: data.name })
      }
      
      // Update Firestore document
      const updates = {
        ...data,
        updatedAt: serverTimestamp(),
      }
      
      await updateDoc(doc(db, 'users', user.id), updates)
      
      // Update local state
      setUser(prev => prev ? { ...prev, ...data } : null)
    } catch (error: any) {
      console.error('Update profile error:', error)
      throw new Error(error.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  // Listen for authentication state changes
  useEffect(() => {
    if (!isFirebaseAvailable) {
      console.warn('Firebase not available, authentication will not work')
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth!, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userData = await convertFirebaseUser(firebaseUser)
          setUser(userData)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Auth state change error:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [isFirebaseAvailable])

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
