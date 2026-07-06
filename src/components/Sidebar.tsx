import React from 'react';
import { 
  Home, 
  Trophy, 
  BarChart2, 
  BookOpen, 
  Target, 
  LayoutGrid, 
  Flame, 
  LogOut, 
  Settings, 
  ChevronRight,
  FileText,
  Users,
  User,
  PlusCircle,
  History,
  ClipboardList,
  BookMarked
} from 'lucide-react';

import { getRankInfo } from '../lib/ranks';
import { playSound } from '../lib/audio';
import { TransparentBadgeImage } from '../lib/transparentBadge';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  streakDays: number;
  profile?: { fullName: string, rollNumber: string, role?: string } | null;
  onOpenSettings?: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose, streakDays, profile, onOpenSettings }: SidebarProps) {
  const isDarkTheme = activeTab === 'analytics' || activeTab === 'teacher-analytics';
  const role = profile?.role || 'student';

  const getNavItems = () => {
    if (role === 'teacher') {
      return [
        { id: 'teacher-dashboard', label: 'Dashboard', icon: Home },
        { id: 'teacher-students', label: 'Students', icon: Users },
        { id: 'teacher-reports', label: 'Reports', icon: FileText },
        { id: 'teacher-leaderboards', label: 'Leaderboards', icon: Trophy },
        { id: 'teacher-analytics', label: 'Analytics', icon: BarChart2 },
        { id: 'teacher-scoring', label: 'Scoring Formula', icon: Settings },
      ];
    } else if (role === 'admin') {
      return [
        { id: 'admin-dashboard', label: 'Platform Dashboard', icon: Home },
        { id: 'admin-classes', label: 'Classes', icon: LayoutGrid },
        { id: 'admin-teachers', label: 'Teachers', icon: User },
        { id: 'admin-onboarding', label: 'Onboarding', icon: PlusCircle },
      ];
    } else {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
        { id: 'analytics', label: 'Analytics', icon: BarChart2 },
        { id: 'syllabus', label: 'Syllabus Tracker', icon: BookMarked },
        { id: 'mock-tests', label: 'Mock Tests', icon: ClipboardList },
        { id: 'backlog-tracker', label: 'Backlog Tracker', icon: History },
        { id: 'goals', label: 'Goals', icon: Target },
        { id: 'subjects', label: 'Subjects', icon: LayoutGrid },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/45 z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed inset-y-0 left-0 w-[248px] z-50 flex flex-col p-5 border-r transition-all duration-300 lg:sticky lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isDarkTheme 
            ? 'bg-[#0d1210] border-white/8 text-[#f4f4ef]' 
            : 'bg-[#f7f6f3] border-[#ece9e3] text-[#1b1c19]'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-1 pb-6 pt-1">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg select-none transition-colors ${
            isDarkTheme ? 'bg-[#d8ef58] text-[#0d1210]' : 'bg-[#1b3b2a] text-white'
          }`}>
            J
          </div>
          <div>
            <div className="font-extrabold text-[15.5px] leading-tight font-display font-black tracking-tight">JEE Tracker</div>
            <div className={`text-[12px] flex flex-col items-start gap-1 ${isDarkTheme ? 'text-[#8b958e]' : 'text-[#83837c]'}`}>
              <span>Keep building.</span>
              {profile && profile.role === 'student' && (() => {
                const rank = getRankInfo((profile as any).points || 0);
                return (
                  <div className="flex items-center gap-1.5 mt-0.5 select-none scale-[0.95] origin-left">
                    {rank.img ? (
                      <TransparentBadgeImage src={rank.img} alt={rank.title} className="w-4.5 h-4.5 object-contain" />
                    ) : (
                      <span className="text-[10px]">{rank.icon}</span>
                    )}
                    <span className={`text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.25 rounded border ${rank.text}`}>
                      {rank.title} {rank.division}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-0.5 mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`group flex items-center gap-3 py-2.5 px-3 rounded-lg text-[14.5px] font-semibold text-left transition-all duration-150 relative ${
                  isActive
                    ? isDarkTheme
                      ? 'bg-[#d8ef58]/14 text-[#d8ef58] font-bold'
                      : 'bg-[#e7eee6] text-[#1b3b2a] font-bold'
                    : isDarkTheme
                      ? 'text-[#7c847d] hover:bg-white/5 hover:text-[#f4f4ef]'
                      : 'text-[#83837c] hover:bg-black/3 hover:text-[#1b1c19]'
                }`}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span>{item.label}</span>
                {isActive && (
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-4.5 rounded-r ${
                    isDarkTheme ? 'bg-[#d8ef58]' : 'bg-[#1b3b2a]'
                  }`} />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* Dynamic Widgets & Bottom Actions */}
        <div className="flex flex-col gap-2.5">
          {/* Streak Widget - dynamically shown on Goals screen or always to reinforce consistency */}
          {activeTab === 'goals' && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#fdf6e9] border border-[#f5e6c8]">
              <div className="w-8.5 h-8.5 rounded-lg bg-[#fbe4b0] flex items-center justify-center">
                <Flame className="w-[17px] h-[17px] text-[#e8871e]" fill="#e8871e" />
              </div>
              <div>
                <div className="text-[16px] font-black text-[#1b1c19] leading-tight">
                  {streakDays}
                  <span className="text-[12px] font-semibold text-[#83837c]"> Day Streak</span>
                </div>
              </div>
            </div>
          )}

          {/* Settings Button */}
          <div className="flex flex-col gap-2">
            <button 
              onClick={onOpenSettings}
              className={`w-full py-2.5 px-3 rounded-lg border text-[13.5px] font-bold text-left flex items-center gap-2.5 cursor-pointer transition-all-custom ${
              isDarkTheme
                ? 'bg-[#121a17] border-white/8 text-[#f4f4ef] hover:bg-white/5 hover:border-white/18'
                : 'bg-white border-[#ece9e3] text-[#1b1c19] hover:bg-[#f7f6f3] hover:border-[#d7d4cb]'
            }`}>
              <Settings className="w-4 h-4 shrink-0" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
