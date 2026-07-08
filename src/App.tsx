import { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import Auth from './components/Auth';
import TimelineView from './components/TimelineView';
import CalendarView from './components/CalendarView';
import GalleryView from './components/GalleryView';
import ChatView from './components/ChatView';
import MemoryForm from './components/MemoryForm';
import AnniversaryCountdown from './components/AnniversaryCountdown';
import BackgroundMusicPlayer from './components/BackgroundMusicPlayer';
import { Heart, Calendar as CalendarIcon, Clock, Home as HomeIcon, Plus, LogOut, Sparkles, Quote, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { GoogleGenAI } from "@google/genai";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'timeline' | 'calendar' | 'gallery' | 'chat'>('home');
  const [showForm, setShowForm] = useState(false);
  const [recentMemories, setRecentMemories] = useState<any[]>([]);
  const [aiRecap, setAiRecap] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Verify DB connection as per instructions
        try {
          const { getDocFromServer } = await import('firebase/firestore');
          const testGet = await getDocFromServer(doc(db, 'users', u.uid));
          console.log("DB Connection Check:", testGet.exists() ? "Profile found" : "New user - profile pending");
          setDbStatus('connected');
        } catch (err) {
          console.error("DB Connection Check Failed (Likely Rules or Index):", err);
          setDbStatus('error');
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || dbStatus !== 'connected') return;
    const q = query(collection(db, 'memories'), orderBy('date', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecentMemories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Memory listener failed:", error);
    });
    return () => unsubscribe();
  }, [user, dbStatus]);

  const generateRecap = async () => {
    if (recentMemories.length === 0) return;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `You are a romantic memory weaver for Ashwin and Khushi. 
      Recent moments: ${recentMemories.map(m => `${m.title} (${m.type}${m.tags ? `: ${m.tags.join(', ')}` : ''})`).join(', ')}. 
      Write a heartwarming, poetic, and playful 2-sentence summary of their recent journey. Use emojis like ❤️, ✨, 🌟. 
      Address them directly as "Ashwin and Khushi" or "You two".`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      setAiRecap(response.text || "Every moment shared is a page in your beautiful together. ❤️");
    } catch (err) {
      console.error(err);
      setAiRecap("Every moment with you is a treasure. ❤️");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-500"></div>
    </div>
  );

  if (!user) return <Auth onAuthenticated={() => {}} />;

  const navItems = [
    { id: 'home', icon: HomeIcon, label: 'Home', emoji: '🏠' },
    { id: 'timeline', icon: Clock, label: 'Journal', emoji: '📝' },
    { id: 'gallery', icon: Camera, label: 'Gallery', emoji: '🖼' },
    { id: 'chat', icon: Heart, label: 'Chat', emoji: '💬' },
    { id: 'calendar', icon: CalendarIcon, label: 'Calendar', emoji: '🗓' },
  ];

  return (
    <div className="min-h-screen bg-rose-50 flex flex-col md:flex-row h-screen overflow-hidden font-sans text-slate-700">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex w-64 bg-white border-r border-rose-100 flex-col p-6 shadow-sm z-30">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-rose-400 rounded-full flex items-center justify-center text-white text-xl shadow-md shadow-rose-200">❤</div>
          <h1 className="font-bold text-rose-500 text-xl tracking-tight font-playful">Us Forever</h1>
        </div>
        
        <nav className="flex-1 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all ${
                activeTab === item.id 
                  ? 'bg-rose-50 text-rose-600 shadow-sm' 
                  : 'text-slate-400 hover:bg-rose-50/50 hover:text-rose-400'
              }`}
            >
              <span className="text-lg">{item.emoji}</span> {item.label}
            </button>
          ))}
          <button 
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-400 transition-colors"
          >
            <span>⚙</span> Sign Out
          </button>
        </nav>

        <div className="mt-auto p-4 bg-rose-100 rounded-3xl text-center shadow-inner">
          <p className="text-[10px] uppercase font-bold text-rose-400 mb-1">Our Journey</p>
          <p className="text-xl font-bold text-rose-600 font-playful tracking-wider">Infinity & Beyond</p>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden relative">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md px-6 md:px-8 flex items-center justify-between border-b border-rose-50 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full border-2 border-white bg-blue-200 flex items-center justify-center font-bold text-blue-600 shadow-sm">A</div>
              <div className="w-10 h-10 rounded-full border-2 border-white bg-pink-200 flex items-center justify-center font-bold text-pink-600 shadow-sm">K</div>
            </div>
            <div>
              <p className="font-bold text-sm md:text-base text-slate-600 leading-none">Ashwin & Khushi's Space</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  dbStatus === 'connected' ? 'bg-emerald-500' : 
                  dbStatus === 'checking' ? 'bg-amber-400 animate-pulse' : 'bg-rose-500'
                }`} />
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                  {dbStatus === 'connected' ? 'Connected' : 
                   dbStatus === 'checking' ? 'Connecting...' : 'Connection Error'}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-full font-bold shadow-lg shadow-rose-200 transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Memory</span>
          </button>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-12 bg-rose-50/30">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto p-6 md:p-8 space-y-6 md:grid md:grid-cols-12 md:gap-8 md:space-y-0"
              >
                {/* Left Column */}
                <div className="md:col-span-8 flex flex-col gap-6 relative">
                  {/* Anniversary Countdown */}
                  <AnniversaryCountdown user={user} />

                  {/* Floating Hearts Decoration */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[1, 2, 3, 4, 5].map(i => (
                      <motion.div
                        key={i}
                        initial={{ y: 200, x: Math.random() * 400, opacity: 0 }}
                        animate={{ y: -200, opacity: [0, 1, 0] }}
                        transition={{ 
                          duration: 4 + Math.random() * 4, 
                          repeat: Infinity, 
                          delay: Math.random() * 5,
                          ease: "linear"
                        }}
                        className="absolute text-rose-200/40 text-xl"
                      >
                        ❤
                      </motion.div>
                    ))}
                  </div>

                  {/* Daily Magic Card */}
                  <div className="vibrant-card p-10 relative overflow-hidden group min-h-[220px] flex items-center bg-white border-rose-100 shadow-rose-100/50">
                    <div className="absolute top-0 right-0 p-8">
                       <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                         Daily Magic
                       </span>
                    </div>
                    
                    <div className="relative z-10 w-full">
                      {aiRecap ? (
                        <motion.p 
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="text-2xl md:text-3xl font-playful font-bold text-slate-800 leading-tight"
                        >
                          {aiRecap}
                        </motion.p>
                      ) : (
                        <div className="space-y-4">
                          <h2 className="text-3xl font-bold font-playful leading-tight text-slate-800">
                            Reliving our best moments together... <span className="text-rose-400">✨</span>
                          </h2>
                          <button 
                            onClick={generateRecap}
                            className="bg-rose-500 text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-rose-600 transition-all shadow-lg shadow-rose-100"
                          >
                            Create Recap
                          </button>
                        </div>
                      )}
                    </div>
                    <Heart className="absolute -bottom-6 -right-6 w-32 h-32 text-rose-50/50 fill-rose-50/50 rotate-12 group-hover:scale-110 transition-transform" />
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="vibrant-card p-6 flex flex-col items-center justify-center gap-2 text-center group hover:bg-blue-50/30 transition-colors">
                      <div className="bg-blue-100 p-2.5 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform">
                        <Camera size={20} />
                      </div>
                      <span className="text-2xl font-bold text-slate-800">{recentMemories.filter(m => m.type === 'photo').length}+</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Photos</span>
                    </div>
                    <div className="vibrant-card p-6 flex flex-col items-center justify-center gap-2 text-center group hover:bg-emerald-50/30 transition-colors">
                      <div className="bg-emerald-100 p-2.5 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
                        <Sparkles size={20} />
                      </div>
                      <span className="text-2xl font-bold text-slate-800">{recentMemories.filter(m => m.type === 'journal').length}+</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Journal</span>
                    </div>
                    <div className="vibrant-card p-6 flex flex-col items-center justify-center gap-2 text-center group hover:bg-yellow-50/30 transition-colors">
                      <div className="bg-yellow-100 p-2.5 rounded-2xl text-yellow-600 group-hover:scale-110 transition-transform">
                        <Quote size={20} />
                      </div>
                      <span className="text-2xl font-bold text-slate-800">{recentMemories.filter(m => m.type === 'note').length}+</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Notes</span>
                    </div>
                  </div>
                </div>

                {/* Right Column (Recent List) */}
                <div className="md:col-span-4 flex flex-col gap-6">
                  <div className="bg-yellow-50 rounded-[40px] p-8 shadow-sm border border-yellow-100 flex flex-col min-h-full">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-lg text-yellow-800">Recents</h3>
                      <span className="text-2xl">✍️</span>
                    </div>
                    <div className="space-y-4 flex-1">
                      {recentMemories.map(memory => (
                        <div 
                          key={memory.id} 
                          className="bg-white/60 p-4 rounded-3xl flex items-center gap-3 shadow-sm hover:scale-105 transition-transform"
                        >
                          <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm ${
                            memory.type === 'photo' ? 'text-blue-500' :
                            memory.type === 'journal' ? 'text-emerald-500' : 'text-yellow-600'
                          }`}>
                             {memory.type === 'photo' ? <Camera size={18} /> : 
                              memory.type === 'journal' ? <Sparkles size={18} /> : <Quote size={18} />}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-yellow-900 line-clamp-1">{memory.title}</h4>
                            <p className="text-[10px] text-yellow-700/60 font-bold">{format(new Date(memory.date), 'MMM do')}</p>
                          </div>
                        </div>
                      ))}
                      {recentMemories.length === 0 && (
                        <p className="text-xs text-yellow-700/50 italic text-center py-10">No memories to show yet.</p>
                      )}
                    </div>
                    <button 
                      onClick={() => setActiveTab('timeline')}
                      className="mt-6 w-full py-3 bg-yellow-400 text-yellow-900 font-bold rounded-2xl hover:bg-yellow-500 transition-colors shadow-sm"
                    >
                      View All Memories
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'timeline' && (
              <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto py-8">
                <TimelineView />
              </motion.div>
            )}

            {activeTab === 'calendar' && (
              <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto py-8">
                <CalendarView />
              </motion.div>
            )}

            {activeTab === 'gallery' && (
              <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto py-8">
                <GalleryView />
              </motion.div>
            )}

            {activeTab === 'chat' && (
              <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto py-8">
                <ChatView />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Notification Footer Bar */}
        <footer className="bg-rose-500 text-white py-2 px-6 md:px-8 flex justify-between items-center text-[10px] md:text-xs font-medium z-40">
          <div className="flex items-center gap-2">
            <span className="animate-pulse">📧</span>
            <span>Notifications enabled: You & Khushi will receive emails for every update.</span>
          </div>
          <div className="opacity-80 hidden sm:block">
            Together Forever
          </div>
        </footer>

        {/* Bottom Nav - Mobile Only */}
        <nav className="md:hidden fixed bottom-6 left-6 right-6 h-16 bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white flex items-center justify-around px-2 z-40">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center justify-center w-20 transition-all ${
                activeTab === item.id ? 'text-rose-500 scale-110' : 'text-slate-300'
              }`}
            >
              <item.icon size={22} className={activeTab === item.id ? 'fill-rose-500/10' : ''} />
              <span className="text-[10px] font-bold uppercase mt-1 tracking-tighter">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Form Overlay */}
      <AnimatePresence>
        {showForm && <MemoryForm onClose={() => setShowForm(false)} />}
      </AnimatePresence>

      {/* Background Music Player */}
      <BackgroundMusicPlayer user={user} />
    </div>
  );
}
