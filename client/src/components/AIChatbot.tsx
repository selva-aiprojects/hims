import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, X, Send, User, Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const AIChatbot: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: "Hello! I'm your Healthezee AI Assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const tenantId = localStorage.getItem('tenant') || 'tenant1';
      const token = localStorage.getItem('token');
      
      const res = await axios.post(`${API_BASE}/api/hospital/ai/chat`, {
        messages: [...messages, userMessage]
      }, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId 
        }
      });

      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "I encountered an error while analyzing your request. Please check the clinical modules for data." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Suppress chatbot if in login page or automation mode to avoid UI overlaps in tests
  if (
    location.pathname === '/' || 
    location.pathname === '/login' || 
    localStorage.getItem('isAutomation') === 'true'
  ) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes chatbot-float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        .chatbot-floating {
          animation: chatbot-float 4s ease-in-out infinite;
        }
        .chatbot-floating:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div style={{ 
        position: 'fixed', 
        bottom: '30px', 
        right: '30px', 
        zIndex: 999999,
        fontFamily: 'sans-serif'
      }}>
      {/* Chat Window */}
      {isOpen && (
        <div style={{
          backgroundColor: '#ffffff',
          width: '380px',
          height: '550px',
          borderRadius: '20px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          marginBottom: '20px'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ffffff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <MessageSquare size={20} />
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>Healthezee AI</div>
                <div style={{ fontSize: '10px', opacity: 0.8 }}>Tenant-Isolated Assistant</div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            backgroundColor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{ 
                display: 'flex', 
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' 
              }}>
                <div style={{ 
                  backgroundColor: m.role === 'user' ? '#2563eb' : '#ffffff',
                  color: m.role === 'user' ? '#ffffff' : '#334155',
                  padding: '12px',
                  borderRadius: '15px',
                  fontSize: '13px',
                  maxWidth: '85%',
                  boxShadow: m.role === 'user' ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                  border: m.role === 'user' ? 'none' : '1px solid #e2e8f0'
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ color: '#64748b', fontSize: '12px', fontStyle: 'italic' }}>
                Analyzing hospital metrics...
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                style={{
                  flex: 1,
                  padding: '10px 15px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  outline: 'none',
                  fontSize: '13px'
                }}
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                style={{
                  padding: '10px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  opacity: isLoading ? 0.5 : 1
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="chatbot-floating"
          style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
            borderRadius: '50%',
            border: 'none',
            boxShadow: '0 8px 25px rgba(99,102,241,0.4)',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s'
          }}
        >
          <MessageSquare size={30} />
        </button>
      )}
    </div>
    </>
  );
};

export default AIChatbot;
