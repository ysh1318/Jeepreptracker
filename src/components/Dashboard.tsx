import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Star, 
  Clock, 
  Crown, 
  Plus, 
  Zap, 
  Bell, 
  Calendar, 
  ChevronRight, 
  Award,
  BookOpen,
  HelpCircle,
  Target,
  Play,
  Pause,
  Square,
  FastForward,
  ShieldCheck
} from 'lucide-react';
import { SubjectTarget, DailyLog } from '../types';
import { getRankInfo } from '../lib/ranks';
import { TransparentBadgeImage } from '../lib/transparentBadge';

interface DashboardProps {
  onOpenLogModal: () => void;
  onOpenWithPrefilled: (minutes: number) => void;
  subjects: SubjectTarget[];
  logs: DailyLog[];
  streak: number;
  todayPoints: number;
  profile?: any;
}

export default function Dashboard({ 
  onOpenLogModal, 
  onOpenWithPrefilled, 
  subjects, 
  logs, 
  streak,
  todayPoints,
  profile
}: DashboardProps) {
  // Sum total hours for the week
  const calculateWeeklyStudyHours = () => {
    let totalMinutes = 0;
    logs.forEach(log => {
      log.entries.forEach(entry => {
        totalMinutes += entry.minutes;
      });
    });
    return parseFloat((totalMinutes / 60).toFixed(1));
  };

  const weeklyHours = calculateWeeklyStudyHours();
  const targetWeeklyHours = subjects.reduce((acc, curr) => acc + (curr.target || 0), 0) || 27;
  const progressPercent = Math.min(100, Math.round((weeklyHours / targetWeeklyHours) * 100));

  // Get active subjects logged today
  const getTodayLog = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    return logs.find(log => log.date === todayStr) || { date: todayStr, entries: [], retroactive: false };
  };

  const todayLog = getTodayLog();

  // Helper to format hours
  const formatHoursAndMinutes = (mins: number) => {
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
  };

  // Get recent logs across all days for activity list
  const getRecentLogsList = () => {
    const list: Array<{
      subject: string;
      minutes: number;
      questionsSolved: number;
      focus: number;
      date: string;
      id: string;
      retroactive: boolean;
      editedAt?: string;
    }> = [];

    // Sort logs descending by date
    const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));

    sortedLogs.forEach(log => {
      log.entries.forEach((entry, i) => {
        list.push({
          subject: entry.subject,
          minutes: entry.minutes,
          questionsSolved: entry.questionsSolved,
          focus: entry.focus,
          date: log.date,
          id: `${log.date}-${entry.subject}-${i}`,
          retroactive: !!log.retroactive,
          editedAt: log.editedAt
        });
      });
    });

    return list.slice(0, 5); // Limit to top 5
  };

  const recentActivities = getRecentLogsList();

  // Dynamically calculate current week dates from Monday to Sunday
  const getWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const mondayDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const week = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + mondayDiff + i);
      const isoStr = d.toISOString().split('T')[0];
      
      const dayLog = logs.find(l => l.date === isoStr);
      let totalMins = 0;
      if (dayLog) {
        totalMins = dayLog.entries.reduce((acc, curr) => acc + curr.minutes, 0);
      }
      
      const hrs = totalMins / 60;
      week.push({
        name: dayNames[i],
        key: isoStr,
        value: parseFloat(hrs.toFixed(1)),
        label: totalMins > 0 ? formatHoursAndMinutes(totalMins) : '',
        empty: totalMins === 0
      });
    }
    return week;
  };

  const weekDays = getWeekDates();

  const maxWeeklyHoursValue = 10; // Peak y-axis for percentage scaling

  // Formatted current date
  const getTodayFormatted = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return today.toLocaleDateString('en-US', options);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Topbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#1b1c19] flex items-center gap-2.5 font-display">
            Good evening, {profile?.fullName ? profile.fullName.split(' ')[0] : 'Student'} 👋
          </h1>
          <p className="text-[#83837c] text-[14px] mt-1">Consistency today, success tomorrow.</p>
        </div>
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <div className="relative w-9.5 h-9.5 border border-[#ece9e3] rounded-lg bg-white flex items-center justify-center hover:bg-[#e7eee6] hover:border-[#d7e3d5] transition-colors cursor-pointer">
            <Bell className="w-[17px] h-[17px] text-[#83837c]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#e0484b] border border-white" />
          </div>
          <div className="flex items-center gap-2 bg-white border border-[#ece9e3] rounded-lg px-3.5 py-2 text-[13.5px] font-semibold">
            <Calendar className="w-3.75 h-3.75 text-[#1b3b2a]" />
            <span>{getTodayFormatted()}</span>
          </div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Streak */}
        <div className="bg-[#fdf6e9] border border-[#f5e6c8] rounded-2xl p-4.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group">
          <div className="text-[12.5px] font-bold text-[#1b1c19] mb-3 flex items-center gap-2">
            <Flame className="w-3.75 h-3.75 text-[#e8871e] group-hover:scale-110 transition-transform" fill="#e8871e" />
            <span>Current Streak</span>
          </div>
          <div className="text-[26px] font-black text-[#1b1c19] leading-none">
            {streak} <span className="text-[14px] font-semibold text-[#83837c]">days</span> 🔥
          </div>
          <p className="text-[11.5px] text-[#83837c] mt-2">Keep it up! You're doing great.</p>
        </div>

        {/* Today Points */}
        <div className="bg-[#eff3ec] border border-[#dfe9dc] rounded-2xl p-4.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group">
          <div className="text-[12.5px] font-bold text-[#1b1c19] mb-3 flex items-center gap-2">
            <Star className="w-3.75 h-3.75 text-[#1f9d51] group-hover:scale-110 transition-transform" fill="#1f9d51" />
            <span>Today's Points</span>
          </div>
          <div className="text-[26px] font-black text-[#1b1c19] leading-none">
            {todayPoints} <span className="text-[14px] font-semibold text-[#83837c]">pts</span>
          </div>
          <p className="text-[11.5px] text-[#1f9d51] font-bold mt-2">↑ Logged study records</p>
        </div>

        {/* Weekly Progress */}
        <div className="bg-[#f1f1f8] border border-[#e4e4f1] rounded-2xl p-4.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
          <div className="text-[12.5px] font-bold text-[#1b1c19] mb-3 flex items-center gap-2">
            <Clock className="w-3.75 h-3.75 text-[#5b6bd6]" />
            <span>This Week Progress</span>
          </div>
          <div className="text-[26px] font-black text-[#1b1c19] leading-none">
            {weeklyHours} <span className="text-[14px] font-semibold text-[#83837c]">/ {targetWeeklyHours} hrs</span>
          </div>
          <div className="h-2 bg-[#eeece6] rounded-full mt-2.5 overflow-hidden">
            <div 
              className="h-full bg-[#1b3b2a] rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11.5px] text-[#83837c] mt-1.5">
            {targetWeeklyHours - weeklyHours > 0 
              ? `${(targetWeeklyHours - weeklyHours).toFixed(1)} hrs left to reach your goal` 
              : 'Target weekly hours completed! Excellent!'}
          </p>
        </div>

        {/* Academic Rank Progress Card */}
        {(() => {
          const points = profile?.points || 0;
          const rank = getRankInfo(points);
          return (
            <div className="bg-[#fcf8f0] border border-[#f3e5ce] rounded-2xl p-4.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 flex flex-col justify-between group">
              <div>
                <div className="text-[12.5px] font-bold text-[#1b1c19] mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-3.75 h-3.75 text-amber-600 group-hover:scale-110 transition-transform" />
                    <span>Prep Rank Tier</span>
                  </div>
                  {/* Division Stars Indicator */}
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: rank.maxStars }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < rank.stars 
                            ? 'text-amber-500 fill-amber-500' 
                            : 'text-gray-200'
                        }`}
                        strokeWidth={2.5}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 flex items-center justify-center shrink-0 relative overflow-hidden select-none">
                    {rank.img ? (
                      <TransparentBadgeImage src={rank.img} alt={rank.title} className="w-full h-full object-contain scale-[1.05]" />
                    ) : (
                      <span className="text-xl">{rank.icon}</span>
                    )}
                  </div>
                  <div>
                    <div className="text-[18px] font-black text-[#1b1c19] leading-tight">
                      {rank.title} {rank.division}
                    </div>
                    <div className="text-[11.5px] text-amber-900 font-bold uppercase tracking-wider mt-0.5">
                      ⭐ {points.toLocaleString()} PTS
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3.5">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                    style={{ width: `${rank.progressPct}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1.5">
                  <span className="text-[9.5px] font-extrabold uppercase text-gray-500">
                    Progress to next division
                  </span>
                  <span className="text-[10px] font-black text-amber-950 uppercase font-mono">
                    {rank.progressPct}%
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>


      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Subjects Card */}
        <div className="bg-white border border-[#ece9e3] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-[#1b1c19] flex items-center gap-2 font-display">
                Today's Sessions
              </h3>
              <button
                onClick={onOpenLogModal}
                className="bg-[#1b3b2a]/5 hover:bg-[#1b3b2a]/10 text-[#1b3b2a] font-extrabold text-[12px] px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Session</span>
              </button>
            </div>

            {/* List of today's logged study rows */}
            <div className="flex flex-col">
              {todayLog.entries.length === 0 ? (
                <div className="text-center py-10 text-[#83837c]">
                  <p className="text-[13.5px] font-semibold">No study sessions logged for today yet.</p>
                  <p className="text-[11.5px] mt-1">Click the "Log Session" button above to record your study block.</p>
                </div>
              ) : (
                todayLog.entries.map((entry, index) => {
                  const subData = subjects.find(s => s.name === entry.subject);
                  return (
                    <div 
                      key={index} 
                      className="flex items-center gap-3 py-3 border-b border-[#ece9e3] last:border-0 hover:bg-black/1 px-2 rounded-lg -mx-2 transition-colors duration-150"
                    >
                      <div className="w-[38px] h-[38px] rounded-lg bg-[#eaf1fb] flex items-center justify-center text-lg shrink-0 select-none">
                        {subData?.ic || '📚'}
                      </div>
                      <div>
                        <div className="font-extrabold text-[14px] text-[#1b1c19] flex items-center gap-1.5">
                          <span>{entry.subject}</span>
                          {todayLog.retroactive && (
                            <span className="bg-[#fdf2f2] text-[#b33a3d] border border-[#fbd3d0] font-bold text-[9px] px-1.5 py-0.5 rounded-full select-none">
                              ⏳ Pending Review
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#83837c]">Logged for {todayLog.date}</p>
                      </div>
                      <div className="flex items-center gap-3 text-[#83837c] text-[12.5px] ml-auto">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{entry.minutes} min</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>{entry.questionsSolved} Qs</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="w-3.5 h-3.5" />
                          <span>Focus {entry.focus}/5</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Secure Accountability Note */}
          <div className="mt-5 pt-4 border-t border-[#ece9e3]">
            <div className="p-3.5 bg-[#f2f4f2] border border-[#d2dbd2] rounded-xl shadow-sm">
              <h4 className="text-[12.5px] font-bold text-[#1b3b2a] flex items-center gap-1.5 mb-1.5 font-display">
                <ShieldCheck className="w-4 h-4 text-[#1b3b2a]" />
                Authorized Session Ledgers
              </h4>
              <p className="text-[11px] text-[#637568] leading-relaxed">
                All study blocks are saved as raw activity (time, questions, focus). Official points and leaderboard rankings are computed independently by the classroom's active scoring formula on the backend. Self-reported sessions are subject to retroactive teacher audits.
              </p>
            </div>
          </div>
        </div>

        {/* Weekly overview & Recent Activities */}
        <div className="flex flex-col gap-4">
          
          {/* Weekly Study Time Bar Chart */}
          <div className="bg-white border border-[#ece9e3] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[14px] font-bold text-[#1b1c19] flex items-center gap-2 font-display">
                This Week Overview
              </h3>
              <span className="text-[12px] text-[#83837c] font-semibold">{weeklyHours} of {targetWeeklyHours} hrs</span>
            </div>

            <div className="flex items-end gap-3.5 h-[150px] mt-4 px-1">
              {(() => {
                const maxVal = Math.max(...weekDays.map(d => d.value), 0);
                const peakDayName = maxVal > 0 ? weekDays.find(d => d.value === maxVal)?.name : null;

                return weekDays.map((day) => {
                  const heightPercentage = Math.min(100, Math.max(4, (day.value / maxWeeklyHoursValue) * 100));
                  const isPeak = peakDayName && day.name === peakDayName;
                  return (
                    <div key={day.name} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5">
                      {day.label && (
                        <div className="text-[10px] text-[#83837c] font-bold text-center whitespace-nowrap overflow-visible">
                          {day.label}
                        </div>
                      )}
                      <div 
                        className={`w-full max-w-[28px] rounded-t-md transition-all duration-500 ${
                          day.empty 
                            ? 'border-1.5 border-dashed border-[#cfd6cf] h-1.5 bg-transparent' 
                            : isPeak 
                              ? 'bg-[#1b3b2a] h-1' 
                              : 'bg-[#a9c4ac] h-1'
                        }`}
                        style={{ height: day.empty ? '4px' : `${heightPercentage}%` }}
                      />
                      <div className="text-[11px] text-[#83837c] font-semibold">{day.name}</div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Recent Study Activity List */}
          <div className="bg-white border border-[#ece9e3] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-[#1b1c19] flex items-center gap-2 font-display">
                Recent Activity
              </h3>
              <span className="text-[12px] text-[#83837c] font-bold">Auditable Ledger Logs</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {recentActivities.map((act) => {
                const subData = subjects.find(s => s.name === act.subject);

                return (
                  <div 
                    key={act.id} 
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/1.5 transition-colors duration-100 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#eaf1fb] flex items-center justify-center text-md shrink-0 select-none">
                      {subData?.ic || '📚'}
                    </div>
                    <div>
                      <div className="font-extrabold text-[13.5px] text-[#1b1c19]">
                        {act.subject} – {act.minutes} min
                      </div>
                      <p className="text-[11.5px] text-[#83837c]">
                        {act.questionsSolved} Qs · Focus {act.focus}/5 · {act.date}
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      {act.retroactive ? (
                        <div className="text-[9.5px] font-bold text-[#b33a3d] bg-[#fdf2f2] px-1.5 py-0.5 rounded border border-[#fbd3d0] inline-block">
                          ⏳ Pending Approval
                        </div>
                      ) : (
                        <div className="text-[11.5px] font-bold text-[#1f9d51] bg-[#eff3ec] px-2 py-0.5 rounded-lg border border-[#dce9dc]">
                          Logged
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
