import React, { useState } from 'react';
import { 
  Unlock, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  LogOut, 
  KeyRound, 
  GraduationCap,
  Users,
  Clock3,
  XCircle,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export type OnboardingStage = 'role_select' | 'teacher_pending' | 'teacher_rejected' | 'student_verify';

interface OnboardingScreenProps {
  stage: OnboardingStage;
  profile: any;
  isPasswordExpired: boolean;
  syncError: string | null;
  teacherRequestInfo?: any;
  onVerify: (username: string, password: string, logLine: (msg: string) => void) => Promise<void>;
  onSelectStudentRole: () => void;
  onRequestTeacherAccess: (details: { instituteName?: string; classId: string; className?: string }) => Promise<void>;
  onContinueAsStudentInstead: () => void;
  onLoadClasses: () => Promise<{ id: string; name: string; teacher?: string; students?: number; status?: string }[]>;
}

/* Shared shell so every onboarding stage looks like one continuous flow */
function Shell({
  accent,
  icon,
  title,
  subtitle,
  children,
  onSignOut
}: {
  accent: 'green' | 'red' | 'neutral';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onSignOut: () => void;
}) {
  const headerBg = accent === 'red' ? 'bg-red-50/50' : accent === 'green' ? 'bg-[#eff3ec]/40' : 'bg-[#f4f7f4]';
  const iconBg = accent === 'red' ? 'bg-red-100 text-red-700' : accent === 'green' ? 'bg-[#1b3b2a] text-white' : 'bg-[#1b1c19] text-white';

  return (
    <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#eff3ec] blur-3xl opacity-60"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#fdf6e9] blur-3xl opacity-60"></div>

      <div className="w-full max-w-lg bg-white border border-[#ece9e3] rounded-3xl shadow-xl overflow-hidden relative z-10 flex flex-col animate-in zoom-in-95 duration-200">
        <div className={`p-6 border-b border-[#ece9e3] text-left ${headerBg}`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs ${iconBg}`}>
              {icon}
            </div>
            <div>
              <h2 className="text-[17px] font-black text-gray-800 tracking-tight font-display uppercase">{title}</h2>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">{subtitle}</p>
            </div>
          </div>
        </div>

        <div className="p-6.5 space-y-5 text-left">
          {children}

          <div className="pt-1">
            <button
              onClick={onSignOut}
              className="px-4.5 py-2.5 border border-[#ece9e3] hover:bg-gray-50 text-gray-500 hover:text-gray-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingScreen({
  stage,
  profile,
  isPasswordExpired,
  syncError,
  teacherRequestInfo,
  onVerify,
  onSelectStudentRole,
  onRequestTeacherAccess,
  onContinueAsStudentInstead
}: OnboardingScreenProps) {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Firebase sign out failed:', e);
    }
    window.location.reload();
  };

  /* ---------------------------------------------------------------- */
  /*  Stage: role_select — brand new account, no role resolved yet     */
  /* ---------------------------------------------------------------- */
  if (stage === 'role_select') {
    return (
      <RoleSelectStage
        onSelectStudentRole={onSelectStudentRole}
        onRequestTeacherAccess={onRequestTeacherAccess}
        onLoadClasses={onLoadClasses}
        onSignOut={handleSignOut}
      />
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Stage: teacher_pending — request submitted, waiting on an admin  */
  /* ---------------------------------------------------------------- */
  if (stage === 'teacher_pending') {
    return (
      <Shell
        accent="neutral"
        icon={<Clock3 className="w-5.5 h-5.5" />}
        title="Request Submitted"
        subtitle="Waiting on admin approval"
        onSignOut={handleSignOut}
      >
        <div className="p-3.5 bg-[#f4f7f4] border border-[#e4e7e2] rounded-2xl flex gap-3 text-[12.5px] text-[#1b1c19] font-semibold leading-relaxed">
          <ShieldCheck className="w-5 h-5 text-[#1b1c19] shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold block">Your teacher access request is pending</span>
            An admin needs to approve this before you get a teacher dashboard. This page will
            update automatically the moment that happens — no need to refresh.
          </div>
        </div>

        {teacherRequestInfo && (
          <div className="bg-[#faf9f5] border border-[#ece9e3] p-4 rounded-xl text-[12.5px] font-semibold text-gray-700 space-y-1">
            <p>Name: <span className="font-extrabold text-[#1b1c19]">{teacherRequestInfo.name}</span></p>
            <p>Email: <span className="font-extrabold text-[#1b1c19]">{teacherRequestInfo.email}</span></p>
            {teacherRequestInfo.className && (
              <p>Requested Class: <span className="font-extrabold text-[#1b1c19]">{teacherRequestInfo.className}</span></p>
            )}
            {teacherRequestInfo.instituteName && (
              <p>Institute: <span className="font-extrabold text-[#1b1c19]">{teacherRequestInfo.instituteName}</span></p>
            )}
          </div>
        )}
      </Shell>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Stage: teacher_rejected — admin declined; offer a student path   */
  /* ---------------------------------------------------------------- */
  if (stage === 'teacher_rejected') {
    return (
      <Shell
        accent="red"
        icon={<XCircle className="w-5.5 h-5.5" />}
        title="Request Declined"
        subtitle="Your teacher access request was not approved"
        onSignOut={handleSignOut}
      >
        <div className="p-3.5 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-[12.5px] text-red-950 font-semibold leading-relaxed">
          <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold block">Access not granted</span>
            An admin reviewed your request and didn't approve teacher access for this account.
            If you believe this is a mistake, contact your school admin directly.
          </div>
        </div>

        <button
          onClick={onContinueAsStudentInstead}
          className="w-full bg-[#1b3b2a] hover:bg-[#142d20] text-white text-xs font-extrabold py-3 rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
        >
          Continue as a Student instead
          <ArrowRight className="w-3.75 h-3.75" />
        </button>
      </Shell>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Stage: student_verify — existing Edofox school-portal handshake  */
  /* ---------------------------------------------------------------- */
  return (
    <StudentVerifyStage
      profile={profile}
      isPasswordExpired={isPasswordExpired}
      syncError={syncError}
      onVerify={onVerify}
      onSignOut={handleSignOut}
    />
  );
}

/* ====================================================================== */
/*  Role selection                                                        */
/* ====================================================================== */

function RoleSelectStage({
  onSelectStudentRole,
  onRequestTeacherAccess,
  onLoadClasses,
  onSignOut
}: {
  onSelectStudentRole: () => void;
  onRequestTeacherAccess: (details: { instituteName?: string; classId: string; className?: string }) => Promise<void>;
  onLoadClasses: () => Promise<{ id: string; name: string; teacher?: string; students?: number; status?: string }[]>;
  onSignOut: () => void;
}) {
  const [mode, setMode] = useState<'choose' | 'teacher_form' | 'teacher_class_select'>('choose');
  const [instituteName, setInstituteName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [classes, setClasses] = useState<{ id: string; name: string; teacher?: string; students?: number; status?: string }[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const handleContinueToClassSelect = (e: React.FormEvent) => {
    e.preventDefault();
    setMode('teacher_class_select');
    setClassesLoading(true);
    setClassesError(null);
    onLoadClasses()
      .then((list) => setClasses(list))
      .catch((err) => setClassesError(err.message || 'Could not load classes.'))
      .finally(() => setClassesLoading(false));
  };

  const handleSubmitTeacherRequest = async () => {
    const selected = classes.find(c => c.id === selectedClassId);
    if (!selected) {
      setErrorMsg('Please select a class first.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onRequestTeacherAccess({
        instituteName: instituteName.trim(),
        classId: selected.id,
        className: selected.name
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not submit your request. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <Shell
      accent="neutral"
      icon={<Users className="w-5.5 h-5.5" />}
      title="Welcome to JEE Prep Tracker"
      subtitle={
        mode === 'choose'
          ? "Tell us who you are to continue"
          : mode === 'teacher_form'
          ? "Request teacher access"
          : "Which class are you requesting?"
      }
      onSignOut={onSignOut}
    >
      {mode === 'choose' && (
        <div className="space-y-3">
          <button
            onClick={onSelectStudentRole}
            className="w-full flex items-center gap-3.5 p-4 border border-[#ece9e3] hover:border-[#1b3b2a] hover:bg-[#eff3ec]/40 rounded-2xl transition-all cursor-pointer text-left group"
          >
            <div className="w-11 h-11 rounded-xl bg-[#eff3ec] text-[#1b3b2a] flex items-center justify-center shrink-0">
              <GraduationCap className="w-5.5 h-5.5" />
            </div>
            <div className="flex-1">
              <p className="font-extrabold text-[#1b1c19] text-[14px]">I'm a Student</p>
              <p className="text-[11.5px] text-[#83837c] font-semibold mt-0.5 leading-relaxed">
                Verify your identity against the school portal to unlock your dashboard, leaderboard, and mock test sync.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#1b3b2a] shrink-0 mt-1" />
          </button>

          <button
            onClick={() => setMode('teacher_form')}
            className="w-full flex items-center gap-3.5 p-4 border border-[#ece9e3] hover:border-[#1b1c19] hover:bg-gray-50 rounded-2xl transition-all cursor-pointer text-left group"
          >
            <div className="w-11 h-11 rounded-xl bg-gray-100 text-[#1b1c19] flex items-center justify-center shrink-0">
              <Users className="w-5.5 h-5.5" />
            </div>
            <div className="flex-1">
              <p className="font-extrabold text-[#1b1c19] text-[14px]">I'm a Teacher</p>
              <p className="text-[11.5px] text-[#83837c] font-semibold mt-0.5 leading-relaxed">
                Request access to a specific class's teacher dashboard. An admin approves this before you can sign in.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#1b1c19] shrink-0 mt-1" />
          </button>

          <p className="text-[10.5px] text-gray-400 font-semibold text-center pt-1">
            Admin accounts are pre-registered and never self-assigned.
          </p>
        </div>
      )}

      {mode === 'teacher_form' && (
        <form onSubmit={handleContinueToClassSelect} className="space-y-4">
          <button
            type="button"
            onClick={() => setMode('choose')}
            className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <div>
            <label className="block text-[10.5px] font-black uppercase text-gray-400 mb-1.5 tracking-wider">
              Institute / Coaching Center Name
            </label>
            <input
              type="text"
              required
              value={instituteName}
              onChange={(e) => setInstituteName(e.target.value)}
              className="w-full bg-[#faf9f5] border border-[#ece9e3] rounded-xl p-3 text-[13.5px] font-bold text-gray-800 focus:outline-none focus:border-[#1b1c19]"
              placeholder="e.g. Sant Tukaram Model School"
            />
          </div>

          <p className="text-[11.5px] text-gray-500 font-semibold leading-relaxed">
            Your name and email come from your signed-in Google account. Next you'll pick
            which class you're requesting to teach.
          </p>

          <button
            type="submit"
            className="w-full bg-[#1b1c19] hover:bg-black text-white text-xs font-extrabold py-3 rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
          >
            Continue: Choose a Class
            <ArrowRight className="w-3.75 h-3.75" />
          </button>
        </form>
      )}

      {mode === 'teacher_class_select' && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setMode('teacher_form')}
            className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl flex gap-2.5 text-[12px] text-red-700 font-bold leading-normal">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {classesLoading && (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-500 text-xs font-bold">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading classes...
            </div>
          )}

          {classesError && (
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl flex gap-2.5 text-[12px] text-red-700 font-bold leading-normal">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{classesError}</span>
            </div>
          )}

          {!classesLoading && !classesError && classes.length === 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-[12px] text-amber-800 font-bold leading-normal">
              No classes exist yet. An admin needs to create a class in the Admin Dashboard before you can request access to one.
            </div>
          )}

          {!classesLoading && classes.length > 0 && (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {classes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedClassId(c.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    selectedClassId === c.id
                      ? 'border-[#1b3b2a] bg-[#eff3ec]'
                      : 'border-[#ece9e3] hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <p className="font-extrabold text-[#1b1c19] text-[13.5px]">{c.name}</p>
                    <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
                      Current teacher: {c.teacher || 'Unassigned'} · {c.students || 0} students
                    </p>
                  </div>
                  {selectedClassId === c.id && (
                    <div className="w-5 h-5 rounded-full bg-[#1b3b2a] text-white flex items-center justify-center shrink-0 text-[10px] font-black">✓</div>
                  )}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            disabled={isSubmitting || !selectedClassId}
            onClick={handleSubmitTeacherRequest}
            className="w-full bg-[#1b1c19] hover:bg-black disabled:opacity-50 text-white text-xs font-extrabold py-3 rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? <Loader2 className="w-3.75 h-3.75 animate-spin" /> : <Unlock className="w-3.75 h-3.75" />}
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      )}
    </Shell>
  );
}

/* ====================================================================== */
/*  Student verification (existing Edofox handshake flow)                 */
/* ====================================================================== */

function StudentVerifyStage({
  profile,
  isPasswordExpired,
  syncError,
  onVerify,
  onSignOut
}: {
  profile: any;
  isPasswordExpired: boolean;
  syncError: string | null;
  onVerify: (username: string, password: string, logLine: (msg: string) => void) => Promise<void>;
  onSignOut: () => void;
}) {
  const [username, setUsername] = useState(profile?.edofoxUsername || '');
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const logLine = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setIsVerifying(true);
    setErrorMsg(null);
    setLogs([]);

    try {
      await onVerify(username.trim(), password.trim(), logLine);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check credentials.');
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#eff3ec] blur-3xl opacity-60"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#fdf6e9] blur-3xl opacity-60"></div>

      <div className="w-full max-w-lg bg-white border border-[#ece9e3] rounded-3xl shadow-xl overflow-hidden relative z-10 flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header Block */}
        <div className={`p-6 border-b border-[#ece9e3] text-left ${
          isPasswordExpired ? 'bg-red-50/50' : 'bg-[#eff3ec]/40'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs ${
              isPasswordExpired ? 'bg-red-100 text-red-700' : 'bg-[#1b3b2a] text-white'
            }`}>
              {isPasswordExpired ? <KeyRound className="w-5.5 h-5.5" /> : <GraduationCap className="w-6.5 h-6.5" />}
            </div>
            <div>
              <h2 className="text-[17px] font-black text-gray-800 tracking-tight font-display uppercase">
                {isPasswordExpired ? 'Re-Verification Required' : 'Student Verification'}
              </h2>
              <p className="text-xs text-gray-400 font-semibold mt-0.5">
                {isPasswordExpired 
                  ? 'Your Edofox portal password changed or expired.' 
                  : 'Sant Tukaram Model School Academic Verification'}
              </p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6.5 space-y-5 text-left">
          
          {isPasswordExpired ? (
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-[12.5px] text-red-950 font-semibold leading-relaxed">
              <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block">Access Locked</span>
                Your stored password failed validation. To restore JEE Prep Tracker dashboard access, enter your updated school Edofox password.
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-[#eff3ec] border border-[#d2dfcd] rounded-2xl flex gap-3 text-[12.5px] text-[#1b3b2a] font-semibold leading-relaxed">
              <ShieldCheck className="w-5 h-5 text-[#1b3b2a] shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block">Verified Identity Required</span>
                Your name, roll number, and mock exam results are compiled directly from the school portal database to ensure academic integrity and prevent spoofing.
              </div>
            </div>
          )}

          {isVerifying ? (
            /* Live Verification Log Panel */
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <Loader2 className="w-9 h-9 text-[#1b3b2a] animate-spin" />
                <p className="text-xs font-extrabold text-[#1b3b2a] animate-pulse">Running school server handshake...</p>
              </div>
              <div className="bg-[#121613] p-4.5 rounded-2xl h-48 overflow-y-auto font-mono text-[11px] text-[#29d873] border border-white/5 space-y-1.5 shadow-inner">
                {logs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">{log}</div>
                ))}
              </div>
            </div>
          ) : (
            /* Input Credentials Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl flex gap-2.5 text-[12px] text-red-700 font-bold leading-normal">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[10.5px] font-black uppercase text-gray-400 mb-1.5 tracking-wider">Username / Roll Number</label>
                <input
                  type="text"
                  required
                  disabled={isPasswordExpired}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#faf9f5] border border-[#ece9e3] rounded-xl p-3 text-[13.5px] font-bold text-gray-800 focus:outline-none focus:border-[#1b3b2a] disabled:opacity-60"
                  placeholder="e.g. STNMS4524"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-black uppercase text-gray-400 mb-1.5 tracking-wider">Edofox Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#faf9f5] border border-[#ece9e3] rounded-xl p-3 text-[13.5px] font-bold text-gray-800 focus:outline-none focus:border-[#1b3b2a]"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex gap-3.5 pt-3">
                <button
                  type="button"
                  onClick={onSignOut}
                  className="px-4.5 py-3 border border-[#ece9e3] hover:bg-gray-50 text-gray-500 hover:text-gray-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#1b3b2a] hover:bg-[#142d20] text-white text-xs font-extrabold py-3 rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <Unlock className="w-3.75 h-3.75" />
                  Verify &amp; Onboard
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
