import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import CosmosWorld from './components/CosmosWorld';
import ChatPanel from './components/ChatPanel';

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [userName, setUserName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  
  // Real-time state
  const [players, setPlayers] = useState(new Map());
  const [selfId, setSelfId] = useState(null);
  
  // Proximity & Chat State
  const [isWorldReady, setIsWorldReady] = useState(false);
  const [roomMembers, setRoomMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }
    
    function onDisconnect() {
      setIsConnected(false);
      setIsJoined(false);
    }
    
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    
    if (socket.connected) onConnect();
    
    socket.on('world:snapshot', (data) => {
      setSelfId(data.selfId);
      const newPlayers = new Map();
      data.players.forEach(p => newPlayers.set(p.userId, p));
      setPlayers(newPlayers);
    });
    
    socket.on('player:joined', (player) => {
      setPlayers(prev => {
        const newMap = new Map(prev);
        newMap.set(player.userId, player);
        return newMap;
      });
    });
    
    socket.on('player:left', ({ userId }) => {
      setPlayers(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    });
    
    socket.on('player:moved', ({ userId, x, y }) => {
      setPlayers(prev => {
        const newMap = new Map(prev);
        const p = newMap.get(userId);
        if (p) {
          p.x = x;
          p.y = y;
        }
        return newMap;
      });
    });
    
    socket.on('proximity:update', (data) => {
      const neighbors = data.partners || [];
      setRoomMembers(neighbors);
      
      // Auto-toggle chat visibility based on proximity
      if (neighbors.length > 0) {
        setIsChatOpen(prev => prev || true); // Open if not already open
      } else {
        setIsChatOpen(false); // Close if no neighbors left
      }
    });

    socket.on('proximity:message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('world:snapshot');
      socket.off('player:joined');
      socket.off('player:left');
      socket.off('player:moved');
      socket.off('proximity:update');
      socket.off('proximity:message');
    };
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!userName.trim()) return;
    
    const spawnX = 400 + Math.floor(Math.random() * 200) - 100;
    const spawnY = 300 + Math.floor(Math.random() * 200) - 100;
    
    socket.emit('join', { name: userName, x: spawnX, y: spawnY });
    setIsJoined(true);
  };
  
  const handleSendMessage = (text) => {
    if (!socket || !text.trim()) return;
    socket.emit('proximity:message', { message: text });
  };
  
  const handleLocalMove = (x, y) => {
    setPlayers(prev => {
      const newMap = new Map(prev);
      const me = newMap.get(selfId);
      if (me) {
        me.x = x;
        me.y = y;
      }
      return newMap; 
    });
    socket.emit('move', { x, y });
  };


  if (!isJoined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white font-sans w-full absolute inset-0 overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="relative bg-white/[0.03] backdrop-blur-3xl p-12 rounded-[2.5rem] shadow-[0_0_80px_rgba(79,70,229,0.15)] border border-white/10 w-full max-w-md animate-in fade-in zoom-in duration-1000">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-3xl rotate-12 flex items-center justify-center text-white text-4xl font-black shadow-2xl scale-90 hover:rotate-0 transition-transform duration-500">
              V
            </div>
            
            <div className="mt-8 text-center">
              <h1 className="text-5xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 tracking-tight">
                Cosmos
              </h1>
              <p className="text-neutral-500 font-bold uppercase tracking-[0.4em] text-[10px] mb-12">Virtual 2D Universe</p>
            </div>

            <form onSubmit={handleJoin} className="flex flex-col gap-8">
              <div className="space-y-3">
                <label className="text-[11px] text-neutral-400 font-black uppercase tracking-widest ml-1">Assign Alias</label>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Enter your cosmic name..."
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    className="w-full px-6 py-5 bg-white/[0.02] border border-white/10 rounded-2xl focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all text-white text-lg font-bold placeholder:text-neutral-700"
                    autoFocus
                  />
                  <div className="absolute inset-0 rounded-2xl bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
              </div>

              <button 
                type="submit"
                disabled={!isConnected}
                className="group relative bg-white text-black font-black py-5 rounded-2xl transition-all shadow-xl shadow-white/5 active:scale-[0.98] disabled:opacity-50"
              >
                <span className="relative z-10 text-lg uppercase tracking-widest">{isConnected ? 'Enter the Space' : 'Syncing...'}</span>
                <div className="absolute inset-0 rounded-2xl bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </form>
          </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <CosmosWorld 
        players={players} 
        selfId={selfId} 
        onMove={handleLocalMove} 
        partners={roomMembers}
        onReady={() => setIsWorldReady(true)}
      />

      {isJoined && !isWorldReady && (
        <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              <div className="w-32 h-32 rounded-full border border-white/5 animate-[ping_3s_infinite]" />
              <div className="absolute inset-0 w-32 h-32 rounded-full border-t border-indigo-500 animate-spin" />
              <span className="text-white font-black text-3xl animate-pulse">🌌</span>
            </div>
            <p className="mt-12 text-white font-black tracking-[1em] uppercase text-[9px] translate-x-[0.5em] opacity-40">Initializing Universe</p>
        </div>
      )}

      {/* Persistent App Header */}
      <div className="absolute top-8 left-8 pointer-events-none flex flex-col gap-3">
        <div className="bg-white/[0.03] backdrop-blur-3xl px-6 py-4 rounded-[1.8rem] border border-white/5 shadow-2xl pointer-events-auto flex items-center gap-4 group">
          <div className="w-16 h-16 rounded-[2rem] bg-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-indigo-900/40">
            C
          </div>
          <div className="flex flex-col">
            <span className="text-white font-black tracking-tight text-md leading-none">Cosmos</span>
            <div className="flex items-center gap-2 mt-1">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981]" />
               <span className="text-neutral-500 font-bold text-[7px] uppercase tracking-widest">{players.size} Users Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Proximity Identity Bridge Removed */}
      
      {/* Bottom Identity HUD */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none w-full max-w-2xl px-8">
        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-3 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-4 pl-3">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-black font-black text-xl shadow-xl">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-white text-md font-black tracking-tight">{userName}</span>
              <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest">Active User</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pr-2">
            {roomMembers.length > 0 ? (
              <button 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] transition-all font-black text-[10px] uppercase tracking-[0.2em] relative overflow-hidden ${isChatOpen ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/40 translate-y-[-2px]' : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'}`}
              >
                <div className={`absolute top-0 left-0 w-1 h-full bg-white/20 transition-all ${isChatOpen ? 'translate-x-0' : '-translate-x-full'}`} />
                Chat
              </button>
            ) : (
              <div className="flex items-center gap-4 px-8 py-3.5 bg-black/40 rounded-[1.5rem] border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 animate-ping" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-600">Scanning for users...</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Sliding Chat Panel */}
      <ChatPanel 
        partners={roomMembers} 
        messages={messages} 
        selfId={selfId}
        onSendMessage={handleSendMessage}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
}

export default App;
