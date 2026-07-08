import React, { useState, useEffect, useRef } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Music, Play, Pause, Volume2, VolumeX, SkipForward, SkipBack, Plus, Trash2, Loader2, Sparkles, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Default sweet romantic instrumentals if no custom songs are uploaded yet
const DEFAULT_SONGS = [
  {
    id: 'default-1',
    title: 'Warm Summer Romance (Acoustic)',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    uploadedBy: 'System'
  },
  {
    id: 'default-2',
    title: 'Ethereal Love Theme (Piano)',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    uploadedBy: 'System'
  },
  {
    id: 'default-3',
    title: 'Serenade of Infinity (Violin)',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    uploadedBy: 'System'
  }
];

export default function BackgroundMusicPlayer({ user }: { user: any }) {
  const [songs, setSongs] = useState<any[]>([]);
  const [deletedDefaultIds, setDeletedDefaultIds] = useState<string[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isOpen, setIsOpen] = useState(false);
  const [autoplayAttempted, setAutoplayAttempted] = useState(false);
  
  // Uploading states
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [songToDelete, setSongToDelete] = useState<{ id: string; title: string } | null>(null);

  // Audio HTML Element Ref
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isAshwin = user?.email === 'ashwinmehta1234500@gmail.com';
  const visibleDefaultSongs = DEFAULT_SONGS.filter(song => !deletedDefaultIds.includes(song.id));
  const activePlaylist = [...visibleDefaultSongs, ...songs];
  const currentSong = activePlaylist[currentSongIndex] || null;

  // Helper for comparing URLs robustly
  const getAbsoluteUrl = (urlStr: string): string => {
    if (!urlStr) return '';
    if (urlStr.startsWith('http')) return urlStr;
    try {
      return new URL(urlStr, window.location.origin).href;
    } catch (e) {
      return urlStr;
    }
  };

  // 1. Listen for custom songs from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'songs'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customSongs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSongs(customSongs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'songs');
    });

    return () => unsubscribe();
  }, [user]);

  // Listen for deleted default songs
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'deleted_default_songs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ids = snapshot.docs.map(doc => doc.id);
      setDeletedDefaultIds(ids);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'deleted_default_songs');
    });
    return () => unsubscribe();
  }, [user]);

  // Safety check to ensure index is never out of bounds when tracks are removed
  useEffect(() => {
    if (activePlaylist.length > 0 && currentSongIndex >= activePlaylist.length) {
      setCurrentSongIndex(0);
    }
  }, [activePlaylist, currentSongIndex]);

  // 2. Manage Audio Element Setup and Event Listeners
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;

    const handleEnded = () => {
      // Loop if there's only 1 song in the active playlist
      if (activePlaylist.length <= 1) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Autoplay loop prevented:", e));
      } else {
        // Play next sequentially
        setCurrentSongIndex(prevIndex => (prevIndex + 1) % activePlaylist.length);
        setIsPlaying(true);
      }
    };

    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [activePlaylist]);

  // 3. Track URL changes and trigger play safely
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    const audio = audioRef.current;
    const targetUrl = getAbsoluteUrl(currentSong.url);
    const isSameSource = audio.src && (audio.src === targetUrl || getAbsoluteUrl(audio.src) === targetUrl);

    if (!isSameSource) {
      audio.src = targetUrl;
      audio.load();
    }

    audio.volume = volume;
    audio.muted = isMuted;

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log("Autoplay block or interruption. Waiting for user interaction.", error);
          // Don't forcefully change state, just let user toggle it
        });
      }
    } else {
      audio.pause();
    }
  }, [currentSong, isPlaying]);

  // 4. Autoplay on first click anywhere in the app
  useEffect(() => {
    if (autoplayAttempted) return;

    const handleGesture = () => {
      if (autoplayAttempted) return;
      setAutoplayAttempted(true);
      setIsPlaying(true);
    };

    window.addEventListener('click', handleGesture, { once: true });
    window.addEventListener('touchstart', handleGesture, { once: true });

    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, [autoplayAttempted]);

  // 5. Playback control helpers with direct audio manipulation for better browser support
  const togglePlay = () => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    setAutoplayAttempted(true);
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      audio.play().catch(err => {
        console.log("Audio play gesture blocked, loaded first", err);
        audio.load();
        audio.play()
          .then(() => setIsPlaying(true))
          .catch(e => {
            console.error("Direct playback failed:", e);
            setIsPlaying(false);
          });
      });
    }
  };

  const toggleMute = () => {
    setAutoplayAttempted(true);
    const newMute = !isMuted;
    setIsMuted(newMute);
    if (audioRef.current) {
      audioRef.current.muted = newMute;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoplayAttempted(true);
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleNext = () => {
    setAutoplayAttempted(true);
    if (activePlaylist.length > 1) {
      setCurrentSongIndex((currentSongIndex + 1) % activePlaylist.length);
      setIsPlaying(true);
    }
  };

  const handlePrev = () => {
    setAutoplayAttempted(true);
    if (activePlaylist.length > 1) {
      setCurrentSongIndex((currentSongIndex - 1 + activePlaylist.length) % activePlaylist.length);
      setIsPlaying(true);
    }
  };

  // 6. Ashwin Only: Audio upload & Delete handlers
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    // Prepare upload
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Direct POST to express `/api/upload` endpoint
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error("Server failed to process file upload.");
      }

      const data = await response.json();
      if (data.status === 'success' && data.url) {
        // Save to Firestore 'songs'
        const cleanTitle = file.name.replace(/\.[^/.]+$/, ""); // strip extension
        try {
          await addDoc(collection(db, 'songs'), {
            title: cleanTitle,
            url: data.url,
            uploadedBy: user.email,
            createdAt: new Date().toISOString()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'songs');
        }

        // Auto transition to newly uploaded song
        setIsPlaying(true);
      } else {
        throw new Error(data.error || "File upload failed.");
      }
    } catch (err: any) {
      console.error("Audio Upload Failed:", err);
      setUploadError(err.message || "Failed to upload audio file.");
    } finally {
      setUploading(false);
      // reset file input
      e.target.value = '';
    }
  };

  const handleDeleteSong = (songId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const song = activePlaylist.find(s => s.id === songId);
    if (song) {
      setSongToDelete({ id: song.id, title: song.title });
    }
  };

  const confirmDeleteSong = async () => {
    if (!songToDelete) return;
    const { id: songId } = songToDelete;
    try {
      if (songId.startsWith('default-')) {
        try {
          await setDoc(doc(db, 'deleted_default_songs', songId), {
            deletedAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `deleted_default_songs/${songId}`);
        }
      } else {
        try {
          await deleteDoc(doc(db, 'songs', songId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `songs/${songId}`);
        }
      }
      // Reset index to 0 if needed
      setCurrentSongIndex(0);
    } catch (err) {
      console.error("Failed to delete song:", err);
    } finally {
      setSongToDelete(null);
    }
  };

  return (
    <>
      {/* Autoplay prompt if not playing yet */}
      <AnimatePresence>
        {!isPlaying && !autoplayAttempted && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            onClick={() => {
              setAutoplayAttempted(true);
              setIsPlaying(true);
            }}
            className="fixed bottom-24 right-6 md:right-8 bg-rose-500 text-white font-bold py-3 px-5 rounded-full shadow-2xl flex items-center gap-2 hover:bg-rose-600 transition-colors z-50 text-xs active:scale-95 animate-bounce border-2 border-white"
          >
            <Sparkles className="w-4 h-4 text-yellow-200 fill-yellow-200" />
            <span>Tap to Play Music ❤️</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating Music Bubble & Player Card */}
      <div className="fixed bottom-6 right-6 md:right-8 z-50">
        
        {/* Floating Bubble */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl relative border-2 border-white transition-all ${
            isPlaying ? 'bg-rose-500 hover:bg-rose-600' : 'bg-slate-400 hover:bg-slate-500'
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Music className="w-6 h-6" />
        </motion.button>

        {/* Player Expanded Control Card */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className={`absolute bottom-18 right-0 w-80 bg-white rounded-[32px] p-6 shadow-2xl border border-rose-50 flex flex-col gap-5 max-h-[80vh] overflow-y-auto relative ${
                songToDelete ? 'overflow-hidden' : ''
              }`}
            >
              {/* Heading */}
              <div className="flex items-center justify-between border-b border-rose-50 pb-3">
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-rose-500" />
                  <span className="font-extrabold text-slate-800 text-sm">Background Soundtrack</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    {isPlaying ? 'Playing' : 'Paused'}
                  </span>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Current Track Display */}
              <div className="bg-rose-50/50 rounded-2xl p-4 flex flex-col items-center text-center relative overflow-hidden shadow-inner">
                <div className="absolute top-2 right-2 flex gap-0.5">
                  <span className={`w-1 h-3 bg-rose-400 rounded-full ${isPlaying ? 'animate-bar-bounce' : ''}`} style={{ animationDelay: '0.1s' }} />
                  <span className={`w-1 h-4 bg-rose-400 rounded-full ${isPlaying ? 'animate-bar-bounce' : ''}`} style={{ animationDelay: '0.3s' }} />
                  <span className={`w-1 h-2 bg-rose-400 rounded-full ${isPlaying ? 'animate-bar-bounce' : ''}`} style={{ animationDelay: '0.5s' }} />
                </div>

                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Now Playing</p>
                <h5 className="font-extrabold text-slate-700 text-sm line-clamp-2 px-2">
                  {currentSong ? currentSong.title : 'No track active'}
                </h5>
                <p className="text-[10px] text-slate-400 font-medium mt-1">
                  Uploaded by: {currentSong?.uploadedBy === 'System' ? 'Lovely App Defaults' : (currentSong?.uploadedBy === 'ashwinmehta1234500@gmail.com' ? 'Ashwin ❤️' : 'Beba (Khushi) ❤️')}
                </p>
              </div>

              {/* Playback Controls Row */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handlePrev}
                  disabled={activePlaylist.length <= 1}
                  className="p-2.5 rounded-full bg-slate-50 hover:bg-rose-50 hover:text-rose-500 text-slate-500 transition-colors disabled:opacity-40"
                >
                  <SkipBack className="w-4 h-4 fill-current" />
                </button>

                <button
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-100 transition-all hover:scale-105"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={handleNext}
                  disabled={activePlaylist.length <= 1}
                  className="p-2.5 rounded-full bg-slate-50 hover:bg-rose-50 hover:text-rose-500 text-slate-500 transition-colors disabled:opacity-40"
                >
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>
              </div>

              {/* Mute & Volume Slider */}
              <div className="flex items-center gap-3 bg-slate-50/60 p-2.5 rounded-2xl">
                <button
                  onClick={toggleMute}
                  className="text-slate-500 hover:text-rose-500 transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="flex-1 accent-rose-500 h-1 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* Playlist details & Upload Panel */}
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  Playlist Queue ({activePlaylist.length} tracks)
                </span>

                 <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {activePlaylist.map((song, idx) => (
                    <div
                      key={song.id}
                      onClick={() => {
                        setCurrentSongIndex(idx);
                        setIsPlaying(true);
                      }}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors group ${
                        idx === currentSongIndex 
                          ? 'bg-rose-50/80 font-bold text-rose-600' 
                          : 'hover:bg-slate-50 text-slate-500'
                      }`}
                    >
                      <span className="truncate flex-1 pr-2">
                        {idx + 1}. {song.title}
                      </span>

                      {/* Delete option for any track (default or custom) */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSong(song.id, e)}
                        className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-all shrink-0 z-10"
                        title="Delete song"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Audio File Upload Controls for Partners */}
                {user && (
                  <div className="border-t border-rose-50 pt-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="audio/mp3,audio/*"
                      className="hidden"
                    />

                    <button
                      onClick={handleUploadClick}
                      disabled={uploading}
                      className="w-full py-3 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-rose-200 disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                          <span>Uploading Love Song...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 text-rose-500" />
                          <span>Upload Song File (.mp3)</span>
                        </>
                      )}
                    </button>

                    {uploadError && (
                      <div className="mt-2 text-[10px] text-rose-500 flex items-center gap-1 font-bold bg-rose-50 p-2 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{uploadError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Custom Delete Confirmation Overlay */}
              <AnimatePresence>
                {songToDelete && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute inset-0 bg-white/95 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center rounded-[32px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-3 animate-pulse">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-base mb-1">Remove Song?</h4>
                    <p className="text-slate-500 text-xs px-2 mb-4">
                      Are you sure you want to remove <span className="font-bold text-slate-700">"{songToDelete.title}"</span> from our playlist? 💔
                    </p>
                    <div className="flex gap-3 w-full max-w-[240px]">
                      <button
                        type="button"
                        onClick={() => setSongToDelete(null)}
                        className="flex-1 py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmDeleteSong}
                        className="flex-1 py-2 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-colors shadow-md shadow-rose-100 cursor-pointer"
                      >
                        Yes, Remove
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
