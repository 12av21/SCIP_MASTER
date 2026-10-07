// SCIP - Auth Context & Permission Hooks
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, UserPermission } from '../types/scip';
import { api } from '../services/apiClient';
import { db } from '../database/scipDatabase';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (payload: { name: string; email: string; password: string; role?: UserRole; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
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

  useEffect(() => {
    // Initial user load from local storage if previously authenticated
    const storedUser = api.getStoredUser();
    const token = api.getToken();
    if (storedUser && token) {
      setUser(storedUser);
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password: pass });
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: { name: string; email: string; password: string; role?: UserRole; phone?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.register(payload);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    api.setStoredUser(null);
    api.setToken(null);
  };

  const switchDemoRole = async (targetRole: UserRole) => {
    setIsLoading(true);
    try {
      const res = await api.demoLogin(targetRole);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
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
        switchDemoRole,
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
