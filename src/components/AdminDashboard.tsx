import React, { useState, useEffect } from "react";
import {
  Home, LayoutGrid, User, Search, Filter, Calendar,
  MoreVertical, ArrowRight, ArrowLeft, Users, FileText, LineChart,
  CheckCircle2, XCircle, LogOut, GraduationCap, Info, PlusCircle,
  UserPlus, Database, ArrowUpRight, Plus, HelpCircle
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Admin routes per doc §5.1 — platform health, no student drill-down */
/*  /admin              → Platform Dashboard (Active Teachers,         */
/*                         Capacity, Weekly Activity / churn signal)   */
/*  /admin/classes       → Classes Overview (support drill into a      */
/*                         class, never a student)                     */
/*  /admin/teachers      → Teachers list + lifecycle (§5.2)            */
/*  /admin/onboarding    → Create classes + configure                  */
/*  /admin/class-detail  → Class specifics, storage, teacher assignment */
/* ------------------------------------------------------------------ */

interface AdminDashboardProps {
  page?: string;
  onPageChange?: (page: string) => void;
  classes?: any[];
  setClasses?: React.Dispatch<React.SetStateAction<any[]>>;
  teachers?: any[];
  setTeachers?: React.Dispatch<React.SetStateAction<any[]>>;
  selectedClassId?: string | null;
  setSelectedClassId?: (id: string | null) => void;
  teacherRequests?: any[];
  onApproveTeacherRequest?: (request: any) => Promise<void>;
  onRejectTeacherRequest?: (requestId: string) => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Small shared bits                                                  */
/* ------------------------------------------------------------------ */

interface StatusProps {
  status: string;
}

function StatusPill({ status }: StatusProps) {
  const map: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    Suspended: "bg-red-50 text-red-600 border border-red-100",
    Lapsed: "bg-amber-50 text-amber-700 border border-amber-100",
  };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${map[status] || "bg-gray-100 text-gray-500"}`}>{status}</span>;
}

function StatusDot({ status }: StatusProps) {
  const map: Record<string, string> = { 
    Active: "bg-emerald-500 text-emerald-700", 
    Lapsed: "bg-amber-500 text-amber-700", 
    Suspended: "bg-red-500 text-red-600" 
  };
  const [dot, text] = (map[status] || "bg-gray-400 text-gray-500").split(" ");
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} /> {status}
    </span>
  );
}

interface ParticipationProps {
  pct: number;
}

function ParticipationText({ pct }: ParticipationProps) {
  const color = pct === 0 ? "text-red-500" : pct < 40 ? "text-orange-500" : "text-[#1b3b2a]";
  return <span className={`font-extrabold ${color}`}>{pct}%</span>;
}

interface UtilizationProps {
  used: number;
  limit: number;
}

function UtilizationBar({ used, limit }: UtilizationProps) {
  const pct = Math.round((used / limit) * 100);
  const barColor = pct >= 90 ? "bg-orange-400" : "bg-[#1b3b2a]";
  const textColor = pct >= 90 ? "text-orange-600 font-extrabold" : "text-gray-700 font-semibold";
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 sm:w-32 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs ${textColor}`}>{pct}%</span>
      {pct >= 90 && <span className="bg-orange-50 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-100">Near Limit</span>}
    </div>
  );
}

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-display">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <span className="flex items-center gap-2 bg-white border border-[#ece9e3] rounded-xl px-3 py-2 text-xs sm:text-sm self-start shadow-sm select-none">
        <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
        <span className="font-semibold text-gray-800">
          {currentTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <span className="text-gray-300">|</span>
        <span className="font-bold text-[#1b3b2a] font-mono tracking-wider">
          {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Platform Dashboard                                                */
/* ------------------------------------------------------------------ */

interface PlatformDashboardProps {
  onNavigate: (page: string) => void;
  teachers: any[];
  classes: any[];
}

function PlatformDashboardPage({ onNavigate, teachers, classes }: PlatformDashboardProps) {
  const calculateTotalStorage = () => {
    let totalGb = 0;
    classes.forEach(c => {
      const gbVal = parseInt(c.storage) || 0;
      totalGb += gbVal;
    });
    return `${totalGb} GB`;
  };

  const getDynamicWeeklyActivity = () => {
    if (classes.length === 0) return [];
    return classes.map(c => {
      const activeCount = Math.round(c.students * ((c.participation || 0) / 100)) || 0;
      return {
        class: c.name,
        teacher: c.teacher || "Unassigned",
        generated: (c.reports || 0) > 0,
        active: activeCount,
        total: c.students || 0,
        pct: c.participation || 0
      };
    });
  };

  return (
    <div className="space-y-6">
      <AdminHeader title="Platform Dashboard" subtitle="A quick overview of the platform's health." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-[#ece9e3] p-5 rounded-2xl shadow-sm text-left flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase">Total Classes</div>
            <div className="text-3xl font-black text-[#1b3b2a] mt-1">{classes.length}</div>
            <div className="text-xs text-gray-500 mt-1">Configured batches</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
            <LayoutGrid className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-[#ece9e3] p-5 rounded-2xl shadow-sm text-left flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase">Registered Teachers</div>
            <div className="text-3xl font-black text-[#1b3b2a] mt-1">{teachers.length}</div>
            <div className="text-xs text-emerald-600 mt-1 font-semibold">Active instruction profiles</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <User className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-[#ece9e3] p-5 rounded-2xl shadow-sm text-left flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase">Total Student Storage</div>
            <div className="text-3xl font-black text-[#1b3b2a] mt-1">{calculateTotalStorage()}</div>
            <div className="text-xs text-indigo-600 mt-1 font-semibold">Allocated across platform</div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Database className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Active Teachers */}
        <div className="bg-white rounded-2xl border border-[#ece9e3] shadow-sm overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-gray-900 flex items-center gap-2"><Users className="h-4 w-4 text-[#1b3b2a]" /> Active Teachers</h3>
            <button 
              onClick={() => onNavigate("teachers")}
              className="text-sm text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-800"
            >
              View all teachers <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/25">
                  <th className="py-3 pl-5 font-bold">Teacher Name</th>
                  <th className="py-3 px-2 font-bold">Status</th>
                  <th className="py-3 px-2 font-bold">Classes</th>
                  <th className="py-3 px-2 font-bold">Students</th>
                  <th className="py-3 px-2 font-bold">Joined On</th>
                  <th className="py-3 pr-5 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {teachers.slice(0, 4).map((t, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/30">
                    <td className="py-3.5 pl-5">
                      <p className="font-bold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.email}</p>
                    </td>
                    <td className="py-3.5 px-2"><StatusDot status={t.status} /></td>
                    <td className="py-3.5 px-2 text-gray-700 font-semibold">{t.classes}</td>
                    <td className="py-3.5 px-2 text-gray-700 font-semibold">{t.students}</td>
                    <td className="py-3.5 px-2 text-gray-700 font-medium">{t.joined || "—"}</td>
                    <td className="py-3.5 pr-5 text-right"><MoreVertical className="h-4 w-4 text-gray-400 inline" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Capacity */}
        <div className="bg-white rounded-2xl border border-[#ece9e3] shadow-sm overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-gray-900 flex items-center gap-2"><Users className="h-4 w-4 text-[#1b3b2a]" /> Capacity <span className="text-gray-400 font-semibold text-xs ml-1">(Students / Limit)</span></h3>
            <button 
              onClick={() => onNavigate("teachers")}
              className="text-sm text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-800"
            >
              View all capacity <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/25">
                  <th className="py-3 pl-5 font-bold">Teacher</th>
                  <th className="py-3 px-2 font-bold">Classes</th>
                  <th className="py-3 px-2 font-bold">Students / Limit</th>
                  <th className="py-3 pr-5 font-bold">Utilization</th>
                </tr>
              </thead>
              <tbody>
                {teachers.slice(0, 4).map((t, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/30">
                    <td className="py-3.5 pl-5 font-bold text-gray-900">{t.name}</td>
                    <td className="py-3.5 px-2 text-gray-700 font-semibold">{t.classes}</td>
                    <td className="py-3.5 px-2 text-gray-700 font-bold">{t.students} / {t.limit}</td>
                    <td className="py-3.5 pr-5"><UtilizationBar used={t.students} limit={t.limit} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="bg-white rounded-2xl border border-[#ece9e3] shadow-sm overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-gray-900 flex items-center gap-2"><LineChart className="h-4 w-4 text-[#1b3b2a]" /> Weekly Activity <span className="text-gray-400 font-semibold text-xs ml-1">(This Week)</span></h3>
            <button 
              onClick={() => onNavigate("classes")}
              className="text-sm text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-800"
            >
              View all classes <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/25">
                  <th className="py-3 pl-5 font-bold">Class</th>
                  <th className="py-3 px-2 font-bold">Teacher</th>
                  <th className="py-3 px-2 font-bold">Report Generated</th>
                  <th className="py-3 px-2 font-bold">Participation</th>
                  <th className="py-3 pr-5 font-bold">Quiet Class</th>
                </tr>
              </thead>
              <tbody>
                {getDynamicWeeklyActivity().length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500 font-semibold text-xs">
                      No classrooms found. Create a class first.
                    </td>
                  </tr>
                ) : (
                  getDynamicWeeklyActivity().map((w, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/30">
                      <td className="py-3.5 pl-5 font-bold text-gray-900">{w.class}</td>
                      <td className="py-3.5 px-2 text-gray-700 font-semibold">{w.teacher}</td>
                      <td className="py-3.5 px-2">
                        {w.generated ? (
                          <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold"><CheckCircle2 className="h-4 w-4" /> Yes</span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-red-500 text-sm font-bold"><XCircle className="h-4 w-4" /> No</span>
                        )}
                      </td>
                      <td className="py-3.5 px-2">
                        <span className={w.pct === 0 ? "text-red-500 font-bold" : w.pct < 40 ? "text-orange-500 font-bold" : "text-gray-700 font-bold"}>
                          {w.active} / {w.total} ({w.pct}%)
                        </span>
                      </td>
                      <td className="py-3.5 pr-5">
                        {w.pct < 40 ? (
                          <span className="bg-red-50 text-red-500 text-[11px] font-bold px-2.5 py-1 rounded-full border border-red-100">Quiet Class</span>
                        ) : (
                          <span className="text-gray-300 font-medium">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 pt-2">© 2026 JEE Tracker. All rights reserved.</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Classes Page                                                      */
/* ------------------------------------------------------------------ */

interface ClassCardProps {
  key?: any;
  c: any;
  onNavigate: (page: string) => void;
  setSelectedClassId: (id: string) => void;
}

function ClassCard({ c, onNavigate, setSelectedClassId }: ClassCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#ece9e3] p-5 flex flex-col hover:shadow-md transition-all text-left">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`h-11 w-11 rounded-full ${c.color || "bg-indigo-100 text-indigo-700"} flex items-center justify-center font-bold text-sm`}>
            {c.initials || c.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-900 leading-tight">{c.name}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">{c.teacher || "Unassigned"}</p>
          </div>
        </div>
        <MoreVertical className="h-4 w-4 text-gray-400 mt-1" />
      </div>
      <div className="mb-4 flex items-center gap-2">
        <StatusPill status={c.status || "Active"} />
        <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-bold">{c.storage || "15 GB"}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 pb-4 mb-3 border-b border-gray-100">
        <div>
          <Users className="h-3.5 w-3.5 text-indigo-500 mb-1" />
          <p className="font-extrabold text-gray-900 text-sm">{c.students || 0}</p>
          <p className="text-[10px] text-gray-500 font-semibold">Students</p>
        </div>
        <div>
          <FileText className="h-3.5 w-3.5 text-blue-500 mb-1" />
          <p className="font-extrabold text-gray-900 text-sm">{c.reports || 0}</p>
          <p className="text-[10px] text-gray-500 font-semibold">Reports</p>
        </div>
        <div>
          <LineChart className="h-3.5 w-3.5 text-orange-500 mb-1" />
          <ParticipationText pct={c.participation || 0} />
          <p className="text-[10px] text-gray-500 font-semibold">Participation</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-auto">
        <p className="text-[11px] text-gray-400 font-medium">Created: {c.createdDate || "—"}</p>
        <button 
          onClick={() => {
            setSelectedClassId(c.id);
            onNavigate("class-detail");
          }}
          className="text-sm text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-800 self-start mt-2 cursor-pointer"
        >
          View Details <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

interface ClassesPageProps {
  onNavigate: (page: string) => void;
  classes: any[];
  setSelectedClassId: (id: string) => void;
}

function ClassesPage({ onNavigate, classes, setSelectedClassId }: ClassesPageProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filtered = classes.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.teacher && c.teacher.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "All" || (c.status || "Active") === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Classes Overview</h1>
          <p className="text-sm text-gray-500 mt-1">All classes across the platform.</p>
        </div>
        <button 
          onClick={() => onNavigate("onboarding")}
          className="flex items-center gap-2 bg-[#1b3b2a] hover:bg-[#132c1e] text-white rounded-xl px-4 py-2.5 text-sm font-bold self-start shadow-sm transition-all cursor-pointer"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          <span>Create New Class</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white border border-[#ece9e3] rounded-xl px-3 py-2 flex-1 max-w-md shadow-sm">
          <Search className="h-4 w-4 text-gray-400" />
          <input 
            className="bg-transparent text-sm outline-none w-full font-semibold text-gray-800" 
            placeholder="Search classes by name or teacher..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(v => !v)}
            className="flex items-center justify-center gap-1.5 border border-[#ece9e3] bg-white rounded-xl px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50"
          >
            <Filter className="h-3.5 w-3.5" /> Filter{statusFilter !== "All" ? `: ${statusFilter}` : ""}
          </button>
          {showFilterMenu && (
            <div className="absolute right-0 mt-1 bg-white border border-[#ece9e3] rounded-xl shadow-md z-10 overflow-hidden w-40">
              {["All", "Active", "Suspended", "Lapsed"].map(opt => (
                <button
                  key={opt}
                  onClick={() => { setStatusFilter(opt); setShowFilterMenu(false); }}
                  className={`block w-full text-left px-3.5 py-2 text-sm font-semibold hover:bg-gray-50 ${statusFilter === opt ? 'text-[#1b3b2a] bg-[#eff3ec]' : 'text-gray-700'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {filtered.map((c, i) => (
          <ClassCard key={c.id || i} c={c} onNavigate={onNavigate} setSelectedClassId={setSelectedClassId} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-10 text-center text-gray-500 font-semibold bg-white rounded-2xl border border-[#ece9e3]">
            No classes found matching "{search}"
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500 gap-4 mt-6">
        <span className="font-semibold">Showing {filtered.length} of {classes.length} classes</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Teachers Page                                                     */
/* ------------------------------------------------------------------ */

interface TeachersPageProps {
  onNavigate: (page: string) => void;
  teachers: any[];
  setTeachers: React.Dispatch<React.SetStateAction<any[]>>;
  pendingRequests?: any[];
  onApproveRequest?: (request: any) => Promise<void>;
  onRejectRequest?: (requestId: string) => Promise<void>;
}

function TeachersPage({ 
  onNavigate, 
  teachers, 
  setTeachers, 
  pendingRequests = [], 
  onApproveRequest, 
  onRejectRequest 
}: TeachersPageProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const handleApprove = async (request: any) => {
    if (!onApproveRequest) return;
    setDecidingId(request.id);
    try {
      await onApproveRequest(request);
    } finally {
      setDecidingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!onRejectRequest) return;
    setDecidingId(requestId);
    try {
      await onRejectRequest(requestId);
    } finally {
      setDecidingId(null);
    }
  };

  const toggleStatus = (index: number) => {
    const updated = [...teachers];
    const current = updated[index];
    if (current.status === "Suspended") {
      current.status = "Active";
    } else {
      current.status = "Suspended";
    }
    setTeachers(updated);
  };

  const filtered = teachers.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <AdminHeader title="Teachers" subtitle="Manage teacher accounts, capacity, and lifecycle status." />

      {pendingRequests.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 mb-6 space-y-3">
          <h3 className="font-extrabold text-amber-900 text-[14.5px] flex items-center gap-1.5">
            <UserPlus className="h-4.5 w-4.5" /> Pending Teacher Access Requests ({pendingRequests.length})
          </h3>
          <div className="space-y-2.5">
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-amber-100 rounded-xl p-3.5">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{req.name}</p>
                  <p className="text-xs text-gray-500">{req.email}</p>
                  {req.className && (
                    <p className="text-[11px] text-[#1b3b2a] font-bold mt-0.5">Requested class: {req.className}</p>
                  )}
                  {req.instituteName && (
                    <p className="text-[11px] text-gray-400 font-semibold mt-0.5">{req.instituteName}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={decidingId === req.id}
                    onClick={() => handleReject(req.id)}
                    className="border border-red-200 text-red-600 rounded-xl px-3.5 py-1.5 text-xs font-bold hover:bg-red-50 cursor-pointer disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button
                    disabled={decidingId === req.id}
                    onClick={() => handleApprove(req)}
                    className="bg-[#1b3b2a] hover:bg-[#132c1e] text-white rounded-xl px-3.5 py-1.5 text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white border border-[#ece9e3] rounded-xl px-3 py-2 flex-1 max-w-md shadow-sm">
          <Search className="h-4 w-4 text-gray-400" />
          <input 
            className="bg-transparent text-sm outline-none w-full font-semibold text-gray-800" 
            placeholder="Search teachers by name or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(v => !v)}
            className="flex items-center justify-center gap-1.5 border border-[#ece9e3] bg-white rounded-xl px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50"
          >
            <Filter className="h-3.5 w-3.5" /> Filter{statusFilter !== "All" ? `: ${statusFilter}` : ""}
          </button>
          {showFilterMenu && (
            <div className="absolute right-0 mt-1 bg-white border border-[#ece9e3] rounded-xl shadow-md z-10 overflow-hidden w-40">
              {["All", "Active", "Suspended", "Lapsed"].map(opt => (
                <button
                  key={opt}
                  onClick={() => { setStatusFilter(opt); setShowFilterMenu(false); }}
                  className={`block w-full text-left px-3.5 py-2 text-sm font-semibold hover:bg-gray-50 ${statusFilter === opt ? 'text-[#1b3b2a] bg-[#eff3ec]' : 'text-gray-700'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#ece9e3] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50/20">
                <th className="py-3 pl-5 font-bold">Teacher Name</th>
                <th className="py-3 px-2 font-bold">Status</th>
                <th className="py-3 px-2 font-bold">Classes</th>
                <th className="py-3 px-2 font-bold">Students / Limit</th>
                <th className="py-3 px-2 font-bold">Joined On</th>
                <th className="py-3 pr-5 font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/30">
                  <td className="py-4 pl-5">
                    <p className="font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.email}</p>
                  </td>
                  <td className="py-4 px-2"><StatusDot status={t.status} /></td>
                  <td className="py-4 px-2 text-gray-700 font-semibold">{t.classes}</td>
                  <td className="py-4 px-2 text-gray-700 font-bold">{t.students} / {t.limit}</td>
                  <td className="py-4 px-2 text-gray-700 font-medium">{t.joined || "—"}</td>
                  <td className="py-4 pr-5">
                    {t.status === "Suspended" ? (
                      <button 
                        onClick={() => toggleStatus(teachers.indexOf(t))}
                        className="border border-emerald-200 text-emerald-600 rounded-xl px-3 py-1.5 text-xs font-bold hover:bg-emerald-50 cursor-pointer"
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button 
                        onClick={() => toggleStatus(teachers.indexOf(t))}
                        className="border border-red-200 text-red-500 rounded-xl px-3 py-1.5 text-xs font-bold hover:bg-red-50 cursor-pointer"
                      >
                        Suspend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 font-semibold">
                    No teachers found matching "{search}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 text-xs text-gray-500 border-t border-gray-100 flex items-center gap-1.5 bg-gray-50/40">
          <Info className="h-4 w-4 text-gray-400" /> Data for lapsed/suspended teachers is preserved indefinitely — only Admin can delete it, and it's never automatic.
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Onboarding Page — Create Class                                    */
/* ------------------------------------------------------------------ */

interface OnboardingPageProps {
  onNavigate: (page: string) => void;
  classes: any[];
  setClasses: React.Dispatch<React.SetStateAction<any[]>>;
  teachers: any[];
  setTeachers: React.Dispatch<React.SetStateAction<any[]>>;
}

function OnboardingPage({ onNavigate, classes, setClasses, teachers, setTeachers }: OnboardingPageProps) {
  const [className, setClassName] = useState("");
  const [storage, setStorage] = useState("15 GB");
  const [creationDate, setCreationDate] = useState("2026-07-02");
  
  // Teacher configuration during class onboarding
  const [teacherOption, setTeacherOption] = useState<"existing" | "new" | "later">("existing");
  const [selectedTeacherName, setSelectedTeacherName] = useState(teachers[0]?.name || "");
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherLimit, setNewTeacherLimit] = useState("40");

  // Initial student
  const [initialStudents, setInitialStudents] = useState<{ name: string; email: string }[]>([
    { name: "", email: "" }
  ]);

  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAddStudentField = () => {
    setInitialStudents([...initialStudents, { name: "", email: "" }]);
  };

  const handleStudentFieldChange = (index: number, field: "name" | "email", value: string) => {
    const updated = [...initialStudents];
    updated[index][field] = value;
    setInitialStudents(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) {
      setFeedback("Please enter a class name.");
      return;
    }

    let finalTeacherName = "Unassigned";

    // Class id needs to exist before we touch any teacher doc, since both the
    // "existing" and "new" teacher paths below need to stamp it onto the
    // teacher record (this is the same field the request/approval flow sets
    // via handleApproveTeacherRequest in App.tsx — a teacher doc without it
    // doesn't get treated as assigned to the class anywhere else in the app).
    const newClassId = (classes.length + 1).toString();

    if (teacherOption === "existing") {
      finalTeacherName = selectedTeacherName;
      // Increment teacher's classes count and assign this class to them
      setTeachers(prev => prev.map(t => {
        if (t.name === selectedTeacherName) {
          return { ...t, classes: t.classes + 1, classId: newClassId };
        }
        return t;
      }));
    } else if (teacherOption === "new") {
      if (!newTeacherName.trim() || !newTeacherEmail.trim()) {
        setFeedback("Please fill out all new teacher details.");
        return;
      }
      finalTeacherName = newTeacherName;
      // Register new teacher
      const newTeacherObj = {
        name: newTeacherName,
        email: newTeacherEmail,
        status: "Active",
        classes: 1,
        classId: newClassId,
        students: initialStudents.filter(s => s.name && s.email).length,
        limit: parseInt(newTeacherLimit) || 40,
        joined: new Date(creationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      };
      setTeachers(prev => [...prev, newTeacherObj]);
    }

    // Format students list
    const validStudents = initialStudents.filter(s => s.name.trim() && s.email.trim()).map(s => ({
      name: s.name,
      email: s.email,
      points: 0
    }));

    // Generate initials
    const initials = className.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "CL";
    
    // Pick color
    const colors = [
      "bg-purple-100 text-purple-700",
      "bg-blue-100 text-blue-700",
      "bg-emerald-100 text-emerald-700",
      "bg-orange-100 text-orange-700",
      "bg-amber-100 text-amber-700",
      "bg-pink-100 text-pink-700",
      "bg-violet-100 text-violet-700"
    ];
    const pickedColor = colors[classes.length % colors.length];

    const newClassObj = {
      id: newClassId,
      name: className,
      teacher: finalTeacherName,
      initials,
      color: pickedColor,
      status: "Active",
      students: validStudents.length,
      reports: 0,
      participation: 0,
      lastReport: "—",
      storage,
      createdDate: new Date(creationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      studentList: validStudents
    };

    setClasses(prev => [...prev, newClassObj]);
    setFeedback("Class created successfully! Redirecting...");
    setTimeout(() => {
      onNavigate("classes");
    }, 1500);
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center gap-3 mb-2">
        <button 
          onClick={() => onNavigate("classes")}
          className="p-1.5 hover:bg-gray-100 rounded-lg border border-[#ece9e3] bg-white text-gray-500 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-[#1b1c19] tracking-tight font-display">Onboard New Class</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure a new batch, allocate storage, and onboard the teacher profile.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section A: Class config */}
          <div className="bg-white border border-[#ece9e3] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-[#1b3b2a]" /> Class Basic Details
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase">Class Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Reso Jaipur JEE 2026"
                  className="w-full bg-white border border-[#ece9e3] rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-[#1b3b2a]"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase">Storage Allocation</label>
                <select 
                  className="w-full bg-white border border-[#ece9e3] rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-[#1b3b2a]"
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                >
                  <option value="5 GB">5 GB — Trial Plan</option>
                  <option value="15 GB">15 GB — Standard Plan</option>
                  <option value="30 GB">30 GB — Premium Batch Plan</option>
                  <option value="50 GB">50 GB — Elite Institutional Plan</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase">Creation Date</label>
                <input 
                  type="date"
                  className="w-full bg-white border border-[#ece9e3] rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-[#1b3b2a]"
                  value={creationDate}
                  onChange={(e) => setCreationDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section B: Teacher onboarding */}
          <div className="bg-white border border-[#ece9e3] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#1b3b2a]" /> Teacher Onboarding & Assignment
            </h3>

            <div className="flex gap-4 p-1 bg-gray-100 rounded-xl max-w-md">
              <button 
                type="button"
                onClick={() => setTeacherOption("existing")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg cursor-pointer ${teacherOption === "existing" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500"}`}
              >
                Existing Teacher
              </button>
              <button 
                type="button"
                onClick={() => setTeacherOption("new")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg cursor-pointer ${teacherOption === "new" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500"}`}
              >
                Onboard New Teacher
              </button>
              <button 
                type="button"
                onClick={() => setTeacherOption("later")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg cursor-pointer ${teacherOption === "later" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500"}`}
              >
                Assign Later
              </button>
            </div>

            {teacherOption === "existing" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase">Select Active Teacher</label>
                <select 
                  className="w-full bg-white border border-[#ece9e3] rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-[#1b3b2a]"
                  value={selectedTeacherName}
                  onChange={(e) => setSelectedTeacherName(e.target.value)}
                >
                  {teachers.map((t, idx) => (
                    <option key={idx} value={t.name}>{t.name} ({t.email})</option>
                  ))}
                </select>
              </div>
            )}

            {teacherOption === "new" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase">Full Name</label>
                  <input 
                    type="text"
                    placeholder="e.g. Prof. Anand Kumar"
                    className="w-full bg-white border border-[#ece9e3] rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-[#1b3b2a]"
                    value={newTeacherName}
                    onChange={(e) => setNewTeacherName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase">Email Address</label>
                  <input 
                    type="email"
                    placeholder="anand@super30.com"
                    className="w-full bg-white border border-[#ece9e3] rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-[#1b3b2a]"
                    value={newTeacherEmail}
                    onChange={(e) => setNewTeacherEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase">Student Capacity Limit</label>
                  <input 
                    type="number"
                    className="w-full bg-white border border-[#ece9e3] rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-[#1b3b2a]"
                    value={newTeacherLimit}
                    onChange={(e) => setNewTeacherLimit(e.target.value)}
                  />
                </div>
              </div>
            )}

            {teacherOption === "later" && (
              <p className="text-xs text-gray-500 font-medium">This class will be initialized without an assigned teacher. You can easily onboard or assign a teacher later from the class detail screen.</p>
            )}
          </div>

          {/* Section C: Initial Students roster */}
          <div className="bg-white border border-[#ece9e3] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-[#1b3b2a]" /> Initial Student Enrollment <span className="text-xs text-gray-400 font-semibold">(Optional)</span>
              </h3>
              <button 
                type="button"
                onClick={handleAddStudentField}
                className="text-xs font-bold bg-[#1b3b2a] hover:bg-[#152e21] text-white px-2.5 py-1 rounded-lg cursor-pointer"
              >
                + Add Student
              </button>
            </div>

            <div className="space-y-3">
              {initialStudents.map((student, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Student #{idx + 1} Name</label>
                    <input 
                      type="text"
                      placeholder="Full Name"
                      className="w-full bg-white border border-[#ece9e3] rounded-xl px-3.5 py-2 text-xs font-semibold outline-none"
                      value={student.name}
                      onChange={(e) => handleStudentFieldChange(idx, "name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase">Student #{idx + 1} Email</label>
                    <input 
                      type="email"
                      placeholder="student@example.com"
                      className="w-full bg-white border border-[#ece9e3] rounded-xl px-3.5 py-2 text-xs font-semibold outline-none"
                      value={student.email}
                      onChange={(e) => handleStudentFieldChange(idx, "email", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Info/Submit Card */}
        <div className="space-y-6">
          <div className="bg-[#faf9f5] border border-[#ece9e3] p-5 rounded-2xl space-y-4">
            <h4 className="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
              <Info className="h-4.5 w-4.5 text-gray-500" /> Platform Guidelines
            </h4>
            <div className="text-xs space-y-2.5 text-gray-600 font-semibold leading-relaxed">
              <p>• Created classes will immediately show up in the platform roster for analytics monitoring.</p>
              <p>• Allocating storage guarantees capacity limits are enforced on study notes and files.</p>
              <p>• Students added to this roster will automatically generate accounts upon next verification login.</p>
            </div>

            {feedback && (
              <div className={`p-3 rounded-xl text-xs font-bold ${feedback.includes("success") ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
                {feedback}
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-[#1b3b2a] hover:bg-[#132c1e] text-white py-3 rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer"
            >
              Complete Class Onboarding
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Class Detail Page — Details & Teacher Onboarding & Student lists  */
/* ------------------------------------------------------------------ */

interface ClassDetailPageProps {
  classId: string;
  classes: any[];
  setClasses: React.Dispatch<React.SetStateAction<any[]>>;
  teachers: any[];
  setTeachers: React.Dispatch<React.SetStateAction<any[]>>;
  onNavigate: (page: string) => void;
}

function ClassDetailPage({ classId, classes, setClasses, teachers, setTeachers, onNavigate }: ClassDetailPageProps) {
  const currentClass = classes.find(c => c.id === classId);

  // Local student addition states
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");

  // Local teacher assignment options
  const [assignOption, setAssignOption] = useState<"existing" | "new">("existing");
  const [existingTeacherSelect, setExistingTeacherSelect] = useState(teachers[0]?.name || "");
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherLimit, setNewTeacherLimit] = useState("40");

  const [enrollFeedback, setEnrollFeedback] = useState<string | null>(null);
  const [teacherFeedback, setTeacherFeedback] = useState<string | null>(null);

  if (!currentClass) {
    return (
      <div className="py-12 text-center bg-white border border-[#ece9e3] rounded-2xl max-w-xl mx-auto mt-8">
        <HelpCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-800">Class Not Found</h2>
        <p className="text-sm text-gray-500 mt-1">The specified class ID does not match any current configurations.</p>
        <button onClick={() => onNavigate("classes")} className="mt-4 text-xs font-bold text-[#1b3b2a] border border-[#ece9e3] bg-[#faf9f5] px-3.5 py-2 rounded-xl">
          Return to Classes
        </button>
      </div>
    );
  }

  // Handle assigning/onboarding a teacher
  const handleAssignTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    let teacherName = "";

    if (assignOption === "existing") {
      teacherName = existingTeacherSelect;
      
      // Update teacher's stats in teachers array
      setTeachers(prev => prev.map(t => {
        if (t.name === existingTeacherSelect) {
          return { ...t, classes: t.classes + 1, classId };
        }
        return t;
      }));
    } else {
      if (!newTeacherName.trim() || !newTeacherEmail.trim()) {
        setTeacherFeedback("Please fill out all teacher details.");
        return;
      }
      teacherName = newTeacherName;

      // Add brand new teacher
      const newTeacherObj = {
        name: newTeacherName,
        email: newTeacherEmail,
        status: "Active",
        classes: 1,
        classId,
        students: currentClass.studentList?.length || 0,
        limit: parseInt(newTeacherLimit) || 40,
        joined: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      };
      setTeachers(prev => [...prev, newTeacherObj]);
    }

    // Update class assigned teacher
    setClasses(prev => prev.map(c => {
      if (c.id === currentClass.id) {
        return { ...c, teacher: teacherName };
      }
      return c;
    }));

    setTeacherFeedback("Teacher successfully assigned & onboarded!");
    // Reset forms
    setNewTeacherName("");
    setNewTeacherEmail("");
    setTimeout(() => setTeacherFeedback(null), 3000);
  };

  // Handle adding student
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentEmail.trim()) {
      setEnrollFeedback("Please enter student name and email.");
      return;
    }

    const newStudentObj = {
      name: newStudentName,
      email: newStudentEmail,
      points: 0
    };

    // Update classes students list
    setClasses(prev => prev.map(c => {
      if (c.id === currentClass.id) {
        const list = c.studentList || [];
        return {
          ...c,
          students: c.students + 1,
          studentList: [...list, newStudentObj]
        };
      }
      return c;
    }));

    // Update assigned teacher's student count if assigned
    if (currentClass.teacher && currentClass.teacher !== "Unassigned") {
      setTeachers(prev => prev.map(t => {
        if (t.name === currentClass.teacher) {
          return { ...t, students: t.students + 1 };
        }
        return t;
      }));
    }

    setEnrollFeedback("Student enrolled successfully!");
    setNewStudentName("");
    setNewStudentEmail("");
    setTimeout(() => setEnrollFeedback(null), 3000);
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      
      {/* Back Button and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate("classes")}
            className="p-1.5 hover:bg-gray-100 rounded-lg border border-[#ece9e3] bg-white text-gray-500 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full ${currentClass.color || "bg-indigo-100 text-indigo-700"} flex items-center justify-center font-bold text-xs`}>
                {currentClass.initials || "CL"}
              </span>
              <h1 className="text-2xl font-black text-gray-900 font-display">{currentClass.name} Details</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">Platform management, storage configuration, teacher assignment, and roster tracking.</p>
          </div>
        </div>
        <StatusPill status={currentClass.status || "Active"} />
      </div>

      {/* Class Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#ece9e3] p-4 rounded-xl shadow-xs">
          <div className="text-[10px] font-black uppercase text-gray-400">Class Storage Capacity</div>
          <div className="text-xl font-bold text-[#1b3b2a] mt-1">{currentClass.storage || "15 GB"}</div>
          <div className="text-[10px] text-gray-500 font-semibold mt-0.5">Assigned File Quota</div>
        </div>

        <div className="bg-white border border-[#ece9e3] p-4 rounded-xl shadow-xs">
          <div className="text-[10px] font-black uppercase text-gray-400">Date of Creation</div>
          <div className="text-xl font-bold text-[#1b3b2a] mt-1">{currentClass.createdDate || "12 Mar 2025"}</div>
          <div className="text-[10px] text-gray-500 font-semibold mt-0.5">First Initialized On</div>
        </div>

        <div className="bg-white border border-[#ece9e3] p-4 rounded-xl shadow-xs">
          <div className="text-[10px] font-black uppercase text-gray-400">Enrolled Students</div>
          <div className="text-xl font-bold text-[#1b3b2a] mt-1">{(currentClass.studentList || []).length} Students</div>
          <div className="text-[10px] text-gray-500 font-semibold mt-0.5">Active profiles</div>
        </div>

        <div className="bg-white border border-[#ece9e3] p-4 rounded-xl shadow-xs">
          <div className="text-[10px] font-black uppercase text-gray-400">Avg. Engagement</div>
          <div className="text-xl font-bold text-[#1b3b2a] mt-1">{currentClass.participation || 0}%</div>
          <div className="text-[10px] text-gray-500 font-semibold mt-0.5">Participation rate</div>
        </div>
      </div>

      {/* Two-Column Detail Body */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Box: Teacher Configuration & Onboarding */}
        <div className="bg-white border border-[#ece9e3] rounded-2xl p-5 shadow-sm space-y-5">
          <div>
            <h3 className="font-extrabold text-[#1b1c19] text-[15.5px]">Assigned Instructor</h3>
            <p className="text-[12px] text-[#83837c] font-medium mt-0.5">Each class must have an active teacher assigned to verify student logs.</p>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#e7eee6] text-[#1b3b2a] flex items-center justify-center font-bold text-sm shrink-0">
              {currentClass.teacher?.slice(0, 2).toUpperCase() || "UN"}
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">{currentClass.teacher || "Unassigned"}</div>
              {currentClass.teacher && currentClass.teacher !== "Unassigned" ? (
                <>
                  <p className="text-xs text-gray-500 mt-0.5">Active Faculty Instructor</p>
                  <p className="text-xs text-indigo-600 font-bold mt-1 inline-flex items-center gap-1">Logged status: Normal operation <CheckCircle2 className="h-3.5 w-3.5" /></p>
                </>
              ) : (
                <p className="text-xs text-red-500 font-semibold mt-0.5">No instructor is currently leading this class. Onboard one below.</p>
              )}
            </div>
          </div>

          {/* Change/Onboard Teacher form */}
          <form onSubmit={handleAssignTeacher} className="border-t border-gray-100 pt-4 space-y-4">
            <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Change or Onboard Instructor</h4>
            
            <div className="flex gap-3 bg-gray-100 p-1 rounded-xl max-w-sm">
              <button 
                type="button"
                onClick={() => setAssignOption("existing")}
                className={`flex-1 py-1.5 text-[11px] font-black rounded-lg cursor-pointer ${assignOption === "existing" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500"}`}
              >
                Assign Existing
              </button>
              <button 
                type="button"
                onClick={() => setAssignOption("new")}
                className={`flex-1 py-1.5 text-[11px] font-black rounded-lg cursor-pointer ${assignOption === "new" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500"}`}
              >
                Onboard New Teacher
              </button>
            </div>

            {assignOption === "existing" ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">Select Teacher</label>
                <select 
                  className="w-full bg-white border border-[#ece9e3] rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#1b3b2a]"
                  value={existingTeacherSelect}
                  onChange={(e) => setExistingTeacherSelect(e.target.value)}
                >
                  {teachers.map((t, idx) => (
                    <option key={idx} value={t.name}>{t.name} ({t.email})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600">Teacher Full Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Anand Kumar"
                      className="w-full bg-white border border-[#ece9e3] rounded-xl px-3.5 py-2 text-xs font-semibold outline-none"
                      value={newTeacherName}
                      onChange={(e) => setNewTeacherName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600">Email Address</label>
                    <input 
                      type="email"
                      placeholder="teacher@institute.com"
                      className="w-full bg-white border border-[#ece9e3] rounded-xl px-3.5 py-2 text-xs font-semibold outline-none"
                      value={newTeacherEmail}
                      onChange={(e) => setNewTeacherEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600">Enrollment Student Limit</label>
                  <input 
                    type="number"
                    className="w-full bg-white border border-[#ece9e3] rounded-xl px-3.5 py-2 text-xs font-semibold outline-none"
                    value={newTeacherLimit}
                    onChange={(e) => setNewTeacherLimit(e.target.value)}
                  />
                </div>
              </div>
            )}

            {teacherFeedback && (
              <p className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 p-2 rounded-lg">{teacherFeedback}</p>
            )}

            <button 
              type="submit"
              className="bg-[#1b3b2a] hover:bg-[#132c1e] text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
            >
              Assign & Onboard Teacher
            </button>
          </form>
        </div>

        {/* Right Box: Roster and student lists */}
        <div className="bg-white border border-[#ece9e3] rounded-2xl p-5 shadow-sm space-y-5">
          <div>
            <h3 className="font-extrabold text-[#1b1c19] text-[15.5px]">Enrolled Students Roster</h3>
            <p className="text-[12px] text-[#83837c] font-medium mt-0.5">Students enrolled in this batch and their aggregate performance points.</p>
          </div>

          {/* List of enrolled students */}
          <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
            {(currentClass.studentList || []).length > 0 ? (
              (currentClass.studentList || []).map((student: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50/50">
                  <div className="text-left">
                    <p className="font-bold text-gray-900 text-xs">{student.name}</p>
                    <p className="text-[10px] text-gray-400 font-semibold">{student.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="bg-[#e7eee6] text-[#1b3b2a] text-[10px] font-black px-2.5 py-1 rounded-full">{student.points || 0} pts</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400 text-xs font-semibold">
                No students enrolled in this class roster yet.
              </div>
            )}
          </div>

          {/* Quick Add Student Roster Form */}
          <form onSubmit={handleAddStudent} className="border-t border-gray-100 pt-4 space-y-3.5">
            <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Quick Enroll Student</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Student Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-white border border-[#ece9e3] rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Email Address</label>
                <input 
                  type="email"
                  placeholder="ramesh@gmail.com"
                  className="w-full bg-white border border-[#ece9e3] rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                />
              </div>
            </div>

            {enrollFeedback && (
              <p className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-100 p-2 rounded-lg">{enrollFeedback}</p>
            )}

            <button 
              type="submit"
              className="bg-[#1b3b2a] hover:bg-[#132c1e] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
            >
              Enroll Student
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Export Component Wrapper                                      */
/* ------------------------------------------------------------------ */

export default function AdminDashboard({ 
  page: propPage, 
  onPageChange,
  classes: propClasses,
  setClasses: propSetClasses,
  teachers: propTeachers,
  setTeachers: propSetTeachers,
  selectedClassId: propSelectedClassId,
  setSelectedClassId: propSetSelectedClassId,
  teacherRequests,
  onApproveTeacherRequest,
  onRejectTeacherRequest
}: AdminDashboardProps) {
  
  const [localPage, setLocalPage] = useState("dashboard");
  const [localClasses, setLocalClasses] = useState([]);
  const [localTeachers, setLocalTeachers] = useState([]);
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);

  const page = propPage || localPage;
  const setPage = onPageChange || setLocalPage;

  const classes = propClasses || [];
  const setClasses = propSetClasses || setLocalClasses;
  const teachers = propTeachers || [];
  const setTeachers = propSetTeachers || setLocalTeachers;
  const selectedClassId = propSelectedClassId || localSelectedId;
  const setSelectedClassId = propSetSelectedClassId || setLocalSelectedId;

  let content;
  if (page === "dashboard") {
    content = <PlatformDashboardPage onNavigate={setPage} teachers={teachers} classes={classes} />;
  } else if (page === "classes") {
    content = <ClassesPage onNavigate={setPage} classes={classes} setSelectedClassId={setSelectedClassId} />;
  } else if (page === "teachers") {
    content = (
      <TeachersPage 
        onNavigate={setPage} 
        teachers={teachers} 
        setTeachers={setTeachers} 
        pendingRequests={teacherRequests || []}
        onApproveRequest={onApproveTeacherRequest}
        onRejectRequest={onRejectTeacherRequest}
      />
    );
  } else if (page === "onboarding") {
    content = <OnboardingPage onNavigate={setPage} classes={classes} setClasses={setClasses} teachers={teachers} setTeachers={setTeachers} />;
  } else if (page === "class-detail") {
    content = (
      <ClassDetailPage 
        classId={selectedClassId || ""} 
        classes={classes} 
        setClasses={setClasses} 
        teachers={teachers} 
        setTeachers={setTeachers} 
        onNavigate={setPage} 
      />
    );
  } else {
    content = <PlatformDashboardPage onNavigate={setPage} teachers={teachers} classes={classes} />;
  }

  return (
    <div id="admin-dashboard-root" className="animate-in fade-in slide-in-from-bottom-2 duration-200">
      {content}
    </div>
  );
}
