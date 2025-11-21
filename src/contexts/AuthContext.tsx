
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'coordenador' | 'usuario';
  group_id: string | null;
  UsuarioData?: string; // Campo para dados do usuário (ex: "Jacqueline Santos - Bext")
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  signUp: (email: string, password: string, name: string, role?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        setProfile(null);
      } else if (profileData) {
        // Type assertion to ensure role is properly typed
        const typedProfile: Profile = {
          ...profileData,
          role: profileData.role as 'admin' | 'coordenador' | 'usuario'
        };
        setProfile(typedProfile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile after a small delay to prevent issues
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 100);

          // Redirecionar para dashboard APENAS quando for um novo login E estiver na página inicial
          if (event === 'SIGNED_IN' && location.pathname === '/') {
            navigate('/dashboard');
          }
          
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session - apenas uma vez na inicialização
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    };

    checkExistingSession();

    return () => subscription.unsubscribe();
  }, [fetchUserProfile, navigate, location.pathname]); // Adicionada dependência do location.pathname

  const signUp = useCallback(async (email: string, password: string, name: string, role: string = 'usuario') => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: name,
          role: role
        }
      }
    });
    
    return { error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  // Memoizar valores computados para evitar re-renders desnecessários
  const authValue = useMemo(() => ({
    user,
    profile,
    session,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user,
    loading
  }), [user, profile, session, signUp, signIn, signOut, loading]);

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
