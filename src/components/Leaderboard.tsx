import React, { useState } from 'react';
import { 
  Trophy, 
  Info, 
  Clock, 
  ArrowUp, 
  ArrowDown, 
  Compass, 
  Lightbulb, 
  ChevronRight,
  Sun,
  Grid,
  Crown,
  X,
  Zap,
  Target,
  BookOpen,
  Atom,
  FlaskConical,
  Binary,
  Star,
  HelpCircle
} from 'lucide-react';
import { LeaderboardEntry } from '../types';
import { getRankInfo } from '../lib/ranks';
import { TransparentBadgeImage } from '../lib/transparentBadge';

interface LeaderboardProps {
  leaderboardData: {
    daily: LeaderboardEntry[];
    weekly: LeaderboardEntry[];
    lifetime: LeaderboardEntry[];
  };
  studentMockAttempts?: any[];
  allMockAttempts?: any[];
  classMockTests?: any[];
  profile?: any;
  loadError?: string | null;
  onSelectStudent?: (uid: string, classId?: string) => void;
}

export default function Leaderboard({ 
  leaderboardData, 
  studentMockAttempts = [], 
  allMockAttempts = [],
  classMockTests = [], 
  profile, 
  loadError,
  onSelectStudent 
}: LeaderboardProps) {
  const [activeMainTab, setActiveMainTab] = useState<'study' | 'mock'>('study');
  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'weekly' | 'lifetime'>('daily');
  
  const getStudentLifetimePoints = (name: string) => {
    if (name === 'Yash' || name === profile?.fullName) {
      return profile?.points || 0;
    }
    const match = leaderboardData.lifetime.find(e => e.name === name);
    return match ? match.points : 0;
  };
  
  // Mock leaderboard options
  const [selectedMockSubject, setSelectedMockSubject] = useState<'overall' | 'physics' | 'chemistry' | 'maths'>('overall');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'weekly' | 'monthly' | 'lifetime'>('weekly');
  const [selectedMockTestId, setSelectedMockTestId] = useState<string>('');
  
  const [showPointsModal, setShowPointsModal] = useState<boolean>(false);

  const currentList = leaderboardData[activeSubTab];

  // Auto-select latest synced test
  const syncedAttempts = studentMockAttempts.filter(a => a.synced);
  const currentMockId = selectedMockTestId || (syncedAttempts.length > 0 ? syncedAttempts[syncedAttempts.length - 1].id : '');

  // Render Rank Badge
  const renderRank = (rank: number) => {
    if (rank === 1) return <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black text-[13px] border border-amber-300 shadow-xs animate-bounce">🥇</div>;
    if (rank === 2) return <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-black text-[13px] border border-slate-300 shadow-xs">🥈</div>;
    if (rank === 3) return <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center font-black text-[13px] border border-orange-300 shadow-xs">🥉</div>;
    return <span className="font-bold text-[13px] w-8 text-center block opacity-70">{rank}</span>;
  };

  // Stable hashing score generator for simulated class roster
  const getStableScore = (name: string, subject: 'physics' | 'chemistry' | 'maths', testId: string, baseScore: number) => {
    const key = `${name}-${subject}-${testId}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    const variance = (Math.abs(hash) % 36) - 18; // -18 to +18
    return Math.max(15, Math.min(100, Math.round(baseScore + variance)));
  };

  // Generate standings based on chosen parameters (100% real dynamic data from Firestore)
  const getMockLeaderboard = () => {
    // Filter tests by timeframe
    let testsToConsider: any[] = [];
    if (selectedTimeframe === 'weekly') {
      const activeTest = classMockTests.find(t => t.id === currentMockId);
      if (activeTest) testsToConsider = [activeTest];
    } else if (selectedTimeframe === 'monthly') {
      // Last 3 tests (e.g. CT-05, CT-06, CT-07)
      testsToConsider = classMockTests.slice(-3);
    } else {
      // Lifetime (all tests)
      testsToConsider = classMockTests;
    }

    if (testsToConsider.length === 0) return [];

    // Map each student from leaderboardData.lifetime (who are active in Firestore!) to their real scores
    const standings = leaderboardData.lifetime.map(student => {
      // Find all synced attempts for this student inside allMockAttempts
      // If student is current user, we can match by either student.uid or profile?.uid or matching their name
      const studentAttempts = (allMockAttempts || []).filter(a => {
        const isThisStudent = a.studentId === student.uid || 
                            (student.isMe && (a.studentId === profile?.uid || !a.studentId));
        return isThisStudent && a.synced;
      });
      
      let totalP = 0;
      let totalC = 0;
      let totalM = 0;
      let count = 0;

      testsToConsider.forEach(test => {
        const attempt = studentAttempts.find(a => a.id === test.id);
        if (attempt) {
          totalP += attempt.scores?.physics || 0;
          totalC += attempt.scores?.chemistry || 0;
          totalM += attempt.scores?.mathematics || 0;
          count++;
        }
      });

      const avgP = count > 0 ? Math.round(totalP / count) : 0;
      const avgC = count > 0 ? Math.round(totalC / count) : 0;
      const avgM = count > 0 ? Math.round(totalM / count) : 0;
      const avgTotal = avgP + avgC + avgM;

      return {
        name: student.name,
        uid: student.uid,
        classId: student.classId,
        isMe: student.isMe,
        physics: avgP,
        chemistry: avgC,
        maths: avgM,
        total: avgTotal,
        emoji: student.emoji || '🎓'
      };
    });

    // Sort by chosen metric
    standings.sort((a, b) => {
      if (selectedMockSubject === 'physics') return b.physics - a.physics;
      if (selectedMockSubject === 'chemistry') return b.chemistry - a.chemistry;
      if (selectedMockSubject === 'maths') return b.maths - a.maths;
      return b.total - a.total;
    });

    return standings.map((item, idx) => ({ rank: idx + 1, ...item }));
  };

  const mockStandings = getMockLeaderboard();

  // Morph theme styling based on subject mode selection
  const getThemeClasses = () => {
    if (activeMainTab === 'study') {
      return {
        wrapper: 'bg-white border-[#ece9e3]',
        header: 'text-[#1b1c19]',
        subText: 'text-[#83837c]',
        cardBg: 'bg-[#faf9f5]',
        progressColor: 'bg-[#1b3b2a]',
        badgeText: 'text-[#1b3b2a] bg-[#eff3ec]',
        title: 'Study Discipline Standings'
      };
    }
    if (selectedMockSubject === 'physics') {
      return {
        wrapper: 'bg-slate-950 border-sky-500/40 text-slate-100 shadow-sky-500/10 shadow-xl',
        header: 'text-sky-400 font-extrabold',
        subText: 'text-sky-200/60',
        cardBg: 'bg-slate-900/60 border-sky-950',
        progressColor: 'bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.75)]',
        badgeText: 'text-sky-300 bg-sky-950/60 border-sky-800/40 border',
        title: '⚡ Cosmic Physics League'
      };
    }
    if (selectedMockSubject === 'chemistry') {
      return {
        wrapper: 'bg-zinc-950 border-lime-500/40 text-zinc-100 shadow-lime-500/10 shadow-xl',
        header: 'text-lime-400 font-extrabold',
        subText: 'text-lime-200/60',
        cardBg: 'bg-zinc-900/60 border-zinc-800',
        progressColor: 'bg-lime-500 shadow-[0_0_8px_rgba(132,204,22,0.75)]',
        badgeText: 'text-lime-300 bg-lime-950/60 border-lime-800/40 border',
        title: '🧪 Chemical Reaction Arena'
      };
    }
    if (selectedMockSubject === 'maths') {
      return {
        wrapper: 'bg-[#150d03] border-amber-500/40 text-amber-50 shadow-amber-500/5 shadow-xl',
        header: 'text-amber-400 font-extrabold',
        subText: 'text-amber-200/50',
        cardBg: 'bg-amber-950/20 border-amber-950/40',
        progressColor: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.75)]',
        badgeText: 'text-amber-300 bg-amber-950/60 border-amber-800/40 border',
        title: '📐 Mathematics Vector Matrix'
      };
    }
    return {
      wrapper: 'bg-white border-[#ece9e3] text-[#1b1c19]',
      header: 'text-emerald-800',
      subText: 'text-[#83837c]',
      cardBg: 'bg-[#faf9f5]',
      progressColor: 'bg-emerald-600',
      badgeText: 'text-emerald-700 bg-emerald-50',
      title: '🏆 Overall Mock Standings'
    };
  };

  const theme = getThemeClasses();
  const activeTestName = classMockTests.find(t => t.id === currentMockId)?.name || 'Select Mock Exam';

  return (
    <div className="animate-in fade-in duration-200 text-left">
      
      {/* Top Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#1b1c19] flex items-center gap-2 font-display uppercase tracking-tight">
            Standings Arena 
            <Trophy className="w-6.5 h-6.5 text-[#e8a615] animate-pulse" />
          </h1>
          <p className="text-[#83837c] text-[13.5px] font-semibold mt-1">
            Compare class-wide logs, XP tallies, and official school mock card standings.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#ece9e3] rounded-xl px-4 py-2.5 text-[13px] font-extrabold shadow-xs">
          <Compass className="w-4 h-4 text-emerald-800 shrink-0" />
          <span>SANT TUKARAM NATIONAL JUNIOR COLLEGE</span>
        </div>
      </div>

      {/* Main Tab Selectors */}
      <div className="flex border-b border-[#ece9e3] mb-6 gap-6">
        <button
          onClick={() => setActiveMainTab('study')}
          className={`pb-3 text-[14.5px] font-black cursor-pointer transition-all border-b-2 flex items-center gap-2 ${
            activeMainTab === 'study'
              ? 'border-emerald-800 text-emerald-800'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Zap className="w-4 h-4" />
          Study Discipline Rankings
        </button>
        <button
          onClick={() => setActiveMainTab('mock')}
          className={`pb-3 text-[14.5px] font-black cursor-pointer transition-all border-b-2 flex items-center gap-2 ${
            activeMainTab === 'mock'
              ? 'border-emerald-800 text-emerald-800'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          School Mock Test Rankings
        </button>
      </div>

      {activeMainTab === 'study' ? (
        /* STUDY DISCIPLINE STANDINGS */
        <>
          {/* Subtimeframe Selection Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4.5">
            <div className="flex gap-1.5 bg-[#f2f0ea] p-1.5 rounded-xl w-fit">
              <button
                onClick={() => setActiveSubTab('daily')}
                className={`flex items-center gap-2.5 py-2 px-4.5 rounded-lg text-[13px] font-extrabold transition-all border-none cursor-pointer ${
                  activeSubTab === 'daily'
                    ? 'bg-[#1b3b2a] text-white shadow-sm'
                    : 'text-[#83837c] hover:text-[#1b1c19] hover:bg-black/4'
                }`}
              >
                <Sun className="w-3.75 h-3.75" />
                <span>Daily Ledger</span>
              </button>
              <button
                onClick={() => setActiveSubTab('weekly')}
                className={`flex items-center gap-2.5 py-2 px-4.5 rounded-lg text-[13px] font-extrabold transition-all border-none cursor-pointer ${
                  activeSubTab === 'weekly'
                    ? 'bg-[#1b3b2a] text-white shadow-sm'
                    : 'text-[#83837c] hover:text-[#1b1c19] hover:bg-black/4'
                }`}
              >
                <Grid className="w-3.75 h-3.75" />
                <span>Weekly Streak</span>
              </button>
              <button
                onClick={() => setActiveSubTab('lifetime')}
                className={`flex items-center gap-2.5 py-2 px-4.5 rounded-lg text-[13px] font-extrabold transition-all border-none cursor-pointer ${
                  activeSubTab === 'lifetime'
                    ? 'bg-[#1b3b2a] text-white shadow-sm'
                    : 'text-[#83837c] hover:text-[#1b1c19] hover:bg-black/4'
                }`}
              >
                <Crown className="w-3.75 h-3.75" />
                <span>Lifetime Hall</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[12px] text-[#83837c] font-bold bg-white border border-[#ece9e3] px-3.5 py-2 rounded-lg">
              <Clock className="w-4 h-4 text-[#83837c]" />
              <span>Scoreboards refresh automatically every 30 minutes</span>
            </div>
          </div>

          {loadError && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[13px] font-bold rounded-xl px-4 py-3 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{loadError}</span>
            </div>
          )}

          {/* Table Standings */}
          <div className="bg-white border border-[#ece9e3] rounded-2xl px-5 py-4.5 shadow-sm overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-[11px] text-[#83837c] font-black uppercase tracking-wider border-b border-transparent">
                  <th className="pb-3 pl-3.5 w-16">Rank</th>
                  <th className="pb-3 pl-2.5">Student Name</th>
                  <th className="pb-3 pr-4 text-right">Study Points</th>
                  <th className="pb-3 pr-3 text-right">Progression</th>
                </tr>
              </thead>
              <tbody>
                {currentList.map((entry) => {
                  const isPointsPositive = entry.delta >= 0;
                  const lifetimePoints = getStudentLifetimePoints(entry.name);
                  const rank = getRankInfo(lifetimePoints);
                  return (
                    <tr 
                      key={entry.rank}
                      onClick={() => entry.uid && onSelectStudent && onSelectStudent(entry.uid, entry.classId)}
                      className={`group transition-colors duration-150 border-t border-[#ece9e3] cursor-pointer ${
                        entry.isMe 
                          ? 'bg-[#eff3ec]/90 font-bold hover:bg-[#e2ebe0]' 
                          : 'hover:bg-black/3'
                      }`}
                    >
                      <td className="py-3.5 pl-3.5">
                        {renderRank(entry.rank)}
                      </td>
                      <td className="py-3.5 pl-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#cfe0d4] flex items-center justify-center shrink-0 overflow-hidden select-none font-bold text-xs text-[#1c3c2b] border border-[#d6ebd9]">
                            {entry.photoURL ? (
                              <img src={entry.photoURL} alt={entry.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{entry.initials || entry.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                            <div className="flex items-center gap-2 text-[14px] text-[#1b1c19] font-extrabold">
                              <span>{entry.name}</span>
                              {entry.isMe && (
                                <span className="bg-[#e7eee6] text-[#1b3b2a] font-bold text-[9px] px-1.5 py-0.25 rounded-full border border-[#d2e3d0]">
                                  You
                                </span>
                              )}
                              <div className="flex items-center gap-1 ml-1 select-none">
                                {rank.img ? (
                                  <TransparentBadgeImage src={rank.img} alt={rank.title} rankTitle={rank.title} className="w-6 h-6 object-contain hover:scale-125 transition-transform duration-150" />
                                ) : (
                                  <span className="text-[10px]">{rank.icon}</span>
                                )}
                                <span className={`text-[8.5px] font-black uppercase tracking-wider px-1 py-0.25 rounded border ${rank.text}`}>
                                  {rank.title} {rank.division}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                      <td className="py-3.5 pr-4 text-right font-black text-[14.5px] text-[#1b1c19]">
                        {entry.points} <span className="text-[11px] font-bold text-[#83837c] uppercase">pts</span>
                      </td>
                      <td className="py-3.5 pr-3 text-right">
                        <span className={`inline-flex items-center gap-0.5 font-black text-[12.5px] ${
                          isPointsPositive ? 'text-[#1f9d51]' : 'text-[#e0484b]'
                        }`}>
                          {isPointsPositive ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                          <span>{isPointsPositive ? '+' : ''}{entry.delta}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* SCHOOL MOCK RANKINGS (HIGHLY GAMIFIED & VERIFIED) */
        <div className="space-y-5 animate-in slide-in-from-bottom-3 duration-200">
          
          {/* Dashboard Control Box */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-white border border-[#ece9e3] p-4.5 rounded-2xl shadow-sm">
            {/* 1. Timeframe Selection */}
            <div>
              <label className="block text-[10.5px] font-black uppercase text-gray-400 mb-1.5">Standings Period</label>
              <div className="flex gap-1.5 bg-[#f2f0ea] p-1 rounded-xl w-full">
                <button
                  onClick={() => setSelectedTimeframe('weekly')}
                  className={`flex-1 text-center py-2 text-[12px] font-black rounded-lg transition-all cursor-pointer ${
                    selectedTimeframe === 'weekly' ? 'bg-[#1b3b2a] text-white shadow-xs' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Latest Mock
                </button>
                <button
                  onClick={() => setSelectedTimeframe('monthly')}
                  className={`flex-1 text-center py-2 text-[12px] font-black rounded-lg transition-all cursor-pointer ${
                    selectedTimeframe === 'monthly' ? 'bg-[#1b3b2a] text-white shadow-xs' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Month Avg
                </button>
                <button
                  onClick={() => setSelectedTimeframe('lifetime')}
                  className={`flex-1 text-center py-2 text-[12px] font-black rounded-lg transition-all cursor-pointer ${
                    selectedTimeframe === 'lifetime' ? 'bg-[#1b3b2a] text-white shadow-xs' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Lifetime Avg
                </button>
              </div>
            </div>

            {/* 2. Specific Exam Selection (Weekly Mock only) */}
            <div>
              <label className="block text-[10.5px] font-black uppercase text-gray-400 mb-1.5">Focus Exam Name</label>
              <select
                disabled={selectedTimeframe !== 'weekly'}
                value={currentMockId}
                onChange={(e) => setSelectedMockTestId(e.target.value)}
                className="w-full bg-[#faf9f5] border border-[#ece9e3] text-gray-800 text-[13px] font-bold rounded-xl p-2.5 focus:outline-none focus:border-[#1b3b2a] disabled:opacity-50 h-[40px] leading-normal"
              >
                {syncedAttempts.length === 0 ? (
                  <option value="">No exam scores synced yet</option>
                ) : (
                  syncedAttempts.map(a => {
                    const test = classMockTests.find(t => t.id === a.id);
                    return (
                      <option key={a.id} value={a.id}>
                        {test ? test.name : `Test ID: ${a.id}`}
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {/* 3. Subject-Specific Boards */}
            <div>
              <label className="block text-[10.5px] font-black uppercase text-gray-400 mb-1.5">Subject Tournament</label>
              <div className="grid grid-cols-4 gap-1 h-[40px]">
                <button
                  onClick={() => setSelectedMockSubject('overall')}
                  className={`py-2 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer border flex flex-col items-center justify-center ${
                    selectedMockSubject === 'overall'
                      ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                      : 'bg-[#faf9f5] text-emerald-950 border-[#ece9e3] hover:bg-emerald-50'
                  }`}
                >
                  <span>ALL</span>
                </button>
                <button
                  onClick={() => setSelectedMockSubject('physics')}
                  className={`py-2 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer border flex flex-col items-center justify-center ${
                    selectedMockSubject === 'physics'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                      : 'bg-[#faf9f5] text-sky-950 border-[#ece9e3] hover:bg-sky-50'
                  }`}
                >
                  <Atom className="w-3.5 h-3.5" />
                  <span className="text-[9px]">PHY</span>
                </button>
                <button
                  onClick={() => setSelectedMockSubject('chemistry')}
                  className={`py-2 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer border flex flex-col items-center justify-center ${
                    selectedMockSubject === 'chemistry'
                      ? 'bg-lime-600 text-white border-lime-600 shadow-sm'
                      : 'bg-[#faf9f5] text-lime-950 border-[#ece9e3] hover:bg-lime-50'
                  }`}
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span className="text-[9px]">CHE</span>
                </button>
                <button
                  onClick={() => setSelectedMockSubject('maths')}
                  className={`py-2 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer border flex flex-col items-center justify-center ${
                    selectedMockSubject === 'maths'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-[#faf9f5] text-amber-950 border-[#ece9e3] hover:bg-amber-50'
                  }`}
                >
                  <Binary className="w-3.5 h-3.5" />
                  <span className="text-[9px]">MTH</span>
                </button>
              </div>
            </div>
          </div>

          {syncedAttempts.length === 0 ? (
            <div className="bg-white border border-[#ece9e3] rounded-3xl p-12 text-center shadow-xs flex flex-col items-center justify-center">
              <Trophy className="w-14 h-14 text-gray-300 mb-3 animate-pulse" />
              <h3 className="text-[17px] font-black text-gray-700 font-display uppercase">Verified Standings Unavailable</h3>
              <p className="text-[13px] text-gray-400 max-w-sm mt-1.5">
                Connect your school Edofox portal account to retrieve verified scores and unlock the class leaderboard.
              </p>
            </div>
          ) : (
            /* MORPHED GAMIFIED THEME ARENA CONTAINER */
            <div className={`border rounded-3xl p-6.5 transition-all duration-300 ${theme.wrapper}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 mb-4 gap-2">
                <div>
                  <h3 className={`text-[17px] font-black tracking-tight ${theme.header} font-display uppercase`}>
                    {theme.title}
                  </h3>
                  <p className={`text-[12.5px] mt-0.5 font-semibold ${theme.subText}`}>
                    {selectedTimeframe === 'weekly' ? `Based on: ${activeTestName}` : selectedTimeframe === 'monthly' ? 'Averages across last 3 mock exams' : 'Averages across all registered mock tests'}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${theme.badgeText}`}>
                  {selectedMockSubject === 'overall' ? 'Total / 300' : `${selectedMockSubject.toUpperCase()} / 100`}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left text-[11px] opacity-75 font-black uppercase tracking-wider border-b border-transparent">
                      <th className="pb-3.5 pl-3 w-16">Rank</th>
                      <th className="pb-3.5 pl-2.5">Candidate Name</th>
                      <th className="pb-3.5 px-4 text-center">Score Breakdown</th>
                      <th className="pb-3.5 pr-4 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {mockStandings.map((entry: any) => {
                      const maxPossible = selectedMockSubject === 'overall' ? 300 : 100;
                      const scoreValue = selectedMockSubject === 'overall' ? entry.total : (selectedMockSubject === 'physics' ? entry.physics : (selectedMockSubject === 'chemistry' ? entry.chemistry : entry.maths));
                      const percent = ((scoreValue / maxPossible) * 100).toFixed(1);
                      const lifetimePoints = getStudentLifetimePoints(entry.name);
                      const rank = getRankInfo(lifetimePoints);

                      return (
                        <tr 
                          key={entry.rank}
                          onClick={() => entry.uid && onSelectStudent && onSelectStudent(entry.uid, entry.classId)}
                          className={`group transition-all duration-200 cursor-pointer ${
                            entry.isMe 
                              ? 'bg-white/10 border-white/20 font-extrabold shadow-[0_0_12px_rgba(255,255,255,0.05)]' 
                              : 'hover:bg-white/10'
                          }`}
                        >
                          <td className="py-4 pl-3">
                            {renderRank(entry.rank)}
                          </td>
                          <td className="py-4 pl-2.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0 overflow-hidden select-none font-bold text-xs text-white border border-white/20">
                                {entry.photoURL ? (
                                  <img src={entry.photoURL} alt={entry.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{entry.initials || entry.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</span>
                                )}
                              </div>
                              <div className="flex flex-col items-start text-[14px]">
                                <span className="font-extrabold tracking-tight flex items-center gap-1.5 flex-wrap">
                                  <span>{entry.name}</span>
                                  {entry.isMe && (
                                    <span className="bg-emerald-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                      YOU
                                    </span>
                                  )}
                                  {entry.rank === 1 && (
                                    <span className="text-[10px] text-amber-400 font-extrabold inline-flex items-center gap-0.5 uppercase tracking-wider">
                                      <Star className="w-3 h-3 fill-amber-400" />
                                      {selectedMockSubject === 'physics' ? 'Cosmic Pro' : selectedMockSubject === 'chemistry' ? 'Alchemist' : selectedMockSubject === 'maths' ? 'Matrix God' : 'Topper'}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1.5 select-none">
                                    {rank.img ? (
                                      <TransparentBadgeImage src={rank.img} alt={rank.title} rankTitle={rank.title} className="w-6 h-6 object-contain hover:scale-125 transition-transform duration-150" />
                                    ) : (
                                      <span className="text-[9px]">{rank.icon}</span>
                                    )}
                                    <span className={`text-[8.5px] font-black uppercase tracking-wider px-1 py-0.25 rounded border ${rank.text}`}>
                                      {rank.title} {rank.division}
                                    </span>
                                  </div>
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-white/30 text-[9px]">STNMS Roster #{100 + entry.rank}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          {/* Mini Glowing Subject Scorebars */}
                          <td className="py-4 px-4 hidden sm:table-cell">
                            <div className="flex items-center justify-center gap-4.5">
                              {/* Physics Spark */}
                              <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black opacity-60">PHY</span>
                                <span className={`text-[12px] font-black ${selectedMockSubject === 'physics' ? 'text-sky-400' : ''}`}>{entry.physics}</span>
                                <div className="w-9 bg-white/10 h-1.25 rounded-full overflow-hidden mt-1.25">
                                  <div className="bg-sky-400 h-full" style={{ width: `${entry.physics}%` }}></div>
                                </div>
                              </div>
                              {/* Chemistry Flask */}
                              <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black opacity-60">CHE</span>
                                <span className={`text-[12px] font-black ${selectedMockSubject === 'chemistry' ? 'text-lime-400' : ''}`}>{entry.chemistry}</span>
                                <div className="w-9 bg-white/10 h-1.25 rounded-full overflow-hidden mt-1.25">
                                  <div className="bg-lime-400 h-full" style={{ width: `${entry.chemistry}%` }}></div>
                                </div>
                              </div>
                              {/* Mathematics Vector */}
                              <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black opacity-60">MTH</span>
                                <span className={`text-[12px] font-black ${selectedMockSubject === 'maths' ? 'text-amber-400' : ''}`}>{entry.maths}</span>
                                <div className="w-9 bg-white/10 h-1.25 rounded-full overflow-hidden mt-1.25">
                                  <div className="bg-amber-400 h-full" style={{ width: `${entry.maths}%` }}></div>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 pr-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-[14.5px] font-black tracking-tight">
                                {scoreValue} <span className="text-[11px] opacity-60 font-semibold">/ {maxPossible}</span>
                              </span>
                              <div className="w-24 bg-white/15 h-1.5 rounded-full overflow-hidden mt-1.5 relative">
                                <div className={`h-full rounded-full transition-all duration-300 ${theme.progressColor}`} style={{ width: `${percent}%` }}></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* How Points Work Modal */}
      {showPointsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-[#ece9e3] rounded-2xl max-w-lg w-full overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#ece9e3] flex justify-between items-center bg-[#fcfbf9]">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#e8a615]" />
                <h3 className="text-[16px] font-black text-[#1b1c19] font-display">Authorized Scoring Formula</h3>
              </div>
              <button 
                onClick={() => setShowPointsModal(false)}
                className="text-[#83837c] hover:text-[#1b1c19] p-1.5 rounded-lg hover:bg-black/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-[13.5px] text-[#555] leading-relaxed font-semibold">
                Study points motivate high study discipline, consistency, and daily practice problem compliance. Points are derived autonomously:
              </p>

              <div className="space-y-3">
                {/* Rule 1 */}
                <div className="flex items-start gap-3 p-3 bg-[#f7f9f6] border border-[#e2ebe0] rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-[#eff3ec] flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-[#1b3b2a]" />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-extrabold text-[#1b1c19]">Study Time Reward</h4>
                    <p className="text-[11.5px] text-[#637568] mt-0.5">
                      Earn <strong className="text-[#1b3b2a]">1 Point</strong> for every <strong className="text-[#1b3b2a]">10 minutes</strong> spent in an active focus study session.
                    </p>
                  </div>
                </div>

                {/* Rule 2 */}
                <div className="flex items-start gap-3 p-3 bg-[#fcf8f2] border border-[#f5e6c8] rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-[#fdf2e2] flex items-center justify-center shrink-0">
                    <HelpCircle className="w-4 h-4 text-[#e8871e]" />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-extrabold text-[#1b1c19]">Question Practice Multiplier</h4>
                    <p className="text-[11.5px] text-[#8c6d3d] mt-0.5">
                      Earn <strong className="text-[#e8871e]">1 Point</strong> for every single JEE Practice Question solved and self-reported.
                    </p>
                  </div>
                </div>

                {/* Rule 3 */}
                <div className="flex items-start gap-3 p-3 bg-[#fbf5f5] border border-[#fbd3d0] rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-[#fdf0f0] flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-[#b33a3d]" />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-extrabold text-[#1b1c19]">Daily Practice Problems (DPP) Bonus</h4>
                    <p className="text-[11.5px] text-[#a15555] mt-0.5">
                      Complete today's DPP to secure a massive <strong className="text-[#b33a3d]">5 Point bonus</strong> (or <strong className="text-[#b33a3d]">2 Points</strong> for progress status).
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#fcfcf9] border border-[#ece9e3] rounded-lg text-center text-[11px] text-[#83837c]">
                ⚡ Standard Point Ledger equation is strictly compiled upon stop & log submission.
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-[#ece9e3] flex justify-end bg-[#fcfbf9]">
              <button 
                onClick={() => setShowPointsModal(false)}
                className="px-4.5 py-2 bg-[#1b3b2a] text-white hover:bg-[#12281c] font-bold text-[13px] rounded-xl transition-all"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
