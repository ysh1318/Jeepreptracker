import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Award, 
  PlayCircle, 
  Calendar, 
  TrendingUp, 
  Timer, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Lock,
  Unlock,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface MockTestsProps {
  classMockTests: any[];
  studentMockAttempts: any[];
  syllabusData?: any[];
  onSyncEdofoxResult: (
    testId: string, 
    scores: { physics: number, chemistry: number, mathematics: number, rank?: string, topperScore?: number }, 
    maxScore: number, 
    testSyllabus: any,
    testName?: string,
    testDate?: string
  ) => Promise<void>;
  globalSyncState: 'idle' | 'syncing' | 'completed' | 'error';
  setGlobalSyncState: React.Dispatch<React.SetStateAction<'idle' | 'syncing' | 'completed' | 'error'>>;
  syncError: string | null;
  setSyncError: React.Dispatch<React.SetStateAction<string | null>>;
  // Credentials verified once during onboarding (see App.tsx handleVerifyAndOnboard).
  // The password itself is never passed down here — it's stored encrypted and
  // only decrypted server-side by the syncEdofoxStored Cloud Function. A student
  // can no longer type in someone else's roll number/password to pull their
  // mock scores. If these ever go stale, the fix is re-verifying through the
  // onboarding screen (App.tsx isPasswordExpired flow), not editing them here.
  edofoxUsername: string;
  isEdofoxLinked: boolean;
  runEdofoxSync: () => Promise<{ success: boolean; studentInfo?: any; tests?: any[]; error?: string }>;
}

export default function MockTests({ 
  classMockTests = [], 
  studentMockAttempts = [], 
  syllabusData = [], 
  onSyncEdofoxResult,
  globalSyncState,
  setGlobalSyncState,
  syncError,
  setSyncError,
  edofoxUsername,
  isEdofoxLinked,
  runEdofoxSync
}: MockTestsProps) {

  // Helper to lookup topic name by ID
  const getTopicName = (subjectId: string, topicId: string) => {
    const subject = syllabusData.find(s => s.id === subjectId);
    if (subject && subject.subtopics) {
      const topic = subject.subtopics.find((st: any) => st.id === topicId);
      if (topic) return topic.name;
    }
    return topicId;
  };

  // Sync Simulator Modal States
  const [activeSyncTest, setActiveSyncTest] = useState<any | null>(null);
  const [syncPhysicsScore, setSyncPhysicsScore] = useState('75');
  const [syncChemistryScore, setSyncChemistryScore] = useState('45');
  const [syncMathsScore, setSyncMathsScore] = useState('85');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [modalSyncError, setModalSyncError] = useState<string | null>(null);

  // Local state to keep UI updated
  const [mergedTests, setMergedTests] = useState<any[]>([]);
  const isAutoSyncingRef = React.useRef(false);

  // Merge class templates and student attempts
  useEffect(() => {
    const merged = classMockTests.map(template => {
      const attempt = studentMockAttempts.find(a => a.id === template.id);
      return {
        ...template,
        synced: attempt?.synced || false,
        scores: attempt?.scores || { physics: null, chemistry: null, mathematics: null },
        rank: attempt?.rank || 'N/A',
        topperScore: attempt?.topperScore || 0,
        percent: attempt?.percent || null,
        syncedAt: attempt?.syncedAt || null
      };
    });
    // Sort chronologically
    merged.sort((a, b) => a.date.localeCompare(b.date));
    setMergedTests(merged);
  }, [classMockTests, studentMockAttempts]);

  // Global background auto-sync function
  const runGlobalAutoSync = async () => {
    if (isAutoSyncingRef.current) return;
    isAutoSyncingRef.current = true;
    setGlobalSyncState('syncing');
    setSyncError(null);
    console.log("Edofox Auto-Sync: Starting background synchronization...");

    try {
      // Scorecard is now fetched AND parsed server-side by the syncEdofox
      // Cloud Function (functions/src/index.ts) — it returns ready-to-use
      // test objects instead of raw HTML, so there's no DOMParser step here.
      const syncData = await runEdofoxSync();
      if (!syncData.success) {
        throw new Error(syncData.error || "Scraper failed to download report");
      }

      const tests = syncData.tests || [];
      let syncCount = 0;

      for (const t of tests) {
        const idCell = t.id;
        if (!idCell) continue;

        const isAlreadySynced = studentMockAttempts.some(a => a.id === idCell && a.synced);
        if (isAlreadySynced) continue;

        const testTemplate = classMockTests.find(tmpl => tmpl.id === idCell);

        const scoresObj = {
          physics: t.physics ?? 0,
          chemistry: t.chemistry ?? 0,
          mathematics: t.mathematics ?? 0,
          rank: t.rank || 'N/A',
          topperScore: t.topperScore ?? 0
        };

        await onSyncEdofoxResult(
          idCell,
          scoresObj,
          testTemplate?.maxSubjectScore || 100,
          testTemplate?.syllabus || { physics: [], chemistry: [], mathematics: [] },
          t.name || testTemplate?.name || idCell,
          t.date || testTemplate?.date || ''
        );
        syncCount++;
      }

      console.log(`Edofox Auto-Sync: Successfully synchronized ${syncCount} test scores.`);
      setGlobalSyncState('completed');
    } catch (err: any) {
      console.warn("Edofox auto-sync failed:", err);
      setGlobalSyncState('error');
      setSyncError(err.message || 'Unknown sync error');
    } finally {
      isAutoSyncingRef.current = false;
    }
  };

  const unsyncedCount = mergedTests.filter(t => !t.synced).length;

  // Run auto sync when credentials change
  useEffect(() => {
    if (!isEdofoxLinked || !edofoxUsername) return;
    const timer = setTimeout(runGlobalAutoSync, 800);
    return () => clearTimeout(timer);
  }, [isEdofoxLinked, edofoxUsername, studentMockAttempts.length]);

  // Linking/unlinking Edofox credentials from inside Mock Tests has been removed.
  // Credentials are set once, verified, during onboarding (App.tsx handleVerifyAndOnboard)
  // and can only be changed by going through that same verification flow again —
  // which only happens automatically when a sync error indicates bad credentials
  // (see isPasswordExpired in App.tsx). This prevents a student from freely typing
  // in someone else's roll number/password here to pull their scores instead.

  // Auto-run real scraper when sync modal is opened and account is linked
  useEffect(() => {
    if (activeSyncTest && isEdofoxLinked && !isSyncing && syncLogs.length === 0) {
      handleRunSyncReal();
    }
  }, [activeSyncTest, isEdofoxLinked]);

  // Trigger real sync from Edofox API via Vite proxy!
  const handleRunSyncReal = async () => {
    if (!activeSyncTest) return;
    setIsSyncing(true);
    setSyncLogs([]);

    const logLine = (msg: string) => {
      setSyncLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    try {
      logLine("Connecting to Edofox sync service...");

      // Scorecard is fetched AND parsed server-side by the syncEdofox Cloud
      // Function now — it returns ready-to-use test objects, so there's no
      // more DOMParser step locating a row by hand.
      const syncData = await runEdofoxSync();
      if (!syncData.success) {
        throw new Error(syncData.error || "Scraper failed to download report");
      }

      logLine("Report data received. Locating test scores...");

      const tests = syncData.tests || [];
      const found = tests.find((t: any) => t.id === activeSyncTest.id);

      if (!found) {
        throw new Error(`Test ID ${activeSyncTest.id} not found in your Edofox scorecard. Make sure this test has been submitted and released by your school.`);
      }

      const scoresObj = {
        physics: found.physics ?? 0,
        chemistry: found.chemistry ?? 0,
        mathematics: found.mathematics ?? 0,
        rank: found.rank || 'N/A',
        topperScore: found.topperScore ?? 0
      };
      const foundName = found.name || '';
      const foundDate = found.date || '';

      logLine(`Scores parsed successfully!`);
      logLine(`- Physics: ${scoresObj.physics}/100`);
      logLine(`- Chemistry: ${scoresObj.chemistry}/100`);
      logLine(`- Mathematics: ${scoresObj.mathematics}/100`);
      logLine(`Writing scores directly to your Firestore student profile...`);

      // Save sync results to database
      await onSyncEdofoxResult(
        activeSyncTest.id,
        scoresObj,
        activeSyncTest.maxSubjectScore || 100,
        activeSyncTest.syllabus,
        foundName || activeSyncTest.name,
        foundDate || activeSyncTest.date
      );

      logLine("Synchronization completed successfully!");
      
      setTimeout(() => {
        setIsSyncing(false);
        setActiveSyncTest(null);
      }, 1500);

    } catch (e: any) {
      logLine(`❌ Error: ${e.message}`);
      console.error(e);
      // Keep error logs visible on screen
      setTimeout(() => {
        setIsSyncing(false);
      }, 8000);
    }
  };

  // Prepare chart data based on synced test percentages
  const chartData = mergedTests
    .filter(t => t.synced)
    .map(t => ({
      name: t.name.replace('Weekly Mock Test ', 'W').split(' (')[0],
      Percentage: t.percent
    }));

  // Calculations for stats card
  const syncedCount = mergedTests.filter(t => t.synced).length;
  const averagePercentage = syncedCount > 0 
    ? Math.round(mergedTests.filter(t => t.synced).reduce((sum, curr) => sum + (curr.percent || 0), 0) / syncedCount)
    : 0;

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-black text-[#1b1c19] font-display flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-[#1b3b2a]" />
            Edofox Weekly Mock Simulation
          </h2>
          <p className="text-[13px] text-[#83837c] font-semibold mt-0.5">
            Sync weekly school tests directly and auto-flag backlogs.
          </p>
        </div>

        {/* Edofox Credentials Action */}
        <div className="flex items-center gap-3">
          {isEdofoxLinked && (
            <button
              onClick={runGlobalAutoSync}
              disabled={globalSyncState === 'syncing'}
              className={`px-3 py-2 rounded-xl text-[12px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border shadow-xs bg-white hover:bg-gray-50 border-[#ece9e3] text-gray-700 ${
                globalSyncState === 'syncing' ? 'opacity-65 cursor-not-allowed' : ''
              }`}
              title="Force sync all Edofox scores now"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${globalSyncState === 'syncing' ? 'animate-spin' : ''}`} />
              <span>
                {globalSyncState === 'syncing' 
                  ? 'Syncing scores...' 
                  : globalSyncState === 'completed' 
                  ? 'All Up-to-date' 
                  : 'Sync Scores'}
              </span>
            </button>
          )}

          {/* Locked Edofox status pill — credentials were verified once during
              onboarding and can't be edited or disconnected from here. This is
              intentional: it's what stops a student from typing in someone
              else's roll number/password to pull their mock scores instead. */}
          <div
            className={`px-4 py-2 rounded-xl text-[12.5px] font-extrabold flex items-center gap-2 border shadow-sm ${
              isEdofoxLinked
                ? 'bg-[#eff3ec] border-[#d2dfcd] text-[#1b3b2a]'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
            title={isEdofoxLinked ? 'Verified during onboarding — locked' : 'Not linked yet'}
          >
            {isEdofoxLinked ? (
              <>
                <Lock className="w-4 h-4 text-[#1b3b2a]" />
                <span>🦊 Linked: {edofoxUsername}</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-red-700" />
                <span>Not linked — complete onboarding first</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sync Error Banner */}
      {syncError && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2.5 text-[12.5px] text-red-950 font-semibold leading-relaxed animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div>
            <div className="font-extrabold text-red-900">Edofox Sync Interrupted</div>
            <p className="mt-0.5 text-red-800">{syncError}</p>
            <p className="mt-1 text-[11px] text-red-400">Verify your local dev server is running and check network connectivity to test.edofox.com.</p>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#ece9e3] p-4.5 rounded-2xl shadow-sm">
          <span className="block text-[11px] font-bold text-[#83837c] uppercase tracking-wider">Mock Schedule</span>
          <span className="block text-[22px] font-black text-[#1b1c19] mt-1 font-display">
            {mergedTests.length} <span className="text-[12.5px] font-semibold text-gray-400">Total</span>
          </span>
        </div>
        <div className="bg-white border border-[#ece9e3] p-4.5 rounded-2xl shadow-sm">
          <span className="block text-[11px] font-bold text-[#83837c] uppercase tracking-wider">Synced Tests</span>
          <span className="block text-[22px] font-black text-[#1b3b2a] mt-1 font-display">
            {syncedCount} <span className="text-[12.5px] font-semibold text-[#83837c]">Tests</span>
          </span>
        </div>
        <div className="bg-white border border-[#ece9e3] p-4.5 rounded-2xl shadow-sm">
          <span className="block text-[11px] font-bold text-[#83837c] uppercase tracking-wider">Average Percent</span>
          <span className="block text-[22px] font-black text-indigo-600 mt-1 font-display">
            {averagePercentage}%
          </span>
        </div>
        <div className="bg-white border border-[#ece9e3] p-4.5 rounded-2xl shadow-sm">
          <span className="block text-[11px] font-bold text-[#83837c] uppercase tracking-wider">Sync Status</span>
          <span className={`block text-[13.5px] font-extrabold mt-2 flex items-center gap-1 ${
            globalSyncState === 'syncing' 
              ? 'text-indigo-600' 
              : globalSyncState === 'completed' 
              ? 'text-emerald-700' 
              : globalSyncState === 'error' 
              ? 'text-red-600' 
              : 'text-[#e8871e]'
          }`}>
            <RefreshCw className={`w-3.5 h-3.5 ${globalSyncState === 'syncing' ? 'animate-spin' : ''}`} />
            {globalSyncState === 'syncing' 
              ? 'Syncing...' 
              : globalSyncState === 'completed' 
              ? 'All Synced' 
              : globalSyncState === 'error' 
              ? 'Failed' 
              : 'Active'}
          </span>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white border border-[#ece9e3] p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-[#1b1c19] text-[15px] font-display flex items-center gap-2">
            <TrendingUp className="w-4.5 h-4.5 text-indigo-600" />
            Edofox Mock Marks Progress Trend
          </h3>
          <span className="text-[11.5px] font-bold text-gray-400">Synced weekly tests percent (%)</span>
        </div>
        
        <div className="h-[210px] w-full mt-2">
          {syncedCount === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-xl bg-gray-50/30 text-gray-400">
              <ClipboardList className="w-8 h-8 text-gray-300 mb-1.5" />
              <p className="text-xs font-bold">No weekly tests synced from Edofox yet.</p>
              <p className="text-[10px] font-medium mt-0.5">Click "Sync from Edofox" on a scheduled test below to begin.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ece9e3" vertical={false} />
                <XAxis dataKey="name" stroke="#83837c" fontSize={11} tickLine={false} />
                <YAxis stroke="#83837c" fontSize={11} domain={[0, 100]} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#ffffff', borderColor: '#ece9e3', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Percentage" 
                  stroke="#1b3b2a" 
                  strokeWidth={3} 
                  activeDot={{ r: 6 }} 
                  dot={{ r: 4, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Mock Tests List Table */}
      <div className="bg-white border border-[#ece9e3] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#ece9e3] bg-[#faf9f5] flex items-center justify-between">
          <h3 className="font-extrabold text-[#1b1c19] text-[15px] font-display">Weekly Mock Schedule &amp; Results</h3>
        </div>
        <div className="divide-y divide-[#ece9e3]/60">
          {mergedTests.map((test) => (
            <div key={test.id} className="flex flex-col p-6 hover:bg-[#faf9f5]/55 transition-all gap-5 border-b border-[#ece9e3]/60 last:border-0">
              {/* Header Row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#eff3ec] flex items-center justify-center shrink-0 mt-0.5 border border-[#d2dfcd]">
                    <Award className="w-5.5 h-5.5 text-[#1b3b2a]" />
                  </div>
                  <div className="truncate text-left">
                    <h4 className="text-[15px] font-black text-[#1b1c19] font-display leading-snug">{test.name}</h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11.5px] text-[#83837c] font-bold">
                      <span className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" /> 
                        Exam Date: {test.date}
                      </span>
                      {test.synced ? (
                        <span className="bg-[#eff3ec] text-[#1b3b2a] border border-[#d2dfcd] px-2 py-0.5 rounded-md">
                          ✓ Synced from Edofox
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                          Completed — Ready to Sync
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Score Summary & Actions */}
                <div className="flex items-center gap-3.5 pl-13 md:pl-0 shrink-0 justify-between md:justify-end">
                  {test.synced ? (
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-[#83837c] block uppercase tracking-wider font-extrabold">Final Marks</span>
                      <span className="text-[16px] font-black text-[#1b1c19] font-display">
                        {test.scores.physics + test.scores.chemistry + test.scores.mathematics} <span className="text-gray-400 font-semibold text-xs">/ 300</span>
                        <span className="text-xs text-[#1b3b2a] ml-2 font-black bg-[#eff3ec] px-1.5 py-0.5 rounded border border-[#d2dfcd]">
                          {test.percent}%
                        </span>
                      </span>
                    </div>
                  ) : (
                    <button
                      disabled={!isEdofoxLinked}
                      onClick={() => setActiveSyncTest(test)}
                      className={`px-4 py-2 rounded-xl text-[12.5px] font-black flex items-center gap-1.5 shadow-sm transition-all border cursor-pointer active:scale-98 ${
                        isEdofoxLinked 
                          ? 'bg-[#1b3b2a] hover:bg-[#142d20] border-[#1b3b2a] text-white'
                          : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                      title={isEdofoxLinked ? "Sync scores from Edofox" : "Link your Edofox account first"}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sync Scores</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Centralized Syllabus Chapters Grid */}
              <div className="bg-[#faf9f5]/55 border border-[#ece9e3] rounded-xl p-4 text-[12px] text-left">
                <div className="font-extrabold text-[#1b1c19] border-b border-gray-100 pb-2 flex items-center gap-1.5 mb-3">
                  <BookOpen className="w-4 h-4 text-emerald-800" />
                  WhatsApp Shared Exam Syllabus Chapters:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="font-black text-gray-400 block uppercase text-[10px] tracking-wider mb-1.5">Physics:</span>
                    <ul className="list-disc pl-4 space-y-1 font-semibold text-gray-700">
                      {test.syllabus?.physics?.length ? (
                        test.syllabus.physics.map((topicId: string) => (
                          <li key={topicId}>{getTopicName('physics', topicId)}</li>
                        ))
                      ) : (
                        <li>General mechanics</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <span className="font-black text-gray-400 block uppercase text-[10px] tracking-wider mb-1.5">Chemistry:</span>
                    <ul className="list-disc pl-4 space-y-1 font-semibold text-gray-700">
                      {test.syllabus?.chemistry?.length ? (
                        test.syllabus.chemistry.map((topicId: string) => (
                          <li key={topicId}>{getTopicName('chemistry', topicId)}</li>
                        ))
                      ) : (
                        <li>General chemistry</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <span className="font-black text-gray-400 block uppercase text-[10px] tracking-wider mb-1.5">Mathematics:</span>
                    <ul className="list-disc pl-4 space-y-1 font-semibold text-gray-700">
                      {test.syllabus?.mathematics?.length ? (
                        test.syllabus.mathematics.map((topicId: string) => (
                          <li key={topicId}>{getTopicName('mathematics', topicId)}</li>
                        ))
                      ) : (
                        <li>General algebra</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Score Drilldowns & Standings if Synced */}
                {test.synced && (
                  <div className="mt-4 pt-4 border-t border-dashed border-[#ece9e3] space-y-3.5">
                    {/* Subject Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className={`p-2.5 rounded-xl border text-center ${
                        test.scores.physics < 60 
                          ? 'bg-red-50/40 border-red-100 text-red-900' 
                          : test.scores.physics >= 75 
                          ? 'bg-emerald-50/40 border-emerald-100 text-emerald-950' 
                          : 'bg-amber-50/40 border-amber-100 text-amber-950'
                      }`}>
                        <span className="block text-[9.5px] font-black uppercase text-gray-400 tracking-wider">Physics</span>
                        <span className="block text-[14px] font-black font-display mt-0.5">{test.scores.physics} <span className="text-[10px] font-semibold text-gray-400">/ 100</span></span>
                      </div>
                      <div className={`p-2.5 rounded-xl border text-center ${
                        test.scores.chemistry < 60 
                          ? 'bg-red-50/40 border-red-100 text-red-900' 
                          : test.scores.chemistry >= 75 
                          ? 'bg-emerald-50/40 border-emerald-100 text-emerald-950' 
                          : 'bg-amber-50/40 border-amber-100 text-amber-950'
                      }`}>
                        <span className="block text-[9.5px] font-black uppercase text-gray-400 tracking-wider">Chemistry</span>
                        <span className="block text-[14px] font-black font-display mt-0.5">{test.scores.chemistry} <span className="text-[10px] font-semibold text-gray-400">/ 100</span></span>
                      </div>
                      <div className={`p-2.5 rounded-xl border text-center ${
                        test.scores.mathematics < 60 
                          ? 'bg-red-50/40 border-red-100 text-red-900' 
                          : test.scores.mathematics >= 75 
                          ? 'bg-emerald-50/40 border-emerald-100 text-emerald-950' 
                          : 'bg-amber-50/40 border-amber-100 text-amber-950'
                      }`}>
                        <span className="block text-[9.5px] font-black uppercase text-gray-400 tracking-wider">Mathematics</span>
                        <span className="block text-[14px] font-black font-display mt-0.5">{test.scores.mathematics} <span className="text-[10px] font-semibold text-gray-400">/ 100</span></span>
                      </div>
                    </div>

                    {/* Class Standings */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] bg-white border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                          🏆 Class Rank: {test.rank || 'N/A'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-black bg-amber-50 text-amber-700 border border-amber-100">
                          👑 Topper Score: {test.topperScore || 0} / 300
                        </span>
                      </div>
                      <span className="text-[11.5px] font-bold text-gray-400">
                        Synced At: {new Date(test.syncedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sync Modal */}
      {activeSyncTest && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-[#ece9e3] rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 bg-[#eff3ec]">
              <h3 className="font-extrabold text-[#1b3b2a] text-[15px] flex items-center gap-1.5 font-display">
                <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                Edofox Live Portal Sync
              </h3>
              <p className="text-xs text-[#1b3b2a]/80 mt-1">Retrieving official exam record for: {activeSyncTest.name}</p>
            </div>
            
            <div className="p-5 space-y-4">
              {!isEdofoxLinked ? (
                <div className="space-y-4 py-3">
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 text-[12.5px] text-amber-950 font-semibold leading-relaxed">
                    <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold block">Edofox Account Required</span>
                      Please link your school Edofox account in the credentials card above to synchronize and fetch official exam scores.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSyncTest(null)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              ) : isSyncing ? (
                /* Spinner & Scraper Real-time Logs Console */
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center py-6 gap-2.5">
                    <Loader2 className="w-8 h-8 text-[#1b3b2a] animate-spin" />
                    <p className="text-xs font-extrabold text-gray-500">Retrieving weekly marks database...</p>
                  </div>
                  <div className="bg-[#121613] p-3 rounded-xl h-44 overflow-y-auto font-mono text-[10.5px] text-[#29d873] border border-white/5 space-y-1.5">
                    {syncLogs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed">{log}</div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Post-sync completion options (e.g. error message state) */
                <div className="space-y-4">
                  <div className="bg-[#121613] p-3 rounded-xl h-44 overflow-y-auto font-mono text-[10.5px] text-[#29d873] border border-white/5 space-y-1.5">
                    {syncLogs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed">{log}</div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSyncTest(null)}
                    className="w-full bg-gray-100 hover:bg-[#eae8e2] text-gray-700 text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
