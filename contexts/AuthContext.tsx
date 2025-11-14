import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getMockUsers, getUserById } from '../services/authService';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  users: User[];
  loading: boolean;
  switchUser: (uid: string) => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  users: [], 
  loading: true, 
  switchUser: () => {} 
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const allUsers = getMockUsers();
    setUsers(allUsers);
    if (allUsers.length > 0) {
      setUser(allUsers[0]); // Default to the first user
    }
    setLoading(false);
  }, []);

  const switchUser = useCallback((uid: string) => {
    const newUser = getUserById(uid);
    if (newUser) {
      setUser(newUser);
    }
  }, []);

  const value = { user, users, loading, switchUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};