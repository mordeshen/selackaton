// frontend/src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // בדיקת אימות בטעינה ראשונית
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        // בקשה לקבלת פרטי המשתמש באמצעות הטוקן
        const response = await axios.get('/api/users/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          setUser(response.data.data.user);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('token');
        setError('אירעה שגיאה באימות. נא להתחבר מחדש.');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // התחברות
  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/users/login', credentials);
      
      if (response.data.success) {
        localStorage.setItem('token', response.data.data.token);
        setUser(response.data.data.user);
        setIsAuthenticated(true);
        setError(null);
        return true;
      }
      
      return false;
    } catch (error) {
      setError(error.response?.data?.message || 'אירעה שגיאה בהתחברות');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // הרשמה
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/users/register', userData);
      
      if (response.data.success) {
        localStorage.setItem('token', response.data.data.token);
        setUser(response.data.data.user);
        setIsAuthenticated(true);
        setError(null);
        return true;
      }
      
      return false;
    } catch (error) {
      setError(error.response?.data?.message || 'אירעה שגיאה בהרשמה');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // התנתקות
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};