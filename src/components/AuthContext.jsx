import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isPublicApp, setIsPublicApp] = useState(false);

  // Check auth status once on mount
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
            // For public apps, don't set auth error - just stay logged out
            if (!isPublicApp) {
              setAuthError({ type: 'auth_required' });
            }
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Auth check error:', error);
          setUser(null);
          // Don't redirect on error in public apps
          if (!isPublicApp) {
            setAuthError({ type: 'auth_required' });
          }
        }
      } finally {
        if (isMounted) {
          setIsLoadingAuth(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [isPublicApp]);

  // Check if app is public (once on mount)
  useEffect(() => {
    let isMounted = true;

    const checkPublicSettings = async () => {
      try {
        // Try to check if app is public by attempting to get user
        // If it fails, app is likely public
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (isMounted) {
          setIsPublicApp(!isAuthenticated);
          setIsLoadingPublicSettings(false);
        }
      } catch (error) {
        if (isMounted) {
          setIsPublicApp(true);
          setIsLoadingPublicSettings(false);
        }
      }
    };

    checkPublicSettings();

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
        isAuthenticated: !!user,
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