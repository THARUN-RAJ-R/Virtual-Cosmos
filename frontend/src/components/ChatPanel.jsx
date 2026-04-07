import React, { useState, useEffect, useRef } from 'react';

function ChatPanel({ partners = [], messages, selfId, onSendMessage, isOpen, onClose }) {
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && partners.length > 0) {
      onSendMessage(text);
      setText('');
    }
  };

  // Simplified header name
  const headerName = "Chat";

  return (
    <div 
      className={`fixed top-0 right-0 h-full w-96 bg-white/[0.08] backdrop-blur-[40px] border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] z-50 flex flex-col pointer-events-auto
        ${partners.length > 0 && isOpen ? 'translate-x-0 opacity-100' : 'translate-x-[20%] opacity-0 pointer-events-none'}
      `}
    >
      {/* Header */}
      <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.05] shrink-0">
        <div className="flex items-center">
          <div className="flex flex-col">
            <h2 className="text-white font-black text-sm tracking-tight">{headerName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981]" />
              <span className="text-neutral-500 font-bold text-[8px] uppercase tracking-widest">Live Session</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/5 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar scroll-smooth">
        {messages.map((msg, idx) => {
          const isMe = msg.fromUserId === selfId;
          return (
            <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full animate-in fade-in slide-in-from-bottom-2 duration-500`}>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2 px-1">
                {isMe ? 'YOU' : msg.fromUserName}
              </span>
              <div 
                className={`py-3.5 px-5 rounded-[1.5rem] max-w-[90%] break-words shadow-xl
                  ${isMe 
                    ? 'bg-indigo-600 text-white rounded-tr-sm shadow-indigo-900/20' 
                    : 'bg-white/[0.05] text-white rounded-tl-sm border border-white/10'
                  }
                `}
              >
                <p className="text-[13px] font-bold leading-relaxed tracking-wide">{msg.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <div className="p-8 bg-white/[0.02] border-t border-white/5 shrink-0">
        <form onSubmit={handleSubmit} className="relative group">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Broadcast a message..."
            className="w-full bg-white/[0.03] text-white rounded-[1.5rem] py-4 pl-6 pr-14 border border-white/10 outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all font-bold text-sm shadow-inner"
          />
          <button 
            type="submit"
            disabled={!text.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white text-black rounded-2xl hover:scale-105 active:scale-95 disabled:opacity-20 disabled:hover:scale-100 transition-all shadow-xl"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatPanel;
