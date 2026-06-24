import { createContext, useContext, useEffect, useState } from 'react';
import api, { fetchMe, login as apiLogin, register as apiRegister, logout as apiLogout } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to load profile from the backend
  const checkAuth = async () => {
    try {
      const response = await fetchMe();
      if (response.data?.success) {
        const currentUser = response.data.user;
        setUser(currentUser);
        localStorage.setItem('olj_role', currentUser.role);
        localStorage.setItem('olj_user', JSON.stringify(currentUser));
      } else {
        clearLocalAuth();
      }
    } catch (error) {
      clearLocalAuth();
    } finally {
      setLoading(false);
    }
  };

  const clearLocalAuth = () => {
    setUser(null);
    localStorage.removeItem('olj_role');
    localStorage.removeItem('olj_user');
  };

  useEffect(() => {
    checkAuth();

    // Axios interceptor to automatically handle 401 (Session Expired / Unauthenticated)
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          clearLocalAuth();
          const path = window.location.pathname;
          const publicPaths = ['/login', '/register', '/', '/dashboard', '/problems', '/contests'];
          const isPublicPage = publicPaths.some(p => path === p || path.startsWith('/problems/') || path.startsWith('/contests/'));
          if (!isPublicPage) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await apiLogin(credentials);
      if (response.data?.success) {
        const currentUser = response.data.user;
        setUser(currentUser);
        localStorage.setItem('olj_role', currentUser.role);
        localStorage.setItem('olj_user', JSON.stringify(currentUser));
        return { success: true, user: currentUser };
      }
      return { success: false, message: response.data?.message || 'Login failed' };
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid credentials';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (details) => {
    setLoading(true);
    try {
      const response = await apiRegister(details);
      if (response.data?.success) {
        const currentUser = response.data.user;
        setUser(currentUser);
        localStorage.setItem('olj_role', currentUser.role);
        localStorage.setItem('olj_user', JSON.stringify(currentUser));
        return { success: true, user: currentUser };
      }
      return { success: false, message: response.data?.message || 'Registration failed' };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed. Check details.';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      clearLocalAuth();
      window.location.href = '/';
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
