import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await authAPI.getMe();
          setUser(response.data);
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (username, password) => {
    console.log('AuthContext login called');
    const response = await authAPI.login({ username, password });
    console.log('API response:', response.data);
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    console.log('User set in context:', user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const hasRole = (roles) => {
    if (!user) return false;
    if (typeof roles === 'string') return user.role === roles;
    return roles.includes(user.role);
  };

  const ROLE_DEFAULT_PERMISSIONS = {
    receptionist: ['dashboard', 'rooms', 'checkin', 'stays', 'guests', 'reports'],
    housekeeping: ['housekeeping'],
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    // If user has explicit permissions set, use those
    if (user.permissions && user.permissions.length > 0) {
      return user.permissions.includes(permission);
    }
    // Fall back to role defaults (handles users created without explicit permissions)
    return (ROLE_DEFAULT_PERMISSIONS[user.role] || []).includes(permission);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    hasRole,
    hasPermission,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
