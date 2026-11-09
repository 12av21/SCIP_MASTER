// SCIP - Auth Context & Permission Hooks
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, UserPermission } from '../types/scip';
import { api } from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (email: string, pass: string) => Promise<User>;
  register: (payload: { name: string; email: string; password: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
  hasPermission: (permission: UserPermission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PERMISSIONS: Record<UserRole, UserPermission[]> = {
  citizen: [
    'report.create',
    'report.read',
    'report.update',
    'incident.read'
  ],
  officer: [
    'report.create',
    'report.read',
    'report.update',
    'report.assign',
    'incident.read',
    'incident.create',
    'incident.update',
    'incident.assign',
    'incident.resolve',
    'analytics.read',
    'intelligence.read'
  ],
  authority: [
    'user.read',
    'report.create',
    'report.read',
    'report.update',
    'report.delete',
    'report.assign',
    'incident.read',
    'incident.create',
    'incident.update',
    'incident.assign',
    'incident.resolve',
    'analytics.read',
    'intelligence.read',
    'audit.read'
  ],
  admin: [
    'user.read',
    'user.create',
    'user.update',
    'user.delete',
    'report.create',
    'report.read',
    'report.update',
    'report.delete',
    'report.assign',
    'incident.read',
    'incident.create',
    'incident.update',
    'incident.assign',
    'incident.resolve',
    'analytics.read',
    'intelligence.read',
    'audit.read',
    'admin.manage'
  ]
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const handleAuthExpired = () => {
      setUser(null);
      setAuthError('Your sign-in session expired. Please sign in again.');
    };
    window.addEventListener('scip:auth-expired', handleAuthExpired);

    if (!api.getToken()) {
      api.setStoredUser(null);
      setUser(null);
      setIsLoading(false);
    } else {
      void api.getCurrentUser(controller.signal)
        .then(currentUser => {
          api.setStoredUser(currentUser);
          setUser(currentUser);
          setAuthError(null);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setUser(null);
            setAuthError(api.getToken()
              ? 'Your saved session could not be verified. Check your connection or sign in again.'
              : 'Your sign-in session expired. Please sign in again.');
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }

    return () => {
      controller.abort();
      window.removeEventListener('scip:auth-expired', handleAuthExpired);
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await api.login({ email, password: pass });
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: { name: string; email: string; password: string; phone?: string }) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await api.register(payload);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setAuthError(null);
    api.setStoredUser(null);
    api.setToken(null);
  };

  const hasPermission = (permission: UserPermission): boolean => {
    if (!user) return false;
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'citizen',
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        register,
        logout,
        authError,
        hasPermission
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
