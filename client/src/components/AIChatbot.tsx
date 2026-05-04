import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Bot, X, Send, User, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const AIChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: "Hello! I'm your Healthezee AI Assistant. How can I help you with your hospital operations today?" }
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
      const tenantId = localStorage.getItem('tenantId') || 'tenant1';
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
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I'm having trouble connecting to the brain center right now." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl w-96 h-[500px] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Healthezee AI</h3>
                <p className="text-[10px] text-blue-100">Tenant-Isolated Assistant</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50 scroll-smooth">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white shadow-sm border border-slate-100 rounded-tl-none text-slate-700'}`}>
                    {m.content}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white shadow-sm border border-slate-100 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-blue-600" />
                  <span className="text-xs text-slate-500 italic">Analyzing hospital metrics...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-100">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="w-full pl-4 pr-12 py-3 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none text-slate-700"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-400 mt-2 italic">
              Strict HIPAA Isolation: Only {localStorage.getItem('tenantName') || 'your hospital'} data accessible.
            </p>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-all hover:rotate-6 active:scale-95 group relative"
        >
          <Bot size={28} className="transition-transform" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
        </button>
      )}
    </div>
  );
};

export default AIChatbot;
