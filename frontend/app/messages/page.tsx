"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Conversation {
  thread_id: number;
  other_user_id: number;
  other_user_name: string;
  other_user_role: string;
  other_user_email: string;
  unread_count: number;
  last_message_content: string;
  last_message_time: string;
}

interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  sender_name: string;
  sender_role: string;
  message_type: string;
  content: string;
  attachment_url?: string;
  attachment_name?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function MessagesPage() {
  const [token, setToken] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // API call helper
  const apiCall = useCallback(async (url: string, method = "GET", body?: any) => {
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
  }, [token]);

  // Define functions before useEffect hooks that use them
  const loadConversations = useCallback(async () => {
    try {
      const data = await apiCall("/api/protected/messages/conversations");
      setConversations(data);
    } catch (err: any) {
      console.error("Failed to load conversations:", err);
    }
  }, [apiCall]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const data = await apiCall("/api/protected/messages/unread/count");
      setUnreadCount(data.count);
    } catch (err: any) {
      console.error("Failed to load unread count:", err);
    }
  }, [apiCall]);

  const loadMessages = useCallback(async (otherUserId: number) => {
    try {
      const data = await apiCall(`/api/protected/messages/thread/${otherUserId}`);
      setMessages(data.reverse()); // Reverse to show oldest first
      
      // Mark unread messages as read
      const unreadMessages = data.filter(
        (m: Message) => !m.is_read && m.recipient_id === currentUser?.id
      );
      
      for (const msg of unreadMessages) {
        await apiCall(`/api/protected/messages/${msg.id}/read`, "PUT");
      }
      
      // Reload conversations to update unread count
      if (unreadMessages.length > 0) {
        loadConversations();
        loadUnreadCount();
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [apiCall, currentUser, loadConversations, loadUnreadCount]);

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

  // Load conversations when token is available
  useEffect(() => {
    if (token) {
      loadConversations();
      loadUnreadCount();
      
      // Refresh every 30 seconds
      const interval = setInterval(() => {
        loadConversations();
        loadUnreadCount();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [token, loadConversations, loadUnreadCount]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation && token) {
      loadMessages(selectedConversation.other_user_id);
      
      // Auto-refresh messages every 10 seconds
      const interval = setInterval(() => {
        loadMessages(selectedConversation.other_user_id);
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [selectedConversation, token, loadMessages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setLoading(true);
    try {
      await apiCall("/api/protected/messages/send", "POST", {
        recipientId: selectedConversation.other_user_id,
        content: newMessage,
        messageType: "text",
      });

      setNewMessage("");
      await loadMessages(selectedConversation.other_user_id);
      await loadConversations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (messageId: number) => {
    if (!confirm("Delete this message?")) return;

    try {
      await apiCall(`/api/protected/messages/${messageId}`, "DELETE");
      if (selectedConversation) {
        await loadMessages(selectedConversation.other_user_id);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!currentUser) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="messages-page">
      <header className="page-header">
        <div>
          <h1>Messages</h1>
          <p>Communicate with suppliers, retailers, and sales reps</p>
        </div>
        <div className="header-actions">
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount} unread</span>
          )}
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

      <div className="messages-container">
        {/* Conversations List */}
        <div className="conversations-list">
          <h2>Conversations</h2>
          {conversations.length === 0 ? (
            <div className="empty-state">
              <p>No conversations yet</p>
              <small>Start messaging users to create conversations</small>
            </div>
          ) : (
            <div className="conversations">
              {conversations.map((conv) => (
                <div
                  key={conv.thread_id}
                  className={`conversation-item ${
                    selectedConversation?.thread_id === conv.thread_id ? "active" : ""
                  }`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <div className="conversation-header">
                    <div className="user-info">
                      <h3>{conv.other_user_name}</h3>
                      <span className="role-badge">{conv.other_user_role}</span>
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="unread-indicator">{conv.unread_count}</span>
                    )}
                  </div>
                  <div className="conversation-preview">
                    <p>{conv.last_message_content}</p>
                    <small>{formatTime(conv.last_message_time)}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Thread */}
        <div className="message-thread">
          {selectedConversation ? (
            <>
              <div className="thread-header">
                <div>
                  <h2>{selectedConversation.other_user_name}</h2>
                  <p>{selectedConversation.other_user_role} • {selectedConversation.other_user_email}</p>
                </div>
              </div>

              <div className="messages">
                {messages.length === 0 ? (
                  <div className="empty-state">
                    <p>No messages yet</p>
                    <small>Send a message to start the conversation</small>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`message ${
                        msg.sender_id === currentUser.id ? "sent" : "received"
                      }`}
                    >
                      <div className="message-content">
                        <div className="message-header">
                          <strong>{msg.sender_name}</strong>
                          <small>{formatTime(msg.created_at)}</small>
                        </div>
                        <p>{msg.content}</p>
                        {msg.attachment_url && (
                          <div className="attachment">
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                              📎 {msg.attachment_name || "Attachment"}
                            </a>
                          </div>
                        )}
                        {msg.sender_id === currentUser.id && (
                          <div className="message-actions">
                            <button
                              onClick={() => deleteMessage(msg.id)}
                              className="btn-text"
                              title="Delete message"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="message-input">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !newMessage.trim()}
                  className="btn-primary"
                >
                  {loading ? "Sending..." : "Send"}
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>Select a conversation to view messages</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .messages-page {
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

        .header-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .unread-badge {
          background: #ff4444;
          color: white;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
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

        .messages-container {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 20px;
          height: calc(100vh - 200px);
        }

        .conversations-list {
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .conversations-list h2 {
          background: #f8f9fa;
          padding: 15px 20px;
          margin: 0;
          font-size: 18px;
          border-bottom: 1px solid #ddd;
        }

        .conversations {
          flex: 1;
          overflow-y: auto;
        }

        .conversation-item {
          padding: 15px 20px;
          border-bottom: 1px solid #eee;
          cursor: pointer;
          transition: background 0.2s;
        }

        .conversation-item:hover {
          background: #f8f9fa;
        }

        .conversation-item.active {
          background: #e3f2fd;
          border-left: 4px solid #2196f3;
        }

        .conversation-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 8px;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .user-info h3 {
          margin: 0;
          font-size: 16px;
        }

        .role-badge {
          background: #e0e0e0;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          text-transform: capitalize;
        }

        .unread-indicator {
          background: #ff4444;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .conversation-preview {
          display: flex;
          justify-content: space-between;
          align-items: end;
        }

        .conversation-preview p {
          margin: 0;
          color: #666;
          font-size: 14px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 200px;
        }

        .conversation-preview small {
          color: #999;
          font-size: 12px;
        }

        .message-thread {
          border: 1px solid #ddd;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .thread-header {
          background: #f8f9fa;
          padding: 15px 20px;
          border-bottom: 1px solid #ddd;
        }

        .thread-header h2 {
          margin: 0;
          font-size: 20px;
        }

        .thread-header p {
          margin: 5px 0 0 0;
          color: #666;
          font-size: 14px;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          background: #fafafa;
        }

        .message {
          margin-bottom: 15px;
          display: flex;
        }

        .message.sent {
          justify-content: flex-end;
        }

        .message.received {
          justify-content: flex-start;
        }

        .message-content {
          max-width: 70%;
          background: white;
          padding: 12px 16px;
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .message.sent .message-content {
          background: #2196f3;
          color: white;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 13px;
        }

        .message-header small {
          opacity: 0.7;
        }

        .message-content p {
          margin: 0;
          word-wrap: break-word;
        }

        .attachment {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(0,0,0,0.1);
        }

        .attachment a {
          color: inherit;
          text-decoration: underline;
        }

        .message-actions {
          margin-top: 5px;
          display: flex;
          gap: 5px;
        }

        .btn-text {
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px 5px;
          opacity: 0.6;
        }

        .btn-text:hover {
          opacity: 1;
        }

        .message-input {
          padding: 15px 20px;
          border-top: 1px solid #ddd;
          display: flex;
          gap: 10px;
          background: white;
        }

        .message-input textarea {
          flex: 1;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          resize: none;
          font-family: inherit;
          font-size: 14px;
          min-height: 60px;
        }

        .message-input textarea:focus {
          outline: none;
          border-color: #2196f3;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: #999;
          text-align: center;
          height: 100%;
        }

        .empty-state p {
          margin: 0 0 5px 0;
          font-size: 16px;
        }

        .empty-state small {
          font-size: 14px;
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-size: 18px;
        }

        .btn-primary, .btn-secondary {
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
      `}</style>
    </div>
  );
}
