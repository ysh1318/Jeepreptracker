import React, { useState, useEffect, useRef } from 'react';
import { User as UserIcon, LogOut, Loader2, ChevronDown, ShieldCheck, AlertTriangle, ExternalLink, Sparkles, UserCheck, CheckCircle2, Star } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { DEFAULT_CLASS_ID, ADMIN_EMAIL, isAdminEmail } from '../lib/config';
import { GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, query, where, getDocs, collectionGroup } from 'firebase/firestore';
import { getRankInfo } from '../lib/ranks';
import { playSound } from '../lib/audio';
import { TransparentBadgeImage } from '../lib/transparentBadge';

interface HeaderProps {
  onProfileChange?: (profile: { fullName: string, rollNumber: string, role?: string } | null) => void;
  profileToView?: any;
  onCloseProfileToView?: () => void;
  onOpenSwitchModal?: () => void;
  classId?: string;
}

export default function Header({ onProfileChange, profileToView, onCloseProfileToView, onOpenSwitchModal, classId = DEFAULT_CLASS_ID }: HeaderProps) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ fullName: string, rollNumber: string, role?: string, email?: string } | null>(null);
  const [myProfile, setMyProfile] = useState<{ fullName: string, rollNumber: string, role?: string, email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Form states for first-time Google sign-ins
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authConfigError, setAuthConfigError] = useState(false);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    if (showProfileModal && profile) {
      const isStudent = profile.role === 'student' || !profile.role;
      if (isStudent) {
        const points = (profile as any).points || 0;
        const rank = getRankInfo(points);
        playSound('rankup', rank.title);
      }
    }
  }, [showProfileModal, profile]);

  useEffect(() => {
    if (profileToView) {
      setProfile(profileToView);
      setShowProfileModal(true);
    }
  }, [profileToView]);

  const handleCloseModal = () => {
    setShowProfileModal(false);
    if (profileToView) {
      if (myProfile) {
        setProfile(myProfile);
      }
      if (onCloseProfileToView) onCloseProfileToView();
    }
  };

  const onProfileChangeRef = useRef(onProfileChange);
  useEffect(() => {
    onProfileChangeRef.current = onProfileChange;
  }, [onProfileChange]);

  useEffect(() => {
    localStorage.removeItem('mock_sandbox_user');
    localStorage.removeItem('mock_sandbox_profile');

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        let resolvedClassId = classId;
        let profileRef = doc(db, 'classes', resolvedClassId, 'students', currentUser.uid);
        if (resolvedClassId === DEFAULT_CLASS_ID || !resolvedClassId) {
          try {
            const q = query(collectionGroup(db, 'students'), where('email', '==', currentUser.email));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const matchedDoc = snap.docs[0];
              resolvedClassId = matchedDoc.ref.parent.parent.parent.parent.id;
              profileRef = doc(db, 'classes', resolvedClassId, 'students', currentUser.uid);
            }
          } catch (e) {
            console.warn("Header dynamic class lookup failed:", e);
          }
        }
        try {
          const docSnap = await getDoc(profileRef);
          const isYashAdmin = isAdminEmail(currentUser.email);
          const roleOverride = localStorage.getItem('role_override');

          if (docSnap.exists()) {
            const data = docSnap.data() as any;
            if (roleOverride) {
              data.role = roleOverride;
            } else if (isYashAdmin && data.role !== 'admin') {
              data.role = 'admin';
              await setDoc(profileRef, data, { merge: true });
            }
            setProfile(data);
            setMyProfile(data);
            onProfileChangeRef.current?.(data);
          } else {
            if (isYashAdmin) {
              const newProfile = {
                fullName: currentUser.displayName || 'Yash Awachar',
                rollNumber: 'ADMIN-01',
                role: roleOverride || 'admin',
                email: currentUser.email || ADMIN_EMAIL,
                createdAt: new Date().toISOString(),
              };
              await setDoc(profileRef, newProfile);
              setProfile(newProfile);
              setMyProfile(newProfile);
              onProfileChangeRef.current?.(newProfile);
            } else if (!currentUser.isAnonymous) {
              setShowProfileModal(true);
              if (currentUser.displayName) setFullName(currentUser.displayName);
            }
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          if (!currentUser.isAnonymous) {
            const isYashAdmin = isAdminEmail(currentUser.email);
            const roleOverride = localStorage.getItem('role_override');
            if (isYashAdmin) {
              const fallbackProfile = {
                fullName: currentUser.displayName || 'Yash Awachar',
                rollNumber: 'ADMIN-01',
                role: roleOverride || 'admin',
                email: currentUser.email || ADMIN_EMAIL,
                createdAt: new Date().toISOString(),
              };
              setProfile(fallbackProfile);
              setMyProfile(fallbackProfile);
              onProfileChangeRef.current?.(fallbackProfile);
            } else {
              setShowProfileModal(true);
            }
          }
        }
      } else {
        setProfile(null);
        setMyProfile(null);
        onProfileChangeRef.current?.(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    localStorage.removeItem('mock_sandbox_user');
    localStorage.removeItem('mock_sandbox_profile');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setShowAuthModal(false);
    } catch (error: any) {
      const errorStr = String(error?.message || error);
      if (errorStr.includes('auth/configuration-not-found')) {
        setAuthConfigError(true);
      } else {
        console.warn('Google login popup was closed or failed:', errorStr);
        alert(
          'Sign-In popup failed or was blocked.\n\n' +
            'This is common inside sandbox preview windows. ' +
            "Please click 'Open App in New Tab' to sign in successfully."
        );
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !fullName.trim() || !rollNumber.trim()) return;

    setIsSubmitting(true);
    let resolvedClassId = classId;
    if (profile && (profile as any).classId) {
      resolvedClassId = (profile as any).classId;
    }
    if (resolvedClassId === DEFAULT_CLASS_ID || !resolvedClassId) {
      try {
        const q = query(collectionGroup(db, 'students'), where('email', '==', user.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          resolvedClassId = snap.docs[0].ref.parent.parent.parent.parent.id;
        }
      } catch (e) {
        console.warn("Header dynamic save class lookup failed:", e);
      }
    }
    const profileRef = doc(db, 'classes', resolvedClassId, 'students', user.uid);

    try {
      const isYashAdmin = isAdminEmail(user.email);
      const newProfile = {
        fullName: fullName.trim(),
        rollNumber: rollNumber.trim(),
        role: isYashAdmin ? 'admin' : 'student',
        email: user.email || '',
        createdAt: new Date().toISOString(),
      };

      await setDoc(profileRef, newProfile);
      setProfile(newProfile);
      setMyProfile(newProfile);
      onProfileChange?.(newProfile);
      setShowProfileModal(false);
    } catch (error) {
      console.error('Error saving profile', error);
      alert('Error saving profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      try {
        await signOut(auth);
      } catch (e) {
        console.error('Firebase sign out failed:', e);
      }
      setUser(null);
      setProfile(null);
      setMyProfile(null);
      onProfileChange?.(null);
      setShowProfileModal(false);
      setShowLogoutConfirm(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'teacher': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  if (loading) {
    return (
      <div className="w-full flex justify-between items-center bg-white border border-[#ece9e3] rounded-2xl px-5 py-4 mb-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1b3b2a] flex items-center justify-center text-white font-bold text-[14px]">J</div>
          <div>
            <h2 className="text-[13.5px] font-extrabold text-[#1b1c19]">JEE Prep Tracker</h2>
            <p className="text-[10px] text-[#83837c] font-bold">Loading...</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#e7eee6] animate-pulse flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-[#1b3b2a] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Floating Top Actions ── */}
      <div className="w-full flex justify-end mb-6">
        {/* Right side (Profile / Login) */}
        <div className="flex items-center gap-3">
          {!user ? (
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-[#1b3b2a] hover:bg-[#204631] text-white px-4 py-2.5 rounded-xl font-bold text-[13px] flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <UserIcon className="w-4 h-4" />
              Sign In / Sync Data
            </button>
          ) : (
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full border border-[#ece9e3] bg-[#faf9f5] hover:border-[#d7d4cb] hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#dce7de] overflow-hidden flex items-center justify-center text-[#1b3b2a] shrink-0 font-bold text-[14px]">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'S'
                )}
              </div>
              <div className="flex flex-col items-start min-w-0 max-w-[120px]">
                <span className="text-[12px] font-extrabold text-[#1b1c19] truncate w-full text-left">
                  {profile?.fullName || user?.displayName || 'Student'}
                </span>
                {profile?.rollNumber && (
                  <span className="text-[10px] font-bold text-[#83837c] truncate w-full text-left">
                    {profile.rollNumber}
                  </span>
                )}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#a6a59f] ml-1 shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* ── Auth Modal ── */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#ece9e3] shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="px-6 py-5 border-b border-[#ece9e3] bg-[#f4f7f4] flex justify-between items-center">
              <div>
                <h2 className="text-[18px] font-extrabold text-[#1b1c19] flex items-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-emerald-700" />
                  Classroom Authentication
                </h2>
                <p className="text-[12px] text-[#555651] font-semibold mt-1">Select your preferred login method</p>
              </div>
              <button onClick={() => setShowAuthModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1 cursor-pointer">✕</button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {isInIframe && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-[11.5px] text-amber-900 leading-relaxed font-semibold">
                    You are inside a sandbox preview frame. Google sign-in popups are blocked by browsers inside frames. Please{' '}
                    <button onClick={handleOpenNewTab} className="underline text-amber-800 hover:text-amber-950 font-bold inline-flex items-center gap-0.5 cursor-pointer">
                      Open in a New Tab <ExternalLink className="w-3 h-3" />
                    </button>
                    {' '}to sign in successfully.
                  </div>
                </div>
              )}

              {/* Google Account Sign-In */}
              <div className="border border-gray-100 rounded-xl p-4">
                <h3 className="text-[14px] font-extrabold text-gray-800 mb-1">Google Account Sign-In</h3>
                <p className="text-[11.5px] text-[#555651] font-medium mb-3.5">Access your real-time synced classroom account via Google OAuth.</p>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    onClick={handleGoogleSignIn}
                    className="flex-1 bg-white border border-[#d3d0c9] hover:bg-[#f7f6f3] text-gray-700 font-extrabold text-[12.5px] py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </button>
                  <button
                    onClick={handleOpenNewTab}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-[12.5px] py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in New Tab
                  </button>
                </div>

                {/* Firebase Auth Configuration Guide */}
                {authConfigError && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                    <h4 className="text-[12px] font-black text-amber-950 flex items-center gap-1.5 uppercase tracking-wide">
                      🔧 Firebase Setup Required
                    </h4>
                    <p className="text-[11px] text-amber-900 leading-relaxed font-semibold">
                      Your Firebase project <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">jeetracker-a6c9b</code> doesn't have Google Auth enabled.
                    </p>
                    <ol className="list-decimal list-inside text-[11px] text-amber-900 space-y-1 font-bold pl-1">
                      <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline hover:text-amber-950">Firebase Console</a>.</li>
                      <li>Go to <span className="font-extrabold">Build &gt; Authentication</span>.</li>
                      <li>Click <span className="font-extrabold">Get Started</span> (if not done already).</li>
                      <li>Under the <span className="font-extrabold">Sign-in method</span> tab, enable <span className="font-extrabold">Google</span> Sign-in provider.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile Completion Modal (first-time Google users) ── */}
      {showProfileModal && user && !profile && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-[#ece9e3] shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-[#ece9e3] bg-[#f4f7f4]">
              <h2 className="text-[18px] font-extrabold text-[#1b1c19]">Complete Your Profile</h2>
              <p className="text-[12px] text-[#555651] font-semibold mt-1">Please provide your details to join the classroom.</p>
            </div>
            <form onSubmit={handleSaveProfile} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[12.5px] font-bold text-[#1b1c19] mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#ece9e3] text-[14px] focus:outline-none focus:border-[#1b3b2a] focus:ring-1 focus:ring-[#1b3b2a]"
                  placeholder="e.g. Yash Sharma"
                  required
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-bold text-[#1b1c19] mb-1.5">Roll Number</label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#ece9e3] text-[14px] focus:outline-none focus:border-[#1b3b2a] focus:ring-1 focus:ring-[#1b3b2a]"
                  placeholder="e.g. JEE-2026-042"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !fullName.trim() || !rollNumber.trim()}
                className={`w-full py-2.5 px-4 text-white font-extrabold text-[13.5px] rounded-xl transition-all shadow-md mt-2 ${
                  isSubmitting || !fullName.trim() || !rollNumber.trim()
                    ? 'bg-gray-300 cursor-not-allowed shadow-none'
                    : 'bg-[#1b3b2a] hover:bg-[#204631] hover:shadow-lg active:translate-y-0.5 cursor-pointer'
                }`}
              >
                {isSubmitting ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Profile View Modal (opened by profile icon) ── */}
      {showProfileModal && user && profile && (() => {
        const isStudent = profile.role === 'student' || !profile.role;
        const points = (profile as any).points || 0;
        const rank = getRankInfo(points);

        if (!isStudent) {
          const isAdmin = profile.role === 'admin';
          return (
            <div className="fixed inset-0 bg-black/65 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="w-full max-w-[420px] overflow-hidden animate-rank-pop">
                
                {/* ID Card Wrapper (High Contrast, Professional Slate Theme) */}
                <div className="relative bg-white border-[5px] border-slate-300 rounded-[28px] shadow-2xl p-6 overflow-hidden flex flex-col items-center">
                  {/* Top Close Button */}
                  <button
                    onClick={handleCloseModal}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-extrabold text-[16px] cursor-pointer z-30"
                  >✕</button>

                  {/* Institution Header */}
                  <div className="w-full text-center border-b border-slate-200 pb-3 mb-5 flex flex-col items-center">
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className="text-base">🏫</span>
                      <span className="text-[12px] font-black uppercase text-slate-900 tracking-wide">
                        Sant Tukaram Junior College
                      </span>
                    </div>
                    <span className="text-[9px] font-black text-slate-500 tracking-wider uppercase mt-0.5">
                      {isAdmin ? 'Official Administration Identity Card' : 'Official Faculty Identity Card'}
                    </span>
                  </div>

                  {/* Smart Chip & Status Badge */}
                  <div className="w-full flex justify-between items-start mb-3">
                    {/* Smart ID Chip */}
                    <div className="w-10 h-7 rounded bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 border border-amber-500 flex flex-col p-0.5 justify-between shadow-sm">
                      <div className="w-full h-px bg-yellow-900/30"></div>
                      <div className="w-full h-px bg-yellow-900/30"></div>
                      <div className="w-full h-px bg-yellow-900/30"></div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-md border shadow-2xs ${
                      isAdmin 
                        ? 'bg-purple-100 text-purple-950 border-purple-300' 
                        : 'bg-blue-100 text-blue-950 border-blue-300'
                    }`}>
                      <ShieldCheck className={`w-4 h-4 ${isAdmin ? 'text-purple-700' : 'text-blue-700'}`} />
                      <span className="text-[9px] font-black tracking-wider uppercase">
                        {isAdmin ? 'System Admin' : 'Faculty Member'}
                      </span>
                    </div>
                  </div>

                  {/* Large Profile Picture / Initial */}
                  <div className="relative mb-5 w-24 h-24 rounded-full border border-slate-200 overflow-hidden shadow-md flex items-center justify-center bg-[#f0f4f1] select-none">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[32px] font-black text-[#1b3b2a]">
                        {profile.fullName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Name & Title */}
                  <div className="text-center w-full mb-4">
                    <h3 className="text-[19px] font-black text-slate-900 tracking-tight leading-tight uppercase font-display">{profile.fullName}</h3>
                    
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded border uppercase tracking-wider ${
                        isAdmin 
                          ? 'bg-purple-50 text-purple-700 border-purple-200' 
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {isAdmin ? 'Administrator' : 'Faculty Instructor'}
                      </span>
                    </div>
                  </div>

                  {/* ID Fields Details Box */}
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 mb-4 shadow-sm">
                    <div className="flex justify-between items-center text-[12px] border-b border-slate-200 pb-2">
                      <span className="font-extrabold text-slate-500 uppercase text-[9.5px] tracking-wide">ID / Designation</span>
                      <span className="font-black text-slate-900 font-mono text-[12.5px]">{profile.rollNumber}</span>
                    </div>
                    <div className="flex justify-between items-center text-[12px] border-b border-slate-200 pb-2">
                      <span className="font-extrabold text-slate-500 uppercase text-[9.5px] tracking-wide">Portal Role</span>
                      <span className="font-black text-slate-900 text-[12px] uppercase">
                        {profile.role}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[12px] pb-0">
                      <span className="font-extrabold text-slate-500 uppercase text-[9.5px] tracking-wide">Institute / School</span>
                      <span className="font-black text-slate-900 text-[12px] truncate max-w-[200px]" title={(profile as any).instituteName || "STNMS Junior College"}>
                        {(profile as any).instituteName || "STNMS Junior College"}
                      </span>
                    </div>
                  </div>

                  {/* Quick Admin Role Switcher */}
                  {user?.email && isAdminEmail(user.email) && (
                    <div className="w-full border-t border-dashed border-slate-200 pt-3.5 mb-4 text-center">
                      <button
                        onClick={() => {
                          setShowProfileModal(false);
                          onOpenSwitchModal?.();
                        }}
                        className="w-full py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-[11.5px] rounded-xl hover:bg-indigo-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        🔄 Switch Portal Role / Class
                      </button>
                    </div>
                  )}

                  {/* Barcode Accent */}
                  <div className="w-full flex flex-col items-center gap-1.5 border-t border-slate-200 pt-4 mb-1">
                    <span className="text-[10px] font-black text-slate-400 font-mono tracking-[4px] uppercase select-none">
                      *STNMS-{(profile.rollNumber || "STAFF").replace(/[^a-zA-Z0-9]/g, "")}*
                    </span>
                    <div className="h-6 w-full max-w-[280px] bg-no-repeat bg-center opacity-40 select-none flex items-center justify-center gap-[1px]">
                      {[2,1,3,1,2,4,1,2,1,3,2,1,4,1,2,1,2,3,1,2,1,4,2,1,3,1,2,1,3].map((w, idx) => (
                        <div key={idx} className="h-full bg-slate-900" style={{ width: `${w}px` }}></div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Logout Area (Separate box below card for clean look) */}
                <div className="mt-3 bg-white border border-[#ece9e3] rounded-2xl p-4 shadow-lg text-center">
                  {!showLogoutConfirm ? (
                    <button
                      onClick={() => setShowLogoutConfirm(true)}
                      className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2 px-4 rounded-xl border border-red-200/60 transition-all cursor-pointer text-[12.5px]"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Secure Sign Out
                    </button>
                  ) : (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                      <p className="text-[12.5px] font-extrabold text-red-950 mb-2">Disconnect portal session?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowLogoutConfirm(false)}
                          className="flex-1 py-1.5 rounded-lg border border-gray-200 text-gray-700 font-bold text-[11.5px] hover:bg-gray-50 transition-all cursor-pointer bg-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11.5px] transition-all cursor-pointer"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        }

        return (
          <div className="fixed inset-0 bg-black/65 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="w-full max-w-[420px] overflow-hidden animate-rank-pop">
              
              {/* ID Card Wrapper (High Contrast, Professional Slate Theme with Holographic Overlay) */}
              <div className="relative bg-white border-[5px] border-slate-300 rounded-[28px] shadow-2xl p-6 overflow-hidden flex flex-col items-center holographic-card">
                {/* Top Close Button */}
                <button
                  onClick={handleCloseModal}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-extrabold text-[16px] cursor-pointer z-30"
                >✕</button>

                {/* Institution Header */}
                <div className="w-full text-center border-b border-slate-200 pb-3 mb-5 flex flex-col items-center">
                  <div className="flex items-center gap-1.5 justify-center">
                    <span className="text-base">🏫</span>
                    <span className="text-[12px] font-black uppercase text-slate-900 tracking-wide">
                      Sant Tukaram Junior College
                    </span>
                  </div>
                  <span className="text-[9px] font-black text-slate-500 tracking-wider uppercase mt-0.5">
                    Official Student Identity Card
                  </span>
                </div>

                {/* Holographic Chip & Sync Badge */}
                <div className="w-full flex justify-between items-start mb-3">
                  {/* Smart ID Chip */}
                  <div className="w-10 h-7 rounded bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 border border-amber-500 flex flex-col p-0.5 justify-between shadow-sm">
                    <div className="w-full h-px bg-yellow-900/30"></div>
                    <div className="w-full h-px bg-yellow-900/30"></div>
                    <div className="w-full h-px bg-yellow-900/30"></div>
                  </div>
                  
                  {/* Sync Status Badge */}
                  <div className="flex items-center gap-1 bg-emerald-100 text-emerald-950 px-2.5 py-1 rounded-md border border-emerald-300 shadow-2xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span className="text-[9px] font-black tracking-wider uppercase">Verified student</span>
                  </div>
                </div>

                {/* 2D Transparent Rank Badge */}
                 <div className="relative mb-5 w-28 h-28 flex items-center justify-center select-none">
                   {rank.img ? (
                     <TransparentBadgeImage 
                       src={rank.img} 
                       alt={rank.title} 
                       rankTitle={rank.title}
                       className="w-full h-full object-contain" 
                     />
                   ) : (
                     <span className="text-[28px]">{rank.icon}</span>
                   )}
                   {/* Student Avatar Corner Badge */}
                   <div className="absolute bottom-[-6px] right-[-6px] w-10 h-10 rounded-full border border-slate-200 overflow-hidden shadow-md flex items-center justify-center bg-white" title="Student Profile">
                     {user?.photoURL ? (
                       <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                     ) : (
                       <span className="text-[13px] font-black text-slate-500">
                         {profile.fullName.charAt(0).toUpperCase()}
                       </span>
                     )}
                   </div>
                 </div>

                {/* Name & Academic Rank Details */}
                <div className="text-center w-full mb-4">
                  <h3 className="text-[19px] font-black text-slate-900 tracking-tight leading-tight uppercase font-display">{profile.fullName}</h3>
                  
                  {/* Free Fire Rank Stars display */}
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded border uppercase tracking-wider ${rank.text}`}>
                      {rank.title} {rank.division}
                    </span>
                    <span className="text-slate-300 font-bold">•</span>
                    <span className="text-[10px] font-black text-amber-950 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded uppercase tracking-wider">
                      ⭐ {points.toLocaleString()} PTS
                    </span>
                  </div>

                  {/* Stars Row Indicator */}
                  <div className="flex items-center justify-center gap-1 mt-2.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl max-w-[200px] mx-auto shadow-2xs">
                    {Array.from({ length: rank.maxStars }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < rank.stars 
                            ? 'text-amber-500 fill-amber-500 drop-shadow-[0_0_2px_rgba(245,158,11,0.5)]' 
                            : 'text-slate-200'
                        }`}
                        strokeWidth={2.5}
                      />
                    ))}
                    <span className="text-[9px] font-black text-slate-500 uppercase ml-1.5">
                      {rank.stars}/{rank.maxStars} Stars
                    </span>
                  </div>
                </div>

                {/* ID Fields Details Box (High Contrast) */}
                <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 mb-4 shadow-sm">
                  <div className="flex justify-between items-center text-[12px] border-b border-slate-200 pb-2">
                    <span className="font-extrabold text-slate-500 uppercase text-[9.5px] tracking-wide">StudentID / Roll</span>
                    <span className="font-black text-slate-900 font-mono text-[12.5px]">{profile.rollNumber}</span>
                  </div>
                  <div className="flex justify-between items-center text-[12px] border-b border-slate-200 pb-2">
                    <span className="font-extrabold text-slate-500 uppercase text-[9.5px] tracking-wide">Classroom / Batch</span>
                    <span className="font-black text-slate-900 text-[12px] truncate max-w-[200px]" title={(profile as any).classroomName || "Class 12 - Target"}>
                      {(profile as any).classroomName || "XI-ARYABHATA"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[12px] border-b border-slate-200 pb-2">
                    <span className="font-extrabold text-slate-500 uppercase text-[9.5px] tracking-wide">Institute / School</span>
                    <span className="font-black text-slate-900 text-[12px] truncate max-w-[200px]" title={(profile as any).instituteName || "Sant Tukaram Model School"}>
                      {(profile as any).instituteName || "STNMS Junior College"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[12px] pb-0">
                    <span className="font-extrabold text-slate-500 uppercase text-[9.5px] tracking-wide">Sync Server</span>
                    <span className="font-black text-slate-700 uppercase text-[10px]">test.edofox.com</span>
                  </div>
                </div>

                {/* Barcode Accent */}
                <div className="w-full flex flex-col items-center gap-1.5 border-t border-slate-200 pt-4 mb-1">
                  <span className="text-[10px] font-black text-slate-400 font-mono tracking-[4px] uppercase select-none">
                    *STNMS-{(profile.rollNumber || "STUDENT").replace(/[^a-zA-Z0-9]/g, "")}*
                  </span>
                  <div className="h-6 w-full max-w-[280px] bg-no-repeat bg-center opacity-40 select-none flex items-center justify-center gap-[1px]">
                    {[2,1,3,1,2,4,1,2,1,3,2,1,4,1,2,1,2,3,1,2,1,4,2,1,3,1,2,1,3].map((w, idx) => (
                      <div key={idx} className="h-full bg-slate-900" style={{ width: `${w}px` }}></div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Logout Area (Separate box below card for clean look) */}
              <div className="mt-3 bg-white border border-[#ece9e3] rounded-2xl p-4 shadow-lg text-center">
                {!showLogoutConfirm ? (
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2 px-4 rounded-xl border border-red-200/60 transition-all cursor-pointer text-[12.5px]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Secure Sign Out
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                    <p className="text-[12.5px] font-extrabold text-red-950 mb-2">Disconnect portal session?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowLogoutConfirm(false)}
                        className="flex-1 py-1.5 rounded-lg border border-gray-200 text-gray-700 font-bold text-[11.5px] hover:bg-gray-50 transition-all cursor-pointer bg-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11.5px] transition-all cursor-pointer"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}
    </>
  );
}
