import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './chat.css';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

// ─── API helpers ──────────────────────────────────────────────────────────────

async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed (${res.status})`);
  }
  return res.json(); // { document_id, filename, num_chunks }
}

async function queryDocument(documentId, question) {
  const res = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: documentId, question }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Query failed (${res.status})`);
  }
  return res.json(); // { answer, sources, model_used, ... }
}

// ─────────────────────────────────────────────────────────────────────────────

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);   // { name, documentId }
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load persisted chats on mount ────────────────────────────────────────
  useEffect(() => {
    const savedChats = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    setChats(savedChats);

    const initialChatId = localStorage.getItem('currentChatId');
    if (initialChatId) {
      loadChat(initialChatId, savedChats);
    }
  }, []);

  // ── Persist helpers ──────────────────────────────────────────────────────

  const saveChats = (updatedChats) => {
    setChats(updatedChats);
    localStorage.setItem('chatHistory', JSON.stringify(updatedChats));
  };

  const updateCurrentChat = (updatedMessages, updatedFile = undefined) => {
    setChats(prev => {
      const updated = prev.map(c => {
        if (c.id !== currentChatId) return c;
        return {
          ...c,
          messages: updatedMessages,
          // Only update file if explicitly passed
          ...(updatedFile !== undefined ? { file: updatedFile } : {}),
          // Use first user message as title
          title: c.title === 'New Chat'
            ? (updatedMessages.find(m => m.isUser)?.text?.substring(0, 25) + '...' || 'New Chat')
            : c.title,
        };
      });
      localStorage.setItem('chatHistory', JSON.stringify(updated));
      return updated;
    });
  };

  // ── Chat management ──────────────────────────────────────────────────────

  const createNewChat = () => {
    const newChatId = Date.now().toString();
    const newChat = {
      id: newChatId,
      title: 'New Chat',
      messages: [],
      file: null,
      createdAt: new Date().toISOString(),
    };
    const updatedChats = [newChat, ...chats];
    saveChats(updatedChats);
    setCurrentChatId(newChatId);
    setMessages([]);
    setCurrentFile(null);
    localStorage.setItem('currentChatId', newChatId);
  };

  const loadChat = (chatId, chatList = chats) => {
    const chat = chatList.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages || []);
      // Restore file info (name + documentId) if it was saved
      setCurrentFile(chat.file || null);
      localStorage.setItem('currentChatId', chatId);
    }
  };

  // ── File upload ──────────────────────────────────────────────────────────

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Make sure we have a chat to attach the file to
    let chatId = currentChatId;
    if (!chatId) {
      const newChatId = Date.now().toString();
      const newChat = {
        id: newChatId,
        title: file.name.substring(0, 25),
        messages: [],
        file: null,
        createdAt: new Date().toISOString(),
      };
      const updatedChats = [newChat, ...chats];
      saveChats(updatedChats);
      setCurrentChatId(newChatId);
      setMessages([]);
      localStorage.setItem('currentChatId', newChatId);
      chatId = newChatId;
    }

    setIsUploading(true);
    try {
      const result = await uploadDocument(file);
      const fileInfo = { name: file.name, documentId: result.document_id };
      setCurrentFile(fileInfo);

      // Persist file info into the chat
      setChats(prev => {
        const updated = prev.map(c =>
          c.id === chatId ? { ...c, file: fileInfo, title: file.name.substring(0, 25) } : c
        );
        localStorage.setItem('chatHistory', JSON.stringify(updated));
        return updated;
      });

      // Add a system message confirming the upload
      const systemMsg = {
        text: `✅ **${file.name}** uploaded and indexed (${result.num_chunks} chunks). You can now ask questions about it.`,
        isUser: false,
        isSystem: true,
      };
      setMessages(prev => {
        const updated = [...prev, systemMsg];
        // persist
        setChats(prevChats => {
          const updatedChats = prevChats.map(c =>
            c.id === chatId ? { ...c, messages: updated } : c
          );
          localStorage.setItem('chatHistory', JSON.stringify(updatedChats));
          return updatedChats;
        });
        return updated;
      });
    } catch (err) {
      const errMsg = {
        text: `❌ Upload failed: ${err.message}`,
        isUser: false,
        isSystem: true,
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsUploading(false);
      // Reset file input so same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const closePreview = () => setCurrentFile(null);

  // ── Send message → real API call ─────────────────────────────────────────

  const handleSend = async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    // Ensure we have a chat
    if (!currentChatId) {
      createNewChat();
      return;
    }

    const userMsg = { text: question, isUser: true };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    updateCurrentChat(updatedMessages);

    try {
      if (!currentFile?.documentId) {
        // No document uploaded yet — tell the user
        const botMsg = {
          text: "Please upload a document first using the 📎 button, then ask your question.",
          isUser: false,
        };
        const final = [...updatedMessages, botMsg];
        setMessages(final);
        updateCurrentChat(final);
        return;
      }

      // ← Real API call to FastAPI backend
      const result = await queryDocument(currentFile.documentId, question);

      const botMsg = {
        text: result.answer,
        isUser: false,
        model: result.model_used,
      };
      const final = [...updatedMessages, botMsg];
      setMessages(final);
      updateCurrentChat(final);
    } catch (err) {
      const errMsg = {
        text: `❌ Error: ${err.message}`,
        isUser: false,
      };
      const final = [...updatedMessages, errMsg];
      setMessages(final);
      updateCurrentChat(final);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="chat-container">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <button className="new-chat-btn" onClick={createNewChat}>
          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"
            strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em"
            xmlns="http://www.w3.org/2000/svg">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New chat
        </button>

        <div className="sidebar-menu">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`menu-item ${currentChatId === chat.id ? 'active' : ''}`}
              onClick={() => loadChat(chat.id)}
              style={{
                cursor: 'pointer', padding: '10px', borderRadius: '4px',
                marginBottom: '5px',
                backgroundColor: currentChatId === chat.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: '#fff',
              }}
            >
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {chat.title}
              </div>
              <div style={{ fontSize: '0.7em', opacity: 0.7 }}>
                {new Date(chat.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <Link to="/" className="menu-item" style={{ textDecoration: 'none', color: 'white' }}>
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"
              strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em"
              xmlns="http://www.w3.org/2000/svg">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Back to Home
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="chat-content-wrapper">
        <div className="chat-main">

          {/* Messages or Welcome */}
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <h1 className="welcome-title">
                {currentFile ? `Chatting about: ${currentFile.name}` : 'Upload a document to begin'}
              </h1>
              <div className="message-tips">
                <div className="tip-column">
                  <div className="tip-card" onClick={() => setInput('Summarize this document')}>
                    "Summarize this document"
                  </div>
                  <div className="tip-card" onClick={() => setInput('What are the key points?')}>
                    "What are the key points?"
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>
              {messages.map((msg, index) => (
                <div key={index} style={{
                  padding: '20px',
                  backgroundColor: msg.isUser ? 'var(--user-msg-bg)' : 'var(--bot-msg-bg)',
                  borderBottom: '1px solid rgba(0,0,0,0.1)',
                }}>
                  <div style={{ maxWidth: '768px', margin: '0 auto', display: 'flex', gap: '20px' }}>
                    <div style={{
                      minWidth: '30px', height: '30px', borderRadius: '2px',
                      background: msg.isUser ? '#5436DA' : msg.isSystem ? '#555' : '#10a37f',
                      flexShrink: 0,
                    }} />
                    <div style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                      {msg.text}
                      {msg.model && (
                        <div style={{ fontSize: '0.7em', opacity: 0.5, marginTop: '6px' }}>
                          via {msg.model}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div style={{ padding: '20px', backgroundColor: 'var(--bot-msg-bg)' }}>
                  <div style={{ maxWidth: '768px', margin: '0 auto', display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ minWidth: '30px', height: '30px', borderRadius: '2px', background: '#10a37f', flexShrink: 0 }} />
                    <div style={{ opacity: 0.6 }}>Thinking…</div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input Area */}
          <div className="chat-input-area">
            <div className="input-wrapper">

              {/* File Preview */}
              {currentFile && (
                <div className="file-preview-container">
                  <div className="file-preview-content">
                    <svg className="file-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentFile.name}
                    </span>
                  </div>
                  <button className="close-preview-btn" onClick={closePreview}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {/* Upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Upload document"
                style={{
                  background: 'none', border: 'none', cursor: isUploading ? 'wait' : 'pointer',
                  color: 'rgba(255,255,255,0.6)', padding: '0 8px', fontSize: '20px',
                  display: 'flex', alignItems: 'center',
                }}
              >
                {isUploading ? '⏳' : '📎'}
              </button>

              <input
                className="chat-input"
                placeholder={currentFile ? 'Ask anything about your document…' : 'Upload a document first, then ask a question…'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />

              <button className="send-btn" onClick={handleSend} disabled={isLoading || !input.trim()}>
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"
                  strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>

            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', width: '100%' }}>
              AI can make mistakes. Consider checking important information.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Chat;