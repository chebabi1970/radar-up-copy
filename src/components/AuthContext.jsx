import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const isAuthenticated = await base44.auth.isAuthenticated();
        
        if (isMounted) {
          if (isAuthenticated) {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
            setAuthError(null);
          } else {
            setUser(null);
            setAuthError(null);
          }
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Auth check error:', error);
          setUser(null);
          setAuthError(null);
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const navigateToLogin = () => {
    base44.auth.redirectToLogin();
  };

  const logout = () => {
    base44.auth.logout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        navigateToLogin,
        logout,
        isPublicApp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};