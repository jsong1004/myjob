"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from 'next/navigation'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { User, AuthContextType } from '@/lib/types'
import { useIdleTimeout } from '@/hooks/use-idle-timeout';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const router = useRouter();

  const signOut = async () => {
    if (!auth) throw new Error("Auth not initialized");
    await firebaseSignOut(auth);
    setUser(null);
  };

  const signOutWithRedirect = async () => {
    if (!auth) throw new Error("Auth not initialized");
    await firebaseSignOut(auth);
    setUser(null);
    router.push('/'); // Redirect to main page after timeout
  };

  // Idle timeout hook - only active when user is logged in
  useIdleTimeout({ 
    onIdle: signOutWithRedirect, 
    idleTime: 60, // 60 minutes (1 hour) idle timeout
    enabled: !!user // Only enable when user is logged in
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({ id: firebaseUser.uid, ...userData } as User);
          // Don't trigger onboarding for existing users signing in
        } else {
          const newUser: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || "",
            name: firebaseUser.displayName || "New User",
            photoURL: firebaseUser.photoURL || "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            onboardingCompleted: false,
          };
          await setDoc(userDocRef, newUser);
          setUser(newUser);
          
          // Trigger onboarding for new users
          setShowOnboarding(true);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const signIn = async (email: string, password: string) => {
    if (!auth) throw new Error("Auth not initialized");
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, name: string) => {
    if (!auth || !db) throw new Error("Firebase not initialized");
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (result.user) {
        await firebaseUpdateProfile(result.user, { displayName: name });
        const newUser = {
          id: result.user.uid,
          email,
          name,
          photoURL: result.user.photoURL,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          onboardingCompleted: false,
        };
        await setDoc(doc(db, "users", result.user.uid), newUser);
        
        // Onboarding will be triggered by the auth state change
    }
  };

  const signInWithGoogle = async () => {
    if (!auth) throw new Error("Auth not initialized");
    await signInWithPopup(auth, googleProvider);
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user || !db) throw new Error("No user logged in or DB not initialized.");
    const userDocRef = doc(db, "users", user.id);
    await updateDoc(userDocRef, { ...data, updatedAt: serverTimestamp() });
    setUser(prevUser => prevUser ? { ...prevUser, ...data } as User : null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        updateProfile,
        showOnboarding,
        setShowOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}