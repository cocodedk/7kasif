import { useState, useCallback } from 'react';

interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  role: 'admin' | 'player';
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
        const user = JSON.parse(userJson);
        if (!user.role) user.role = 'player';
        return { user, token, loading: false };
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

  const requestMagicLink = useCallback(async (email: string) => {
    const res = await fetch(`${getApiBase()}/api/auth/send-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error('Failed to send login link');
  }, []);

  const verifyMagicToken = useCallback(async (token: string) => {
    const res = await fetch(`${getApiBase()}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const text = await res.text();
      let message = `Verification failed (${res.status})`;
      try { message = JSON.parse(text).error || message; } catch {}
      throw new Error(message);
    }
    const body = await res.json();
    if (!body.user.role) body.user.role = 'player';
    setAuth(body.user, body.token);
    return body;
  }, [setAuth]);

  return {
    user: state.user,
    token: state.token,
    loading: state.loading,
    isAuthenticated: !!state.user,
    requestMagicLink,
    verifyMagicToken,
    logout,
  };
}
