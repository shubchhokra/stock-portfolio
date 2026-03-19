import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signup = useCallback(async (email, username, password) => {
    // Check username availability first
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/check-username/${encodeURIComponent(username.trim())}`);
    const { available } = await res.json();
    if (!available) throw new Error('Username already taken');

    // Sign up — Supabase trigger auto-creates the profile row
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.trim() } },
    });
    if (error) throw new Error(error.message);
  }, []);

  const login = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const username = session?.user?.user_metadata?.username
    ?? session?.user?.email?.split('@')[0]
    ?? null;

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      username,
      isAuthenticated: !!session,
      isLoading: session === undefined,
      signup,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
