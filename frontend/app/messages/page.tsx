'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Paperclip, Search } from 'lucide-react';

interface Message {
  id: number;
  threadId: number;
  userId: number;
  content: string;
  attachmentUrl?: string;
  timestamp: string;
}

interface Thread {
  id: number;
  title: string;
  lastMessage: string;
  unreadCount: number;
  updatedAt: string;
}

export default function MessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch threads on component mount
  useEffect(() => {
    fetchThreads();
    const interval = setInterval(fetchThreads, 5000); // Auto-refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch messages when thread is selected
  useEffect(() => {
    if (selectedThread) {
      fetchMessages(selectedThread.id);
    }
  }, [selectedThread]);

  const fetchThreads = async () => {
    try {
      const response = await fetch('/api/messages/threads');
      const data = await response.json();
      setThreads(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching threads:', error);
      setLoading(false);
    }
  };

  const fetchMessages = async (threadId: number) => {
    try {
      const response = await fetch(`/api/messages/${threadId}`);
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedThread) return;

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: selectedThread.id,
          content: newMessage,
        }),
      });

      setNewMessage('');
      fetchMessages(selectedThread.id);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const filteredThreads = threads.filter((thread) =>
    thread.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Thread List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-4">
            <MessageCircle size={24} /> Messages
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
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No conversations found</div>
          ) : (
            filteredThreads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => setSelectedThread(thread)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedThread?.id === thread.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-900">{thread.title}</h3>
                  {thread.unreadCount > 0 && (
                    <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                      {thread.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 truncate mt-1">{thread.lastMessage}</p>
                <p className="text-xs text-gray-400 mt-2">{thread.updatedAt}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedThread ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">{selectedThread.title}</h2>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="flex flex-col space-y-1">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 bg-gray-100 p-3 rounded-lg max-w-xs">
                      <p className="text-gray-900">{msg.content}</p>
                      {msg.attachmentUrl && (
                        <a
                          href={msg.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 underline text-sm mt-2"
                        >
                          📎 Attachment
                        </a>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 ml-3">{msg.timestamp}</p>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 flex gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Paperclip size={20} className="text-gray-600" />
              </button>
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
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