import React, { useState } from 'react';
import { 
  Clock, 
  HelpCircle, 
  Target, 
  Star, 
  Sun, 
  Moon, 
  Compass, 
  Filter, 
  Rocket, 
  ChevronRight,
  X,
  Calendar,
  Award,
  ChevronDown,
  TrendingUp,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { SubjectTarget, DailyLog, LogEntry } from '../types';

interface AnalyticsProps {
  subjects: SubjectTarget[];
  logs: DailyLog[];
}

export default function Analytics({ subjects, logs }: AnalyticsProps) {
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [showDetailedReport, setShowDetailedReport] = useState<boolean>(false);

  // Filter logs based on active subject selection
  const filteredLogs = logs.map(log => {
    const matchingEntries = log.entries.filter(entry => 
      subjectFilter === 'All' || entry.subject.toLowerCase() === subjectFilter.toLowerCase()
    );
    return {
      ...log,
      entries: matchingEntries
    };
  }).filter(log => log.entries.length > 0);

  // Compute dynamic stats
  let totalMinutes = 0;
  let totalQuestions = 0;
  let totalFocus = 0;
  let entriesCount = 0;
  let totalPointsEarned = 0;

  filteredLogs.forEach(log => {
    log.entries.forEach(entry => {
      totalMinutes += entry.minutes;
      totalQuestions += entry.questionsSolved;
      totalFocus += entry.focus;
      entriesCount += 1;

      // App.tsx standard point formula:
      const studyPoints = Math.floor(entry.minutes / 10) * 1;
      const questionPoints = entry.questionsSolved * 1;
      const dppPoints = entry.dppStatus === 'completed' ? 5 : entry.dppStatus === 'progress' ? 2 : 0;
      const focusBonus = entry.focus >= 4 ? 3 : 0;
      totalPointsEarned += (studyPoints + questionPoints + dppPoints + focusBonus);
    });
  });

  const avgFocus = entriesCount > 0 ? (totalFocus / entriesCount) : 4.0;
  const avgAccuracy = Math.round((avgFocus / 5) * 100);

  const formattedTotalHours = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

  // Helper to generate coordinates for custom SVG Sparkline chart
  const renderSparkline = (points: number[], strokeColor: string) => {
    const w = 70;
    const h = 30;
    const max = Math.max(...points, 1);
    const min = Math.min(...points, 0);
    const range = (max - min) || 1;
    const step = w / (points.length - 1 || 1);
    
    const coords = points.map((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / range) * h * 0.8 - h * 0.1;
      return [x, y];
    });

    const pathString = coords.map((c, i) => {
      return (i === 0 ? 'M' : 'L') + c[0].toFixed(1) + ',' + c[1].toFixed(1);
    }).join(' ');

    return (
      <svg className="w-[70px] h-[30px] overflow-visible" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <path d={pathString} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, idx) => (
          <circle key={idx} cx={c[0].toFixed(1)} cy={c[1].toFixed(1)} r="3" fill={strokeColor} />
        ))}
      </svg>
    );
  };

  // Helper to draw large SVG line charts
  const renderFullLineChart = (points: number[], strokeColor: string, w = 260, h = 90) => {
    const max = Math.max(...points, 1);
    const min = Math.min(...points, 0);
    const range = (max - min) || 1;
    const step = w / (points.length - 1 || 1);
    
    const coords = points.map((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / range) * h * 0.8 - h * 0.1;
      return [x, y];
    });

    const pathString = coords.map((c, i) => {
      return (i === 0 ? 'M' : 'L') + c[0].toFixed(1) + ',' + c[1].toFixed(1);
    }).join(' ');

    return (
      <svg className="w-full h-[90px] overflow-visible" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <path d={pathString} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, idx) => (
          <circle key={idx} cx={c[0].toFixed(1)} cy={c[1].toFixed(1)} r="3.5" fill={strokeColor} />
        ))}
      </svg>
    );
  };

  // Compute subject-wise distribution overall
  const subjectMinutesMap: Record<string, number> = {
    'Physics': 0, 'Chemistry': 0, 'Mathematics': 0, 'Others': 0
  };
  
  logs.forEach(log => {
    log.entries.forEach(entry => {
      const s = entry.subject;
      if (s === 'Physics' || s === 'Chemistry' || s === 'Mathematics') {
        subjectMinutesMap[s] += entry.minutes;
      } else {
        subjectMinutesMap['Others'] += entry.minutes;
      }
    });
  });

  const totalMinsOverall = Object.values(subjectMinutesMap).reduce((s, m) => s + m, 0) || 1;
  const physicsPct = Math.round((subjectMinutesMap['Physics'] / totalMinsOverall) * 100);
  const chemistryPct = Math.round((subjectMinutesMap['Chemistry'] / totalMinsOverall) * 100);
  const mathPct = Math.round((subjectMinutesMap['Mathematics'] / totalMinsOverall) * 100);
  const othersPct = Math.max(0, 100 - physicsPct - chemistryPct - mathPct);

  // Draw the SVG donut progression ring
  const renderDonutChart = (p: number, c: number, m: number, o: number, totalHrsText: string, size = 120, stroke = 14) => {
    const r = (size - stroke) / 2;
    const circumference = 2 * Math.PI * r;
    
    const segments = [
      { pct: p, color: '#7fbf6a' },
      { pct: c, color: '#9c8cf0' },
      { pct: m, color: '#e8a615' },
      { pct: o, color: '#4a524d' }
    ].filter(s => s.pct > 0);

    let offset = 0;
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          {segments.map((s, index) => {
            const strokeLength = (s.pct / 100) * circumference;
            const strokeOffset = -offset;
            offset += strokeLength;
            return (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
                strokeDashoffset={strokeOffset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[15px] font-black text-[#f4f4ef] leading-tight font-display">{totalHrsText}</div>
          <div className="text-[9px] text-[#8b958e] uppercase font-bold tracking-wider">Total</div>
        </div>
      </div>
    );
  };

  // Map of days for study time columns
  const dayMinutesMap: Record<string, number> = {
    'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
  };
  const dayQuestionsMap: Record<string, number> = {
    'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
  };
  const dayFocusMap: Record<string, { sum: number, count: number }> = {
    'Mon': { sum: 0, count: 0 }, 'Tue': { sum: 0, count: 0 }, 'Wed': { sum: 0, count: 0 },
    'Thu': { sum: 0, count: 0 }, 'Fri': { sum: 0, count: 0 }, 'Sat': { sum: 0, count: 0 }, 'Sun': { sum: 0, count: 0 }
  };

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  filteredLogs.forEach(log => {
    const dateObj = new Date(log.date + 'T12:00:00');
    const dayName = daysOfWeek[dateObj.getDay()];
    log.entries.forEach(entry => {
      if (dayName in dayMinutesMap) {
        dayMinutesMap[dayName] += entry.minutes;
        dayQuestionsMap[dayName] += entry.questionsSolved;
        dayFocusMap[dayName].sum += entry.focus;
        dayFocusMap[dayName].count += 1;
      }
    });
  });

  const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const days = orderedDays.map(d => {
    const mins = dayMinutesMap[d];
    return {
      d,
      v: mins / 60,
      lbl: mins > 0 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : '',
      empty: mins === 0
    };
  });

  // Highlight peak day
  const maxDayMinutes = Math.max(...Object.values(dayMinutesMap), 1);
  const peakDayName = Object.keys(dayMinutesMap).find(key => dayMinutesMap[key] === maxDayMinutes && maxDayMinutes > 0);
  days.forEach(day => {
    if (day.d === peakDayName) {
      (day as any).peak = true;
    }
  });

  // Dynamic sparklines arrays
  const sparklineStudy = orderedDays.map(d => dayMinutesMap[d]);
  const sparklineQuestions = orderedDays.map(d => dayQuestionsMap[d]);
  const sparklineAccuracy = orderedDays.map(d => dayFocusMap[d].count ? Math.round((dayFocusMap[d].sum / (dayFocusMap[d].count * 5)) * 100) : 60);
  const sparklinePoints = orderedDays.map(d => {
    let dayMins = dayMinutesMap[d];
    let dayQs = dayQuestionsMap[d];
    return Math.floor(dayMins / 10) + dayQs;
  });

  // Accuracy Trend and Questions trend
  const accuracyPoints = sparklineAccuracy;
  const questionPoints = sparklineQuestions;

  const dayparts = [
    { lbl: 'Morning (5AM – 12PM)', pct: 35, ic: Sun, color: '#f0c419' },
    { lbl: 'Afternoon (12PM – 5PM)', pct: 25, ic: Sun, color: '#e8871e' },
    { lbl: 'Evening (5PM – 10PM)', pct: 32, ic: Sun, color: '#e0484b' },
    { lbl: 'Night (10PM – 5AM)', pct: 8, ic: Moon, color: '#5b6bd6' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
      
      {/* Topbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#f4f4ef] flex items-center gap-2 font-display">
            Analytics
          </h1>
          <p className="text-[#8b958e] text-[14px] mt-1">
            Understand your efforts. Improve every day.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {/* Interactive Subject Filter */}
          <div className="flex items-center gap-2 bg-[#121a17] border border-white/8 text-[#f4f4ef] rounded-lg px-2.5 py-1.5 text-[13px] font-bold">
            <Filter className="w-3.5 h-3.5 text-[#d8ef58]" />
            <span className="text-[#8b958e] mr-1">Subject:</span>
            <select 
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="bg-transparent border-none text-white font-extrabold focus:outline-none cursor-pointer text-[13px]"
            >
              <option value="All" className="bg-[#121a17]">All Subjects</option>
              <option value="Physics" className="bg-[#121a17]">Physics</option>
              <option value="Chemistry" className="bg-[#121a17]">Chemistry</option>
              <option value="Mathematics" className="bg-[#121a17]">Mathematics</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-[#121a17] border border-white/8 text-[#f4f4ef] rounded-lg px-3.5 py-2 text-[13px] font-semibold cursor-pointer hover:border-white/18 transition-all">
            <Clock className="w-4 h-4 text-[#8b958e]" />
            <span>This Week</span>
          </div>
        </div>
      </div>

      {/* Grid Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Total Study Time */}
        <div className="bg-[#121a17] border border-white/8 rounded-2xl p-4.5 flex flex-col justify-between hover:border-white/18 transition-all">
          <div className="text-[12.5px] font-bold text-[#8b958e] mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Total Study Time</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-[25px] font-black text-[#f4f4ef] leading-none">{formattedTotalHours}</div>
              <p className="text-[11.5px] text-[#1f9d51] font-bold mt-2">↑ Dynamic logs active</p>
            </div>
            {renderSparkline(sparklineStudy, '#7fbf6a')}
          </div>
        </div>

        {/* Questions Solved */}
        <div className="bg-[#121a17] border border-white/8 rounded-2xl p-4.5 flex flex-col justify-between hover:border-white/18 transition-all">
          <div className="text-[12.5px] font-bold text-[#8b958e] mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            <span>Questions Solved</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-[25px] font-black text-[#f4f4ef] leading-none">{totalQuestions}</div>
              <p className="text-[11.5px] text-[#1f9d51] font-bold mt-2">↑ {totalQuestions > 0 ? `${totalQuestions} solved` : '0 solved'}</p>
            </div>
            {renderSparkline(sparklineQuestions, '#9c8cf0')}
          </div>
        </div>

        {/* Average Focus */}
        <div className="bg-[#121a17] border border-white/8 rounded-2xl p-4.5 flex flex-col justify-between hover:border-white/18 transition-all">
          <div className="text-[12.5px] font-bold text-[#8b958e] mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span>Focus Rating Avg</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-[25px] font-black text-[#f4f4ef] leading-none">{avgFocus.toFixed(1)}/5</div>
              <p className="text-[11.5px] text-[#1f9d51] font-bold mt-2">~{avgAccuracy}% focus efficiency</p>
            </div>
            {renderSparkline(sparklineAccuracy, '#e8a615')}
          </div>
        </div>

        {/* Points Earned */}
        <div className="bg-[#121a17] border border-white/8 rounded-2xl p-4.5 flex flex-col justify-between hover:border-white/18 transition-all">
          <div className="text-[12.5px] font-bold text-[#8b958e] mb-3 flex items-center gap-2">
            <Star className="w-4 h-4" />
            <span>Points Earned</span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-[25px] font-black text-[#f4f4ef] leading-none">{totalPointsEarned}</div>
              <p className="text-[11.5px] text-[#1f9d51] font-bold mt-2">↑ Live points ledger</p>
            </div>
            {renderSparkline(sparklinePoints, '#5fd1c5')}
          </div>
        </div>
      </div>

      {/* Main Charts Block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Study Time Column Chart */}
        <div className="bg-[#121a17] border border-white/8 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-[#f4f4ef] flex items-center gap-2 font-display">
              <Clock className="w-4 h-4 text-[#d8ef58]" />
              Study Time Over the Week
            </h3>
            <span className="text-[12px] text-[#8b958e] font-semibold">{formattedTotalHours} logged</span>
          </div>

          <div className="flex items-end gap-3.5 h-[150px] mt-4 px-1">
            {days.map((day) => {
              const heightPercentage = Math.min(100, Math.max(4, (day.v / 10) * 100));
              return (
                <div key={day.d} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5">
                  {day.lbl && (
                    <div className="text-[9.5px] text-[#8b958e] font-bold text-center whitespace-nowrap">
                      {day.lbl}
                    </div>
                  )}
                  <div 
                    className={`w-full max-w-[28px] rounded-t-md transition-all duration-500 ${
                      day.empty 
                        ? 'border-1.5 border-dashed border-[#cfd6cf] h-1.5 bg-transparent' 
                        : (day as any).peak 
                          ? 'bg-[#d8ef58]' 
                          : 'bg-[#3c5a44]'
                    }`}
                    style={{ height: day.empty ? '4px' : `${heightPercentage}%` }}
                  />
                  <div className="text-[11px] text-[#8b958e] font-semibold">{day.d}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subject-Wise Time Distribution */}
        <div className="bg-[#121a17] border border-white/8 rounded-2xl p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-[#f4f4ef] flex items-center gap-2 font-display mb-4">
            <Target className="w-4 h-4 text-[#d8ef58]" />
            Subject Wise Time Distribution
          </h3>
          <div className="flex flex-col sm:flex-row items-center gap-6 mt-2">
            {renderDonutChart(physicsPct, chemistryPct, mathPct, othersPct, formattedTotalHours)}
            <div className="flex-1 w-full flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[12.5px]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#7fbf6a]" />
                  <span className="font-semibold text-[#f4f4ef]">Physics</span>
                </div>
                <span className="text-[#8b958e] font-bold">{Math.floor(subjectMinutesMap['Physics'] / 60)}h {subjectMinutesMap['Physics'] % 60}m ({physicsPct}%)</span>
              </div>
              <div className="flex items-center justify-between text-[12.5px]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#9c8cf0]" />
                  <span className="font-semibold text-[#f4f4ef]">Chemistry</span>
                </div>
                <span className="text-[#8b958e] font-bold">{Math.floor(subjectMinutesMap['Chemistry'] / 60)}h {subjectMinutesMap['Chemistry'] % 60}m ({chemistryPct}%)</span>
              </div>
              <div className="flex items-center justify-between text-[12.5px]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#e8a615]" />
                  <span className="font-semibold text-[#f4f4ef]">Mathematics</span>
                </div>
                <span className="text-[#8b958e] font-bold">{Math.floor(subjectMinutesMap['Mathematics'] / 60)}h {subjectMinutesMap['Mathematics'] % 60}m ({mathPct}%)</span>
              </div>
              <div className="flex items-center justify-between text-[12.5px]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#4a524d]" />
                  <span className="font-semibold text-[#f4f4ef]">Others</span>
                </div>
                <span className="text-[#8b958e] font-bold">{Math.floor(subjectMinutesMap['Others'] / 60)}h {subjectMinutesMap['Others'] % 60}m ({othersPct}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accuracy, Questions & Period Trends */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Focus Rating Trend */}
        <div className="bg-[#121a17] border border-white/8 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-[#f4f4ef] flex items-center gap-2 font-display">
              Focus Rating Trend
            </h3>
            <span className="text-[12px] text-[#8b958e]">{avgFocus.toFixed(1)}/5 avg</span>
          </div>
          <div className="mt-5">{renderFullLineChart(accuracyPoints, '#e8e553', 260, 90)}</div>
          <div className="flex justify-between text-[11px] text-[#8b958e] mt-3 px-1 font-semibold">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>

        {/* Questions Trend */}
        <div className="bg-[#121a17] border border-white/8 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-[#f4f4ef] flex items-center gap-2 font-display">
              Questions Solved Trend
            </h3>
            <span className="text-[12px] text-[#8b958e]">{totalQuestions} total</span>
          </div>
          <div className="mt-5">{renderFullLineChart(questionPoints, '#9c8cf0', 260, 90)}</div>
          <div className="flex justify-between text-[11px] text-[#8b958e] mt-3 px-1 font-semibold">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>

        {/* Period Distribution (Day parts) */}
        <div className="bg-[#121a17] border border-white/8 rounded-2xl p-5 shadow-sm">
          <h3 className="text-[14px] font-bold text-[#f4f4ef] flex items-center gap-2 font-display mb-4.5">
            Time Distribution (Day Parts)
          </h3>
          <div className="flex flex-col gap-3">
            {dayparts.map((part) => {
              const Icon = part.ic;
              return (
                <div key={part.lbl} className="flex items-center gap-2.5">
                  <div 
                    className="w-6.5 h-6.5 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${part.color}22` }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: part.color }} />
                  </div>
                  <div className="text-[12px] text-[#f4f4ef] flex-1 truncate">{part.lbl}</div>
                  <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden mx-2.5">
                    <div 
                      className="h-full rounded-full"
                      style={{ backgroundColor: part.color, width: `${part.pct}%` }}
                    />
                  </div>
                  <div className="text-[11.5px] font-bold text-[#f4f4ef] w-8 text-right">{part.pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Achievement Callout Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-[#d8ef58]/8 border border-[#d8ef58]/25 rounded-2xl">
        <div className="text-2xl select-none">🚀</div>
        <div>
          <h4 className="text-[14px] font-black text-[#f4f4ef] font-display">Effort logs synced in real-time</h4>
          <p className="text-[12.5px] text-[#8b958e] mt-0.5">
            You have earned <span className="text-white font-extrabold">{totalPointsEarned} study points</span> overall from logging. Explore detailed session parameters.
          </p>
        </div>
        <button 
          onClick={() => setShowDetailedReport(true)}
          className="flex items-center gap-1.5 py-2.5 px-4 bg-[#d8ef58] text-[#0d1210] hover:bg-[#c6db49] border-none font-bold text-[13px] rounded-lg cursor-pointer sm:ml-auto select-none transition-colors duration-150 shadow-md"
        >
          <span>View Detailed Study Log</span>
          <ChevronRight className="w-4 h-4" strokeWidth="2.5" />
        </button>
      </div>

      {/* Detailed Report Modal */}
      {showDetailedReport && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#121a17] border border-white/12 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-[#f4f4ef]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/8 flex justify-between items-center bg-[#0d1210]">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#d8ef58]" />
                <h3 className="text-lg font-bold text-white font-display">Study Logs Ledger Explorer</h3>
              </div>
              <button 
                onClick={() => setShowDetailedReport(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-3.5 bg-[#121a17]">
              {logs.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  No historical study logs found.
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="bg-white/3 border border-white/6 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between border-b border-white/6 pb-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-[#d8ef58]" />
                        <span>{log.date}</span>
                      </div>
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-[#d8ef58]/12 text-[#d8ef58] border border-[#d8ef58]/20">
                        Daily Block
                      </span>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {log.entries.map((entry, entryIdx) => {
                        const calculatedPoints = Math.floor(entry.minutes / 10) + entry.questionsSolved + (entry.dppStatus === 'completed' ? 5 : entry.dppStatus === 'progress' ? 2 : 0) + (entry.focus >= 4 ? 3 : 0);
                        return (
                          <div key={entryIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white/1.5 rounded-lg border border-white/3 hover:border-white/8 transition-all">
                            <div className="flex items-center gap-2.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#d8ef58]" />
                              <div>
                                <span className="font-bold text-[13.5px] text-white mr-2">{entry.subject}</span>
                                <span className="text-[11.5px] text-gray-400">({entry.minutes} mins • {entry.questionsSolved} Qs)</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              <div className="text-[11px] text-gray-400 font-medium">
                                DPP: <strong className="text-white">{entry.dppStatus}</strong> • Focus: <strong className="text-white">{entry.focus}/5</strong>
                              </div>
                              <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                                +{calculatedPoints} pts
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/8 flex justify-end bg-[#0d1210]">
              <button 
                onClick={() => setShowDetailedReport(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-bold text-[13px] rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
