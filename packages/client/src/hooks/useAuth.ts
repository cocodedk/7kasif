import { useState, useCallback, useEffect } from 'react';

interface AuthUser {
  id: number;
  username: string;
  displayName: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

const TOKEN_KEY = 'hk_token';
const USER_KEY = 'hk_user';

function getApiBase(): string {
  return window.location.origin;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    if (token && userJson) {
      try {
        return { user: JSON.parse(userJson), token, loading: false };
      } catch {
        // Corrupt data
      }
    }
    return { user: null, token: null, loading: false };
  });

  const setAuth = useCallback((user: AuthUser, token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setState({ user, token, loading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setState({ user: null, token: null, loading: false });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${getApiBase()}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Login failed');
    setAuth(body.user, body.token);
    return body;
  }, [setAuth]);

  return {
    user: state.user,
    token: state.token,
    loading: state.loading,
    isAuthenticated: !!state.user,
    login,
    logout,
  };
}
