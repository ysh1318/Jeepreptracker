import React, { useState, useMemo } from 'react';
import {
  Atom,
  FlaskConical,
  Calculator,
  ChevronDown,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Search,
  Filter,
  ChevronsUpDown,
  Eye,
  EyeOff,
  BarChart3,
  Target,
  Flame,
  Zap
} from 'lucide-react';
import { SyllabusTopic, SubTopic } from '../types';

interface SyllabusProps {
  syllabusData: SyllabusTopic[];
  onToggleSubTopic?: (topicId: string, subTopicId: string) => void;
}

export default function Syllabus({ syllabusData, onToggleSubTopic }: SyllabusProps) {
  const [activeSubjectId, setActiveSubjectId] = useState<string>('physics');
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);
  const [scopeFilter, setScopeFilter] = useState<'all' | 'main-only' | 'advanced-only'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'progress' | 'notstarted'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Subject data
  const physicsTopic = syllabusData.find(s => s.id === 'phys-1') || { cur: 0, tot: 0, pct: 0, subtopics: [] };
  const chemTopic = syllabusData.find(s => s.id === 'chem-1') || { cur: 0, tot: 0, pct: 0, subtopics: [] };
  const mathTopic = syllabusData.find(s => s.id === 'math-1') || { cur: 0, tot: 0, pct: 0, subtopics: [] };

  // Compute real counts from subtopics
  const getStatusCounts = (topic: any) => {
    const subs = topic.subtopics || [];
    const completed = subs.filter((s: SubTopic) => s.status === 'completed').length;
    const progress = subs.filter((s: SubTopic) => s.status === 'progress').length;
    const notstarted = subs.filter((s: SubTopic) => s.status === 'notstarted').length;
    const total = subs.length;
    return { completed, progress, notstarted, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const physCounts = getStatusCounts(physicsTopic);
  const chemCounts = getStatusCounts(chemTopic);
  const mathCounts = getStatusCounts(mathTopic);

  const totalCompleted = physCounts.completed + chemCounts.completed + mathCounts.completed;
  const totalProgress = physCounts.progress + chemCounts.progress + mathCounts.progress;
  const totalNotStarted = physCounts.notstarted + chemCounts.notstarted + mathCounts.notstarted;
  const totalAll = physCounts.total + chemCounts.total + mathCounts.total;
  const overallPct = totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0;

  const subjectsTabs = [
    { id: 'physics', name: 'Physics', emoji: '⚡', counts: physCounts, color: 'from-cyan-500 to-blue-600', light: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700' },
    { id: 'chem', name: 'Chemistry', emoji: '🧪', counts: chemCounts, color: 'from-purple-500 to-violet-600', light: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
    { id: 'math', name: 'Mathematics', emoji: '📐', counts: mathCounts, color: 'from-orange-400 to-amber-600', light: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' }
  ];

  // Current subject
  const currentSubjectSyllabus = syllabusData.find(
    (s) => s.id.startsWith(activeSubjectId.substring(0, 4))
  ) || syllabusData[0] || { id: '', name: '', subtopics: [] };

  const currentTab = subjectsTabs.find(t => t.id === activeSubjectId) || subjectsTabs[0];
  const currentCounts = currentTab.counts;

  // Filtering helpers
  const matchesScope = (sub: SubTopic) => {
    if (scopeFilter === 'all') return true;
    if (scopeFilter === 'main-only') return sub.scope === 'main-only' || sub.scope === 'both';
    if (scopeFilter === 'advanced-only') return sub.scope === 'advanced-only' || sub.scope === 'both';
    return true;
  };

  const matchesStatus = (sub: SubTopic) => {
    if (statusFilter === 'all') return true;
    return sub.status === statusFilter;
  };

  const matchesSearch = (sub: SubTopic) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return sub.name.toLowerCase().includes(q) || (sub.chapter || '').toLowerCase().includes(q);
  };

  // Group subtopics by chapter
  const chaptersMap = useMemo(() => {
    const chapters: Record<string, SubTopic[]> = {};
    if (!currentSubjectSyllabus?.subtopics) return chapters;
    currentSubjectSyllabus.subtopics.forEach((sub) => {
      const ch = sub.chapter || 'General';
      if (!chapters[ch]) chapters[ch] = [];
      chapters[ch].push(sub);
    });
    return chapters;
  }, [currentSubjectSyllabus]);

  // Filtered chapters
  const filteredChaptersMap = useMemo(() => {
    const result: Record<string, SubTopic[]> = {};
    Object.keys(chaptersMap).forEach(ch => {
      const filtered = chaptersMap[ch].filter(s => matchesScope(s) && matchesStatus(s) && matchesSearch(s));
      if (filtered.length > 0) result[ch] = filtered;
    });
    return result;
  }, [chaptersMap, scopeFilter, statusFilter, searchQuery]);

  const chapterNames = Object.keys(filteredChaptersMap);

  // Expand / collapse all
  const toggleAll = () => {
    if (expandedChapters.length === chapterNames.length) {
      setExpandedChapters([]);
    } else {
      setExpandedChapters([...chapterNames]);
    }
  };

  const toggleChapter = (ch: string) => {
    setExpandedChapters(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    );
  };

  // Status rendering
  const StatusDot = ({ status }: { status: string }) => {
    if (status === 'completed') return (
      <div className="w-5.5 h-5.5 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-sm shadow-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={3} />
      </div>
    );
    if (status === 'progress') return (
      <div className="w-5.5 h-5.5 rounded-full border-[2.5px] border-amber-400 flex items-center justify-center shrink-0">
        <div className="w-2 h-2 rounded-full bg-amber-400" />
      </div>
    );
    return <Circle className="w-5.5 h-5.5 text-gray-300 shrink-0" />;
  };

  const StatusBadge = ({ status, onClick }: { status: string; onClick?: () => void }) => {
    const base = "text-[10.5px] font-black px-3 py-1 rounded-full select-none transition-all";
    if (status === 'completed') return (
      <span onClick={onClick} className={`${base} bg-emerald-100 text-emerald-700 border border-emerald-200 ${onClick ? 'cursor-pointer hover:bg-emerald-200 active:scale-95' : ''}`}>
        ✅ Done
      </span>
    );
    if (status === 'progress') return (
      <span onClick={onClick} className={`${base} bg-amber-100 text-amber-700 border border-amber-200 ${onClick ? 'cursor-pointer hover:bg-amber-200 active:scale-95' : ''}`}>
        🔄 In Progress
      </span>
    );
    return (
      <span onClick={onClick} className={`${base} bg-gray-100 text-gray-500 border border-gray-200 ${onClick ? 'cursor-pointer hover:bg-gray-200 active:scale-95' : ''}`}>
        ⬜ Not Started
      </span>
    );
  };

  // Mini progress ring
  const ProgressRing = ({ pct, size = 36, stroke = 3.5, color = '#1b3b2a' }: { pct: number; size?: number; stroke?: number; color?: string }) => {
    const r = (size - stroke) / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (pct / 100) * circumference;
    return (
      <svg width={size} height={size} className="shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eeece6" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-700"
        />
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.28}
          fontWeight={900} fill="#1b1c19" className="rotate-90" style={{ transformOrigin: 'center' }}>
          {pct}%
        </text>
      </svg>
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#1b1c19] flex items-center gap-2.5 font-display">
            <Target className="w-7 h-7 text-[#1b3b2a]" />
            Syllabus Tracker
          </h1>
          <p className="text-[#83837c] text-[13px] mt-1 font-medium">
            {totalAll} topics • {totalCompleted} completed • {totalProgress} in progress • {totalNotStarted} remaining
          </p>
        </div>
      </div>

      {/* ── Overall Progress Bar ── */}
      <div className="bg-gradient-to-r from-[#1b3b2a] to-[#2d5c42] rounded-2xl p-5 mb-5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <ProgressRing pct={overallPct} size={56} stroke={5} color="#4ade80" />
            <div>
              <div className="text-white font-black text-[18px]">Overall Syllabus Progress</div>
              <div className="text-white/60 text-[12px] font-semibold mt-0.5">{totalCompleted} / {totalAll} topics completed across all subjects</div>
            </div>
          </div>
          <div className="flex items-center gap-5">
            {subjectsTabs.map(tab => (
              <div key={tab.id} className="text-center">
                <div className="text-[20px] font-black text-white">{tab.counts.pct}%</div>
                <div className="text-white/50 text-[10px] font-bold uppercase tracking-wide">{tab.emoji} {tab.name.slice(0, 4)}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Combined progress bar */}
        <div className="mt-4 h-2.5 bg-white/15 rounded-full overflow-hidden flex">
          <div className="h-full bg-emerald-400 transition-all duration-700 rounded-l-full" style={{ width: `${totalAll > 0 ? (totalCompleted / totalAll) * 100 : 0}%` }} />
          <div className="h-full bg-amber-400 transition-all duration-700" style={{ width: `${totalAll > 0 ? (totalProgress / totalAll) * 100 : 0}%` }} />
        </div>
        <div className="flex items-center gap-5 mt-2.5 text-[11px] font-bold text-white/60">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-400 rounded-full inline-block" /> Completed ({totalCompleted})</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-400 rounded-full inline-block" /> In Progress ({totalProgress})</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-white/20 rounded-full inline-block" /> Not Started ({totalNotStarted})</span>
        </div>
      </div>

      {/* ── Subject Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {subjectsTabs.map(tab => {
          const isActive = activeSubjectId === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveSubjectId(tab.id); setExpandedChapters([]); setSearchQuery(''); }}
              className={`relative overflow-hidden rounded-2xl p-4 text-left transition-all cursor-pointer border-2 ${
                isActive
                  ? `${tab.light} ${tab.border} shadow-md scale-[1.02]`
                  : 'bg-white border-[#ece9e3] hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              {isActive && <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tab.color}`} />}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{tab.emoji}</span>
                  <div>
                    <div className={`text-[14px] font-black ${isActive ? tab.text : 'text-[#1b1c19]'}`}>{tab.name}</div>
                    <div className="text-[11px] text-gray-500 font-semibold mt-0.5">
                      {tab.counts.completed}/{tab.counts.total} done
                    </div>
                  </div>
                </div>
                <ProgressRing pct={tab.counts.pct} size={40} stroke={3.5} color={isActive ? (tab.id === 'physics' ? '#06b6d4' : tab.id === 'chem' ? '#a855f7' : '#f97316') : '#1b3b2a'} />
              </div>
              {/* Mini status bar */}
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: `${tab.counts.total > 0 ? (tab.counts.completed / tab.counts.total) * 100 : 0}%` }} />
                <div className="h-full bg-amber-400" style={{ width: `${tab.counts.total > 0 ? (tab.counts.progress / tab.counts.total) * 100 : 0}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Toolbar: Search + Filters ── */}
      <div className="bg-white border border-[#ece9e3] rounded-2xl p-4 mb-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics or chapters..."
              className="w-full pl-9 pr-3 py-2 text-[13px] font-medium bg-[#faf9f5] border border-[#ece9e3] rounded-xl focus:outline-none focus:border-[#1b3b2a] focus:ring-1 focus:ring-[#1b3b2a] transition-all"
            />
          </div>

          {/* Status filter chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: 'all' as const, label: 'All', count: currentCounts.total },
              { key: 'notstarted' as const, label: '⬜ Not Started', count: currentCounts.notstarted },
              { key: 'progress' as const, label: '🔄 In Progress', count: currentCounts.progress },
              { key: 'completed' as const, label: '✅ Done', count: currentCounts.completed },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer border ${
                  statusFilter === f.key
                    ? 'bg-[#1b3b2a] text-white border-[#1b3b2a] shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f.label} <span className="opacity-60">({f.count})</span>
              </button>
            ))}
          </div>

          {/* Scope filter */}
          <div className="flex items-center gap-1.5 bg-[#faf9f5] border border-[#ece9e3] p-1 rounded-xl shrink-0">
            {(['all', 'main-only', 'advanced-only'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setScopeFilter(filter)}
                className={`px-2.5 py-1.5 rounded-lg text-[10.5px] font-black transition-all cursor-pointer ${
                  scopeFilter === filter
                    ? 'bg-[#1b3b2a] text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-black/3'
                }`}
              >
                {filter === 'all' ? 'All' : filter === 'main-only' ? 'Mains' : 'Advanced'}
              </button>
            ))}
          </div>

          {/* Expand/Collapse */}
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-extrabold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-all shrink-0"
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
            {expandedChapters.length === chapterNames.length ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      {/* ── Chapter List ── */}
      <div className="flex flex-col gap-3">
        {chapterNames.length === 0 ? (
          <div className="bg-white border border-[#ece9e3] rounded-2xl p-10 text-center shadow-xs">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-[15px] font-bold text-gray-400">No topics match your filters</p>
            <p className="text-[12px] text-gray-400 mt-1">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          chapterNames.map((chapterName, chIdx) => {
            const subtopics = filteredChaptersMap[chapterName];
            const allChapterSubtopics = chaptersMap[chapterName] || [];
            const completedCount = allChapterSubtopics.filter(s => s.status === 'completed').length;
            const progressCount = allChapterSubtopics.filter(s => s.status === 'progress').length;
            const totalCount = allChapterSubtopics.length;
            const chPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const isExpanded = expandedChapters.includes(chapterName);
            const isFullyDone = completedCount === totalCount && totalCount > 0;

            return (
              <div
                key={chapterName}
                className={`bg-white border rounded-2xl shadow-xs overflow-hidden transition-all ${
                  isFullyDone ? 'border-emerald-200 bg-emerald-50/30' : 'border-[#ece9e3]'
                }`}
              >
                {/* Chapter Header */}
                <div
                  onClick={() => toggleChapter(chapterName)}
                  className="flex items-center gap-3 px-4.5 py-3.5 cursor-pointer hover:bg-black/[0.015] select-none transition-all"
                >
                  {/* Chapter number */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-black shrink-0 ${
                    isFullyDone ? 'bg-emerald-100 text-emerald-700' : 'bg-[#f4f3ef] text-gray-500'
                  }`}>
                    {isFullyDone ? '✓' : chIdx + 1}
                  </div>

                  {/* Title + count */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-[14px] font-extrabold font-display truncate ${isFullyDone ? 'text-emerald-800' : 'text-[#1b1c19]'}`}>
                      {chapterName}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-gray-500 font-semibold">{totalCount} topics</span>
                      {completedCount > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">✅ {completedCount}</span>
                      )}
                      {progressCount > 0 && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">🔄 {progressCount}</span>
                      )}
                    </div>
                  </div>

                  {/* Progress ring + chevron */}
                  <div className="flex items-center gap-3 shrink-0">
                    <ProgressRing pct={chPct} size={34} stroke={3} color={isFullyDone ? '#10b981' : '#1b3b2a'} />
                    <ChevronDown className={`w-4.5 h-4.5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Subtopics */}
                {isExpanded && (
                  <div className="border-t border-[#ece9e3]">
                    {subtopics.map((t, tIdx) => (
                      <div
                        key={t.id}
                        className={`flex items-center gap-3 px-4.5 py-3 border-b border-[#f5f4f0] last:border-b-0 transition-all hover:bg-[#faf9f5] ${
                          t.status === 'completed' ? 'bg-emerald-50/30' : ''
                        }`}
                      >
                        {/* Toggle button */}
                        <button
                          className="shrink-0 cursor-pointer hover:scale-110 active:scale-90 transition-transform bg-transparent border-none p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSubTopic?.(currentSubjectSyllabus.id, t.id);
                          }}
                        >
                          <StatusDot status={t.status} />
                        </button>

                        {/* Topic info */}
                        <div className="flex-1 min-w-0">
                          <span className={`text-[13px] font-bold leading-tight block truncate ${
                            t.status === 'completed' ? 'text-emerald-800 line-through opacity-70' : 'text-[#1b1c19]'
                          }`}>
                            {t.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            {t.scope === 'advanced-only' ? (
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black rounded">ADV</span>
                            ) : t.scope === 'main-only' ? (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-black rounded">MAIN</span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-gray-50 text-gray-400 border border-gray-200 text-[9px] font-semibold rounded">M+A</span>
                            )}
                            <span className="text-[10px] text-gray-400 font-medium">{t.time}</span>
                            <span className="text-[10px] text-gray-400 font-medium">• {t.qs}</span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <StatusBadge
                          status={t.status}
                          onClick={() => onToggleSubTopic?.(currentSubjectSyllabus.id, t.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Bottom summary ── */}
      {chapterNames.length > 0 && (
        <div className="mt-4 text-center text-[12px] text-gray-400 font-semibold py-3">
          Showing {chapterNames.length} chapters • {Object.keys(filteredChaptersMap).reduce((a, chName) => a + filteredChaptersMap[chName].length, 0)} topics
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      )}
    </div>
  );
}
