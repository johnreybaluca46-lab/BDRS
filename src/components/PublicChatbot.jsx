import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import { useChat } from '@ai-sdk/react';

import './lib/ResidentChatbot.css';
import { isNativeApp } from '../utils/platform';

class ChatbotErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{position: 'fixed', bottom: 20, right: 20, background: 'red', color: 'white', padding: 20, zIndex: 99999}}>
          Chatbot Error: {this.state.error?.toString()}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PublicChatbot() {
  return (
    <ChatbotErrorBoundary>
      <PublicChatbotInner />
    </ChatbotErrorBoundary>
  );
}

function PublicChatbotInner() {
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const API_BASE_URL = import.meta.env.VITE_VERCEL_API_URL || (isNativeApp ? 'https://bdrs-five.vercel.app' : '');

  const defaultWelcome = {
    id: 'welcome-message',
    role: 'assistant',
    content: "Hello! 👋 I'm the Public BDRS Assistant.\n\nHow can I help you today?\n\n*Security Notice: Never share your password, OTP, PIN, or recovery codes with the BDRS Assistant.*"
  };

  const [messages, setMessages] = useState([defaultWelcome]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingTime, setLoadingTime] = useState(0);

  useEffect(() => {
    let interval;
    if (isLoading) {
      setLoadingTime(0);
      interval = setInterval(() => {
        setLoadingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setLoadingTime(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && messagesEndRef.current && messages.length > 1) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const toggleChat = () => setIsOpen(!isOpen);

  const suggestedPrompts = [
    "What documents can I request?",
    "What are the requirements for Barangay Clearance?",
    "How do I request a document?",
    "What are your office hours?",
    "How does payment work?"
  ];

  const handleInputChange = (e) => setInput(e.target.value);

  const append = async (message) => {
    const newMessages = [...messages, { id: Date.now().toString(), ...message }];
    setMessages(newMessages);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/public-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });

      if (!response.ok) {
        let errMessage = 'The assistant is temporarily unavailable. Please try again.';
        if (response.status === 401) errMessage = 'Your session has expired. Please sign in again.';
        else if (response.status === 403) errMessage = 'You are not authorized to use this assistant.';
        else if (response.status === 429) errMessage = 'Too many requests. Please wait a moment and try again.';
        else if (response.status === 408 || response.status === 504) errMessage = 'The assistant took too long to respond. Please try again.';
        
        try { await response.json(); } catch(e) {}
        throw new Error(errMessage);
      }
      
      const data = await response.json();
      
      setMessages([...newMessages, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.text
      }]);
    } catch (err) {
      console.error('Chat error:', err);
      setError(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    append({ role: 'user', content: userMessage });
  };

  const handleSuggestionClick = (prompt) => {
    append({
      role: 'user',
      content: prompt
    });
  };

  return (
    <div className="bdrs-chatbot-wrapper theme-public">
      {!isOpen && (
        <button className="bdrs-chatbot-fab" onClick={toggleChat} aria-label="Open BDRS Assistant">
          <MessageCircle size={28} />
        </button>
      )}

      {isOpen && (
        <div className={`bdrs-chatbot-window theme-public ${false ? 'full-screen-mode' : ''}`}>
      <div className="bdrs-chatbot-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={22} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 'bold' }}>BDRS Assistant</div>
            <div style={{ fontSize: '11px', opacity: 0.85 }}>Your Barangay Document Guide</div>
          </div>
        </div>
        {(!false) && (
          <button className="bdrs-chatbot-close" onClick={toggleChat} aria-label="Close chat">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="bdrs-chatbot-messages">
        {messages.map(m => (
          m.role === 'assistant' ? (
            <div key={m.id} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--chat-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', maxWidth: '85%' }}>
                <div className={`bdrs-chatbot-message ${m.role}`} style={{ maxWidth: '100%' }}>
                  <div style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{m.content}</div>
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '4px' }}>
                  {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          ) : (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', marginBottom: '24px' }}>
              <div className={`bdrs-chatbot-message ${m.role}`} style={{ maxWidth: '85%' }}>
                <div style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{m.content}</div>
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginRight: '4px' }}>
                {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          )
        ))}
        
        {!isLoading && (
          <div className="bdrs-chatbot-suggestions">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 'bold', color: 'var(--chat-primary)', marginBottom: '8px', marginTop: '12px' }}>
              <Sparkles size={16} /> Suggested Questions
            </div>
            {suggestedPrompts.map((prompt, i) => (
              <button 
                key={i}
                className="bdrs-chatbot-suggestion-btn"
                onClick={() => handleSuggestionClick(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--chat-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={18} />
            </div>
            <div className="bdrs-chatbot-loading" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '13px' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <div className="bdrs-chatbot-dot"></div>
                <div className="bdrs-chatbot-dot"></div>
                <div className="bdrs-chatbot-dot"></div>
              </div>
              <span>({loadingTime}s)</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bdrs-chatbot-error">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="bdrs-chatbot-input-area" onSubmit={handleSubmit}>
        <input
          className="bdrs-chatbot-input"
          value={input}
          placeholder="Type your message..."
          onChange={handleInputChange}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className="bdrs-chatbot-send-btn" 
          disabled={isLoading || !input}
          aria-label="Send message"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
      )}
    </div>
  );
}
