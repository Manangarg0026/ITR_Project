import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Landmark, LogOut, User, DollarSign, Shield } from "lucide-react";
import API from "../api";

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await API.post("/auth/logout");
    } catch (err) {
      console.error("Logout failed on server:", err);
    } finally {
      onLogout();
      navigate("/login");
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <Link to="/" style={styles.logoContainer}>
          <Landmark size={28} color="var(--color-accent)" />
          <span className="serif-title" style={styles.logoText}>APEX HORIZON</span>
          <span style={styles.logoSubtext}>BANK & TRUST</span>
        </Link>

        {user && (
          <nav style={styles.nav}>
            <Link 
              to="/" 
              style={{
                ...styles.navLink,
                ...(isActive("/") ? styles.activeNavLink : {})
              }}
            >
              Dashboard
            </Link>
            <Link 
              to="/transactions" 
              style={{
                ...styles.navLink,
                ...(isActive("/transactions") ? styles.activeNavLink : {})
              }}
            >
              Transfers
            </Link>
            {user.systemUser && (
              <Link 
                to="/system-admin" 
                style={{
                  ...styles.navLink,
                  ...styles.adminLink,
                  ...(isActive("/system-admin") ? styles.activeNavLink : {})
                }}
              >
                <Shield size={16} style={{ marginRight: 6 }} />
                Treasury
              </Link>
            )}
          </nav>
        )}

        <div style={styles.userSection}>
          {user ? (
            <>
              <div style={styles.userInfo}>
                <div style={styles.avatar}>
                  <User size={16} color="var(--color-primary)" />
                </div>
                <div style={styles.userDetails}>
                  <span style={styles.userName}>{user.name}</span>
                  <span style={styles.userRole}>
                    {user.systemUser ? "Treasury Officer" : "Private Client"}
                  </span>
                </div>
              </div>
              <button onClick={handleLogout} className="btn btn-outline-gold" style={styles.logoutBtn}>
                <LogOut size={16} style={{ marginRight: 6 }} />
                Sign Out
              </button>
            </>
          ) : (
            <div style={styles.authButtons}>
              {location.pathname !== "/login" && (
                <Link to="/login" className="btn btn-outline-gold" style={{ marginRight: 10 }}>
                  Sign In
                </Link>
              )}
              {location.pathname !== "/register" && (
                <Link to="/register" className="btn btn-accent">
                  Open Account
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    backgroundColor: "var(--color-primary)",
    color: "var(--color-white)",
    borderBottom: "2px solid var(--color-accent)",
    padding: "0 20px",
    height: "80px",
    display: "flex",
    alignItems: "center",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "var(--shadow-md)",
  },
  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    textDecoration: "none",
  },
  logoText: {
    fontSize: "1.3rem",
    fontWeight: "700",
    color: "var(--color-white)",
    lineHeight: "1.1",
    letterSpacing: "0.05em",
  },
  logoSubtext: {
    fontSize: "0.65rem",
    color: "var(--color-accent)",
    fontWeight: "700",
    letterSpacing: "0.2em",
    marginTop: "2px",
  },
  nav: {
    display: "flex",
    gap: "30px",
    alignItems: "center",
    marginLeft: "40px",
    flex: 1,
  },
  navLink: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: "0.95rem",
    fontWeight: "500",
    transition: "var(--transition-smooth)",
    padding: "8px 4px",
    borderBottom: "2px solid transparent",
  },
  activeNavLink: {
    color: "var(--color-accent)",
    borderBottomColor: "var(--color-accent)",
  },
  adminLink: {
    display: "flex",
    alignItems: "center",
  },
  userSection: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "var(--color-accent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  userDetails: {
    display: "flex",
    flexDirection: "column",
  },
  userName: {
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "var(--color-white)",
  },
  userRole: {
    fontSize: "0.75rem",
    color: "var(--color-accent)",
  },
  logoutBtn: {
    padding: "8px 12px",
    fontSize: "0.85rem",
  },
  authButtons: {
    display: "flex",
    alignItems: "center",
  }
};
