import React, { useState, useRef } from 'react';
import { db, storage, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytesResumable, uploadBytes } from 'firebase/storage';
import { X, Image as ImageIcon, FileText, Calendar as CalendarIcon, Heart, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import imageCompression from 'browser-image-compression';

interface MemoryFormProps {
  onClose: () => void;
}

export default function MemoryForm({ onClose }: MemoryFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'photo' | 'note' | 'event' | 'journal'>('photo');
  const [tags, setTags] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'compressing' | 'uploading' | 'saving'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    setUploadProgress(0);
    setStatus('idle');

    try {
      let mediaUrl = '';
      if (imageFile) {
        setStatus('compressing');
        // Compress image before upload
        const options = {
          maxSizeMB: 0.5, // Reduced from 0.8 for faster upload
          maxWidthOrHeight: 1280, // Reduced from 1920 for faster processing
          useWebWorker: true,
        };
        
        let fileToUpload = imageFile;
        try {
          fileToUpload = await imageCompression(imageFile, options);
        } catch (err) {
          console.error("Compression failed, using original", err);
        }

        console.log("Starting upload to Google Cloud Storage via API proxy...");
        setStatus('uploading');
        setUploadProgress(20); // Initial indicator

        try {
          const formData = new FormData();
          formData.append('file', fileToUpload);

          setUploadProgress(50); // Mid-way indicator
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            let errMsg = 'Failed to upload image.';
            try {
              const errData = await uploadResponse.json();
              errMsg = errData.error || errData.details || errMsg;
            } catch (jsonErr) {
              try {
                const textErr = await uploadResponse.text();
                if (textErr && textErr.length < 200) {
                  errMsg = textErr;
                }
              } catch (textErr) {}
            }
            throw new Error(errMsg);
          }

          const uploadData = await uploadResponse.json();
          mediaUrl = uploadData.url;
          setUploadProgress(100);
          console.log("Google Cloud Storage upload successful! URL:", mediaUrl);
        } catch (uploadErr: any) {
          console.error("GCS Upload failed:", uploadErr);
          throw new Error(`Google Cloud Storage upload failed: ${uploadErr.message}`);
        }
      }

      setStatus('saving');
      const memoryData = {
        title,
        description,
        date: new Date(date).toISOString(),
        type,
        mediaUrl,
        location,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Partner',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'memories'), memoryData);
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f43f5e', '#fb7185', '#fda4af']
      });

      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'memories');
    } finally {
      setLoading(false);
      setStatus('idle');
      setUploadProgress(0);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-900/20 backdrop-blur-md"
    >
      <div className="bg-white rounded-[40px] p-6 md:p-8 w-full max-w-md shadow-2xl relative flex flex-col max-h-[90vh] border border-rose-100">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-500 shrink-0" />
        
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-rose-600 font-playful">
            <Heart className="fill-rose-500 w-5 h-5" />
            Capture Memory
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-rose-50 rounded-full text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto pr-2 pb-2 custom-scrollbar">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest px-1">What happened?</label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., The best rainy day date"
              className="w-full px-4 py-2.5 bg-rose-50/50 border border-rose-100/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500/10 transition-all font-medium text-sm"
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'photo', icon: ImageIcon, label: 'Photo' },
              { id: 'note', icon: FileText, label: 'Note' },
              { id: 'event', icon: CalendarIcon, label: 'Event' },
              { id: 'journal', icon: Sparkles, label: 'Journal' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id as any)}
                className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 border-2 transition-all ${
                  type === t.id ? 'border-rose-500 bg-rose-50 text-rose-600 shadow-sm' : 'border-slate-50 bg-slate-50/50 text-slate-400 opacity-60'
                }`}
              >
                <t.icon size={16} />
                <span className="text-[8px] font-bold uppercase tracking-tight">{t.label}</span>
              </button>
            ))}
          </div>

          {type === 'photo' && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-rose-100 rounded-3xl aspect-video flex flex-col items-center justify-center cursor-pointer hover:bg-rose-50 transition-colors overflow-hidden group shrink-0"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <>
                  <div className="bg-rose-100 p-2 rounded-full text-rose-400 mb-1 group-hover:scale-110 transition-transform">
                    <ImageIcon size={20} />
                  </div>
                  <span className="text-[9px] text-rose-300 font-bold uppercase tracking-widest">Select Memory Photo</span>
                </>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                className="hidden" 
                accept="image/*"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest px-1">When?</label>
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-rose-50/50 border border-rose-100/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500/10 font-medium text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest px-1">Where?</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. DreamLand"
                className="w-full px-3 py-2 bg-rose-50/50 border border-rose-100/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500/10 font-medium text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest px-1">Tags</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2..."
              className="w-full px-4 py-2 bg-rose-50/50 border border-rose-100/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500/10 transition-all font-medium text-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest px-1">Recap of notes...</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write down the little things..."
              rows={2}
              className="w-full px-4 py-2 bg-rose-50/50 border border-rose-100/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500/10 resize-none font-playful text-lg"
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full mt-2 bg-rose-500 text-white font-bold py-3 rounded-2xl shadow-lg shadow-rose-200 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-70"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                <span>
                  {status === 'compressing' ? 'Compressing image...' : 
                   status === 'uploading' ? `Uploading... ${uploadProgress}%` : 
                   'Saving...'}
                </span>
              </div>
            ) : (
              <>
                <Heart size={16} className="fill-white" />
                Save Our Memory
              </>
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
