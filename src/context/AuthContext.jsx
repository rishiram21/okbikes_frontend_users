import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";

// Create Auth Context
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Initialize state from localStorage but also track if it's been loaded
  const [token, setToken] = useState(() => localStorage.getItem("jwtToken"));
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [tokenLoaded, setTokenLoaded] = useState(false);

  // Effect to run once on mount to ensure localStorage is accessed
  useEffect(() => {
    const storedToken = localStorage.getItem("jwtToken");
    if (storedToken) {
      console.log("Token loaded from localStorage on init");
      setToken(storedToken);
      
      // Set up axios default headers with the token
      axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
    }
    setTokenLoaded(true);
  }, []);

  // Keep isAuthenticated in sync with token
  useEffect(() => {
    setIsAuthenticated(!!token);
    
    // Set up axios default headers whenever token changes
    if (token) {
      console.log("Setting default Authorization header with token");
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      console.log("Removing Authorization header");
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  const login = (jwtToken) => {
    if (!jwtToken) {
      console.error("Attempted to login with null/empty token");
      return;
    }
    
    console.log("Login called with token:", jwtToken.substring(0, 10) + "...");
    localStorage.setItem("jwtToken", jwtToken);
    setToken(jwtToken);
    
    // Set up axios default headers immediately
    axios.defaults.headers.common["Authorization"] = `Bearer ${jwtToken}`;
    
    return jwtToken;
  };

  const logout = () => {
    console.log("Logout called, removing token");
    localStorage.removeItem("jwtToken");
    setToken(null);
    
    // Remove Authorization header
    delete axios.defaults.headers.common["Authorization"];
  };

  const openAuthModal = (mode = "login") => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  // For debugging
  const checkToken = () => {
    const storedToken = localStorage.getItem("jwtToken");
    const contextToken = storedToken;
    setIsAuthenticated(!!storedToken);
    setToken(storedToken);
    
    console.log("localStorage token:", storedToken ? storedToken.substring(0, 10) + "..." : "null");
    console.log("Context token:", contextToken ? contextToken.substring(0, 10) + "..." : "null");
    console.log("isAuthenticated:", isAuthenticated);
    
    return {
      storedToken: !!storedToken,
      contextToken: !!contextToken,
      isAuthenticated
    };
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        token,
        tokenLoaded,
        login,
        logout,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        authMode,
        checkToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);