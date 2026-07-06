import React, { useState, useEffect } from 'react';
import { X, Clock, HelpCircle, CheckCircle, Flame, Calendar, Award, ShieldCheck } from 'lucide-react';
import { SubjectTarget, DailyLog } from '../types';

interface LogSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectTarget[];
  logs: DailyLog[]; // Crucial for anti-cheat checking of cumulative daily hours
  prefilledMinutes?: number | null; // Prefilled from the real-time study timer
  onLogSubmit: (log: {
    subject: string;
    minutes: number;
    questionsSolved: number;
    dppStatus: 'completed' | 'progress' | 'none';
    focus: number;
    date: string;
    retroactive: boolean;
  }) => void;
}

export default function LogSessionModal({ 
  isOpen, 
  onClose, 
  subjects, 
  logs, 
  prefilledMinutes, 
  onLogSubmit 
}: LogSessionModalProps) {
  const [subject, setSubject] = useState(subjects[0]?.name || 'Physics');
  const [questions, setQuestions] = useState(5);
  const [dppStatus, setDppStatus] = useState<'completed' | 'progress' | 'none'>('none');
  const [focus, setFocus] = useState(4);

  // Manual input state for study duration
  const [manualMinutes, setManualMinutes] = useState<number>(30);
  const [isRetroactive, setIsRetroactive] = useState<boolean>(false);
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Active date is calculated dynamically to keep logging live
  const liveDate = new Date().toISOString().split('T')[0];
  const minutes = prefilledMinutes !== null && prefilledMinutes !== undefined ? prefilledMinutes : manualMinutes;

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Suggest reasonable initial questions count based on minutes (e.g. 1 question per 5 minutes of study)
      const initialQuestions = Math.min(15, Math.max(1, Math.floor(minutes / 5)));
      setQuestions(initialQuestions);
      setDppStatus('none');
      setFocus(4);
      setIsRetroactive(false);
    }
  }, [isOpen, minutes]);

  if (!isOpen) return null;

  // Max daily cap check to prevent extreme sessions
  const MAX_DAILY_MINUTES = 960; // 16 hours
  
  // Anti-Cheat constraints
  // 1. Max questions capped at 1 question per 2 minutes studied (minimum 2 questions allowed for short sessions), absolute cap 45
  const maxQuestionsAllowed = Math.max(2, Math.floor(minutes / 2));
  const isQuestionsExceeded = questions > maxQuestionsAllowed;
  const validatedQuestions = isQuestionsExceeded ? maxQuestionsAllowed : questions;

  // 2. DPP Completed requires at least 30 minutes of study
  const isDppEligible = minutes >= 30;
  const activeDppStatus = (!isDppEligible && dppStatus === 'completed') ? 'progress' : dppStatus;

  // Calculate total minutes already logged for today
  const getExistingMinutesForToday = () => {
    const todayLog = logs.find(log => log.date === liveDate);
    if (!todayLog) return 0;
    return todayLog.entries.reduce((total, entry) => total + entry.minutes, 0);
  };

  const existingMinutes = getExistingMinutesForToday();
  const totalWithNewSession = existingMinutes + minutes;
  const isLimitExceeded = totalWithNewSession > MAX_DAILY_MINUTES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLimitExceeded || minutes <= 0) {
      return; // Safety guard
    }
    onLogSubmit({
      subject,
      minutes,
      questionsSolved: validatedQuestions,
      dppStatus: activeDppStatus,
      focus,
      date: (prefilledMinutes === null && isRetroactive) ? customDate : liveDate,
      retroactive: prefilledMinutes === null ? isRetroactive : false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-[#ece9e3] shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ece9e3] bg-[#f4f7f4]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#e7eee6] flex items-center justify-center text-[#1b3b2a]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-extrabold text-[#1b1c19] font-display">
                Verify &amp; Save Study Session
              </h2>
              <p className="text-[11px] text-[#555651] font-semibold mt-0.5">Stopwatch Integrity Protocol Active</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-[#e2e8e2] rounded-lg transition-colors text-[#83837c] cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4.5">
          
          {/* Double column info display for verified fields */}
          <div className="grid grid-cols-2 gap-3 bg-[#faf9f5] border border-[#ece9e3] p-3.5 rounded-xl">
            <div>
              <span className="block text-[11px] font-bold text-[#83837c] uppercase tracking-wider">Date of Session</span>
              {prefilledMinutes === null && isRetroactive ? (
                <input
                  type="date"
                  max={liveDate}
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full mt-1 bg-white border border-[#ece9e3] rounded-lg px-2 py-0.5 text-xs font-bold text-gray-700 outline-none"
                />
              ) : (
                <span className="font-extrabold text-[13px] text-[#1b1c19] flex items-center gap-1.5 mt-1 truncate">
                  <Calendar className="w-4 h-4 text-[#1b3b2a] shrink-0" />
                  {new Date(liveDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
            <div>
              <span className="block text-[11px] font-bold text-[#83837c] uppercase tracking-wider">
                {prefilledMinutes !== null ? "Verified Study Time" : "Enter Study Time"}
              </span>
              {prefilledMinutes !== null ? (
                <span className="font-black text-[14px] text-[#1b3b2a] flex items-center gap-1.5 mt-1">
                  <Clock className="w-4 h-4" />
                  {minutes} mins
                </span>
              ) : (
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="number"
                    min={1}
                    max={960}
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 bg-white border border-[#ece9e3] rounded px-2.5 py-1 text-[13px] font-bold text-[#1b3b2a] focus:outline-none focus:border-[#1b3b2a]"
                  />
                  <span className="text-[12.5px] font-bold text-gray-500">mins</span>
                </div>
              )}
            </div>
          </div>

          {/* Retroactive Toggle for manual logs */}
          {prefilledMinutes === null && (
            <div className="flex items-center gap-2.5 p-3.5 bg-amber-50 border border-amber-100 rounded-xl">
              <input
                type="checkbox"
                id="retroactive-toggle"
                checked={isRetroactive}
                onChange={(e) => setIsRetroactive(e.target.checked)}
                className="rounded border-amber-300 text-amber-700 focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="retroactive-toggle" className="text-[12px] font-bold text-amber-900 cursor-pointer select-none leading-none">
                Submit as Retroactive / Manual Entry (Needs review)
              </label>
            </div>
          )}

          {/* Subject Dropdown */}
          <div>
            <label className="block text-[12.5px] font-bold text-[#1b1c19] mb-1.5">
              Subject
            </label>
            <div className="grid grid-cols-3 gap-2">
              {subjects.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSubject(sub.name)}
                  className={`p-2.5 rounded-xl border text-[13px] font-bold text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    subject === sub.name
                      ? 'border-[#1b3b2a] bg-[#e7eee6] text-[#1b3b2a] ring-2 ring-[#1b3b2a]/10'
                      : 'border-[#ece9e3] bg-white text-[#83837c] hover:bg-[#faf9f5]'
                  }`}
                >
                  <span className="text-base">{sub.ic}</span>
                  <span>{sub.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Questions Solved */}
          <div>
            <div className="flex justify-between items-baseline mb-1.5">
              <label className="text-[12.5px] font-bold text-[#1b1c19] flex items-center gap-1">
                <HelpCircle className="w-4 h-4 text-[#83837c]" />
                Questions Solved During Session
              </label>
              <span className="text-[11px] text-[#83837c] font-semibold">Max: {maxQuestionsAllowed} Qs</span>
            </div>
            <input 
              type="number"
              min={0}
              max={150}
              value={questions}
              onChange={(e) => setQuestions(Math.max(0, parseInt(e.target.value) || 0))}
              className={`w-full p-2.5 rounded-xl border text-[14px] focus:outline-none ${
                isQuestionsExceeded 
                  ? 'border-[#b33a3d] focus:border-[#b33a3d] focus:ring-1 focus:ring-[#b33a3d]' 
                  : 'border-[#ece9e3] focus:border-[#1b3b2a] focus:ring-1 focus:ring-[#1b3b2a]'
              }`}
              required
            />
            {isQuestionsExceeded && (
              <p className="mt-1.5 text-[11px] text-[#b33a3d] font-semibold bg-[#fdf2f2] px-2.5 py-1.5 rounded-lg border border-[#fbd3d0] leading-normal">
                ⚠️ <strong>Capped:</strong> Solved questions are validated at at most 1 question per 2 minutes studied ({maxQuestionsAllowed} Qs) to maintain leaderboard integrity.
              </p>
            )}
          </div>

          {/* DPP Status */}
          <div>
            <div className="flex justify-between items-baseline mb-1.5">
              <label className="text-[12.5px] font-bold text-[#1b1c19] flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-[#83837c]" />
                DPP (Daily Practice Problem) Status
              </label>
              {!isDppEligible && (
                <span className="text-[10px] text-[#b33a3d] font-bold">Requires ≥30m study</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['none', 'progress', 'completed'] as const).map((status) => {
                const isDisabled = status === 'completed' && !isDppEligible;
                const isSelected = activeDppStatus === status;
                return (
                  <button
                    key={status}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setDppStatus(status)}
                    className={`p-2 rounded-xl border text-[12px] font-bold text-center capitalize transition-all cursor-pointer ${
                      isDisabled 
                        ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                        : isSelected
                          ? 'border-[#1b3b2a] bg-[#e7eee6] text-[#1b3b2a]'
                          : 'border-[#ece9e3] bg-white text-[#83837c] hover:bg-[#faf9f5]'
                    }`}
                  >
                    {status === 'none' ? 'No DPP' : status === 'progress' ? 'In Progress' : 'Completed'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Focus Rating */}
          <div>
            <label className="block text-[12.5px] font-bold text-[#1b1c19] mb-1.5 flex items-center gap-1">
              <Flame className="w-4 h-4 text-[#83837c]" />
              Focus Rating ({focus}/5)
            </label>
            <div className="flex gap-2 justify-between">
              {[1, 2, 3, 4, 5].map((stars) => (
                <button
                  key={stars}
                  type="button"
                  onClick={() => setFocus(stars)}
                  className={`w-9 h-9 rounded-xl border font-bold text-[13.5px] flex items-center justify-center transition-all cursor-pointer ${
                    focus === stars
                      ? 'border-[#1b3b2a] bg-[#e7eee6] text-[#1b3b2a]'
                      : 'border-[#ece9e3] bg-white text-[#83837c] hover:bg-[#faf9f5]'
                  }`}
                >
                  {stars}
                </button>
              ))}
            </div>
          </div>

          {/* Daily limit check */}
          {isLimitExceeded && (
            <div className="p-3 bg-[#fdf2f2] rounded-xl border border-[#fbd3d0] text-[#b33a3d] text-[11.5px] leading-relaxed">
              <div className="font-extrabold flex items-center gap-1.5">
                <span>🚫 Daily Limit Breached</span>
              </div>
              <p className="mt-1">
                You cannot study more than 16 hours (960 mins) per day. You already logged{' '}
                <strong>{Math.floor(existingMinutes / 60)}h {existingMinutes % 60}m</strong>. Adding this session would exceed the limit.
              </p>
            </div>
          )}

          {/* Action button */}
          <button
            type="submit"
            disabled={isLimitExceeded || minutes <= 0}
            className={`w-full py-2.5 px-4 text-white font-extrabold text-[13.5px] rounded-xl transition-all shadow-md ${
              isLimitExceeded || minutes <= 0
                ? 'bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-[#1b3b2a] hover:bg-[#204631] hover:shadow-lg active:translate-y-0.5 cursor-pointer'
            }`}
          >
            {isLimitExceeded ? 'Daily Study Limit Exceeded' : minutes <= 0 ? 'Invalid Stopwatch Duration' : 'Confirm & Save Logs'}
          </button>
        </form>
      </div>
    </div>
  );
}
