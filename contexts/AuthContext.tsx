import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 네트워크 불가 등으로 INITIAL_SESSION이 오지 않을 때 무한 대기 방지.
    // 5초 후에도 응답 없으면 세션 없음으로 간주하고 로그인 화면으로 보낸다.
    const timeoutId = setTimeout(() => {
      console.warn('[AuthContext] 세션 확인 5초 초과 — 세션 없음으로 처리합니다.');
      setLoading(false);
    }, 5000);

    let unsubscribe: (() => void) | null = null;

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        clearTimeout(timeoutId);
        console.log(`[AuthContext] auth event: ${event}`, session?.user?.email ?? 'no user');
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch (error) {
      console.error('[AuthContext] auth 리스너 초기화 실패:', error);
      clearTimeout(timeoutId);
      setLoading(false);
    }

    return () => {
      clearTimeout(timeoutId);
      unsubscribe?.();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    username: string,
    displayName: string,
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // raw_user_meta_data에 담겨 handle_new_user 트리거가 profiles 행을 자동 생성한다.
        data: { username, display_name: displayName },
      },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
