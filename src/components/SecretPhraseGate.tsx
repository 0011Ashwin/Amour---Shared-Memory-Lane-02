import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Send, Sparkles, User, Lock, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SecretPhraseGateProps {
  key?: string;
  onSuccess: (role?: 'ashwin' | 'khushi') => void;
  onCancel: () => void;
}

export default function SecretPhraseGate({ onSuccess, onCancel }: SecretPhraseGateProps) {
  const [role, setRole] = useState<'ashwin' | 'khushi' | null>(null);
  const [phrase, setPhrase] = useState('');
  const [error, setError] = useState(false);

  const targetPhrases = {
    ashwin: 'piti piti kare dege',
    khushi: 'farr dungi'
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    
    const inputCleaned = phrase.trim().toLowerCase().replace(/\s+/g, ' ');
    let isCorrect = false;

    if (role === 'ashwin') {
      // Allow 'piti piti kare dege' or 'piti piti kar dege'
      isCorrect = inputCleaned === 'piti piti kare dege' || 
                  inputCleaned === 'piti piti kar dege' || 
                  inputCleaned.includes('piti piti');
    } else if (role === 'khushi') {
      // Allow 'farr dungi' or 'far dungi'
      isCorrect = inputCleaned === 'farr dungi' || 
                  inputCleaned === 'far dungi' || 
                  inputCleaned.includes('farr') || 
                  inputCleaned.includes('far d');
    }
    
    if (isCorrect) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#fb7185', '#fda4af', '#fff1f2']
      });
      onSuccess(role);
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-rose-50 flex items-center justify-center p-6 min-h-screen overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[40px] p-8 md:p-10 shadow-2xl shadow-rose-200 border border-white my-auto"
      >
        <AnimatePresence mode="wait">
          {!role ? (
            <motion.div
              key="role-selection"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <div className="inline-flex p-4 bg-rose-50 rounded-full mb-4 text-rose-500">
                  <Heart className="w-8 h-8 fill-current" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Identify Yourself</h2>
                <p className="text-slate-500 mt-2">Choose your identity to continue...</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setRole('ashwin')}
                  className="p-6 rounded-[32px] border-2 border-slate-50 hover:border-rose-200 hover:bg-rose-50/50 transition-all flex flex-col items-center gap-3 group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl group-hover:scale-110 transition-transform">
                    A
                  </div>
                  <span className="font-bold text-slate-700">Ashwin</span>
                </button>
                <button
                  onClick={() => setRole('khushi')}
                  className="p-6 rounded-[32px] border-2 border-slate-50 hover:border-rose-200 hover:bg-rose-50/50 transition-all flex flex-col items-center gap-3 group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-xl group-hover:scale-110 transition-transform">
                    K
                  </div>
                  <span className="font-bold text-slate-700">Khushi</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="phrase-input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <button 
                  onClick={() => setRole(null)}
                  className="text-xs font-bold text-slate-400 hover:text-rose-500 mb-4 transition-colors uppercase tracking-widest flex items-center justify-center gap-1 mx-auto"
                >
                  Change identity?
                </button>
                <h2 className="text-2xl font-bold text-slate-800">Secret Phrase</h2>
                <p className="text-slate-500 mt-2 italic">
                  "Only {role === 'ashwin' ? 'Ashwin' : 'Khushi'} knows what to say..."
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className={`relative transition-transform ${error ? 'animate-shake' : ''}`}>
                  <input
                    type="text"
                    value={phrase}
                    onChange={(e) => setPhrase(e.target.value)}
                    placeholder="Enter the secret phrase..."
                    className={`w-full bg-slate-50 border-2 ${error ? 'border-rose-400' : 'border-slate-100'} rounded-2xl py-5 px-6 focus:outline-none focus:border-rose-300 transition-all text-center text-lg font-medium text-slate-700`}
                    autoFocus
                  />
                  {phrase.length > 0 && !error && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Sparkles className="text-rose-400 w-5 h-5 animate-pulse" />
                    </div>
                  )}
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-rose-500 text-sm text-center font-bold"
                  >
                    That's not it! Try again, {role === 'ashwin' ? 'Ashwin' : 'Khushi'}.
                  </motion.p>
                )}

                <button
                  type="submit"
                  className="w-full bg-slate-900 text-white rounded-2xl py-5 px-6 font-bold shadow-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 group"
                >
                  Verify Now <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 text-center text-[10px] text-slate-300 flex items-center justify-center gap-2 uppercase tracking-[0.2em] font-black">
          <Heart size={12} className="fill-current" />
          <span>Restricted Access</span>
          <Heart size={12} className="fill-current" />
        </div>
      </motion.div>

      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-30">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-rose-200 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-100 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
