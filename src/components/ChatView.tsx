import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { Send, Heart, User, Trash2, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export default function ChatView() {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(docs);
      setLoading(false);
    }, (error) => {
      console.error("Chat listener failed:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  // Separate effect for scrolling to keep it reliable
  useEffect(() => {
    if (messages.length > 0) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser) return;

    const text = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, 'messages'), {
        text,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Lover',
        userPhoto: auth.currentUser.photoURL,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'messages', id));
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <Loader2 className="animate-spin text-rose-500 mb-4" size={40} />
        <p className="text-slate-400 font-medium">Opening our chat box...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[70vh] bg-white rounded-[40px] shadow-xl shadow-rose-100/50 border border-rose-50 overflow-hidden mx-4 md:mx-auto max-w-2xl relative">
      <div className="bg-rose-500 p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-2xl backdrop-blur-md">
            <Heart size={20} className="text-white fill-current" />
          </div>
          <div>
            <h3 className="font-bold text-white leading-none">Our Secret Chat</h3>
            <p className="text-[10px] text-rose-100 uppercase font-bold tracking-widest mt-1">Real-time Love</p>
          </div>
        </div>
        <div className="flex -space-x-2">
          <div className="w-8 h-8 rounded-full border-2 border-rose-500 bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">A</div>
          <div className="w-8 h-8 rounded-full border-2 border-rose-500 bg-pink-100 flex items-center justify-center text-[10px] font-bold text-pink-600">K</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-10 opacity-40">
            <Sparkles size={40} className="text-rose-300 mb-4" />
            <p className="text-slate-500 font-medium italic">Start a beautiful conversation...</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => {
            const isMe = msg.userId === auth.currentUser?.uid;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className={`max-w-[80%] p-4 rounded-3xl text-sm font-medium shadow-sm relative group ${
                  isMe ? 'bg-rose-500 text-white rounded-tr-none' : 'bg-slate-100 text-slate-700 rounded-tl-none'
                }`}>
                  {msg.text}
                  {isMe && (
                    <button 
                      onClick={() => handleDelete(msg.id)}
                      className="absolute -left-8 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1 font-bold">
                  {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : 'Typing...'}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Write something sweet..."
          className="flex-1 bg-white border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-rose-300 transition-all shadow-inner"
        />
        <button 
          type="submit" 
          disabled={!newMessage.trim()}
          className="bg-rose-500 text-white p-3 rounded-2xl hover:bg-rose-600 active:scale-95 transition-all shadow-md shadow-rose-100 disabled:opacity-50 disabled:scale-100"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
