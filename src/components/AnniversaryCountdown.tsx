import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { Heart, Lock, Unlock, Clock, Sparkles, PenTool, CheckCircle, Gift, BookOpen, Scroll, Mail, MailOpen, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Anniversary target date: November 8th, 2026 00:00:00 local time
const ANNIVERSARY_DATE = new Date(2026, 10, 8, 0, 0, 0); // Month 10 is November (0-indexed)

export default function AnniversaryCountdown({ user }: { user: any }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isArrived: false
  });

  const [myMessage, setMyMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [isReadModalOpen, setIsReadModalOpen] = useState(false);

  // Partner status states (for countdown / locked view)
  const [partnerHasWritten, setPartnerHasWritten] = useState(false);
  const [partnerMessage, setPartnerMessage] = useState<string | null>(null);

  const isAshwin = user?.email === 'ashwinmehta1234500@gmail.com';
  const myName = isAshwin ? 'Ashwin' : 'Beba (Khushi)';
  const partnerName = isAshwin ? 'Beba (Khushi)' : 'Ashwin';
  
  // Custom identifier for documents in anniversary_messages
  const myDocId = isAshwin ? 'ashwin' : 'khushi';
  const partnerDocId = isAshwin ? 'khushi' : 'ashwin';

  // 1. Calculate Countdown
  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = ANNIVERSARY_DATE.getTime() - new Date().getTime();
      if (difference <= 0) {
        setTimeLeft(prev => ({ ...prev, isArrived: true }));
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isArrived: false
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch/Listen for messages
  useEffect(() => {
    if (!user) return;

    // Listen to my message
    const myDocRef = doc(db, 'anniversary_messages', myDocId);
    const unsubMy = onSnapshot(myDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setMyMessage(docSnap.data().text || '');
      }
    }, (error) => {
      console.warn("My letter is not yet created or loaded:", error);
    });

    // Listen to partner status indicator (non-private status) to check if written
    const partnerStatusRef = doc(db, 'anniversary_status', partnerDocId);
    const unsubPartnerStatus = onSnapshot(partnerStatusRef, (docSnap) => {
      if (docSnap.exists()) {
        setPartnerHasWritten(docSnap.data().hasWritten || false);
      } else {
        setPartnerHasWritten(false);
      }
    }, (error) => {
      console.warn("Unable to load partner's status indicator:", error);
    });

    // Listen to partner's actual message text ONLY if the anniversary has officially arrived!
    let unsubPartnerMessage = () => {};
    const now = new Date();
    if (now >= ANNIVERSARY_DATE || timeLeft.isArrived) {
      const partnerDocRef = doc(db, 'anniversary_messages', partnerDocId);
      unsubPartnerMessage = onSnapshot(partnerDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setPartnerMessage(docSnap.data().text || '');
        } else {
          setPartnerMessage(null);
        }
      }, (error) => {
        console.warn("Unable to load partner's locked letter text:", error);
      });
    } else {
      setPartnerMessage(null);
    }

    return () => {
      unsubMy();
      unsubPartnerStatus();
      unsubPartnerMessage();
    };
  }, [user, myDocId, partnerDocId, timeLeft.isArrived]);

  // Count words helper
  const getWordCount = (str: string) => {
    return str.trim().split(/\s+/).filter(Boolean).length;
  };

  const wordCount = getWordCount(myMessage);
  const maxWords = 2000;

  // Handles save
  const handleSaveMessage = async () => {
    if (wordCount > maxWords) {
      alert(`Your message exceeds the ${maxWords} words of love limit! Please shorten it slightly.`);
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    try {
      // 1. Save full letter text (locked by rules)
      await setDoc(doc(db, 'anniversary_messages', myDocId), {
        uid: user.uid,
        email: user.email,
        writerName: myName,
        text: myMessage,
        updatedAt: new Date().toISOString()
      });

      // 2. Save public/partner-visible status indicator
      await setDoc(doc(db, 'anniversary_status', myDocId), {
        hasWritten: myMessage.trim().length > 0,
        updatedAt: new Date().toISOString()
      });

      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save anniversary message:", err);
      alert("Failed to lock your love letter. Please try again!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      {/* Dynamic Celebration Header if anniversary has arrived */}
      {timeLeft.isArrived ? (
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 p-8 rounded-[40px] shadow-2xl text-white text-center relative overflow-hidden mb-8 border border-white/20"
        >
          {/* Sparkles */}
          <div className="absolute top-4 left-4 animate-bounce"><Sparkles className="w-8 h-8 text-yellow-200" /></div>
          <div className="absolute bottom-4 right-4 animate-pulse"><Heart className="w-10 h-10 text-white fill-white/30" /></div>
          
          <h2 className="text-4xl md:text-5xl font-playful font-extrabold mb-3 drop-shadow">
            Happy 1st Anniversary! 🎉❤️
          </h2>
          <p className="text-lg md:text-xl font-medium max-w-2xl mx-auto opacity-95">
            Ashwin and Khushi, today marks 1 year of holding hands, sharing smiles, and weaving beautiful memories. Your special love letters are now officially unlocked!
          </p>
        </motion.div>
      ) : (
        /* Countdown Card */
        <div className="vibrant-card p-8 bg-white border border-rose-100 shadow-xl shadow-rose-100/40 rounded-[40px] relative overflow-hidden mb-8">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Heart className="w-24 h-24 text-rose-500 fill-rose-500" />
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="bg-rose-100 text-rose-600 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5 mb-4 shadow-sm">
              <Gift className="w-3.5 h-3.5" />
              1st Anniversary Countdown
            </span>
            
            <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 font-playful mb-6">
              Count down to <span className="text-rose-500">November 8th</span> ❤️
            </h3>

            {/* Countdown Grid */}
            <div className="grid grid-cols-4 gap-3 md:gap-5 max-w-md w-full mb-6">
              {[
                { label: 'Days', value: timeLeft.days },
                { label: 'Hours', value: timeLeft.hours },
                { label: 'Mins', value: timeLeft.minutes },
                { label: 'Secs', value: timeLeft.seconds }
              ].map((item, index) => (
                <div 
                  key={index} 
                  className="bg-rose-50/50 border border-rose-100/80 rounded-3xl p-4 flex flex-col items-center justify-center shadow-inner hover:scale-105 transition-transform"
                >
                  <span className="text-3xl md:text-4xl font-extrabold text-rose-500 font-playful leading-tight">
                    {String(item.value).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-slate-400 text-xs italic">
              "We count the seconds because every moment with you is infinity." ✨
            </p>
          </div>
        </div>
      )}

      {/* Main Envelopes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Envelope 1: My Letter to Partner */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white rounded-[40px] p-8 border border-rose-100 shadow-md flex flex-col justify-between min-h-[260px] relative overflow-hidden group transition-all"
        >
          {/* Decorative stamp/seal in background */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50/40 rounded-full -mr-8 -mt-8 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
            <Mail className="w-16 h-16 text-rose-100" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-3">
              <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm flex items-center gap-1.5 ${
                myMessage.trim() ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-500 border border-rose-100'
              }`}>
                {myMessage.trim() ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    Letter Sealed & Secured
                  </>
                ) : (
                  <>
                    <PenTool className="w-3.5 h-3.5 animate-pulse" />
                    Not Written Yet
                  </>
                )}
              </span>
            </div>

            <h4 className="font-extrabold text-slate-800 text-xl font-playful mb-2">
              Your Letter for {partnerName}
            </h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[85%]">
              Write down your deepest emotions, romantic memories, and loving promises. Safely stored in the cloud.
            </p>
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-rose-50 relative z-10">
            <span className="text-xs text-slate-400 font-bold">
              {myMessage.trim() ? `Locked: ${wordCount} words` : '0 words written'}
            </span>
            <button
              onClick={() => {
                setIsWriteModalOpen(true);
                // If there's no message, default straight to editing mode
                if (!myMessage.trim()) {
                  setIsEditing(true);
                }
              }}
              className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs px-5 py-3 rounded-full shadow-lg shadow-rose-100 hover:shadow-rose-200 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>{myMessage.trim() ? 'Open & Edit Envelope 💌' : 'Write Love Letter ✍️'}</span>
            </button>
          </div>
        </motion.div>

        {/* Envelope 2: Partner's Letter to Me */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white rounded-[40px] p-8 border border-rose-100 shadow-md flex flex-col justify-between min-h-[260px] relative overflow-hidden group transition-all"
        >
          {/* Stamp background */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-50/40 rounded-full -mr-8 -mt-8 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
            {timeLeft.isArrived ? (
              <MailOpen className="w-16 h-16 text-pink-100" />
            ) : (
              <Lock className="w-14 h-14 text-rose-100" />
            )}
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-3">
              {!timeLeft.isArrived ? (
                partnerHasWritten ? (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm border border-emerald-100">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Sealed & Locked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm border border-amber-100">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    Writing in Progress
                  </span>
                )
              ) : (
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm border border-emerald-200 flex items-center gap-1.5 animate-bounce">
                  <Unlock className="w-3.5 h-3.5" />
                  Officially Unlocked!
                </span>
              )}
            </div>

            <h4 className="font-extrabold text-slate-800 text-xl font-playful mb-2">
              Letter from {partnerName}
            </h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[85%]">
              {!timeLeft.isArrived 
                ? `${partnerName}'s anniversary letter is safeguarded with a secure golden heart padlock.` 
                : `${partnerName}'s romantic message is finally open! Click below to read their loving words.`}
            </p>
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-rose-50 relative z-10">
            <span className="text-xs text-rose-500 font-bold">
              {!timeLeft.isArrived ? 'Unlocks Nov 8th' : 'Available to read'}
            </span>

            {!timeLeft.isArrived ? (
              <button
                disabled
                className="bg-slate-100 text-slate-400 font-extrabold text-xs px-5 py-3 rounded-full flex items-center gap-2 cursor-not-allowed opacity-80"
              >
                <Lock className="w-4 h-4" />
                <span>Locked with Love 🔒</span>
              </button>
            ) : (
              <button
                onClick={() => setIsReadModalOpen(true)}
                className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs px-5 py-3 rounded-full shadow-lg shadow-rose-100 hover:shadow-rose-200 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Open & Read Letter 📖</span>
              </button>
            )}
          </div>
        </motion.div>

      </div>

      {/* --- WRITE / EDIT LOVE LETTER POP-UP MODAL --- */}
      <AnimatePresence>
        {isWriteModalOpen && (
          <div 
            onClick={() => {
              setIsWriteModalOpen(false);
              setIsEditing(false);
            }}
            className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white rounded-[32px] p-6 md:p-8 shadow-2xl border border-rose-50 max-w-2xl w-full max-h-[90vh] flex flex-col justify-between relative overflow-hidden cursor-default"
            >
              {/* Decorative Envelope Stamp */}
              <div className="absolute -top-10 -left-10 w-28 h-28 bg-rose-50 rounded-full opacity-60 z-0" />

              <div className="relative z-10 flex flex-col h-full flex-1">
                {/* Header */}
                <div className="border-b border-rose-100 pb-4 mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl md:text-2xl font-extrabold text-slate-800 font-playful flex items-center gap-2">
                      <Scroll className="w-6 h-6 text-rose-500" />
                      Your Love Letter for {partnerName}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Your words are private and safely encrypted. They will only be shared on your 1st Anniversary!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsWriteModalOpen(false);
                      setIsEditing(false);
                    }}
                    className="p-3 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer shrink-0 z-30 relative"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Editor or Static preview view */}
                {isEditing || !myMessage.trim() ? (
                  <div className="flex-1 flex flex-col min-h-[300px]">
                    <textarea
                      value={myMessage}
                      onChange={(e) => setMyMessage(e.target.value)}
                      placeholder={`Dearest ${partnerName},\n\nWrite your sweet, romantic letter here. Express your love, share memories of our first year, and tell me why you love me so much...\n\nWith all my love,\n${myName}`}
                      className="flex-1 w-full bg-rose-50/10 rounded-2xl p-5 border border-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 text-slate-700 placeholder-slate-400 leading-relaxed resize-none text-sm font-sans min-h-[250px] overflow-y-auto"
                    />
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold ${wordCount > maxWords ? 'text-rose-500' : 'text-slate-400'}`}>
                          Word Count: <span className="font-extrabold">{wordCount}</span> / {maxWords}
                        </span>
                        {wordCount > maxWords && (
                          <span className="text-[10px] text-rose-400 font-bold">Please trim to stay under 2000 words</span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {myMessage.trim() && (
                          <button
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={handleSaveMessage}
                          disabled={saving}
                          className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs px-5 py-3 rounded-full shadow-md shadow-rose-100 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>{saving ? 'Sealing...' : 'Save & Seal Letter 💌'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between min-h-[300px]">
                    {/* Parchment Paper styled container */}
                    <div className="bg-[#fefaf4] border border-amber-100/60 shadow-inner p-6 rounded-2xl max-h-[350px] overflow-y-auto italic text-amber-950 font-serif leading-relaxed text-sm whitespace-pre-line relative">
                      <div className="absolute top-2 right-4 opacity-5 pointer-events-none">
                        <Heart className="w-32 h-32 text-amber-950 fill-current" />
                      </div>
                      {myMessage}
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-rose-50 pt-4">
                      <div className="text-xs text-slate-400 font-bold">
                        Last locked: {wordCount} words
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setIsWriteModalOpen(false);
                          }}
                          className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          Close Envelope
                        </button>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-white bg-rose-500 hover:bg-rose-600 font-bold text-xs flex items-center gap-1.5 px-4 py-2.5 rounded-full shadow transition-all active:scale-95 cursor-pointer"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          <span>Edit Letter</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success toast inside modal */}
                <AnimatePresence>
                  {saveSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mt-3 p-3 bg-emerald-50 text-emerald-700 text-xs font-bold text-center rounded-2xl border border-emerald-100 flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <span>Your love letter is sealed and safe in the cloud! 💖</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- READ PARTNER'S LOVE LETTER POP-UP MODAL --- */}
      <AnimatePresence>
        {isReadModalOpen && timeLeft.isArrived && (
          <div 
            onClick={() => setIsReadModalOpen(false)}
            className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-gradient-to-b from-[#fefbf7] to-[#fcf4e8] rounded-[40px] p-8 md:p-10 shadow-2xl border border-amber-100 max-w-2xl w-full max-h-[85vh] flex flex-col relative overflow-hidden cursor-default"
            >
              {/* Red Wax Seal Background Decoration */}
              <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-rose-500/5 rounded-full border-4 border-dashed border-rose-500/10 pointer-events-none" />

              <div className="relative z-10 flex flex-col h-full overflow-hidden">
                {/* Scrollwork Header */}
                <div className="border-b border-amber-200/60 pb-4 mb-5 flex items-start justify-between gap-4 text-left">
                  <div>
                    <span className="text-xs text-amber-600 font-extrabold uppercase tracking-widest bg-amber-50 border border-amber-100 px-3 py-1 rounded-full inline-block mb-2">
                      💌 1st Anniversary Love Scroll
                    </span>
                    <h3 className="text-2xl font-extrabold text-amber-950 font-serif">
                      Letter from {partnerName}
                    </h3>
                    <p className="text-[11px] text-amber-700/80 font-medium italic mt-1">
                      Unlocked with endless love on November 8th
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsReadModalOpen(false);
                    }}
                    className="p-3 rounded-full text-amber-800 hover:text-amber-950 hover:bg-amber-100/60 transition-all cursor-pointer shrink-0 z-30 relative"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {partnerMessage ? (
                  <div className="flex-1 flex flex-col overflow-hidden justify-between">
                    {/* Letter Content container */}
                    <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                      <div className="font-serif leading-relaxed text-amber-950 text-base md:text-lg whitespace-pre-line italic p-1">
                        {partnerMessage}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-amber-200/60 flex flex-col items-center gap-4">
                      <p className="font-serif text-amber-900/80 italic text-sm text-center">
                        "Forever and always yours, with all my heart." ❤️
                      </p>

                      <button
                        onClick={() => setIsReadModalOpen(false)}
                        className="bg-amber-900 hover:bg-amber-950 text-white font-extrabold text-xs px-6 py-2.5 rounded-full transition-all active:scale-95 shadow cursor-pointer"
                      >
                        Fold & Close Scroll 💌
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                    <Heart className="w-16 h-16 text-rose-300 fill-rose-100 mb-4 animate-pulse" />
                    <p className="text-sm text-amber-800/80 italic font-serif">
                      {partnerName} hasn't locked or saved an anniversary letter yet. Ask them to write one so you can read their romantic words!
                    </p>
                    <button
                      onClick={() => setIsReadModalOpen(false)}
                      className="mt-6 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs px-5 py-2.5 rounded-full transition-all active:scale-95 cursor-pointer"
                    >
                      Close View
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
