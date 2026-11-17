import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, History, RefreshCw, Key, Landmark, CheckCircle } from "lucide-react";
import API from "../../api";

// Simple custom UUID generator for browser compatibility
const generateUUID = () => {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "idx_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export default function Transactions({ user }) {
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  
  // Status State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Session History State (stored in localStorage since backend doesn't have list APIs)
  const [history, setHistory] = useState([]);

  // Fetch accounts on load
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await API.get("/accounts");
      const accountsList = res.data.accounts.filter(acc => acc.status === "ACTIVE");
      setAccounts(accountsList);

      // Pre-select account if provided in query params, or default to first
      const queryFrom = searchParams.get("fromAccount");
      if (queryFrom && accountsList.some(a => a._id === queryFrom)) {
        setFromAccount(queryFrom);
      } else if (accountsList.length > 0) {
        setFromAccount(accountsList[0]._id);
      }

      // Fetch balances
      const balancePromises = accountsList.map(async (acc) => {
        try {
          const balRes = await API.get(`/accounts/balance/${acc._id}`);
          return { id: acc._id, balance: balRes.data.balance };
        } catch (e) {
          return { id: acc._id, balance: 0 };
        }
      });
      const balanceResults = await Promise.all(balancePromises);
      const balanceMap = {};
      balanceResults.forEach(r => balanceMap[r.id] = r.balance);
      setBalances(balanceMap);

    } catch (err) {
      console.error("Error loading transaction requirements:", err);
      setError("Unable to load active accounts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Load session history from localStorage
  const loadHistory = () => {
    if (!user) return;
    const key = `bank_history_${user._id}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse history:", e);
      }
    }
  };

  // Save transaction to history
  const saveToHistory = (tx) => {
    if (!user) return;
    const key = `bank_history_${user._id}`;
    const updated = [tx, ...history].slice(0, 15); // limit to 15 entries
    setHistory(updated);
    localStorage.setItem(key, JSON.stringify(updated));
  };

  useEffect(() => {
    fetchAccounts();
    loadHistory();
    setIdempotencyKey(generateUUID());
  }, [user]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
      setError("All transfer authorization parameters are required.");
      return;
    }

    if (fromAccount === toAccount) {
      setError("Sender and recipient accounts cannot be the same.");
      return;
    }

    if (parseFloat(amount) <= 0) {
      setError("Transfer amount must be greater than zero.");
      return;
    }

    const currentBalance = balances[fromAccount] || 0;
    if (parseFloat(amount) > currentBalance) {
      setError(`Insufficient funds. Your current balance is ${formatCurrency(currentBalance)}.`);
      return;
    }

    setSubmitting(true);

    try {
      const res = await API.post("/transactions", {
        fromAccount,
        toAccount,
        amount: parseFloat(amount),
        idempotencyKey,
      });

      setSuccess("Vault transaction processed and ledger entries committed successfully.");
      
      // Save to local history
      saveToHistory({
        id: res.data.transaction?._id || "TX_" + Date.now().toString().slice(-6),
        fromAccount,
        toAccount,
        amount: parseFloat(amount),
        status: "COMPLETED",
        timestamp: new Date().toISOString(),
        idempotencyKey
      });

      // Reset form fields
      setToAccount("");
      setAmount("");
      
      // Refresh balances
      await fetchAccounts();
      // Re-generate idempotency key for next transfer
      setIdempotencyKey(generateUUID());

    } catch (err) {
      console.error("Transfer error:", err);
      const msg = err.response?.data?.message || "Transaction authorization rejected. Please check receiver ID.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val, cur = "INR") => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: cur,
    }).format(val);
  };

  const truncateId = (id) => `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 className="serif-title" style={styles.title}>Secure Fund Transfer</h1>
        <p style={styles.subtitle}>Execute real-time double-entry ledger transfers</p>
      </div>

      <div style={styles.grid}>
        {/* Left Col: Transfer Form */}
        <div className="card" style={styles.formCard}>
          <div style={styles.cardHeader}>
            <Send size={20} color="var(--color-accent)" />
            <h3 style={styles.cardTitle}>Authorization Form</h3>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleTransfer}>
            <div className="form-group">
              <label className="form-label" htmlFor="fromAccount">Debit Account (Sender)</label>
              <select
                id="fromAccount"
                className="form-input"
                value={fromAccount}
                onChange={(e) => setFromAccount(e.target.value)}
                disabled={loading || submitting}
                required
              >
                {accounts.length === 0 && <option value="">No Active Accounts Available</option>}
                {accounts.map(acc => (
                  <option key={acc._id} value={acc._id}>
                    {acc._id.slice(0, 8)}... ({formatCurrency(balances[acc._id] ?? 0, acc.currency)})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="toAccount">Credit Account ID (Recipient Mongoose ID)</label>
              <input
                id="toAccount"
                type="text"
                className="form-input"
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                placeholder="Enter Recipient's Account ID (e.g. 64a8fb...)"
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="amount">Amount (INR)</label>
              <input
                id="amount"
                type="number"
                step="0.01"
                className="form-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group" style={styles.idempotencyGroup}>
              <div style={styles.idempotencyLabelRow}>
                <label className="form-label" style={{ marginBottom: 0 }}>Idempotency Key</label>
                <div style={styles.tooltip}>
                  <Key size={14} color="var(--color-accent)" />
                  <span style={{ marginLeft: 4 }}>Auto-assigned security key</span>
                </div>
              </div>
              <input
                type="text"
                className="form-input"
                style={styles.readonlyInput}
                value={idempotencyKey}
                readOnly
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={styles.submitBtn}
              disabled={submitting || accounts.length === 0}
            >
              {submitting ? (
                <>
                  <RefreshCw className="spin" size={18} style={{ marginRight: 8 }} />
                  Processing Ledger Entries... (15s Lock)
                </>
              ) : (
                "Authorize & Execute Transfer"
              )}
            </button>
          </form>
        </div>

        {/* Right Col: Local Session History */}
        <div className="card" style={styles.historyCard}>
          <div style={styles.cardHeader}>
            <History size={20} color="var(--color-accent)" />
            <h3 style={styles.cardTitle}>Recent Session Transactions</h3>
          </div>

          <div style={styles.historyContainer}>
            {history.length === 0 ? (
              <div style={styles.emptyHistory}>
                <History size={36} color="var(--color-border)" style={{ marginBottom: 10 }} />
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
                  No transfers executed in this session.
                </p>
              </div>
            ) : (
              <div style={styles.historyList}>
                {history.map((tx) => (
                  <div key={tx.id} style={styles.historyItem}>
                    <div style={styles.historyHeader}>
                      <div style={styles.txId}>TX: {truncateId(tx.id)}</div>
                      <div style={styles.txAmount}>{formatCurrency(tx.amount)}</div>
                    </div>
                    <div style={styles.txDetails}>
                      <div>From: <span style={styles.monoId}>{truncateId(tx.fromAccount)}</span></div>
                      <div>To: <span style={styles.monoId}>{truncateId(tx.toAccount)}</span></div>
                    </div>
                    <div style={styles.txFooter}>
                      <span style={styles.txTime}>{new Date(tx.timestamp).toLocaleTimeString()}</span>
                      <span style={styles.completedBadge}>
                        <CheckCircle size={12} style={{ marginRight: 3 }} />
                        Committed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={styles.ledgerInfo}>
            <p>
              <strong>Security Protocol:</strong> All ledger database commits run in a single atomic MongoDB transaction session to ensure that debits and credits cannot be partially executed.
            </p>
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
  header: {
    marginBottom: "35px",
    borderBottom: "1px solid var(--color-border)",
    paddingBottom: "25px",
  },
  title: {
    fontSize: "2.2rem",
    fontWeight: "400",
    color: "var(--color-primary)",
    fontFamily: "var(--font-display)",
  },
  subtitle: {
    color: "var(--color-text-muted)",
    fontSize: "1rem",
    marginTop: "4px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1.1fr 1fr",
    gap: "35px",
    alignItems: "start",
  },
  formCard: {
    padding: "30px",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "25px",
    borderBottom: "1px solid var(--color-border)",
    paddingBottom: "15px",
  },
  cardTitle: {
    fontSize: "1.2rem",
    fontWeight: "600",
    color: "var(--color-primary)",
  },
  idempotencyGroup: {
    backgroundColor: "var(--color-bg-light)",
    padding: "15px",
    borderRadius: "var(--border-radius)",
    border: "1px solid var(--color-border)",
  },
  idempotencyLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  tooltip: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "0.75rem",
    color: "var(--color-text-muted)",
    fontWeight: "600",
  },
  readonlyInput: {
    backgroundColor: "var(--color-white)",
    color: "var(--color-text-muted)",
    fontFamily: "monospace",
    fontSize: "0.85rem",
    borderColor: "var(--color-border)",
    cursor: "not-allowed",
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    fontSize: "1rem",
    fontWeight: "600",
    marginTop: "15px",
  },
  historyCard: {
    padding: "30px",
    display: "flex",
    flexDirection: "column",
  },
  historyContainer: {
    minHeight: "200px",
    maxHeight: "350px",
    overflowY: "auto",
    marginBottom: "20px",
  },
  emptyHistory: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 0",
  },
  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  historyItem: {
    padding: "15px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--border-radius)",
    backgroundColor: "var(--color-bg-light)",
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  txId: {
    fontFamily: "monospace",
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "var(--color-primary)",
  },
  txAmount: {
    fontSize: "1.05rem",
    fontWeight: "700",
    color: "var(--color-primary)",
  },
  txDetails: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.8rem",
    color: "var(--color-text-muted)",
    marginBottom: "10px",
  },
  monoId: {
    fontFamily: "monospace",
    color: "var(--color-text-dark)",
  },
  txFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.75rem",
    borderTop: "1px dotted var(--color-border)",
    paddingTop: "8px",
    color: "var(--color-text-muted)",
  },
  completedBadge: {
    display: "inline-flex",
    alignItems: "center",
    color: "var(--color-success)",
    fontWeight: "600",
  },
  ledgerInfo: {
    fontSize: "0.8rem",
    lineHeight: "1.5",
    color: "var(--color-text-muted)",
    backgroundColor: "var(--color-accent-light)",
    padding: "15px",
    borderRadius: "var(--border-radius)",
    border: "1px solid rgba(197, 168, 128, 0.25)",
  }
};
