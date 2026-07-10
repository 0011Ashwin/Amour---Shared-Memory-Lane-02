import { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { X, Maximize2, Heart, Download, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import ConfirmDialog from './ConfirmDialog';

export default function GalleryView() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch memories of type 'photo' or that have a mediaUrl
    const q = query(
      collection(db, 'memories'), 
      where('mediaUrl', '!=', ''),
      orderBy('mediaUrl'), // Fix for Firestore: inequality filter requires orderBy on the same field
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      // Filter in memory if needed or rely on higher level logic
      const filtered = docs.filter(doc => doc.mediaUrl);
      setPhotos(filtered);
      setLoading(false);
    }, (error) => {
      console.error("Gallery listener failed:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
    </div>
  );

  if (photos.length === 0) return (
    <div className="vibrant-card p-12 text-center opacity-50 space-y-3 bg-white/50 max-w-md mx-auto mt-10">
      <div className="bg-rose-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-rose-300">
        <Heart size={24} />
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No photos captured yet.</p>
    </div>
  );

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 font-playful">Our Gallery</h2>
          <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">A lifetime in frames</p>
        </div>
        <div className="flex gap-2">
           <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
             {photos.length} Memories Captured
           </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {photos.map((photo, index) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setSelectedPhoto(photo)}
            className="group relative aspect-square rounded-[2rem] overflow-hidden bg-slate-100 cursor-pointer shadow-sm hover:shadow-xl hover:shadow-rose-100 transition-all border border-white"
          >
            <img 
              src={photo.mediaUrl} 
              alt={photo.title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
              <p className="text-white text-xs font-bold line-clamp-1">{photo.title}</p>
              <p className="text-white/70 text-[9px] font-medium tracking-tighter">
                {format(new Date(photo.date), 'MMM d, yyyy')}
              </p>
            </div>
            
            <div className="absolute top-3 right-3 flex gap-2 z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTargetId(photo.id);
                }}
                className="w-8 h-8 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110 cursor-pointer"
                title="Delete Memory"
              >
                <Trash2 size={12} />
              </button>
              <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 size={14} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
          >
            <button 
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-6 right-6 md:top-12 md:right-12 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors z-[110]"
            >
              <X size={24} />
            </button>

            <motion.div 
              layoutId={selectedPhoto.id}
              className="relative w-full max-w-4xl max-h-full flex flex-col items-center"
            >
              <img 
                src={selectedPhoto.mediaUrl} 
                alt={selectedPhoto.title} 
                className="max-w-full max-h-[70vh] object-contain rounded-3xl shadow-2xl border border-white/10"
              />
              
              <div className="mt-8 text-center space-y-2 max-w-xl">
                <h3 className="text-2xl md:text-3xl font-bold text-white font-playful tracking-wide">
                  {selectedPhoto.title}
                </h3>
                <p className="text-slate-400 text-sm md:text-base font-medium">
                  {format(new Date(selectedPhoto.date), 'MMMM do, yyyy')} • Added by {selectedPhoto.userName}
                </p>
                {selectedPhoto.description && (
                  <p className="text-slate-300 italic font-playful text-lg md:text-xl px-6">
                    "{selectedPhoto.description}"
                  </p>
                )}
                
                <div className="pt-4 flex flex-wrap justify-center gap-3">
                  <a 
                    href={selectedPhoto.mediaUrl} 
                    target="_blank" 
                    rel="referrer" 
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-xs font-bold transition-all"
                  >
                    <Download size={14} /> Download Original
                  </a>
                  <button
                    onClick={() => {
                      setDeleteTargetId(selectedPhoto.id);
                    }}
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    <Trash2 size={14} /> Delete Memory
                  </button>
                  <div className="flex items-center gap-2 bg-rose-500/20 text-rose-400 px-4 py-2 rounded-full text-xs font-bold">
                    <Heart size={14} className="fill-rose-400" /> Forever
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
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
              if (selectedPhoto && selectedPhoto.id === deleteTargetId) {
                setSelectedPhoto(null);
              }
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
