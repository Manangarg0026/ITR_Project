import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Wallet, ShieldAlert, Award, ArrowUpRight } from "lucide-react";
import API from "../../api";

export default function Dashboard({ user }) {
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchAccountsAndBalances = async () => {
    try {
      setLoading(true);
      setError("");
      
      const accountsRes = await API.get("/accounts");
      const accountsList = accountsRes.data.accounts;
      setAccounts(accountsList);

      // Fetch balances for all accounts concurrently
      const balancePromises = accountsList.map(async (acc) => {
        try {
          const balRes = await API.get(`/accounts/balance/${acc._id}`);
          return { id: acc._id, balance: balRes.data.balance };
        } catch (err) {
          console.error(`Failed to fetch balance for account ${acc._id}:`, err);
          return { id: acc._id, balance: 0, error: true };
        }
      });

      const balanceResults = await Promise.all(balancePromises);
      const balanceMap = {};
      balanceResults.forEach((result) => {
        balanceMap[result.id] = result.balance;
      });
      setBalances(balanceMap);

    } catch (err) {
      console.error("Dashboard data load error:", err);
      setError("Failed to load accounts. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsAndBalances();
  }, []);

  const handleCreateAccount = async () => {
    setCreatingAccount(true);
    setError("");
    setSuccessMessage("");
    try {
      await API.post("/accounts", {});
      setSuccessMessage("New account established successfully.");
      await fetchAccountsAndBalances();
    } catch (err) {
      console.error("Account creation failed:", err);
      setError("Failed to open a new account. Please try again.");
    } finally {
      setCreatingAccount(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "ACTIVE":
        return styles.statusActive;
      case "FROZEN":
        return styles.statusFrozen;
      case "CLOSED":
        return styles.statusClosed;
      default:
        return {};
    }
  };

  const formatBalance = (amount, currency = "INR") => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  return (
    <div style={styles.container}>
      {/* Header Panel */}
      <div style={styles.headerPanel}>
        <div>
          <h1 className="serif-title" style={styles.welcomeTitle}>Welcome back, {user?.name}</h1>
          <p style={styles.welcomeSubtitle}>Manage your assets and real-time ledgers</p>
        </div>
        
        <button 
          onClick={handleCreateAccount} 
          className="btn btn-accent" 
          disabled={creatingAccount}
          style={styles.newAccountBtn}
        >
          <Plus size={18} style={{ marginRight: 6 }} />
          {creatingAccount ? "Establishing Account..." : "New Account"}
        </button>
      </div>

      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Main Layout Grid */}
      <div style={styles.grid}>
        {/* Left Side: Accounts List */}
        <div style={styles.mainCol}>
          <h3 style={styles.sectionTitle}>Your Accounts</h3>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner} />
              <span>Retrieving secure ledger data...</span>
            </div>
          ) : accounts.length === 0 ? (
            <div style={styles.emptyState}>
              <Wallet size={48} color="var(--color-accent)" style={{ marginBottom: 15 }} />
              <h4>No Active Accounts Found</h4>
              <p style={{ color: "var(--color-text-muted)", marginBottom: 20 }}>
                You have not opened any ledger accounts yet. Set up your first account to start sending and receiving funds.
              </p>
              <button onClick={handleCreateAccount} className="btn btn-primary" disabled={creatingAccount}>
                Create Your First Account
              </button>
            </div>
          ) : (
            <div style={styles.accountsList}>
              {accounts.map((acc) => (
                <div key={acc._id} className="card" style={styles.accountCard}>
                  <div style={styles.accountCardHeader}>
                    <div>
                      <div style={styles.accountName}>
                        Private Client Account
                        <span style={{ ...styles.statusBadge, ...getStatusStyle(acc.status) }}>
                          {acc.status}
                        </span>
                      </div>
                      <div style={styles.accountId}>ID: {acc._id}</div>
                    </div>
                    <Link 
                      to={`/transactions?fromAccount=${acc._id}`} 
                      className="btn btn-outline-gold" 
                      style={styles.actionBtn}
                    >
                      Transfers
                      <ArrowUpRight size={16} style={{ marginLeft: 6 }} />
                    </Link>
                  </div>
                  
                  <div style={styles.balanceContainer}>
                    <div style={styles.balanceLabel}>Real-Time Ledger Balance</div>
                    <div style={styles.balanceValue}>
                      {formatBalance(balances[acc._id] ?? 0, acc.currency)}
                    </div>
                  </div>
                  
                  <div style={styles.cardFooter}>
                    <span>Currency: <strong>{acc.currency}</strong></span>
                    <span>Created: {new Date(acc.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Quick Actions & Help Card */}
        <div style={styles.sideCol}>
          <div className="card" style={styles.infoCard}>
            <Award size={36} color="var(--color-accent)" style={{ marginBottom: 15 }} />
            <h4 style={styles.infoCardTitle}>Private Banking Experience</h4>
            <p style={styles.infoCardText}>
              Apex Horizon operates on a dual-entry immutable ledger system. Every single transaction you authorize writes an instantaneous debit and credit entry directly to the vaults, protecting your capital with complete transaction integrity.
            </p>
          </div>

          <div className="card" style={styles.quickActionsCard}>
            <h4 style={{ marginBottom: 15 }}>Quick Links</h4>
            <div style={styles.quickLinksList}>
              <Link to="/transactions" style={styles.quickLinkItem}>
                <span>Make a Secure Transfer</span>
                <ArrowUpRight size={16} />
              </Link>
              {user?.systemUser && (
                <Link to="/system-admin" style={styles.quickLinkItem}>
                  <span>Access Treasury Injects</span>
                  <ArrowUpRight size={16} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "40px 20px",
  },
  headerPanel: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "35px",
    borderBottom: "1px solid var(--color-border)",
    paddingBottom: "25px",
  },
  welcomeTitle: {
    fontSize: "2.2rem",
    fontWeight: "400",
    color: "var(--color-primary)",
    fontFamily: "var(--font-display)",
  },
  welcomeSubtitle: {
    color: "var(--color-text-muted)",
    fontSize: "1rem",
    marginTop: "4px",
  },
  newAccountBtn: {
    padding: "12px 24px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "35px",
  },
  mainCol: {
    display: "flex",
    flexDirection: "column",
  },
  sectionTitle: {
    fontSize: "1.2rem",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--color-text-muted)",
    marginBottom: "20px",
  },
  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 0",
    gap: "15px",
    color: "var(--color-text-muted)",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid var(--color-border)",
    borderTopColor: "var(--color-accent)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 40px",
    border: "2px dashed var(--color-border)",
    borderRadius: "8px",
  },
  accountsList: {
    display: "flex",
    flexDirection: "column",
    gap: "25px",
  },
  accountCard: {
    padding: "24px",
    borderLeft: "4px solid var(--color-accent)",
  },
  accountCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },
  accountName: {
    fontSize: "1.1rem",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "var(--color-primary)",
  },
  accountId: {
    fontFamily: "monospace",
    fontSize: "0.85rem",
    color: "var(--color-text-muted)",
    marginTop: "4px",
  },
  statusBadge: {
    fontSize: "0.7rem",
    padding: "4px 8px",
    borderRadius: "100px",
    fontWeight: "700",
    letterSpacing: "0.05em",
  },
  statusActive: {
    backgroundColor: "var(--color-success-bg)",
    color: "var(--color-success)",
  },
  statusFrozen: {
    backgroundColor: "var(--color-warning-bg)",
    color: "var(--color-warning)",
  },
  statusClosed: {
    backgroundColor: "var(--color-error-bg)",
    color: "var(--color-error)",
  },
  actionBtn: {
    padding: "8px 14px",
    fontSize: "0.85rem",
  },
  balanceContainer: {
    margin: "15px 0 20px 0",
  },
  balanceLabel: {
    fontSize: "0.8rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--color-text-muted)",
  },
  balanceValue: {
    fontSize: "2.2rem",
    fontWeight: "600",
    fontFamily: "var(--font-sans)",
    color: "var(--color-primary)",
    marginTop: "4px",
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    borderTop: "1px solid var(--color-border)",
    paddingTop: "15px",
    fontSize: "0.8rem",
    color: "var(--color-text-muted)",
  },
  sideCol: {
    display: "flex",
    flexDirection: "column",
    gap: "25px",
  },
  infoCard: {
    backgroundColor: "var(--color-primary)",
    color: "var(--color-white)",
    borderColor: "var(--color-primary)",
  },
  infoCardTitle: {
    color: "var(--color-white)",
    fontSize: "1.1rem",
    marginBottom: "10px",
  },
  infoCardText: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: "0.9rem",
    lineHeight: "1.6",
  },
  quickActionsCard: {
    padding: "24px",
  },
  quickLinksList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  quickLinkItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--border-radius)",
    fontSize: "0.9rem",
    fontWeight: "500",
    transition: "var(--transition-smooth)",
    color: "var(--color-primary)",
  },
  quickLinkItemHover: {
    borderColor: "var(--color-accent)",
    backgroundColor: "var(--color-accent-light)",
  }
};
