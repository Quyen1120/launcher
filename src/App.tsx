import React from 'react';
import { LayoutGrid, Server, Settings, Info, Bell, Search, User, Play, ExternalLink, Signal, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Server as ServerType, NewsItem } from './types';

// Mock Data
const MOCK_SERVERS: ServerType[] = [
  {
    id: '1',
    name: 'Nexus Roleplay | Vietnam #1',
    ip: '103.153.72.144:7777',
    players: 452,
    maxPlayers: 1000,
    ping: 24,
    map: 'San Andreas',
    gamemode: 'Roleplay',
    status: 'online',
    version: '0.3.7-R4',
    image: 'https://picsum.photos/seed/samp1/800/400'
  },
  {
    id: '2',
    name: 'Advance RP | Blue Server',
    ip: '5.254.104.121:7777',
    players: 890,
    maxPlayers: 1000,
    ping: 56,
    map: 'San Andreas',
    gamemode: 'Roleplay',
    status: 'online',
    version: '0.3.7',
    image: 'https://picsum.photos/seed/samp2/800/400'
  },
  {
    id: '3',
    name: 'Arizona RP | Scottdale',
    ip: '185.169.134.3:7777',
    players: 1000,
    maxPlayers: 1000,
    ping: 42,
    map: 'San Andreas',
    gamemode: 'Roleplay',
    status: 'full',
    version: '0.3.7',
    image: 'https://picsum.photos/seed/samp3/800/400'
  },
  {
    id: '4',
    name: 'Horizon Gaming | TDM/DM',
    ip: 'play.horizon.com:7777',
    players: 120,
    maxPlayers: 500,
    ping: 15,
    map: 'LS/SF/LV',
    gamemode: 'TDM/DM',
    status: 'online',
    version: '0.3.7',
    image: 'https://picsum.photos/seed/samp4/800/400'
  }
];

const MOCK_NEWS: NewsItem[] = [
  {
    id: 'n1',
    title: 'Update 2.4: New Vehicle System',
    date: '2026-03-28',
    summary: 'We have completely revamped the vehicle ownership system. New dealerships are now open in Las Venturas.',
    category: 'Update',
    image: 'https://picsum.photos/seed/news1/600/300'
  },
  {
    id: 'n2',
    title: 'Spring Racing Event',
    date: '2026-04-01',
    summary: 'Join us this weekend for the biggest racing event of the year. Prizes up to $1,000,000 in-game cash!',
    category: 'Event',
    image: 'https://picsum.photos/seed/news2/600/300'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = React.useState<'home' | 'servers' | 'settings'>('home');
  const [nickname, setNickname] = React.useState('Player_Nexus');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedServer, setSelectedServer] = React.useState<ServerType | null>(null);

  const [copiedIp, setCopiedIp] = React.useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIp(text);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const handleConnect = (server: ServerType) => {
    // In a real launcher, this would trigger the game
    // For web, we'll show a notification
    alert(`Connecting to ${server.name} (${server.ip})...\nMake sure GTA:SA is installed!`);
  };

  const filteredServers = MOCK_SERVERS.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.ip.includes(searchQuery)
  );

  return (
    <div className="flex h-screen bg-bg-dark overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-20 md:w-64 bg-bg-card border-r border-white/5 flex flex-col transition-all duration-300">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center neon-glow">
            <Play className="fill-white text-white w-5 h-5 ml-0.5" />
          </div>
          <span className="hidden md:block font-bold text-xl tracking-tight">SAMP NEXUS</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <NavItem 
            active={activeTab === 'home'} 
            onClick={() => setActiveTab('home')}
            icon={<LayoutGrid size={20} />}
            label="Home"
          />
          <NavItem 
            active={activeTab === 'servers'} 
            onClick={() => setActiveTab('servers')}
            icon={<Server size={20} />}
            label="Servers"
          />
          <NavItem 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')}
            icon={<Settings size={20} />}
            label="Settings"
          />
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
              <User size={20} />
            </div>
            <div className="hidden md:block overflow-hidden">
              <p className="text-sm font-medium truncate">{nickname}</p>
              <p className="text-xs text-gray-400">Level 15</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-bg-dark/50 backdrop-blur-xl z-10">
          <div className="relative w-96 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search servers, players..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-brand-primary/50 transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-white transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-bg-dark"></span>
            </button>
            <div className="h-8 w-px bg-white/10 mx-2"></div>
            <button className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white px-6 py-2.5 rounded-xl font-semibold transition-all neon-glow active:scale-95">
              <Play size={18} className="fill-current" />
              Quick Play
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10"
              >
                {/* Hero Section */}
                <section className="relative h-80 rounded-3xl overflow-hidden group">
                  <img 
                    src="https://picsum.photos/seed/gta/1200/600" 
                    alt="Hero" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/20 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-10 space-y-4">
                    <span className="bg-brand-primary/20 text-brand-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-brand-primary/30">Featured Server</span>
                    <h1 className="text-5xl font-bold tracking-tight">Nexus Roleplay: Vietnam</h1>
                    <p className="text-gray-300 max-w-xl text-lg">Experience the most advanced roleplay mechanics in San Andreas. Join thousands of players in a living, breathing world.</p>
                    <div className="flex gap-4 pt-4">
                      <button className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">Join Now</button>
                      <button className="bg-white/10 backdrop-blur-md border border-white/10 px-8 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors">Server Info</button>
                    </div>
                  </div>
                </section>

                {/* News Grid */}
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Latest News</h2>
                    <button className="text-brand-primary text-sm font-semibold hover:underline">View All</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {MOCK_NEWS.map((news) => (
                      <div key={news.id} className="bg-bg-card border border-white/5 rounded-2xl overflow-hidden group cursor-pointer hover:border-white/20 transition-all">
                        <div className="h-48 overflow-hidden">
                          <img src={news.image} alt={news.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                        </div>
                        <div className="p-6 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded",
                              news.category === 'Update' ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"
                            )}>{news.category}</span>
                            <span className="text-xs text-gray-500">{news.date}</span>
                          </div>
                          <h3 className="text-xl font-bold group-hover:text-brand-primary transition-colors">{news.title}</h3>
                          <p className="text-gray-400 text-sm line-clamp-2">{news.summary}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'servers' && (
              <motion.div 
                key="servers"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">Server Browser</h2>
                    <p className="text-gray-400">Discover the best SAMP servers around the world.</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="bg-white/5 border border-white/10 p-2.5 rounded-xl hover:bg-white/10 transition-colors">
                      <Signal size={20} />
                    </button>
                    <button className="bg-white/5 border border-white/10 p-2.5 rounded-xl hover:bg-white/10 transition-colors">
                      <Users size={20} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {filteredServers.map((server) => (
                    <div 
                      key={server.id} 
                      onClick={() => setSelectedServer(server)}
                      className="bg-bg-card border border-white/5 p-5 rounded-2xl flex items-center gap-6 hover:bg-bg-hover hover:border-brand-primary/30 transition-all cursor-pointer group"
                    >
                      <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center text-2xl font-bold text-brand-primary">
                        {server.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg group-hover:text-brand-primary transition-colors">{server.name}</h3>
                        <div className="flex items-center gap-4 mt-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); copyToClipboard(server.ip); }}
                            className="text-xs text-gray-400 flex items-center gap-1 hover:text-brand-primary transition-colors"
                          >
                            <ExternalLink size={12} /> {copiedIp === server.ip ? 'Copied!' : server.ip}
                          </button>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <LayoutGrid size={12} /> {server.gamemode}
                          </span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-sm font-bold">{server.players} / {server.maxPlayers}</span>
                          <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-brand-primary" 
                              style={{ width: `${(server.players / server.maxPlayers) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 justify-end text-[10px] uppercase font-bold tracking-wider">
                          <span className="text-brand-accent flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-pulse"></div>
                            {server.ping}ms
                          </span>
                          <span className="text-gray-500">{server.version}</span>
                        </div>
                      </div>
                      <button className="bg-white/5 p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-primary hover:text-white">
                        <Play size={20} className="fill-current" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-2xl space-y-8"
              >
                <h2 className="text-3xl font-bold">Launcher Settings</h2>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Game Nickname</label>
                    <input 
                      type="text" 
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-brand-primary/50"
                      placeholder="Enter your nickname..."
                    />
                    <p className="text-xs text-gray-500">This name will be used when connecting to any server.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">GTA San Andreas Path</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        readOnly
                        value="C:\Games\GTA San Andreas"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-gray-500"
                      />
                      <button className="bg-white/10 px-6 rounded-xl font-medium hover:bg-white/20 transition-colors">Browse</button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 space-y-4">
                    <h3 className="font-bold">Preferences</h3>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                      <div>
                        <p className="font-medium">Auto-Update Launcher</p>
                        <p className="text-xs text-gray-400">Keep your launcher up to date automatically.</p>
                      </div>
                      <div className="w-12 h-6 bg-brand-primary rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                      <div>
                        <p className="font-medium">Discord Rich Presence</p>
                        <p className="text-xs text-gray-400">Show your server status on Discord.</p>
                      </div>
                      <div className="w-12 h-6 bg-white/10 rounded-full relative cursor-pointer">
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white/50 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Server Detail Modal */}
      <AnimatePresence>
        {selectedServer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedServer(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-3xl bg-bg-card border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="h-64 relative">
                <img src={selectedServer.image} alt={selectedServer.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-card to-transparent"></div>
                <button 
                  onClick={() => setSelectedServer(null)}
                  className="absolute top-6 right-6 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <Info size={20} className="rotate-45" />
                </button>
              </div>
              
              <div className="p-10 -mt-20 relative space-y-8">
                <div className="flex items-end justify-between">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-bold">{selectedServer.name}</h2>
                    <div className="flex items-center gap-4 text-gray-400">
                      <span className="flex items-center gap-1.5"><ExternalLink size={16} /> {selectedServer.ip}</span>
                      <span className="flex items-center gap-1.5"><Users size={16} /> {selectedServer.players} / {selectedServer.maxPlayers}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleConnect(selectedServer)}
                    className="bg-brand-primary text-white px-10 py-4 rounded-2xl font-bold text-xl neon-glow hover:scale-105 transition-all active:scale-95 flex items-center gap-3"
                  >
                    <Play size={24} className="fill-current" />
                    CONNECT
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <StatCard label="Gamemode" value={selectedServer.gamemode} />
                  <StatCard label="Map" value={selectedServer.map} />
                  <StatCard label="Version" value={selectedServer.version} />
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-lg">Server Description</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Welcome to {selectedServer.name}. This server features custom mapping, advanced economy, and a dedicated staff team. Join our community on Discord to stay updated with the latest events and updates.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}

function NavItem({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
        active 
          ? "bg-brand-primary/10 text-brand-primary" 
          : "text-gray-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <div className={cn("transition-transform duration-300", active && "scale-110")}>
        {icon}
      </div>
      <span className="hidden md:block font-medium">{label}</span>
      {active && <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-6 bg-brand-primary rounded-r-full hidden md:block" />}
    </button>
  );
}

function StatCard({ label, value }: { label: string, value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">{label}</p>
      <p className="font-semibold text-lg">{value}</p>
    </div>
  );
}
