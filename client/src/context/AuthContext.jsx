import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('opd_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.getMe();
        setUser(res.user);
      } catch (err) {
        console.warn('Session expired or invalid:', err.message);
        localStorage.removeItem('opd_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = async (username, password) => {
    setError(null);
    try {
      const res = await api.login(username, password);
      localStorage.setItem('opd_token', res.token);
      setUser(res.user);
      return res.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('opd_token');
    setUser(null);
  };

  const switchDemoRole = async (targetRole) => {
    let creds = { username: 'admin', password: 'admin123' };
    if (targetRole === 'receptionist') {
      creds = { username: 'receptionist', password: 'reception123' };
    } else if (targetRole === 'doctor') {
      creds = { username: 'dr.sharma', password: 'doctor123' };
    }
    return await login(creds.username, creds.password);
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, switchDemoRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
