'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Search, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Contact {
  id: number;
  name: string;
  email: string;
  role: string;
  business_name?: string;
  employee_role?: string | null;
  communication_type?: 'team' | 'approved_partner';
}

interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  content: string;
  created_at: string;
  sender_name?: string;
  recipient_name?: string;
}

interface CallLog {
  id: number;
  caller_id: number;
  recipient_id: number;
  call_type: string;
  duration_seconds: number;
  notes: string;
  created_at: string;
  caller_name?: string;
  recipient_name?: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [callDuration, setCallDuration] = useState('0');
  const [callNotes, setCallNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loggingCall, setLoggingCall] = useState(false);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [teamOnlyMode, setTeamOnlyMode] = useState(false);

  const apiBase = 'http://localhost:10000';

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  useEffect(() => {
    const userRaw = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userRaw || !token) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userRaw);
      if (!['supplier', 'retailer'].includes(user.role)) {
        setError('Communication is only available for suppliers and retailers.');
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);
      if (typeof window !== 'undefined') {
        const scope = new URLSearchParams(window.location.search).get('scope');
        setTeamOnlyMode(scope === 'team');
      }
      loadContacts();
    } catch (e) {
      console.error(e);
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (!selectedContact) return;
    loadMessages(selectedContact.id);
    loadCallLogs(selectedContact.id);
    const interval = setInterval(() => {
      loadMessages(selectedContact.id);
      loadCallLogs(selectedContact.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedContact]);

  const loadContacts = async () => {
    try {
      setError('');
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
      const teamOnly = params.get('scope') === 'team';

      const endpoint = teamOnly
        ? `${apiBase}/api/communication/contacts?teamOnly=true`
        : `${apiBase}/api/communication/contacts`;

      const scopedResponse = await fetch(endpoint, {
        method: 'GET',
        headers: authHeaders()
      });

      const data = await scopedResponse.json();
      if (!scopedResponse.ok) {
        throw new Error(data.error || 'Failed to load contacts');
      }

      const loadedContacts: Contact[] = data.contacts || [];
      setContacts(loadedContacts);

      const requestedContactParam = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('contactId')
        : null;
      const requestedContactId = Number.parseInt(requestedContactParam || '', 10);
      if (Number.isFinite(requestedContactId)) {
        const requestedContact = loadedContacts.find((contact) => contact.id === requestedContactId);
        if (requestedContact) {
          setSelectedContact(requestedContact);
          return;
        }
      }

      if (!selectedContact && loadedContacts.length > 0) {
        setSelectedContact(loadedContacts[0]);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (contactId: number) => {
    try {
      const response = await fetch(`${apiBase}/api/messages?with_user_id=${contactId}`, {
        headers: authHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load messages');
      }

      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError(error instanceof Error ? error.message : 'Failed to load messages');
    }
  };

  const loadCallLogs = async (contactId: number) => {
    try {
      const response = await fetch(`${apiBase}/api/calls?with_user_id=${contactId}`, {
        headers: authHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load call logs');
      }

      setCallLogs(data.calls || []);
    } catch (error) {
      console.error('Error fetching call logs:', error);
      setError(error instanceof Error ? error.message : 'Failed to load call logs');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || sending) return;

    try {
      setSending(true);
      setError('');

      const response = await fetch(`${apiBase}/api/messages`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          recipient_id: selectedContact.id,
          content: newMessage.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setNewMessage('');
      await loadMessages(selectedContact.id);
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleLogCall = async () => {
    if (!selectedContact || loggingCall) return;

    try {
      setLoggingCall(true);
      setError('');

      const duration = Number.parseInt(callDuration, 10);
      const response = await fetch(`${apiBase}/api/calls`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          recipient_id: selectedContact.id,
          call_type: 'outbound',
          duration_seconds: Number.isFinite(duration) ? duration : 0,
          notes: callNotes.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to log call');
      }

      setCallDuration('0');
      setCallNotes('');
      await loadCallLogs(selectedContact.id);
    } catch (error) {
      console.error('Error logging call:', error);
      setError(error instanceof Error ? error.message : 'Failed to log call');
    } finally {
      setLoggingCall(false);
    }
  };

  const filteredContacts = contacts.filter((contact) =>
    `${contact.name} ${contact.business_name || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Contact List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-4">
            <MessageCircle size={24} /> {teamOnlyMode ? 'Employee Messages' : 'Messages'}
          </h1>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {teamOnlyMode ? 'No employees found for your business' : 'No contacts found'}
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedContact?.id === contact.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                  <span className="text-xs text-gray-500 uppercase">{contact.role}</span>
                </div>
                <p className="text-sm text-gray-600 truncate mt-1">{contact.business_name || contact.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  {contact.employee_role && (
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{contact.employee_role}</span>
                  )}
                  {contact.communication_type === 'team' && (
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">Employee</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedContact ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">{selectedContact.name}</h2>
              <p className="text-sm text-gray-500">{selectedContact.business_name || selectedContact.email}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-sm text-gray-500">No messages yet. Start the conversation.</div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col space-y-1 ${msg.sender_id === currentUserId ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-3 rounded-lg max-w-lg ${
                        msg.sender_id === currentUserId ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p>{msg.content}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleString()}</p>
                </div>
              ))}

              <div className="pt-4 mt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Phone size={16} className="text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Call Logs</h3>
                </div>

                <div className="flex gap-2 mb-3">
                  <input
                    type="number"
                    min={0}
                    value={callDuration}
                    onChange={(e) => setCallDuration(e.target.value)}
                    placeholder="Duration (sec)"
                    className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    placeholder="Call notes"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleLogCall}
                    disabled={loggingCall}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Log Call
                  </button>
                </div>

                <div className="space-y-2">
                  {callLogs.length === 0 && (
                    <p className="text-xs text-gray-500">No call logs yet.</p>
                  )}
                  {callLogs.slice(0, 8).map((log) => (
                    <div key={log.id} className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">{log.duration_seconds}s</span>
                        <span className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      {log.notes && <p className="text-gray-600 mt-1">{log.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}