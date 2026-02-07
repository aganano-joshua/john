/**
 * UserContext.tsx
 * ===============
 * Authentication context for LinguaFlow.
 *
 * Provides the current user object plus login / logout helpers.
 * The user state is kept in memory (not persisted); refreshing
 * the page will log the user out.
 *
 * Usage:
 *   const { user, login, logout, isAuthenticated } = useUser();
 */

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Shape of the authenticated user.
 * Created during login and passed around via context.
 */
interface User {
  /** Unique user identifier (typically email-based) */
  userId: string;
  /** Display name shown in chat */
  name: string;
  /** Email address */
  email: string;
  /** Socket.IO connection ID (assigned after socket connects) */
  socketId: string;
}

/** Values exposed to consumers via useUser() */
interface UserContextType {
  /** The currently logged-in user, or null */
  user: User | null;
  /** Store a User object in state (i.e. "log in") */
  login: (userData: User) => void;
  /** Clear the user state (i.e. "log out") */
  logout: () => void;
  /** Convenience boolean: true when user !== null */
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

/**
 * UserProvider
 * Wrap your app with this to make authentication state available
 * to every child component via the useUser() hook.
 */
export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  /** Set the logged-in user */
  const login = (userData: User) => {
    setUser(userData);
  };

  /** Clear the logged-in user (log out) */
  const logout = () => {
    setUser(null);
  };

  /** Derived flag — true when a user is logged in */
  const isAuthenticated = user !== null;

  return (
    <UserContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </UserContext.Provider>
  );
};

/**
 * Hook to consume the user context.
 * Must be called inside a <UserProvider>.
 */
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
