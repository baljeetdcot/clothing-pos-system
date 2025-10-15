import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { databaseService } from '../services/adaptiveDatabase';
import { networkDatabaseService } from '../services/networkDatabase';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication status
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        
        // For network mode, check server session (when not on localhost)
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
          const authStatus = await networkDatabaseService.checkAuthStatus();
          if (authStatus.authenticated && authStatus.user) {
            setUser(authStatus.user);
            localStorage.setItem('pos_user', JSON.stringify(authStatus.user));
          }
        } else {
          // For Electron mode, check localStorage
          const savedUser = localStorage.getItem('pos_user');
          if (savedUser) {
            try {
              setUser(JSON.parse(savedUser));
            } catch (error) {
              console.error('Error parsing saved user:', error);
              localStorage.removeItem('pos_user');
            }
          }
        }
      } catch (error) {
        console.error('Auth status check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Use network service for cloud deployment, local service for localhost
      const userData = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
        ? await networkDatabaseService.authenticateUser(username, password)
        : await databaseService.authenticateUser(username, password);
      
      if (userData) {
        setUser(userData);
        localStorage.setItem('pos_user', JSON.stringify(userData));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // For network mode, call server logout (when not on localhost)
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        await networkDatabaseService.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('pos_user');
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      setLoading(true);
      
      // Network mode: use dedicated endpoint (when not on localhost)
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        await networkDatabaseService.changeOwnPassword(currentPassword, newPassword);
        return true;
      }

      // Electron mode: verify and then update locally
      const isValid = await databaseService.authenticateUser(user.username, currentPassword);
      if (!isValid) return false;
      await databaseService.updateUser(user.id, { password: newPassword });
      return true;
    } catch (error) {
      console.error('Change password error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    changePassword,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
