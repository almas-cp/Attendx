import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase, getCurrentUser, getUserProfile, signInWithEmail, signOut as supabaseSignOut } from './supabase';
import { Session } from '@supabase/supabase-js';

type UserProfile = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

type AuthContextType = {
  session: Session | null;
  user: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log('🔄 Initializing AuthProvider');
  
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔍 AuthProvider: Checking for existing session');
    
    // Check for existing session and set up auth state listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔑 Retrieved session state:', session ? 'Session exists' : 'No session');
      
      setSession(session);
      if (session) {
        console.log('👤 Session found, loading user profile');
        loadUserProfile();
      } else {
        console.log('👤 No session found, user is not authenticated');
      }
      setLoading(false);
    });

    // Listen for auth changes
    console.log('👂 Setting up auth state change listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`🔄 Auth state changed: ${event}`, session ? 'with session' : 'without session');
        
        setSession(session);
        if (session) {
          console.log('👤 New session detected, loading or refreshing user profile');
          await loadUserProfile();
        } else {
          console.log('👤 Session ended, clearing user profile');
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      console.log('👋 Cleaning up auth state change listener');
      subscription.unsubscribe();
    };
  }, []);

  // Load user profile data from database
  async function loadUserProfile() {
    console.log('🔍 AuthContext: Loading user profile data');
    
    try {
      const profile = await getUserProfile();
      
      if (profile) {
        console.log('✅ User profile loaded successfully. Name:', profile.name);
        setUser(profile as UserProfile);
      } else {
        console.log('⚠️ No user profile found in the database');
        
        // Create a temporary profile using current auth user
        const authUser = await getCurrentUser();
        if (authUser) {
          console.log('⚠️ Creating temporary user profile from auth data');
          const tempProfile: UserProfile = {
            id: '1', // Default ID
            name: authUser.user_metadata?.name || 
                  (authUser.email ? authUser.email.split('@')[0] : 'User'),
            email: authUser.email || '',
            created_at: authUser.created_at || new Date().toISOString()
          };
          setUser(tempProfile);
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      setUser(null);
    }
  }

  // Sign out function
  async function signOut() {
    console.log('🚪 AuthContext: Initiating sign out process');
    
    try {
      await supabaseSignOut();
      console.log('✅ AuthContext: Sign out successful, clearing user data');
      setUser(null);
    } catch (error) {
      console.error('💥 AuthContext: Unexpected error during sign out:', error);
    }
  }

  const value = {
    session,
    user,
    loading,
    signOut,
  };

  console.log(`🔐 AuthContext state: loading=${loading}, authenticated=${!!session}, user=${user ? user.name : 'none'}`);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to access auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    console.error('❌ useAuth called outside of AuthProvider!');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  console.log('🔐 useAuth: Accessing authentication context');
  return context;
} 