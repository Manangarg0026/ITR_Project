import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Dashboard from "./pages/Dashboard/Dashboard";
import Transactions from "./pages/Transactions/Transactions";
import SystemAdmin from "./pages/SystemAdmin/SystemAdmin";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    // Check if session exists in localStorage
    const savedUser = localStorage.getItem("user_data");
    const token = localStorage.getItem("auth_token");

    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse cached session data:", e);
        localStorage.removeItem("user_data");
        localStorage.removeItem("auth_token");
      }
    }
    setBootstrapping(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogoutSuccess = () => {
    setUser(null);
    localStorage.removeItem("user_data");
    localStorage.removeItem("auth_token");
  };

  if (bootstrapping) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <span style={styles.loadingText}>Initializing Secure Session...</span>
      </div>
    );
  }

  return (
    <Router>
      <Navbar user={user} onLogout={handleLogoutSuccess} />
      <main style={styles.main}>
        <Routes>
          {/* Public Auth Routes */}
          <Route 
            path="/login" 
            element={
              user ? <Navigate to="/" replace /> : <Login onLoginSuccess={handleLoginSuccess} />
            } 
          />
          <Route 
            path="/register" 
            element={
              user ? <Navigate to="/" replace /> : <Register onLoginSuccess={handleLoginSuccess} />
            } 
          />

          {/* Protected Client Portal Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute user={user}>
                <Dashboard user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute user={user}>
                <Transactions user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/system-admin"
            element={
              <ProtectedRoute user={user} requireAdmin={true}>
                <SystemAdmin user={user} />
              </ProtectedRoute>
            }
          />

          {/* Catch-all Route redirects to Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </Router>
  );
}

const styles = {
  main: {
    minHeight: "calc(100vh - 80px)",
    backgroundColor: "var(--color-bg-light)",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    backgroundColor: "var(--color-primary)",
    color: "var(--color-white)",
    gap: "20px",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid rgba(255, 255, 255, 0.1)",
    borderTopColor: "var(--color-accent)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    fontFamily: "var(--font-sans)",
    fontSize: "1rem",
    fontWeight: "500",
    letterSpacing: "0.05em",
    color: "var(--color-accent)",
  }
};
