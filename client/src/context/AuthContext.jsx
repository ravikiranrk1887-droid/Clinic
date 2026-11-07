import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [staff, setStaff] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('cq_token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setStaff(null);
    setToken(null);
    localStorage.removeItem('cq_token');
    delete api.defaults.headers.common['Authorization'];
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const { data } = await api.get('/auth/me');
          setStaff(data.data);
        } catch {
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token, logout]);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    const { token: newToken, staff: staffData } = data.data;
    localStorage.setItem('cq_token', newToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setStaff(staffData);
    return staffData;
  };

  return (
    <AuthContext.Provider value={{ staff, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
