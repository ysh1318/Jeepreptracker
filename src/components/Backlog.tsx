import React, { useState } from 'react';
import { 
  History, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Calendar, 
  AlertCircle, 
  TrendingUp, 
  Inbox,
  Award
} from 'lucide-react';
import { BacklogItem, SyllabusTopic } from '../types';

interface BacklogProps {
  backlogData: BacklogItem[];
  syllabusData: SyllabusTopic[];
  onToggleBacklog: (id: string) => void;
  onAddBacklog: (item: Omit<BacklogItem, 'id' | 'createdDate' | 'status' | 'points'>) => void;
  onDeleteBacklog: (id: string) => void;
}

export default function Backlog({ 
  backlogData, 
  syllabusData, 
  onToggleBacklog, 
  onAddBacklog, 
  onDeleteBacklog 
}: BacklogProps) {
  
  // Custom form states
  const [subject, setSubject] = useState<'physics' | 'chemistry' | 'mathematics'>('physics');
  const [topicName, setTopicName] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [targetDate, setTargetDate] = useState('2026-07-15');
  const [showAddForm, setShowAddForm] = useState(false);

  // Calculate stats
  const totalCount = backlogData.length;
  const activeCount = backlogData.filter(b => b.status !== 'cleared').length;
  const clearedCount = backlogData.filter(b => b.status === 'cleared').length;
  const clearanceRate = totalCount > 0 ? Math.round((clearedCount / totalCount) * 100) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicName.trim()) return;
    onAddBacklog({
      subject,
      topic: topicName.trim(),
      priority,
      targetDate
    });
    setTopicName('');
    setShowAddForm(false);
  };

  const getSubjectStyle = (sub: string) => {
    switch (sub) {
      case 'physics':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'chemistry':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-100';
    }
  };

  const getPriorityStyle = (prio: string) => {
    switch (prio) {
      case 'High':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-black text-[#1b1c19] font-display">Backlog Clearance Tracker</h2>
          <p className="text-[12.5px] text-[#83837c] font-semibold mt-0.5">Audit, schedule, and redeem points by clearing missed topics</p>
        </div>
        <button
          onClick={() => setShowAddForm(prev => !prev)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1b3b2a] hover:bg-[#204631] text-white font-extrabold text-[12.5px] rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Hide Form' : 'Register Custom Backlog'}</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#ece9e3] p-4.5 rounded-2xl shadow-sm">
          <span className="block text-[11px] font-bold text-[#83837c] uppercase tracking-wider">Identified Gaps</span>
          <span className="block text-[22px] font-black text-[#1b1c19] mt-1 font-display">{totalCount}</span>
        </div>
        <div className="bg-white border border-[#ece9e3] p-4.5 rounded-2xl shadow-sm">
          <span className="block text-[11px] font-bold text-[#83837c] uppercase tracking-wider">Active Backlogs</span>
          <span className="block text-[22px] font-black text-[#b33a3d] mt-1 font-display">{activeCount}</span>
        </div>
        <div className="bg-white border border-[#ece9e3] p-4.5 rounded-2xl shadow-sm">
          <span className="block text-[11px] font-bold text-[#83837c] uppercase tracking-wider">Cleared Backlogs</span>
          <span className="block text-[22px] font-black text-[#1f9d51] mt-1 font-display">{clearedCount}</span>
        </div>
        <div className="bg-white border border-[#ece9e3] p-4.5 rounded-2xl shadow-sm">
          <span className="block text-[11px] font-bold text-[#83837c] uppercase tracking-wider">Clearance Rate</span>
          <span className="block text-[22px] font-black text-indigo-600 mt-1 font-display">{clearanceRate}%</span>
        </div>
      </div>

      {/* Register Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-[#ece9e3] p-5 rounded-2xl shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-150">
          <h3 className="font-extrabold text-[#1b1c19] text-[14.5px] font-display">New Backlog Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-[#83837c] uppercase tracking-wider mb-1.5">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as any)}
                className="w-full bg-[#faf9f5] border border-[#ece9e3] rounded-xl px-3 py-2 text-[13px] font-bold text-gray-800 focus:outline-none focus:border-[#1b3b2a]"
              >
                <option value="physics">Physics</option>
                <option value="chemistry">Chemistry</option>
                <option value="mathematics">Mathematics</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[#83837c] uppercase tracking-wider mb-1.5">Topic / Chapter Name</label>
              <input
                type="text"
                placeholder="e.g. Volumetric titration analysis"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                className="w-full bg-[#faf9f5] border border-[#ece9e3] rounded-xl px-3.5 py-2 text-[13px] font-bold text-gray-800 focus:outline-none focus:border-[#1b3b2a]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#83837c] uppercase tracking-wider mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-[#faf9f5] border border-[#ece9e3] rounded-xl px-3 py-2 text-[13px] font-bold text-gray-800 focus:outline-none focus:border-[#1b3b2a]"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#83837c] uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" /> Target Clearance Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-white border border-[#ece9e3] rounded-lg px-2.5 py-1 text-xs font-bold text-[#1b1c19] ml-2 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1b3b2a] hover:bg-[#204631] text-white font-extrabold text-[12.5px] rounded-xl transition-colors cursor-pointer"
            >
              Add to Backlogs
            </button>
          </div>
        </form>
      )}


      {/* Backlog Items List */}
      <div className="bg-white border border-[#ece9e3] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#ece9e3] bg-[#faf9f5]">
          <h3 className="font-extrabold text-[#1b1c19] text-[15px] font-display">Active Backlog Register</h3>
        </div>

        {backlogData.length === 0 ? (
          <div className="p-10 text-center text-[#83837c] font-semibold space-y-2">
            <Inbox className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-[14px] font-extrabold">All clear! No pending backlogs.</p>
            <p className="text-[12px] text-gray-400">Keep syllabus goals aligned to prevent backlog accumulation.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#ece9e3]/60">
            {backlogData.map((item) => (
              <div 
                key={item.id} 
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 hover:bg-[#faf9f5]/50 transition-colors ${
                  item.status === 'cleared' ? 'bg-[#fafcf7]/60 opacity-70' : ''
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <button 
                    onClick={() => onToggleBacklog(item.id)}
                    className="mt-0.5 shrink-0 hover:scale-110 active:scale-95 transition-transform bg-transparent border-none p-0 cursor-pointer"
                  >
                    <CheckCircle 
                      className={`w-5.5 h-5.5 ${
                        item.status === 'cleared' 
                          ? 'text-[#1f9d51] fill-[#eafaf0]' 
                          : 'text-gray-300 hover:text-gray-400'
                      }`} 
                    />
                  </button>
                  <div className="truncate">
                    <h4 className={`text-[14px] font-extrabold text-gray-900 font-sans leading-snug ${
                      item.status === 'cleared' ? 'line-through text-gray-400' : ''
                    }`}>
                      {item.topic}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 text-[11px] text-[#83837c] font-semibold">
                      <span className={`px-2 py-0.5 rounded-md border text-[9.5px] font-black uppercase tracking-wider shrink-0 ${getSubjectStyle(item.subject)}`}>
                        {item.subject}
                      </span>
                      <span>•</span>
                      <span className={`px-2 py-0.5 rounded-md border text-[9.5px] font-black shrink-0 ${getPriorityStyle(item.priority)}`}>
                        {item.priority} Priority
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 shrink-0"><Calendar className="w-3.5 h-3.5 text-gray-400" /> Deadline: {item.targetDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 pl-9 sm:pl-0 shrink-0 justify-between sm:justify-end">
                  <span className="text-[12.5px] font-extrabold text-indigo-700 w-16 text-right">
                    {item.status === 'cleared' ? 'Cleared' : 'Pending'}
                  </span>
                  
                  {item.status !== 'cleared' && (
                    <button
                      onClick={() => onToggleBacklog(item.id)}
                      className="px-3.5 py-1.5 bg-[#eff3ec] hover:bg-[#e2edd8] text-[#1b3b2a] font-black text-[11.5px] border border-[#ece9e3] rounded-xl cursor-pointer"
                    >
                      Clear Backlog
                    </button>
                  )}

                  <button 
                    onClick={() => onDeleteBacklog(item.id)}
                    className="p-1.5 hover:bg-red-50 text-[#83837c] hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
