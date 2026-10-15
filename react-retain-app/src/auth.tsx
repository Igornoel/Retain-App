import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from './types';
import { api, getToken, setToken } from './api';

interface Auth {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Context = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api.me().then(setUser).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await api.login(email, password);
    setToken(result.token);
    setUser(result.user);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const result = await api.signup(name, email, password);
    setToken(result.token);
    setUser(result.user);
  };

  const signOut = async () => {
    try { if (getToken()) await api.logout(); } catch { /* Clear local credentials even if the server session already expired. */ } finally {
      setToken(null);
      setUser(null);
    }
  };

  return <Context.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</Context.Provider>;
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
