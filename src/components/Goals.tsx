import React, { useState } from 'react';
import { 
  Target, 
  Plus, 
  Bell, 
  Filter, 
  CheckCircle, 
  Clock, 
  MoreVertical, 
  Lightbulb, 
  ChevronRight, 
  Calendar,
  Trash2,
  PlusCircle,
  MinusCircle,
  X,
  Check
} from 'lucide-react';
import { Goal } from '../types';

interface GoalsProps {
  goalsData: Goal[];
  onUpdateGoals?: (updatedGoals: Goal[]) => void;
  onOpenLogModal: () => void;
}

export default function Goals({ goalsData, onUpdateGoals, onOpenLogModal }: GoalsProps) {
  const [activeGoalTab, setActiveGoalTab] = useState<'active' | 'completed' | 'all'>('active');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state for creating a new goal
  const [newTitle, setNewTitle] = useState('');
  const [newSub, setNewSub] = useState('');
  const [newTot, setNewTot] = useState(10);
  const [newPrio, setNewPrio] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newIcon, setNewIcon] = useState('🎯');
  const [newDate, setNewDate] = useState('31 Dec 2026');

  // Dynamic calculations for stats
  const totalGoals = goalsData.length;
  const completedGoals = goalsData.filter(g => g.completed).length;
  const activeGoalsCount = goalsData.filter(g => !g.completed).length;
  const inProgressGoals = goalsData.filter(g => !g.completed && g.cur > 0).length;
  const notStartedGoals = goalsData.filter(g => !g.completed && g.cur === 0).length;
  const overallPct = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  // Filter goals list based on active tab
  const getFilteredGoals = () => {
    if (activeGoalTab === 'active') return goalsData.filter(g => !g.completed);
    if (activeGoalTab === 'completed') return goalsData.filter(g => g.completed);
    return goalsData;
  };

  const filteredGoals = getFilteredGoals();

  // Handle Toggling whole Goal completion
  const handleToggleGoal = (goalId: string) => {
    const updated = goalsData.map(g => {
      if (g.id === goalId) {
        const nextCompleted = !g.completed;
        const nextCur = nextCompleted ? g.tot : 0;
        return {
          ...g,
          cur: nextCur,
          pct: nextCompleted ? 100 : 0,
          completed: nextCompleted
        };
      }
      return g;
    });
    onUpdateGoals?.(updated);
  };

  // Handle Incrementing progress
  const handleAdjustProgress = (goalId: string, delta: number) => {
    const updated = goalsData.map(g => {
      if (g.id === goalId) {
        const nextCur = Math.min(g.tot, Math.max(0, g.cur + delta));
        const pct = Math.min(100, Math.round((nextCur / g.tot) * 100));
        return {
          ...g,
          cur: nextCur,
          pct,
          completed: pct >= 100
        };
      }
      return g;
    });
    onUpdateGoals?.(updated);
  };

  // Handle Deleting goal
  const handleDeleteGoal = (goalId: string) => {
    const updated = goalsData.filter(g => g.id !== goalId);
    onUpdateGoals?.(updated);
  };

  // Handle Adding new goal
  const handleAddGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const colors = ['#1f9d51', '#5b6bd6', '#e8871e', '#e0484b', '#7c5cd6', '#12b886'];
    const backgrounds = ['#eff3ec', '#f1f1f8', '#fdf6e9', '#fdeceb', '#f4f1fa', '#e6fcf5'];
    const randomIdx = Math.floor(Math.random() * colors.length);

    const newGoal: Goal = {
      id: `goal-custom-${Date.now()}`,
      icon: newIcon || '🎯',
      bg: backgrounds[randomIdx],
      color: colors[randomIdx],
      title: newTitle,
      sub: newSub || 'Self-defined study milestone',
      cur: 0,
      tot: Math.max(1, newTot),
      pct: 0,
      prio: newPrio,
      date: newDate,
      left: 'Custom Goal',
      completed: false
    };

    onUpdateGoals?.([...goalsData, newGoal]);
    
    // Reset form & close
    setNewTitle('');
    setNewSub('');
    setNewTot(10);
    setNewPrio('Medium');
    setNewIcon('🎯');
    setNewDate('31 Dec 2026');
    setShowAddModal(false);
  };

  // SVG progression ring helpers
  const renderGoalDonut = (size = 64, stroke = 8, pct = 61, text = '61%') => {
    const r = (size - stroke) / 2;
    const circumference = 2 * Math.PI * r;
    const strokeLength = (pct / 100) * circumference;
    
    return (
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          {/* Track */}
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eeece6" strokeWidth={stroke} />
          {/* Fill */}
          <circle 
            cx={size / 2} 
            cy={size / 2} 
            r={r} 
            fill="none" 
            stroke="#1b3b2a" 
            strokeWidth={stroke}
            strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[13.5px] font-black font-display text-[#1b1c19]">
          {text}
        </div>
      </div>
    );
  };

  const renderSideDonut = () => {
    const size = 130;
    const stroke = 15;
    const r = (size - stroke) / 2;
    const circumference = 2 * Math.PI * r;
    
    const completedPctPart = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
    const inProgressPctPart = totalGoals > 0 ? Math.round((inProgressGoals / totalGoals) * 100) : 0;
    const notStartedPctPart = totalGoals > 0 ? Math.round((notStartedGoals / totalGoals) * 100) : 0;

    const segments = [
      { pct: completedPctPart, color: '#1f9d51' },
      { pct: inProgressPctPart, color: '#5b6bd6' },
      { pct: notStartedPctPart, color: '#e8871e' }
    ].filter(s => s.pct > 0);

    let offset = 0;
    return (
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          {segments.map((s, idx) => {
            const strokeLength = (s.pct / 100) * circumference;
            const strokeOffset = -offset;
            offset += strokeLength;
            return (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
                strokeDashoffset={strokeOffset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="transition-all duration-300"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[20px] font-black text-[#1b1c19] leading-tight">{totalGoals}</div>
          <div className="text-[10px] text-[#83837c] font-bold">Total Goals</div>
        </div>
      </div>
    );
  };

  const deadlines = [
    { name: 'Complete Physics Syllabus', date: '30 Nov 2025', left: '197 days left', ic: '📘' },
    { name: 'Solve 5000 Questions', date: '31 Dec 2025', left: '228 days left', ic: '❓' },
    { name: 'Give 30 Mock Tests', date: '15 Jan 2026', left: '243 days left', ic: '📅' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
      
      {/* Topbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#1b1c19] flex items-center gap-2.5 font-display">
            Goals
          </h1>
          <p className="text-[#83837c] text-[14px] mt-1">
            Track what matters. Consistency today, success tomorrow.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-[#1b3b2a] text-white hover:bg-[#11291d] px-4 py-2.5 rounded-xl font-bold text-[13.5px] transition-all cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Create Goal</span>
          </button>
          <div className="relative w-9.5 h-9.5 border border-[#ece9e3] rounded-lg bg-white flex items-center justify-center hover:bg-[#e7eee6] transition-colors cursor-pointer">
            <Bell className="w-[17px] h-[17px] text-[#83837c]" />
            <span className="absolute -top-1 -right-1 bg-[#e0484b] text-white font-bold text-[10px] rounded-full w-4.5 h-4.5 flex items-center justify-center border-2 border-[#faf9f5]">
              3
            </span>
          </div>
        </div>
      </div>

      {/* Mini Stats and Overall progress Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-5.5">
        <div className="bg-white border border-[#ece9e3] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm hover:shadow-md transition-all">
          <div className="w-9.5 h-9.5 rounded-lg bg-[#eff3ec] flex items-center justify-center shrink-0">
            <Target className="w-4.5 h-4.5 text-[#1f9d51]" />
          </div>
          <div>
            <div className="text-[20px] font-black text-[#1b1c19] leading-tight">{activeGoalsCount}</div>
            <div className="text-[12px] text-[#83837c] font-semibold">Active Goals</div>
          </div>
        </div>

        <div className="bg-white border border-[#ece9e3] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm hover:shadow-md transition-all">
          <div className="w-9.5 h-9.5 rounded-lg bg-[#e4f3e6] flex items-center justify-center shrink-0 text-[#1f9d51]">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[20px] font-black text-[#1b1c19] leading-tight">{completedGoals}</div>
            <div className="text-[12px] text-[#83837c] font-semibold">Completed</div>
          </div>
        </div>

        <div className="bg-white border border-[#ece9e3] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm hover:shadow-md transition-all">
          <div className="w-9.5 h-9.5 rounded-lg bg-[#fdf0dc] flex items-center justify-center shrink-0">
            <Clock className="w-4.5 h-4.5 text-[#c2820f]" />
          </div>
          <div>
            <div className="text-[20px] font-black text-[#1b1c19] leading-tight">{inProgressGoals}</div>
            <div className="text-[12px] text-[#83837c] font-semibold">In Progress</div>
          </div>
        </div>

        <div className="bg-white border border-[#ece9e3] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm hover:shadow-md transition-all">
          <div className="w-9.5 h-9.5 rounded-lg bg-[#fdeceb] flex items-center justify-center shrink-0 text-[#c14d3f]">
            <Target className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-[20px] font-black text-[#1b1c19] leading-tight">{notStartedGoals}</div>
            <div className="text-[12px] text-[#83837c] font-semibold">Not Started</div>
          </div>
        </div>

        <div className="bg-white border border-[#ece9e3] rounded-2xl p-4.5 flex items-center gap-3.5 col-span-2 md:col-span-1 shadow-sm hover:shadow-md transition-all">
          {renderGoalDonut(64, 8, overallPct, `${overallPct}%`)}
          <div className="min-w-0">
            <div className="text-[15px] font-black text-[#1b1c19] leading-tight">{overallPct}%</div>
            <p className="text-[11px] text-[#83837c] font-medium leading-relaxed mt-0.5">Overall Progress<br/>{completedGoals} of {totalGoals} completed</p>
          </div>
        </div>
      </div>

      {/* Tabs list bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4.5">
        <div className="flex gap-1.5 bg-[#f2f0ea] p-1.5 rounded-xl w-fit">
          <button
            onClick={() => setActiveGoalTab('active')}
            className={`py-2 px-4.5 rounded-lg text-[13.5px] font-extrabold transition-all border-none ${
              activeGoalTab === 'active'
                ? 'bg-[#1b3b2a] text-white shadow-sm'
                : 'text-[#83837c] hover:text-[#1b1c19] hover:bg-black/4'
            }`}
          >
            Active Goals ({activeGoalsCount})
          </button>
          <button
            onClick={() => setActiveGoalTab('completed')}
            className={`py-2 px-4.5 rounded-lg text-[13.5px] font-extrabold transition-all border-none ${
              activeGoalTab === 'completed'
                ? 'bg-[#1b3b2a] text-white shadow-sm'
                : 'text-[#83837c] hover:text-[#1b1c19] hover:bg-black/4'
            }`}
          >
            Completed ({completedGoals})
          </button>
          <button
            onClick={() => setActiveGoalTab('all')}
            className={`py-2 px-4.5 rounded-lg text-[13.5px] font-extrabold transition-all border-none ${
              activeGoalTab === 'all'
                ? 'bg-[#1b3b2a] text-white shadow-sm'
                : 'text-[#83837c] hover:text-[#1b1c19] hover:bg-black/4'
            }`}
          >
            All Goals ({totalGoals})
          </button>
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#ece9e3] rounded-lg px-3.5 py-2 text-[13.5px] font-semibold cursor-pointer hover:border-[#d7d4cb]">
          <Filter className="w-3.75 h-3.75 text-[#83837c]" />
          <span>Sort: Priority</span>
        </div>
      </div>

      {/* Two Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4.5">
        {/* Goals Checklist */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {filteredGoals.map((goal) => {
            const isHigh = goal.prio === 'High';
            const isMedium = goal.prio === 'Medium';
            return (
              <div 
                key={goal.id} 
                className="bg-white border border-[#ece9e3] rounded-2xl p-4 sm:px-4.5 sm:py-4 hover:border-[#d7d4cb] hover:shadow-md transition-all duration-150"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Toggle Completion Checkbox */}
                    <button 
                      onClick={() => handleToggleGoal(goal.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                        goal.completed 
                          ? 'bg-[#1f9d51] border-[#1f9d51] text-white' 
                          : 'border-[#cfd6cf] hover:border-[#1b3b2a] bg-white'
                      }`}
                      title={goal.completed ? "Mark incomplete" : "Mark complete"}
                    >
                      {goal.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="w-[38px] h-[38px] rounded-lg flex items-center justify-center text-lg shrink-0 select-none" style={{ backgroundColor: goal.bg }}>
                      {goal.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-extrabold text-[14.5px] font-display truncate transition-all ${
                        goal.completed ? 'line-through text-[#83837c]' : 'text-[#1b1c19]'
                      }`}>{goal.title}</h4>
                      <p className="text-[12px] text-[#83837c] truncate mt-0.5">{goal.sub}</p>
                    </div>
                  </div>

                  {/* Right side controls: adjust values and delete */}
                  <div className="flex items-center gap-2.5 self-end sm:self-auto pl-9 sm:pl-0">
                    <div className="flex items-center gap-1 bg-[#f2f0ea] px-2 py-1 rounded-lg">
                      <button 
                        onClick={() => handleAdjustProgress(goal.id, -1)}
                        className="p-0.5 text-[#83837c] hover:text-[#1b1c19] hover:bg-black/4 rounded transition-colors"
                        disabled={goal.completed}
                        title="Decrease Progress"
                      >
                        <MinusCircle className="w-4 h-4" />
                      </button>
                      <span className="text-[13.5px] font-black text-[#1b1c19] min-w-[36px] text-center font-display">
                        {goal.cur} <span className="text-[10px] font-semibold text-[#83837c]">/ {goal.tot}</span>
                      </span>
                      <button 
                        onClick={() => handleAdjustProgress(goal.id, 1)}
                        className="p-0.5 text-[#83837c] hover:text-[#1b1c19] hover:bg-black/4 rounded transition-colors"
                        disabled={goal.completed}
                        title="Increase Progress"
                      >
                        <PlusCircle className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-[13.5px] font-black w-10 text-right font-display" style={{ color: goal.color }}>
                      {goal.pct}%
                    </div>

                    <span className={`text-[11px] font-bold px-2.5 py-0.75 rounded-full select-none ml-1 hidden sm:inline-block ${
                      isHigh 
                        ? 'bg-[#fdeceb] text-[#c14d3f]' 
                        : isMedium 
                          ? 'bg-[#fdf3e2] text-[#b3821f]' 
                          : 'bg-[#eef1fd] text-[#5768c9]'
                    }`}>
                      {goal.prio}
                    </span>

                    <button 
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1.5 text-[#83837c] hover:text-[#e0484b] hover:bg-[#fdeceb] rounded-lg transition-colors cursor-pointer ml-1"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="h-1.75 bg-[#eeece6] rounded-full mt-3 overflow-hidden ml-9">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ width: `${goal.pct}%`, backgroundColor: goal.completed ? '#1f9d51' : goal.color }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2.5 text-[12px] text-[#83837c] ml-9">
                  <span>Target Date: {goal.date}</span>
                  <span>{goal.left}</span>
                </div>
              </div>
            );
          })}

          {filteredGoals.length === 0 && (
            <div className="bg-white border border-dashed border-[#ece9e3] rounded-2xl p-10 text-center flex flex-col items-center justify-center text-[#83837c]">
              <Target className="w-10 h-10 text-[#d4cfc5] mb-2.5" />
              <p className="font-extrabold text-[15px] text-[#1b1c19]">No goals in this tab</p>
              <p className="text-[12.5px] mt-1">Get started by creating a new custom goal!</p>
            </div>
          )}
        </div>

        {/* Sidebar Info Panels */}
        <div className="flex flex-col gap-4">
          
          {/* Progress Breakdown */}
          <div className="bg-white border border-[#ece9e3] rounded-2xl p-5 shadow-sm flex flex-col items-center">
            <h3 className="text-[14px] font-bold text-[#1b1c19] w-full text-left font-display">
              Goal Progress Overview
            </h3>
            <div className="my-5.5 flex justify-center">
              {renderSideDonut()}
            </div>
            <div className="w-full flex flex-col gap-1.5 mt-1">
              <div className="flex items-center justify-between text-[12.5px]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#1f9d51]" />
                  <span className="font-semibold text-[#1b1c19]">Completed</span>
                </div>
                <span className="text-[#83837c] font-bold">{completedGoals} ({totalGoals > 0 ? Math.round(completedGoals / totalGoals * 100) : 0}%)</span>
              </div>
              <div className="flex items-center justify-between text-[12.5px]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#5b6bd6]" />
                  <span className="font-semibold text-[#1b1c19]">In Progress</span>
                </div>
                <span className="text-[#83837c] font-bold">{inProgressGoals} ({totalGoals > 0 ? Math.round(inProgressGoals / totalGoals * 100) : 0}%)</span>
              </div>
              <div className="flex items-center justify-between text-[12.5px]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm bg-[#e8871e]" />
                  <span className="font-semibold text-[#1b1c19]">Not Started</span>
                </div>
                <span className="text-[#83837c] font-bold">{notStartedGoals} ({totalGoals > 0 ? Math.round(notStartedGoals / totalGoals * 100) : 0}%)</span>
              </div>
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white border border-[#ece9e3] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-[#1b1c19] font-display">
                Upcoming Deadlines
              </h3>
              <span className="text-[13px] text-[#1b3b2a] font-extrabold cursor-pointer hover:underline">
                View All
              </span>
            </div>
            <div className="flex flex-col">
              {deadlines.map((dl, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-3 py-2.5 border-b border-[#ece9e3] last:border-0 hover:bg-black/1 px-1 rounded-lg -mx-1 transition-colors duration-100"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#eff3ec] flex items-center justify-center text-md shrink-0 select-none">
                    {dl.ic}
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-[13.5px] text-[#1b1c19] truncate">{dl.name}</div>
                    <div className="text-[11.5px] text-[#83837c] mt-0.5">{dl.date}</div>
                  </div>
                  <div className="ml-auto text-[12px] font-black text-[#1f9d51] whitespace-nowrap">
                    {dl.left}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Goals Tip */}
          <div className="bg-[#fdf6e9] border border-[#f5e6c8] rounded-2xl p-4.5 shadow-sm flex gap-3">
            <div className="w-8.5 h-8.5 bg-[#fbe4b0] rounded-lg flex items-center justify-center text-[#e8871e] shrink-0">
              <Lightbulb className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-[13.5px] font-extrabold text-[#1b1c19] font-display">Study Tips</h4>
              <p className="text-[12.5px] text-[#83837c] mt-1 leading-relaxed">
                Break big goals into small daily tasks. Small steps every single day build momentum and lead to giant leaps of success.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* CREATE GOAL MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#ece9e3] rounded-3xl w-full max-w-[450px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5.5 py-4 border-b border-[#ece9e3]">
              <h3 className="text-[16px] font-black text-[#1b1c19] flex items-center gap-2 font-display">
                <Target className="w-4.5 h-4.5 text-[#1b3b2a]" />
                Create Custom Goal
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 text-[#83837c] hover:text-[#1b1c19] hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleAddGoalSubmit} className="p-5.5 flex flex-col gap-4">
              {/* Goal Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-extrabold text-[#1b1c19] uppercase tracking-wide">Goal Title *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Solve 100 Electrostatics PYQs"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#faf9f5] border border-[#ece9e3] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#1b3b2a] transition-all"
                />
              </div>

              {/* Subtitle / Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-extrabold text-[#1b1c19] uppercase tracking-wide">Subtitle / Desc</label>
                <input 
                  type="text" 
                  placeholder="e.g. Focus on JEE Advanced questions"
                  value={newSub}
                  onChange={(e) => setNewSub(e.target.value)}
                  className="w-full bg-[#faf9f5] border border-[#ece9e3] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#1b3b2a] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {/* Target Value */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-extrabold text-[#1b1c19] uppercase tracking-wide">Target Count</label>
                  <input 
                    type="number" 
                    min="1"
                    required
                    value={newTot}
                    onChange={(e) => setNewTot(parseInt(e.target.value) || 1)}
                    className="w-full bg-[#faf9f5] border border-[#ece9e3] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#1b3b2a] transition-all font-display font-bold"
                  />
                </div>

                {/* Priority Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-extrabold text-[#1b1c19] uppercase tracking-wide">Priority</label>
                  <select 
                    value={newPrio}
                    onChange={(e) => setNewPrio(e.target.value as any)}
                    className="w-full bg-[#faf9f5] border border-[#ece9e3] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#1b3b2a] transition-all font-semibold"
                  >
                    <option value="High">🔴 High</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Low">🔵 Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {/* Emoji Icon */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-extrabold text-[#1b1c19] uppercase tracking-wide">Emoji Icon</label>
                  <select 
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                    className="w-full bg-[#faf9f5] border border-[#ece9e3] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#1b3b2a] transition-all text-lg"
                  >
                    <option value="🎯">🎯 Target</option>
                    <option value="🧪">🧪 Chemistry</option>
                    <option value="📘">📘 Physics</option>
                    <option value="📐">📐 Math</option>
                    <option value="❓">❓ Practice</option>
                    <option value="🏆">🏆 Contest</option>
                    <option value="📅">📅 Schedule</option>
                  </select>
                </div>

                {/* Deadline */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-extrabold text-[#1b1c19] uppercase tracking-wide">Deadline Date</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 15 Aug 2026"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-[#faf9f5] border border-[#ece9e3] rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-[#1b3b2a] transition-all"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 mt-2">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border border-[#ece9e3] bg-white text-[#83837c] hover:bg-[#faf9f5] rounded-xl font-bold text-[13.5px] cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-[#1b3b2a] text-white hover:bg-[#11291d] rounded-xl font-bold text-[13.5px] cursor-pointer transition-colors shadow-sm"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
