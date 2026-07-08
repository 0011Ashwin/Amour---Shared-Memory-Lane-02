import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Heart, Chrome, Sparkles, Loader2, Compass, AlertTriangle, ArrowRight, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import SecretPhraseGate from './SecretPhraseGate';

export default function Auth({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [redirectLoading, setRedirectLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  // Parse error helper
  const parseAuthError = (err: any) => {
    console.error("Auth error details:", err);
    const code = err.code || '';
    setErrorCode(code);
    
    if (code === 'auth/unauthorized-domain') {
      return `auth/unauthorized-domain`;
    } else if (code === 'auth/popup-closed-by-user') {
      return `auth/popup-closed-by-user`;
    } else if (code === 'auth/popup-blocked') {
      return `auth/popup-blocked`;
    }
    return err.message || 'Failed to sign in. Please try again.';
  };

  // Check if we survived a redirect login
  useEffect(() => {
    let active = true;
    const checkRedirect = async () => {
      try {
        setRedirectLoading(true);
        const result = await getRedirectResult(auth);
        if (!active) return;

        if (result && result.user) {
          const user = result.user;
          // Check if user exists in our partners collection
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (!userDoc.exists()) {
            await setDoc(doc(db, 'users', user.uid), {
              displayName: user.displayName || 'Ashwin/Khushi',
              email: user.email,
              photoURL: user.photoURL,
              role: 'partner',
              createdAt: new Date().toISOString()
            });
          }
          
          onAuthenticated();
        }
      } catch (err: any) {
        if (!active) return;
        const msg = parseAuthError(err);
        setError(msg);
      } finally {
        if (active) setRedirectLoading(false);
      }
    };

    checkRedirect();
    return () => {
      active = false;
    };
  }, [onAuthenticated]);

  const handleSignInPopup = async () => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user exists in our partners collection
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          displayName: user.displayName || 'Ashwin/Khushi',
          email: user.email,
          photoURL: user.photoURL,
          role: 'partner',
          createdAt: new Date().toISOString()
        });
      }
      
      onAuthenticated();
    } catch (err: any) {
      const msg = parseAuthError(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignInRedirect = async () => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      const msg = parseAuthError(err);
      setError(msg);
      setLoading(false);
    }
  };

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
  const currentHostname = window.location.hostname;
  const currentProjectId = "zoo-test-492620"; // From config

  if (redirectLoading) {
    return (
      <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="animate-spin text-rose-500 w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 font-playful">Logging you in...</h2>
        <p className="text-sm text-slate-400 mt-2">Checking together-space status.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-6 relative overflow-hidden heart-bg">
      <AnimatePresence mode="wait">
        {!isVerified ? (
          <SecretPhraseGate 
            key="gate"
            onSuccess={() => setIsVerified(true)}
            onCancel={() => {}}
          />
        ) : (
          <motion.div
            key="login-form"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-[40px] p-8 shadow-2xl shadow-rose-250 border border-white z-10 overflow-y-auto max-h-[90vh]"
          >
            <div className="flex justify-center mb-6">
              <div className="bg-rose-100 p-4 rounded-full">
                <Heart className="w-12 h-12 text-rose-500 fill-rose-500" />
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-800 mb-2 font-playful tracking-tight">Identity Verified</h1>
              <p className="text-slate-500 text-sm">
                Now, please sign in with your <span className="text-rose-500 font-bold">Google Account</span> to enter.
              </p>
            </div>

            {/* Main Action Area */}
            <div className="space-y-4">
              <button
                onClick={handleSignInPopup}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-rose-500 hover:bg-rose-600 text-white py-4 px-6 rounded-2xl font-bold active:scale-95 transition-all shadow-md shadow-rose-100 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin text-white" size={20} />
                ) : (
                  <>
                    <Chrome className="w-5 h-5" />
                    Continue with Google (Popup)
                  </>
                )}
              </button>

              <button
                onClick={handleSignInRedirect}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 py-3.5 px-6 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-sm"
              >
                <Smartphone className="w-5 h-5 text-rose-400" />
                Sign In with Redirect (Mobile/PWA Friendly)
              </button>
            </div>

            {/* Helpful Guide for Firebase Errors */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-6 text-sm text-left p-4 rounded-3xl bg-rose-50 border border-rose-100 space-y-4 text-slate-600"
                >
                  {/* Unauthorized Domain Error Handholding */}
                  {errorCode === 'auth/unauthorized-domain' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-rose-600 font-bold">
                        <AlertTriangle className="w-5 h-5" />
                        <span>Domain Authorization Needed</span>
                      </div>
                      <p className="text-xs leading-relaxed">
                        Your browser is block-protecting this sign-in because this website's address (URL) is not authorized in your Firebase Project Console.
                      </p>
                      <div className="bg-white/80 p-3.5 rounded-2xl border border-rose-100/60 text-xs font-mono select-all break-all shadow-inner">
                        {currentHostname}
                      </div>
                      <p className="text-xs font-bold text-slate-700">How to Fix This Step-by-Step:</p>
                      <ol className="text-xs space-y-2 list-decimal list-inside leading-relaxed pl-1">
                        <li>
                          Open the{' '}
                          <a 
                            href={`https://console.firebase.google.com/project/${currentProjectId}/authentication/settings`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-rose-500 font-bold underline hover:text-rose-600"
                          >
                            Firebase Console Auth Settings
                          </a>.
                        </li>
                        <li>Scroll down to the <b>Authorized domains</b> section.</li>
                        <li>Click <b>Add domain</b>.</li>
                        <li>Paste the address shown above: <code className="bg-rose-100/50 px-1 py-0.5 rounded leading-none select-all">{currentHostname}</code></li>
                        <li>Click <b>Add</b> to save, then refresh this page to try again!</li>
                      </ol>
                    </div>
                  ) : errorCode === 'auth/popup-closed-by-user' || errorCode === 'auth/popup-blocked' ? (
                    /* Popup Blocked Error Handholding */
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-amber-600 font-bold">
                        <Smartphone className="w-5 h-5" />
                        <span>Sign-In Blocked or Interrupted</span>
                      </div>
                      <p className="text-xs leading-relaxed">
                        On mobile browsers, inside private tabs, or standalone home-screen apps, popup windows can be blocked or accidentally closed.
                      </p>
                      <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-100 text-xs">
                        <p className="font-semibold text-amber-800 flex items-center gap-1.5 mb-1">
                          ✨ Recommended Solution:
                        </p>
                        <p className="text-amber-700 leading-normal">
                          Click the <b>"Sign In with Redirect"</b> button inside the application structure instead of the default popup button. This redirects you safely inside the same tab!
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* General Fallback Error */
                    <div className="space-y-1">
                      <p className="text-xs text-rose-500 text-center font-bold">Sign-In Error:</p>
                      <p className="text-xs text-rose-400 text-center select-text font-mono break-words">{error}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={() => setIsVerified(false)}
              className="mt-6 w-full text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-[0.2em] block text-center"
            >
              Back to Gate
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-rose-200/50 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-amber-100/50 rounded-full blur-3xl" />
    </div>
  );
}
