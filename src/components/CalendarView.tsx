import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { format, isSameDay } from 'date-fns';
import { Heart, Quote, Image as ImageIcon, Sparkles, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDialog from './ConfirmDialog';

export default function CalendarView() {
  const [value, setValue] = useState(new Date());
  const [memories, setMemories] = useState<any[]>([]);
  const [selectedDateMemories, setSelectedDateMemories] = useState<any[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'memories'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMemories(docs);
    }, (error) => {
      console.error("Calendar listener failed:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const dayMemories = memories.filter(m => isSameDay(new Date(m.date), value));
    setSelectedDateMemories(dayMemories);
  }, [value, memories]);

  const tileContent = ({ date, view }: { date: Date, view: string }) => {
    if (view === 'month') {
      const hasMemory = memories.some(m => isSameDay(new Date(m.date), date));
      if (hasMemory) {
        return (
          <div className="flex justify-center mt-1">
            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
          </div>
        );
      }
    }
    return null;
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-2xl mx-auto">
      <div className="vibrant-card p-4 md:p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6 px-4">
          <h2 className="text-2xl font-bold text-slate-800 font-playful">Our Calendar</h2>
          <div className="flex gap-2">
            <span className="bg-rose-100 text-rose-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
              Relive the days
            </span>
          </div>
        </div>
        
        <div className="bg-rose-50/50 rounded-[2rem] p-2">
          <Calendar 
            onChange={(val) => {
              setValue(val as Date);
              setShowDetail(true);
            }} 
            value={value}
            tileContent={tileContent}
            className="w-full !bg-transparent"
          />
        </div>
        <p className="mt-4 text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest italic">
          Tap a date to see our special memories
        </p>
      </div>

      <AnimatePresence>
        {selectedDateMemories.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 px-4">
              <div className="bg-amber-100 p-2 rounded-full text-amber-500">
                <Sparkles size={16} />
              </div>
              <h3 className="font-bold text-slate-700">Captured on {format(value, 'do MMMM')}</h3>
            </div>
            
            {selectedDateMemories.map(memory => (
              <div 
                key={memory.id} 
                className="vibrant-card p-5 md:p-6 flex gap-5 hover:scale-[1.02] transition-transform"
              >
                {memory.mediaUrl && (
                  <div className="w-24 h-24 rounded-3xl overflow-hidden flex-shrink-0 bg-rose-50 shadow-inner">
                    <img src={memory.mediaUrl} alt={memory.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-slate-800 text-base">{memory.title}</h4>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        memory.type === 'photo' ? 'bg-blue-100 text-blue-600' : 
                        memory.type === 'journal' ? 'bg-emerald-100 text-emerald-600' :
                        'bg-rose-100 text-rose-600'
                      }`}>
                        {memory.type}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetId(memory.id);
                        }}
                        className="p-1 hover:bg-rose-50 text-rose-500 rounded-full transition-colors cursor-pointer"
                        title="Delete Memory"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-500 mt-2 line-clamp-2 font-playful text-lg leading-tight italic">
                    "{memory.description}"
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {memory.tags && memory.tags.map((tag: string) => (
                      <span key={tag} className="text-[8px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                    Added by {memory.userName}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <div className="vibrant-card p-12 text-center opacity-50 space-y-3 bg-white/50">
            <div className="bg-rose-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-rose-300">
              <Heart size={24} />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No memories on this day yet.</p>
          </div>
        )}
      </AnimatePresence>

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
