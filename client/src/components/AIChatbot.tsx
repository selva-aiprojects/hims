import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { MessageSquare, X, Send, GripVertical, Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const STORAGE_KEY = 'chatbot_position';

const AIChatbot: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: "Hello! I'm your Healthezee AI Assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- DRAG STATE ---
  const widgetRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, elLeft: 0, elTop: 0 });

  const getSavedPos = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { left: 300, top: window.innerHeight - 110 };
  };

  const [pos, setPos] = useState<{ left: number; top: number }>(getSavedPos);

  const savePos = (p: { left: number; top: number }) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  };

  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const el = widgetRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, elLeft: rect.left, elTop: rect.top };
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      setPos({
        left: clamp(dragStart.current.elLeft + dx, 0, window.innerWidth - 70),
        top: clamp(dragStart.current.elTop + dy, 0, window.innerHeight - 70)
      });
    };
    const onUp = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      const finalPos = {
        left: clamp(dragStart.current.elLeft + dx, 0, window.innerWidth - 70),
        top: clamp(dragStart.current.elTop + dy, 0, window.innerHeight - 70)
      };
      setPos(finalPos);
      savePos(finalPos);
      setIsDragging(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging]);

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
      const tenantId = localStorage.getItem('tenant') || '';
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE}/api/hospital/ai/chat`, {
        messages: [...messages, userMessage]
      }, {
        headers: { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId }
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "I encountered an error. Please check the clinical modules for data." }]);
    } finally {
      setIsLoading(false);
    }
  };

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
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
        .chatbot-floating { animation: chatbot-float 4s ease-in-out infinite; }
        .chatbot-floating:hover, .chatbot-dragging { animation-play-state: paused; }
        .chatbot-drag-handle { cursor: grab; }
        .chatbot-drag-handle:active { cursor: grabbing; }
      `}</style>

      <div
        ref={widgetRef}
        style={{
          position: 'fixed',
          left: `${pos.left}px`,
          top: `${pos.top}px`,
          zIndex: 999999,
          fontFamily: 'sans-serif',
          userSelect: 'none'
        }}
      >
        {/* Chat Window */}
        {isOpen && (
          <div style={{
            backgroundColor: '#ffffff',
            width: '380px',
            height: '520px',
            borderRadius: '20px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            marginBottom: '16px'
          }}>
            {/* Header — drag handle */}
            <div
              onMouseDown={onMouseDown}
              className="chatbot-drag-handle"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#ffffff'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <GripVertical size={16} style={{ opacity: 0.7 }} />
                <MessageSquare size={18} />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px' }}>Healthezee AI</div>
                  <div style={{ fontSize: '10px', opacity: 0.8 }}>Drag to move • Tenant-Isolated</div>
                </div>
              </div>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
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
              gap: '14px'
            }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    backgroundColor: m.role === 'user' ? '#2563eb' : '#ffffff',
                    color: m.role === 'user' ? '#ffffff' : '#334155',
                    padding: '10px 14px',
                    borderRadius: '14px',
                    fontSize: '13px',
                    maxWidth: '85%',
                    boxShadow: m.role === 'user' ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                    border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
                    lineHeight: 1.5
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>
                  <Loader2 size={14} />
                  Analyzing hospital metrics...
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ padding: '14px 16px', borderTop: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Ask me anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
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
                    padding: '10px 14px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    opacity: (isLoading || !input.trim()) ? 0.5 : 1
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Toggle Button */}
        {!isOpen && (
          <div style={{ position: 'relative' }}>
            {/* Small drag grip above the button */}
            <div
              onMouseDown={onMouseDown}
              className="chatbot-drag-handle"
              title="Drag to move"
              style={{
                position: 'absolute',
                top: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(99,102,241,0.18)',
                borderRadius: '6px',
                padding: '3px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <GripVertical size={13} style={{ color: '#6366f1' }} />
            </div>
            <button
              onClick={() => !isDragging && setIsOpen(true)}
              className={isDragging ? 'chatbot-dragging' : 'chatbot-floating'}
              style={{
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)',
                borderRadius: '50%',
                border: 'none',
                boxShadow: '0 8px 25px rgba(99,102,241,0.45)',
                color: 'white',
                cursor: isDragging ? 'grabbing' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MessageSquare size={28} />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default AIChatbot;
