import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './chat.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);

  // Load chats on mount
  useEffect(() => {
    const savedChats = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    setChats(savedChats);

    // Check if a chat was just created from Home
    const initialChatId = localStorage.getItem('currentChatId');
    if (initialChatId) {
      loadChat(initialChatId, savedChats);
      // Optional: Clear the flag so refresh doesn't always reset? 
      // Keeping it allows persistence on reload for now.
    }
  }, []);

  const createNewChat = () => {
    const newChatId = Date.now().toString();
    const newChat = {
      id: newChatId,
      title: "New Chat",
      messages: [],
      file: null,
      createdAt: new Date().toISOString()
    };

    const updatedChats = [newChat, ...chats];
    setChats(updatedChats);
    localStorage.setItem('chatHistory', JSON.stringify(updatedChats));
    loadChat(newChatId, updatedChats);
  };

  const loadChat = (chatId, chatList = chats) => {
    const chat = chatList.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages || []);
      setCurrentFile(chat.file || null);
      localStorage.setItem('currentChatId', chatId);
    }
  };

  const closePreview = () => {
    setCurrentFile(null);
  };

  const handleSend = () => {
    if (input.trim() && currentChatId) {
      const newUserMsg = { text: input, isUser: true };
      const updatedMessages = [...messages, newUserMsg];

      setMessages(updatedMessages);
      setInput('');

      // Update local storage
      const updatedChats = chats.map(c =>
        c.id === currentChatId
          ? { ...c, messages: updatedMessages, title: c.title === "New Chat" ? input.substring(0, 20) + "..." : c.title }
          : c
      );
      setChats(updatedChats);
      localStorage.setItem('chatHistory', JSON.stringify(updatedChats));

      // Simulate bot response
      setTimeout(() => {
        const botMsg = { text: "I'm a simulated AI response. I can see your document if one is uploaded.", isUser: false };
        const msgsWithBot = [...updatedMessages, botMsg];
        setMessages(msgsWithBot);

        const finalChats = updatedChats.map(c =>
          c.id === currentChatId
            ? { ...c, messages: msgsWithBot }
            : c
        );
        setChats(finalChats);
        localStorage.setItem('chatHistory', JSON.stringify(finalChats));
      }, 1000);
    } else if (!currentChatId) {
      // If no chat selected, create one
      createNewChat();
      // Wait a tick for state update (simplified for now, ideally use effect or promise)
      setTimeout(() => handleSend(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-container">
      {/* Sidebar */}
      <div className="chat-sidebar">
        <button className="new-chat-btn" onClick={createNewChat}>
          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          New chat
        </button>
        <div className="sidebar-menu">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`menu-item ${currentChatId === chat.id ? 'active' : ''}`}
              onClick={() => loadChat(chat.id)}
              style={{ cursor: 'pointer', padding: '10px', borderRadius: '4px', marginBottom: '5px', backgroundColor: currentChatId === chat.id ? 'rgba(255,255,255,0.1)' : 'transparent', color: '#fff' }}
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
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            Back to Home
          </Link>
        </div>
      </div>

      {/* Main Content Area - Full width now */}
      <div className="chat-content-wrapper">

        {/* Chat Panel */}
        <div className="chat-main">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <h1 className="welcome-title">
                {currentFile ? "Ask questions about your document" : "Where should we begin?"}
              </h1>
              <div className="message-tips">
                <div className="tip-column">
                  <div className="tip-card" onClick={() => setInput("Summarize this document")}>
                    "Summarize this document"
                  </div>
                  <div className="tip-card" onClick={() => setInput("What are the key points?")}>
                    "Key points"
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
                  borderBottom: '1px solid rgba(0,0,0,0.1)'
                }}>
                  <div style={{ maxWidth: '768px', margin: '0 auto', display: 'flex', gap: '20px' }}>
                    <div style={{ minWidth: '30px', height: '30px', borderRadius: '2px', background: msg.isUser ? '#5436DA' : '#10a37f' }}></div>
                    <div style={{ lineHeight: '1.6' }}>{msg.text}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="chat-input-area">
            <div className="input-wrapper">

              {/* File Preview */}
              {currentFile && (
                <div className="file-preview-container">
                  <div className="file-preview-content">
                    <svg className="file-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                    <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentFile.name}
                    </span>
                  </div>
                  <button className="close-preview-btn" onClick={closePreview}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
              )}

              <input
                className="chat-input"
                rows="1"
                placeholder="Ask anything"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button className="send-btn" onClick={handleSend}>
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>
            <div style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.5)',
              textAlign: 'center',
              width: '100%'
            }}>
              AI can make mistakes. Consider checking important information.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
