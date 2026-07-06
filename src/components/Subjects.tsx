import React, { useState } from 'react';
import { 
  Target, 
  Clock, 
  BarChart2, 
  Crown, 
  Plus, 
  Lightbulb,
  LayoutGrid,
  Edit2,
  Save,
  X
} from 'lucide-react';
import { SubjectTarget } from '../types';

interface SubjectsProps {
  subjects: SubjectTarget[];
  onUpdateSubjectTargets?: (updatedSubjects: SubjectTarget[]) => void;
  onOpenLogModal: () => void;
}

export default function Subjects({ subjects, onUpdateSubjectTargets, onOpenLogModal }: SubjectsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTargets, setTempTargets] = useState<{ [key: string]: number }>({});

  // Calculate total target and completed hours
  const totalTarget = subjects.reduce((acc, curr) => acc + curr.target, 0);
  const totalDone = parseFloat(subjects.reduce((acc, curr) => acc + curr.done, 0).toFixed(1));
  const overallPacePercent = Math.min(100, Math.round((totalDone / totalTarget) * 100));

  // Determine leading subject based on percentage target completed
  const getLeadingSubject = () => {
    let lead = subjects[0];
    let maxPct = 0;
    
    subjects.forEach(sub => {
      const pct = sub.done / sub.target;
      if (pct > maxPct) {
        maxPct = pct;
        lead = sub;
      }
    });

    return {
      ...lead,
      pctCompleted: Math.round(maxPct * 100)
    };
  };

  const leadingSubject = getLeadingSubject();

  // Helper to format hours display nicely (e.g. "7.5 hrs" -> "7h 30m")
  const formatHrs = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return mm ? `${hh}h ${mm}m` : `${hh}h`;
  };

  const handleStartEdit = () => {
    const initial: { [key: string]: number } = {};
    subjects.forEach(sub => {
      initial[sub.id] = sub.target;
    });
    setTempTargets(initial);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = () => {
    const updated = subjects.map(sub => {
      if (tempTargets[sub.id] !== undefined) {
        return {
          ...sub,
          target: Math.max(1, tempTargets[sub.id])
        };
      }
      return sub;
    });
    onUpdateSubjectTargets?.(updated);
    setIsEditing(false);
  };

  const handleTargetChange = (subId: string, value: number) => {
    setTempTargets(prev => ({
      ...prev,
      [subId]: value
    }));
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
      
      {/* Topbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#1b1c19] flex items-center gap-2.5 font-display">
            Subjects
          </h1>
          <p className="text-[#83837c] text-[14px] mt-1">
            Set weekly target hours per subject and track how you're pacing.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCancel}
                className="flex items-center gap-1.5 bg-[#f2f0ea] text-[#1b1c19] hover:bg-[#e6e4dc] px-4 py-2.5 rounded-xl font-bold text-[13px] transition-all cursor-pointer border-none"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center gap-1.5 bg-[#1b3b2a] text-white hover:bg-[#11291d] px-4 py-2.5 rounded-xl font-bold text-[13px] transition-all cursor-pointer shadow-sm border-none"
              >
                <Save className="w-4 h-4" />
                <span>Save Targets</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={handleStartEdit}
              className="flex items-center gap-1.5 bg-white border border-[#ece9e3] hover:bg-[#faf9f5] text-[#1b1c19] px-4 py-2.5 rounded-xl font-bold text-[13px] transition-all cursor-pointer shadow-sm"
            >
              <Edit2 className="w-4 h-4 text-[#1b3b2a]" />
              <span>Adjust Targets</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5.5">
        
        {/* Weekly Target */}
        <div className="bg-[#eff3ec] border border-[#dfe9dc] rounded-2xl p-4.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
          <div className="text-[12.5px] font-bold text-[#1b1c19] mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-[#1f9d51]" />
            <span>Weekly Target</span>
          </div>
          <div className="text-[26px] font-black text-[#1b1c19] leading-none">
            {formatHrs(totalTarget)}
          </div>
          <p className="text-[11.5px] text-[#83837c] mt-2">Across {subjects.length} subjects</p>
        </div>

        {/* Hours Logged */}
        <div className="bg-[#f1f1f8] border border-[#e4e4f1] rounded-2xl p-4.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
          <div className="text-[12.5px] font-bold text-[#1b1c19] mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#5b6bd6]" />
            <span>Hours Logged</span>
          </div>
          <div className="text-[26px] font-black text-[#1b1c19] leading-none">
            {formatHrs(totalDone)}
          </div>
          <p className="text-[11.5px] text-[#83837c] mt-2">
            {totalTarget - totalDone > 0 
              ? `${formatHrs(totalTarget - totalDone)} left this week` 
              : 'Target weekly hours completed!'}
          </p>
        </div>

        {/* Overall Pace */}
        <div className="bg-[#f4f1fa] border border-[#e8e4f5] rounded-2xl p-4.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
          <div className="text-[12.5px] font-bold text-[#1b1c19] mb-3 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#7c5cd6]" />
            <span>Overall Pace</span>
          </div>
          <div className="text-[26px] font-black text-[#1b1c19] leading-none">
            {overallPacePercent}%
          </div>
          <div className="h-1.75 bg-[#eeece6] rounded-full mt-2.5 overflow-hidden">
            <div 
              className="h-full bg-[#1b3b2a] rounded-full transition-all duration-300" 
              style={{ width: `${overallPacePercent}%` }}
            />
          </div>
        </div>

        {/* Leading Subject */}
        <div className="bg-[#fdf6e9] border border-[#f5e6c8] rounded-2xl p-4.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group">
          <div className="text-[12.5px] font-bold text-[#1b1c19] mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#e8871e] group-hover:scale-110 transition-transform" fill="#e8871e" />
            <span>Leading Subject</span>
          </div>
          <div className="text-[20px] font-black text-[#1b1c19] leading-none flex items-center gap-1.5">
            <span className="text-xl shrink-0 select-none">{leadingSubject.ic}</span>
            <span>{leadingSubject.name}</span>
          </div>
          <p className="text-[11.5px] text-[#83837c] mt-2">
            {leadingSubject.pctCompleted}% of target reached
          </p>
        </div>

      </div>

      {/* Main Subjects Card */}
      <div className="bg-white border border-[#ece9e3] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-[#ece9e3] pb-3">
          <h3 className="text-[14px] font-bold text-[#1b1c19] flex items-center gap-2 font-display">
            <LayoutGrid className="w-4.5 h-4.5 text-[#1b3b2a]" />
            Weekly Target Hours
          </h3>
        </div>

        <div className="flex flex-col">
          {subjects.map((sub) => {
            const pct = Math.min(100, Math.round((sub.done / sub.target) * 100));
            const remaining = Math.max(0, sub.target - sub.done);
            return (
              <div 
                key={sub.id} 
                className="flex flex-col sm:flex-row sm:items-center gap-4 py-4 border-b border-[#ece9e3] last:border-0 hover:bg-black/1 px-2.5 -mx-2.5 rounded-xl transition-colors duration-150"
              >
                <div className="w-[38px] h-[38px] rounded-lg flex items-center justify-center text-lg shrink-0 select-none" style={{ backgroundColor: sub.bg }}>
                  {sub.ic}
                </div>
                <div className="font-extrabold text-[14px] text-[#1b1c19] w-28 shrink-0">
                  {sub.name}
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <div className="h-1.75 bg-[#eeece6] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: `${pct}%`, backgroundColor: sub.barColor }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0 min-w-[150px] pl-10 sm:pl-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-[11px] font-semibold text-[#83837c]">Target:</span>
                      <input 
                        type="number" 
                        min="1" 
                        max="168"
                        required
                        value={tempTargets[sub.id] ?? sub.target}
                        onChange={(e) => handleTargetChange(sub.id, Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-16 bg-[#faf9f5] border border-[#ece9e3] rounded-lg px-2 py-1 text-[13px] font-bold text-center outline-none focus:border-[#1b3b2a]"
                      />
                      <span className="text-[11px] font-semibold text-[#83837c]">hrs</span>
                    </div>
                  ) : (
                    <>
                      <div className="font-black text-[13px] text-[#1b1c19] font-display">
                        {formatHrs(sub.done)} <span className="text-[11px] font-semibold text-[#83837c]">/ {formatHrs(sub.target)}</span>
                      </div>
                      <p className="text-[11.5px] text-[#83837c] mt-0.5">
                        {pct >= 100 ? 'Target reached 🎉' : `${formatHrs(remaining)} to go`}
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>


      </div>

      {/* Tip Card */}
      <div className="bg-[#fdf6e9] border border-[#f5e6c8] rounded-2xl p-4.5 shadow-sm flex gap-3.5 mt-4.5">
        <div className="w-8.5 h-8.5 bg-[#fbe4b0] rounded-lg flex items-center justify-center text-[#e8871e] shrink-0">
          <Lightbulb className="w-4.5 h-4.5" />
        </div>
        <div>
          <h4 className="text-[13px] font-extrabold text-[#1b1c19] font-display">Study Target Tip</h4>
          <p className="text-[12.5px] text-[#83837c] mt-1 leading-relaxed">
            Setting realistic weekly targets per subject helps balance strong and weak areas instead of over-focusing on your favorite topics. Regular self-assessment keeps your preparation balanced.
          </p>
        </div>
      </div>

    </div>
  );
}
