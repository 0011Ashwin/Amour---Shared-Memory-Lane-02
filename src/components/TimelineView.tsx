import { useState, useEffect } from 'react';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Calendar as CalendarIcon, List, Clock, MapPin, Heart, Quote, Image as ImageIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDialog from './ConfirmDialog';

export default function TimelineView() {
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'memories'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMemories(docs);
      setLoading(false);
    }, (error) => {
      console.error("Timeline listener failed:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
    </div>
  );

  if (memories.length === 0) return (
    <div className="text-center py-20 px-6">
      <div className="bg-rose-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
        <Heart className="text-rose-300 w-10 h-10" />
      </div>
      <h3 className="text-xl font-bold text-slate-700 font-playful">No memories yet!</h3>
      <p className="text-slate-400 text-sm mt-1">Tap the heart button below to start our lane.</p>
    </div>
  );

  return (
    <div className="px-6 py-4 space-y-12 relative max-w-2xl mx-auto">
      {/* Timeline line */}
      <div className="absolute left-[39px] top-12 bottom-12 w-0.5 bg-rose-100 hidden md:block" />

      {memories.map((memory, index) => (
        <motion.div
          key={memory.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex flex-col md:flex-row gap-4 md:gap-12 group relative"
        >
          {/* Date Side */}
          <div className="md:w-20 md:flex-shrink-0 flex md:flex-col items-center md:items-end justify-between md:justify-start pt-2">
            <div className="md:hidden flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-rose-400"></span>
               <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">
                {format(new Date(memory.date), 'MMMM d, yyyy')}
               </span>
            </div>
            
            <div className="hidden md:flex flex-col items-end mr-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">
                {format(new Date(memory.date), 'MMMM yyyy')}
              </p>
              <h3 className="text-3xl font-bold text-slate-800 leading-none">
                {format(new Date(memory.date), 'dd')}
              </h3>
            </div>

            {/* The Dot */}
            <div className={`hidden md:flex absolute left-[31px] w-5 h-5 rounded-full border-4 border-white shadow-sm z-10 transition-transform group-hover:scale-125 ${
              index % 2 === 0 ? 'bg-rose-400' : 'bg-blue-400'
            }`} />
          </div>

          {/* Content Card */}
          <div className="vibrant-card flex-1 p-6 md:p-8 transition-all hover:shadow-xl hover:shadow-rose-100 group-hover:-translate-y-1">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-xl font-bold text-slate-800 mb-1">{memory.title}</h4>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                    memory.type === 'photo' ? 'bg-blue-100 text-blue-600' :
                    memory.type === 'note' ? 'bg-yellow-100 text-yellow-700' :
                    memory.type === 'journal' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-rose-100 text-rose-500'
                  }`}>
                    {memory.type}
                  </span>
                  {memory.tags && memory.tags.map((tag: string) => (
                    <span key={tag} className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${
                  memory.userName.toLowerCase().includes('ashwin') ? 'bg-blue-400' : 'bg-pink-400'
                }`}>
                  {memory.userName.charAt(0)}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTargetId(memory.id);
                  }}
                  className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                  title="Delete Memory"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {memory.mediaUrl && (
              <div className="mb-4 rounded-3xl overflow-hidden aspect-video shadow-inner bg-slate-50 border border-slate-100">
                <img src={memory.mediaUrl} alt={memory.title} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" />
              </div>
            )}

            {memory.description && (
              <p className="text-slate-600 leading-relaxed font-playful text-lg lg:text-xl">
                {memory.description}
              </p>
            )}

            {memory.location && (
              <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 w-fit px-3 py-1 rounded-full">
                <MapPin size={12} className="text-rose-400" />
                {memory.location}
              </div>
            )}
          </div>
        </motion.div>
      ))}

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Delete Memory"
        message="Are you sure you want to delete this memory? This action cannot be undone."
        onConfirm={async () => {
          if (deleteTargetId) {
            try {
              await deleteDoc(doc(db, 'memories', deleteTargetId));
              setDeleteTargetId(null);
            } catch (err) {
              handleFirestoreError(err, OperationType.DELETE, `memories/${deleteTargetId}`);
            }
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
