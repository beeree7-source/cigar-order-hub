"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CallLog {
  id: number;
  caller_id: number;
  recipient_id: number;
  caller_name: string;
  caller_role: string;
  recipient_name: string;
  recipient_role: string;
  call_type: string;
  status: string;
  duration: number;
  start_time: string;
  end_time?: string;
  notes?: string;
  created_at: string;
}

interface CallAnalytics {
  total_calls: number;
  completed_calls: number;
  missed_calls: number;
  inbound_calls: number;
  outbound_calls: number;
  avg_duration: number;
  total_duration: number;
  max_duration: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function CallsPage() {
  const [token, setToken] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [analytics, setAnalytics] = useState<CallAnalytics | null>(null);
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState("");
  const [filters, setFilters] = useState({
    callType: "",
    status: "",
    startDate: "",
    endDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // API call helper
  const apiCall = async (url: string, method = "GET", body?: any) => {
    const headers: any = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const res = await fetch(`${apiUrl}${url}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Request failed");
    }

    return res.json();
  };

  // Initialize - check for token and load user
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    
    if (!storedToken || !storedUser) {
      router.push("/");
      return;
    }

    setToken(storedToken);
    setCurrentUser(JSON.parse(storedUser));
  }, [router]);

  // Load data when token is available
  useEffect(() => {
    if (token) {
      loadCallLogs();
      loadAnalytics();
    }
  }, [token, filters]);

  const loadCallLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.callType) params.append("callType", filters.callType);
      if (filters.status) params.append("status", filters.status);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const queryString = params.toString();
      const url = `/api/protected/calls/logs${queryString ? `?${queryString}` : ""}`;
      const data = await apiCall(url);
      setCallLogs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const queryString = params.toString();
      const url = `/api/protected/calls/analytics${queryString ? `?${queryString}` : ""}`;
      const data = await apiCall(url);
      setAnalytics(data);
    } catch (err: any) {
      console.error("Failed to load analytics:", err);
    }
  };

  const openNotesModal = (call: CallLog) => {
    setSelectedCall(call);
    setNotes(call.notes || "");
    setShowNotesModal(true);
  };

  const saveNotes = async () => {
    if (!selectedCall) return;

    setLoading(true);
    try {
      await apiCall(`/api/protected/calls/${selectedCall.id}/notes`, "PUT", { notes });
      setShowNotesModal(false);
      setSelectedCall(null);
      setNotes("");
      await loadCallLogs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "completed":
        return "badge-success";
      case "missed":
        return "badge-danger";
      case "failed":
        return "badge-danger";
      case "answered":
        return "badge-success";
      default:
        return "badge-info";
    }
  };

  const getCallTypeIcon = (type: string) => {
    switch (type) {
      case "inbound":
        return "📞";
      case "outbound":
        return "📱";
      case "missed":
        return "📵";
      default:
        return "📞";
    }
  };

  if (!currentUser) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="calls-page">
      <header className="page-header">
        <div>
          <h1>Call Logs</h1>
          <p>Track and manage all call communications</p>
        </div>
        <div className="header-actions">
          <button onClick={() => router.push("/")} className="btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {/* Analytics Cards */}
      {analytics && (
        <div className="analytics-grid">
          <div className="analytics-card">
            <h3>Total Calls</h3>
            <div className="value">{analytics.total_calls}</div>
          </div>
          <div className="analytics-card">
            <h3>Completed</h3>
            <div className="value">{analytics.completed_calls}</div>
          </div>
          <div className="analytics-card">
            <h3>Missed</h3>
            <div className="value danger">{analytics.missed_calls}</div>
          </div>
          <div className="analytics-card">
            <h3>Avg Duration</h3>
            <div className="value">{formatDuration(Math.round(analytics.avg_duration || 0))}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <h3>Filters</h3>
        <div className="filters">
          <select
            value={filters.callType}
            onChange={(e) => setFilters({ ...filters, callType: e.target.value })}
          >
            <option value="">All Call Types</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
            <option value="missed">Missed</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value="initiated">Initiated</option>
            <option value="ringing">Ringing</option>
            <option value="answered">Answered</option>
            <option value="completed">Completed</option>
            <option value="missed">Missed</option>
            <option value="failed">Failed</option>
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            placeholder="Start Date"
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            placeholder="End Date"
          />

          <button
            onClick={() => setFilters({ callType: "", status: "", startDate: "", endDate: "" })}
            className="btn-text"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Call Logs Table */}
      <div className="table-section">
        <h3>Call History ({callLogs.length} calls)</h3>
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : callLogs.length === 0 ? (
          <div className="empty-state">
            <p>No call logs found</p>
            <small>Call logs will appear here once calls are made</small>
          </div>
        ) : (
          <div className="table-container">
            <table className="calls-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Caller</th>
                  <th>Recipient</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Start Time</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {callLogs.map((call) => (
                  <tr key={call.id}>
                    <td>
                      <span className="call-type-badge">
                        {getCallTypeIcon(call.call_type)} {call.call_type}
                      </span>
                    </td>
                    <td>
                      <div>
                        <div className="user-name">{call.caller_name}</div>
                        <div className="user-role">{call.caller_role}</div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div className="user-name">{call.recipient_name}</div>
                        <div className="user-role">{call.recipient_role}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(call.status)}`}>
                        {call.status}
                      </span>
                    </td>
                    <td>{formatDuration(call.duration)}</td>
                    <td>{formatDateTime(call.start_time)}</td>
                    <td>
                      {call.notes ? (
                        <span className="has-notes" title={call.notes}>
                          📝 Yes
                        </span>
                      ) : (
                        <span className="no-notes">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => openNotesModal(call)}
                        className="btn-small"
                        title="Add/Edit Notes"
                      >
                        {call.notes ? "Edit Notes" : "Add Notes"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="modal-overlay" onClick={() => setShowNotesModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Call Notes</h2>
              <button onClick={() => setShowNotesModal(false)} className="close-btn">
                ×
              </button>
            </div>
            <div className="modal-body">
              {selectedCall && (
                <div className="call-details">
                  <p>
                    <strong>Call:</strong> {selectedCall.caller_name} → {selectedCall.recipient_name}
                  </p>
                  <p>
                    <strong>Date:</strong> {formatDateTime(selectedCall.start_time)}
                  </p>
                  <p>
                    <strong>Duration:</strong> {formatDuration(selectedCall.duration)}
                  </p>
                </div>
              )}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this call..."
                rows={6}
              />
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowNotesModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={saveNotes} disabled={loading} className="btn-primary">
                {loading ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .calls-page {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e0e0e0;
        }

        .page-header h1 {
          margin: 0;
          font-size: 32px;
        }

        .page-header p {
          margin: 5px 0 0 0;
          color: #666;
        }

        .error-banner {
          background: #fee;
          border: 1px solid #fcc;
          color: #c00;
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-banner button {
          background: none;
          border: none;
          color: #c00;
          font-size: 20px;
          cursor: pointer;
          padding: 0 5px;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .analytics-card {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        }

        .analytics-card h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #666;
          text-transform: uppercase;
          font-weight: 600;
        }

        .analytics-card .value {
          font-size: 32px;
          font-weight: 700;
          color: #2196f3;
        }

        .analytics-card .value.danger {
          color: #ff4444;
        }

        .filters-section {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .filters-section h3 {
          margin: 0 0 15px 0;
          font-size: 18px;
        }

        .filters {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .filters select,
        .filters input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .filters select {
          min-width: 150px;
        }

        .table-section {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
        }

        .table-section h3 {
          margin: 0 0 15px 0;
          font-size: 18px;
        }

        .table-container {
          overflow-x: auto;
        }

        .calls-table {
          width: 100%;
          border-collapse: collapse;
        }

        .calls-table th {
          background: #f8f9fa;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #ddd;
        }

        .calls-table td {
          padding: 12px;
          border-bottom: 1px solid #eee;
        }

        .calls-table tr:hover {
          background: #f8f9fa;
        }

        .call-type-badge {
          display: inline-block;
          padding: 4px 8px;
          background: #e3f2fd;
          border-radius: 6px;
          font-size: 13px;
          text-transform: capitalize;
        }

        .user-name {
          font-weight: 500;
        }

        .user-role {
          font-size: 12px;
          color: #666;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .badge-success {
          background: #d4edda;
          color: #155724;
        }

        .badge-danger {
          background: #f8d7da;
          color: #721c24;
        }

        .badge-info {
          background: #d1ecf1;
          color: #0c5460;
        }

        .has-notes {
          color: #2196f3;
          cursor: pointer;
        }

        .no-notes {
          color: #999;
        }

        .loading-state,
        .empty-state {
          padding: 40px;
          text-align: center;
          color: #999;
        }

        .empty-state p {
          margin: 0 0 5px 0;
          font-size: 16px;
        }

        .empty-state small {
          font-size: 14px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 600px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #ddd;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 24px;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #666;
        }

        .close-btn:hover {
          color: #000;
        }

        .modal-body {
          padding: 20px;
        }

        .call-details {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 15px;
        }

        .call-details p {
          margin: 5px 0;
        }

        .modal-body textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
        }

        .modal-body textarea:focus {
          outline: none;
          border-color: #2196f3;
        }

        .modal-footer {
          padding: 20px;
          border-top: 1px solid #ddd;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-size: 18px;
        }

        .btn-primary,
        .btn-secondary,
        .btn-small,
        .btn-text {
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          border: none;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #2196f3;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #1976d2;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: white;
          color: #333;
          border: 1px solid #ddd;
        }

        .btn-secondary:hover {
          background: #f8f9fa;
        }

        .btn-small {
          background: #2196f3;
          color: white;
          padding: 6px 12px;
          font-size: 12px;
        }

        .btn-small:hover {
          background: #1976d2;
        }

        .btn-text {
          background: none;
          color: #2196f3;
          padding: 6px 12px;
        }

        .btn-text:hover {
          background: #f0f0f0;
        }
      `}</style>
    </div>
  );
}
