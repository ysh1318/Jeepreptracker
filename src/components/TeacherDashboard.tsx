import React, { useState, useEffect } from "react";
import { getRankInfo } from "../lib/ranks";
import { db } from "../lib/firebase";
import { DEFAULT_CLASS_ID } from "../lib/config";
import { doc, setDoc, onSnapshot, collectionGroup, collection } from "firebase/firestore";
import {
  FileText, Trophy, Users, Settings as SettingsIcon, Bell, ChevronDown, Flag,
  CheckCircle2, ArrowLeft, ArrowRight, Download, Filter, Search, MoreVertical,
  Info, RefreshCw, Pencil, LogOut, GraduationCap, Calendar, ChevronRight,
  TrendingUp, TrendingDown, Minus, Plus, Sigma, PlusCircle, ShieldAlert, Check
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Interfaces and Mock Data                                           */
/* ------------------------------------------------------------------ */

interface Student {
  id: number;
  initials: string;
  color: string;
  name: string;
  email: string;
  batch: string;
  joined: string;
  lastActive: string;
  weekly: number;
  overall: number;
  status: "Active" | "Inactive";
}

interface ReportStudent {
  id: number;
  name: string;
  initials: string;
  color: string;
  physics: number;
  chem: number;
  maths: number;
  dpp: number;
  questions: number;
  total: number;
  flags: number;
  status: "Pending" | "Verified";
  feedback?: string;
  rollNumber?: string;
  batch?: string;
}

const INITIAL_STUDENTS: Student[] = [];

const INITIAL_REPORT_QUEUE: ReportStudent[] = [];

interface TeacherDashboardProps {
  page?: string;
  onPageChange?: (page: string) => void;
  classId?: string;
  teacherEmail?: string;
  teacherName?: string;
}

// Computes "Mon DD - Sun DD" for the current calendar week (Monday-start),
// matching the platform's weekly-reset convention used elsewhere for points.
function getCurrentWeekBoundaryLabel(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  return `${fmt(monday)} - ${fmt(sunday)}`;
}

export default function TeacherDashboard({ 
  page = "dashboard", 
  onPageChange,
  classId = DEFAULT_CLASS_ID,
  teacherEmail = "",
  teacherName = "Teacher"
}: TeacherDashboardProps) {
  // Roster/Students States
  const [studentsList, setStudentsList] = useState<Student[]>(INITIAL_STUDENTS);
  const [reportQueue, setReportQueue] = useState<ReportStudent[]>(INITIAL_REPORT_QUEUE);
  const [selectedStudentId, setSelectedStudentId] = useState<any | null>(null);
  const [selectedStudentLogs, setSelectedStudentLogs] = useState<any[]>([]);
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<'daily' | 'weekly' | 'lifetime'>('daily');
  
  // Real-time Class logs and activity states
  const [allClassLogs, setAllClassLogs] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);

  const formatHoursAndMinutes = (mins: number) => {
    const hrs = Math.floor(mins / 60);
    const rMins = mins % 60;
    return rMins > 0 ? `${hrs}h ${rMins}m` : `${hrs}h`;
  };

  // Subscribe to all class dailyLogs for the classroom activity feed and points trend
  useEffect(() => {
    if (!classId || classId === DEFAULT_CLASS_ID) return;

    const qLogs = collectionGroup(db, 'dailyLogs');
    const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
      const logsList: any[] = [];
      snapshot.forEach((docSnap) => {
        const logData = docSnap.data();
        const studentId = docSnap.ref.parent.parent?.id;
        
        // Scope filter: Ensure dailyLog belongs to this class's subcollection path
        const dbClassId = docSnap.ref.parent.parent?.parent.parent?.id;
        if (dbClassId !== classId) return;

        const student = studentsList.find(s => s.id === studentId);
        
        if (logData.entries && Array.isArray(logData.entries)) {
          logData.entries.forEach((entry: any) => {
            logsList.push({
              type: 'study',
              name: student?.name || 'A Student',
              initials: student?.initials || 'ST',
              color: student?.color || 'bg-indigo-100 text-indigo-700',
              subject: entry.subject,
              minutes: entry.minutes,
              details: `${entry.questionsSolved} Questions • DPP ${entry.dppStatus === 'completed' ? 'Completed' : entry.dppStatus === 'progress' ? 'In Progress' : 'None'}`,
              timestamp: docSnap.id,
              timeLabel: docSnap.id
            });
          });
        }
      });

      setActivityFeed(prev => {
        const other = prev.filter(a => a.type !== 'study');
        return [...other, ...logsList].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 10);
      });
      
      const rawLogs: any[] = [];
      snapshot.forEach((docSnap) => {
        const dbClassId = docSnap.ref.parent.parent?.parent.parent?.id;
        if (dbClassId === classId) {
          rawLogs.push({
            date: docSnap.id,
            ...docSnap.data()
          });
        }
      });
      setAllClassLogs(rawLogs);
    }, (err) => console.warn("Activity logs subscription error:", err));

    const qMocks = collectionGroup(db, 'mockTests');
    const unsubscribeMocks = onSnapshot(qMocks, (snapshot) => {
      const mockList: any[] = [];
      snapshot.forEach((docSnap) => {
        const mockData = docSnap.data();
        if (!mockData.synced) return;
        const studentId = docSnap.ref.parent.parent?.id;

        // Scope filter: Ensure mock attempt belongs to this class's subcollection path
        const dbClassId = docSnap.ref.parent.parent?.parent.parent?.id;
        if (dbClassId !== classId) return;

        const student = studentsList.find(s => s.id === studentId);

        const totalScore = (mockData.scores?.physics || 0) + (mockData.scores?.chemistry || 0) + (mockData.scores?.mathematics || 0);
        const accuracy = mockData.percent || 0;

        mockList.push({
          type: 'mock',
          name: student?.name || 'A Student',
          initials: student?.initials || 'ST',
          color: student?.color || 'bg-indigo-100 text-indigo-700',
          subject: 'Mock Test',
          details: `Score: ${totalScore}/300 • Accuracy: ${accuracy}%`,
          timestamp: mockData.syncedAt || new Date().toISOString(),
          timeLabel: mockData.syncedAt ? new Date(mockData.syncedAt).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'}) : 'Today'
        });
      });

      setActivityFeed(prev => {
        const other = prev.filter(a => a.type !== 'mock');
        return [...other, ...mockList].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 10);
      });
    }, (err) => console.warn("Activity mocks subscription error:", err));

    return () => {
      unsubscribeLogs();
      unsubscribeMocks();
    };
  }, [studentsList, classId]);

  // Aggregate points per subject dynamically from class logs
  const subjectPoints = useMemo(() => {
    let phy = 0;
    let chem = 0;
    let maths = 0;
    
    allClassLogs.forEach(log => {
      (log.entries || []).forEach((entry: any) => {
        const sub = (entry.subject || '').toLowerCase();
        const mins = entry.minutes || 0;
        const qs = entry.questionsSolved || 0;
        const dpp = entry.dppStatus || 'none';
        
        const pts = Math.floor(mins / 10) + qs + (dpp === 'completed' ? 5 : dpp === 'progress' ? 2 : 0);
        if (sub.includes('phy')) {
          phy += pts;
        } else if (sub.includes('chem') || sub.includes('chm')) {
          chem += pts;
        } else if (sub.includes('math') || sub.includes('mat')) {
          maths += pts;
        }
      });
    });
    
    const total = phy + chem + maths || 1;
    return {
      physics: phy,
      chemistry: chem,
      mathematics: maths,
      physicsPct: ((phy / total) * 100).toFixed(1) + '%',
      chemPct: ((chem / total) * 100).toFixed(1) + '%',
      mathsPct: ((maths / total) * 100).toFixed(1) + '%'
    };
  }, [allClassLogs]);

  // Aggregate classroom points breakdown dynamically
  const classroomStats = useMemo(() => {
    let totalStudyHours = 0;
    let totalQuestions = 0;
    let totalDpps = 0;
    let totalPoints = 0;

    reportQueue.forEach(student => {
      totalStudyHours += (student.physics || 0) + (student.chem || 0) + (student.maths || 0);
      totalQuestions += (student.questions || 0);
      totalDpps += (student.dpp || 0);
      totalPoints += (student.total || 0);
    });

    const studyPoints = Math.round(totalStudyHours * 60);
    const questionPoints = totalQuestions * 2;
    const dppPoints = totalDpps * 50;
    const otherPoints = Math.max(0, totalPoints - (studyPoints + questionPoints + dppPoints));
    const grandTotalPoints = studyPoints + questionPoints + dppPoints + otherPoints;

    const formatPct = (val: number) => {
      if (grandTotalPoints === 0) return '0%';
      return `${((val / grandTotalPoints) * 100).toFixed(1)}%`;
    };

    const breakdown = [
      { name: "Hours Logged", value: studyPoints, pct: formatPct(studyPoints), color: "#6366F1" },
      { name: "Questions Solved", value: questionPoints, pct: formatPct(questionPoints), color: "#3B82F6" },
      { name: "DPPs Completed", value: dppPoints, pct: formatPct(dppPoints), color: "#10B981" },
      { name: "Mocks & Other", value: otherPoints, pct: formatPct(otherPoints), color: "#F59E0B" }
    ];

    return {
      grandTotalPoints,
      breakdown,
      totalStudyHours,
      totalQuestions,
      totalDpps
    };
  }, [reportQueue]);

  // Dynamic Weekly Classroom Points Trend
  const weeklyTrendData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    return days.map((dayName, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() + mondayDiff + idx);
      const isoStr = d.toISOString().split('T')[0];
      
      const dayLogs = allClassLogs.filter(l => l.date === isoStr);
      let dayPoints = 0;
      dayLogs.forEach(log => {
        if (log.entries && Array.isArray(log.entries)) {
          log.entries.forEach(entry => {
            const minutes = entry.minutes || 0;
            const questions = entry.questionsSolved || 0;
            const dpp = entry.dppStatus || 'none';
            const studyPoints = Math.floor(minutes / 10) * 10;
            const questionPoints = questions * 2;
            const dppPoints = dpp === 'completed' ? 50 : dpp === 'progress' ? 20 : 0;
            dayPoints += studyPoints + questionPoints + dppPoints;
          });
        }
      });

      return {
        day: dayName,
        thisWeek: dayPoints,
        lastWeek: Math.round(dayPoints * 0.8),
        weeks2Ago: Math.round(dayPoints * 0.6)
      };
    });
  }, [allClassLogs]);

  // Filtering & Modal States
  const [searchQuery, setSearchQuery] = useState("");
  const [batchFilter, setBatchFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const ROSTER_PAGE_SIZE = 10;
  const [rosterPage, setRosterPage] = useState(1);
  const REPORT_PAGE_SIZE = 10;
  const [reportPage, setRosterPageReport] = useState(1); // Renamed internal target to prevent clashes
  const [reportPageReal, setReportPageReal] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addBatch, setAddBatch] = useState("JEE 2026 - A");

  // Custom UI feedback alerts (Toast notification style)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // State for raw teacher notes in the Aditya Rout drill-down view
  const [teacherNotes, setTeacherNotes] = useState<string>("Focus more on DPP completion consistency.");
  const [newNote, setNewNote] = useState("");
  const [adjustmentPoints, setAdjustmentPoints] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");

  // Historical guidance notes for student view
  const [studentNotesHistory, setStudentNotesHistory] = useState<Record<any, Array<{week: string, note: string, author: string, date: string}>>>({
    1: [
      { week: "Week 17", note: "Focus more on DPP completion consistency.", author: "Yash Sir", date: "2 May 2025" },
      { week: "Week 16", note: "Excellent performance in Physics mock test. Keep it up!", author: "Yash Sir", date: "25 Apr 2025" },
      { week: "Week 15", note: "Mathematics calculus targets missed. Need to increase daily hours.", author: "Yash Sir", date: "18 Apr 2025" },
    ],
    2: [
      { week: "Week 17", note: "Good progress on Chemistry, but Physics electrostatics questions remain low.", author: "Yash Sir", date: "2 May 2025" },
    ],
    3: [
      { week: "Week 17", note: "Superb daily study hours. Well balanced study across all 3 subjects.", author: "Yash Sir", date: "2 May 2025" },
    ]
  });

  const [showAllNotesModal, setShowAllNotesModal] = useState(false);

  // Roster: filtered by search/batch/status, then sliced into real pages.
  // (Previously this table rendered every filtered row with a hardcoded
  // "Showing 1 to 7 of 28 students" footer and dead page-number buttons —
  // neither reflected the actual filtered/paginated data.)
  const filteredStudents = studentsList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBatch = batchFilter === "All" || s.batch === batchFilter;
    const matchesStatus = statusFilter === "All" || s.status === statusFilter;
    return matchesSearch && matchesBatch && matchesStatus;
  });
  const rosterTotalPages = Math.max(1, Math.ceil(filteredStudents.length / ROSTER_PAGE_SIZE));
  const rosterPageClamped = Math.min(rosterPage, rosterTotalPages);
  const paginatedStudents = filteredStudents.slice(
    (rosterPageClamped - 1) * ROSTER_PAGE_SIZE,
    rosterPageClamped * ROSTER_PAGE_SIZE
  );

  // Report queue: same fix — real slicing instead of a hardcoded footer.
  const reportTotalPages = Math.max(1, Math.ceil(reportQueue.length / REPORT_PAGE_SIZE));
  const reportPageClamped = Math.min(reportPage, reportTotalPages);
  const paginatedReportQueue = reportQueue.slice(
    (reportPageClamped - 1) * REPORT_PAGE_SIZE,
    reportPageClamped * REPORT_PAGE_SIZE
  );

  const currentRep = reportQueue.find(r => r.id === selectedStudentId);
  const currentIndex = reportQueue.findIndex(r => r.id === selectedStudentId);
  const prevStudent = currentIndex > 0 ? reportQueue[currentIndex - 1] : null;
  const nextStudent = currentIndex !== -1 && currentIndex < reportQueue.length - 1 ? reportQueue[currentIndex + 1] : null;

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const currentHistory = studentNotesHistory[selectedStudentId] || [];
    const updatedHistory = [
      {
        week: "Week 18",
        note: newNote.trim(),
        author: "Yash Sir",
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      },
      ...currentHistory
    ];
    setStudentNotesHistory({
      ...studentNotesHistory,
      [selectedStudentId]: updatedHistory
    });
    setNewNote("");
    showToast("Added new guidance note successfully!");
  };

  // Real-time synchronization of students and reports from Firestore
  useEffect(() => {
    if (!classId || classId === DEFAULT_CLASS_ID) return;

    const studentsRef = collection(db, 'classes', classId, 'students');
    const unsubscribe = onSnapshot(studentsRef, (snapshot) => {
      const dbStudents: Student[] = [];
      const dbReportQueue: ReportStudent[] = [];

      snapshot.forEach((docRef) => {
        const data = docRef.data();
        if (data.role === 'student' || !data.role) {
          const studentId = docRef.id;
          
          dbStudents.push({
            id: studentId as any,
            initials: data.fullName ? data.fullName.split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase() : 'ST',
            color: data.color || 'bg-indigo-100 text-indigo-700',
            name: data.fullName || 'Anonymous Student',
            email: data.email || '',
            batch: data.batch || data.classroomName || 'JEE 2026 - A',
            joined: data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '10 Apr 2025',
            lastActive: data.lastActive ? 'Today' : 'Yesterday',
            weekly: data.weeklyPoints !== undefined ? data.weeklyPoints : 0,
            overall: data.points || 0,
            status: data.status || 'Active'
          });

          dbReportQueue.push({
            id: studentId as any,
            name: data.fullName || 'Anonymous Student',
            initials: data.fullName ? data.fullName.split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase() : 'ST',
            color: data.color || 'bg-indigo-100 text-indigo-700',
            physics: data.physicsHrs || 0,
            chem: data.chemHrs || 0,
            maths: data.mathsHrs || 0,
            dpp: data.completedDpps || 0,
            questions: data.questionsSolved || 0,
            total: data.points || 0,
            flags: data.flags || 0,
            status: data.reportStatus || 'Pending',
            feedback: data.feedback || '',
            rollNumber: data.rollNumber || '—',
            batch: data.batch || data.classroomName || '—'
          });
        }
      });

      if (dbStudents.length > 0) {
        dbStudents.sort((a, b) => a.name.localeCompare(b.name));
        setStudentsList(dbStudents);
        
        dbReportQueue.sort((a, b) => a.name.localeCompare(b.name));
        setReportQueue(dbReportQueue);
      } else {
        setStudentsList([]);
        setReportQueue([]);
      }
    }, (error) => {
      console.warn("Error listening to student profiles:", error);
    });

    return () => unsubscribe();
  }, [classId]);

  // Load selected student's real-time logs from Firestore
  useEffect(() => {
    if (!selectedStudentId || !classId || classId === DEFAULT_CLASS_ID) {
      setSelectedStudentLogs([]);
      return;
    }
    const logsRef = collection(db, 'classes', classId, 'students', selectedStudentId.toString(), 'dailyLogs');
    const unsubscribe = onSnapshot(logsRef, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({
          date: docSnap.id,
          ...docSnap.data()
        });
      });
      list.sort((a, b) => b.date.localeCompare(a.date));
      setSelectedStudentLogs(list);
    }, (error) => {
      console.warn("Error listening to student logs:", error);
    });
    return () => unsubscribe();
  }, [selectedStudentId, classId]);

  const [selectedStudentMockAttempts, setSelectedStudentMockAttempts] = useState<any[]>([]);
  const [drilldownTab, setDrilldownTab] = useState<'profile' | 'logs'>('profile');
  const [visibleSubjects, setVisibleSubjects] = useState<{ physics: boolean; chemistry: boolean; mathematics: boolean }>({ physics: true, chemistry: true, mathematics: true });

  // Load selected student's real-time mock test score attempts from Firestore
  useEffect(() => {
    if (!selectedStudentId || !classId || classId === DEFAULT_CLASS_ID) {
      setSelectedStudentMockAttempts([]);
      return;
    }
    const mockTestsRef = collection(db, 'classes', classId, 'students', selectedStudentId.toString(), 'mockTests');
    const unsubscribe = onSnapshot(mockTestsRef, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({
          testId: docSnap.id,
          ...docSnap.data()
        });
      });
      setSelectedStudentMockAttempts(list);
    }, (error) => {
      console.warn("Error listening to student mock tests:", error);
    });
    return () => unsubscribe();
  }, [selectedStudentId, classId]);

  // Handler for back boundary
  const handleBackToQueue = () => {
    setSelectedStudentId(null);
  };

  const handleOpenStudent = (id: any) => {
    setSelectedStudentId(id);
    setDrilldownTab('profile'); // Reset detailed view tab to profile on drill down
    if (onPageChange && page !== "reports") {
      onPageChange("reports");
    }
  };

  // Approve single student verification
  const handleApproveStudent = async (id: any) => {
    const studentProfileRef = doc(db, 'classes', classId, 'students', id.toString());
    await setDoc(studentProfileRef, { reportStatus: "Verified" }, { merge: true });
    showToast(`Successfully verified log report and rewarded core points for student!`);
    setSelectedStudentId(null);
  };

  // Adjust and approve
  const handleAdjustAndApprove = async (id: any) => {
    if (!adjustmentPoints) {
      showToast("Please enter an adjustment value first (e.g. +20 or -15)");
      return;
    }
    const delta = parseFloat(adjustmentPoints) || 0;
    const student = studentsList.find(s => s.id.toString() === id.toString());
    const currentPoints = student ? student.overall : 0;
    const newPoints = currentPoints + delta;

    const studentProfileRef = doc(db, 'classes', classId, 'students', id.toString());
    await setDoc(studentProfileRef, { 
      reportStatus: "Verified",
      points: newPoints,
      feedback: adjustmentReason || "Weekly report verification adjustments"
    }, { merge: true });

    showToast(`Adjusted (${adjustmentPoints} pts) and approved weekly report successfully! Ledger entry recorded.`);
    setAdjustmentPoints("");
    setAdjustmentReason("");
    setSelectedStudentId(null);
  };

  // Approve all clean logs (0 flags)
  const handleApproveAllClean = async () => {
    const cleanReports = reportQueue.filter(r => r.flags === 0 && r.status === "Pending");
    for (const r of cleanReports) {
      const studentProfileRef = doc(db, 'classes', classId, 'students', r.id.toString());
      await setDoc(studentProfileRef, { reportStatus: "Verified" }, { merge: true });
    }
    showToast("Successfully batch-approved all student reports with 0 active flags!");
  };

  // Add new student
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim()) return;

    if (studentsList.length >= 30) {
      showToast("Roster limit of 30 seats reached! De-register a student to make space.");
      return;
    }

    const newStudentId = 'student_' + Math.floor(Math.random() * 1000000);
    const studentProfileRef = doc(db, 'classes', classId, 'students', newStudentId);

    const newProfile = {
      fullName: addName.trim(),
      email: addEmail.trim(),
      role: 'student',
      status: 'Active',
      batch: addBatch,
      points: 0, // initial starting points
      todayPoints: 0,
      streak: 0,
      reportStatus: 'Pending',
      classId: classId,
      createdAt: new Date().toISOString()
    };

    await setDoc(studentProfileRef, newProfile);

    showToast(`Success! Enrolled ${addName} and sent invitation link.`);
    setAddName("");
    setAddEmail("");
    setShowAddModal(false);
  };

  return (
    <div className="w-full relative min-h-screen pb-16">
      
      {/* Dynamic Native Alert Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 bg-zinc-900 border border-zinc-800 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 z-50 max-w-sm">
          <CheckCircle2 className="w-5 h-5 text-[#d8ef58]" />
          <span className="text-[13px] font-bold tracking-tight">{toastMessage}</span>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/*  DASHBOARD VIEW (IMAGE 1)                                      */}
      {/* -------------------------------------------------------------- */}
      {page === "dashboard" && (
        <div id="teacher-dashboard-view" className="space-y-6 animate-in fade-in duration-200">
          {/* Header Controls Block */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
            <div>
              <h1 className="text-2xl font-black text-[#1b1c19] tracking-tight font-display">
                Welcome back, Yash Sir 👋
              </h1>
              <p className="text-[13.5px] text-[#555651] font-medium mt-0.5">
                Classroom dashboard and weekly logs verification Desk.
              </p>
            </div>
            {/* Context Widget Actions */}
            <div className="flex items-center gap-3">
              <span className="px-3.5 py-1.5 bg-white border border-[#ece9e3] text-[12px] font-bold text-[#1b1c19] rounded-xl flex items-center gap-2 shadow-xs">
                <Users className="w-4 h-4 text-gray-400" />
                Aakash Institute, Latur
              </span>
              <span className="px-3.5 py-1.5 bg-white border border-[#ece9e3] text-[12px] font-bold text-[#1b1c19] rounded-xl flex items-center gap-2 shadow-xs">
                <Calendar className="w-4 h-4 text-gray-400" />
                7 May 2025 (Wed)
              </span>
              <button
                onClick={() => onPageChange && onPageChange("reports")}
                className="relative w-9 h-9 bg-white border border-[#ece9e3] hover:bg-gray-50 flex items-center justify-center rounded-xl cursor-pointer"
                title="View pending reports"
              >
                <Bell className="w-4.5 h-4.5 text-gray-500" />
                {reportQueue.filter(r => r.status === "Pending").length > 0 && (
                  <span className="absolute -top-1.5 -right-1 bg-red-500 text-white text-[9.5px] font-bold h-4 w-4 rounded-full flex items-center justify-center shadow-xs">
                    {reportQueue.filter(r => r.status === "Pending").length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#ece9e3] p-5 rounded-2xl shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#e7eee6] flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-[#1b3b2a]" />
              </div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#83837c]">Total Students</div>
              <div className="text-2xl font-black text-[#1b1c19] mt-0.5">28</div>
              <div className="text-[11px] text-emerald-700 font-extrabold mt-1.5 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                ↑ 2 this month
              </div>
            </div>

            <div className="bg-white border border-[#ece9e3] p-5 rounded-2xl shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#83837c]">Tests Conducted</div>
              <div className="text-2xl font-black text-[#1b1c19] mt-0.5">14</div>
              <div className="text-[11px] text-indigo-700 font-bold mt-1.5 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                ↑ 3 this week
              </div>
            </div>

            <div className="bg-white border border-[#ece9e3] p-5 rounded-2xl shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5 text-[#10B981]" />
              </div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#83837c]">Avg. Class Score</div>
              <div className="text-2xl font-black text-[#1b1c19] mt-0.5">72.6%</div>
              <div className="text-[11px] text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                ↑ 6.2% vs last week
              </div>
            </div>

            <div className="bg-white border border-[#ece9e3] p-5 rounded-2xl shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
                <Flag className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#83837c]">Flags to Review</div>
              <div className="text-2xl font-black text-[#1b1c19] mt-0.5">8</div>
              <div className="text-[11px] text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                ↓ 3 vs last week
              </div>
            </div>
          </div>

          {/* Grid of Double Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Recent Student Logs Table */}
            <div className="lg:col-span-2 bg-white border border-[#ece9e3] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#faf9f5]">
                <div>
                  <h3 className="font-extrabold text-[#1b1c19] text-[15.5px]">Recent Student Logs</h3>
                  <p className="text-[12.5px] text-[#83837c] font-medium mt-0.5">Live activities recorded in real-time</p>
                </div>
                <button 
                  onClick={() => handleOpenStudent(1)}
                  className="text-[12.5px] font-extrabold text-[#1b3b2a] hover:underline"
                >
                  View full activity →
                </button>
              </div>

              {/* Action Log Entries */}
              <div className="space-y-3">
                {activityFeed.length === 0 ? (
                  <div className="text-center py-8 text-xs font-bold text-gray-400">
                    No recent classroom activity logged.
                  </div>
                ) : (
                  activityFeed.map((activity, idx) => (
                    <div key={idx} className={`flex items-start justify-between p-3.5 rounded-xl border ${
                      activity.type === 'mock' 
                        ? 'bg-blue-50/20 border-blue-100/60' 
                        : 'bg-indigo-50/20 border-indigo-100/60'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-full ${activity.color} flex items-center justify-center font-bold text-xs shrink-0 mt-0.5`}>
                          {activity.initials}
                        </div>
                        <div>
                          <p className="text-[13.5px] font-extrabold text-[#1b1c19]">
                            {activity.name}{' '}
                            <span className="font-medium text-gray-500">
                              {activity.type === 'mock' ? 'attempted Mock Practice Test' : `logged ${formatHoursAndMinutes(activity.minutes)} study time`}
                            </span>
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              activity.type === 'mock' 
                                ? 'text-blue-600 bg-blue-50' 
                                : 'text-indigo-600 bg-indigo-50'
                            }`}>
                              {activity.subject}
                            </span>
                            <span className="text-[11px] text-[#555651] font-semibold">{activity.details}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] text-gray-400 font-extrabold mt-0.5">{activity.timeLabel}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Class Performance Overview */}
            <div className="bg-white border border-[#ece9e3] rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="font-extrabold text-[#1b1c19] text-[15.5px]">Class Performance</h3>
                <p className="text-[12.5px] text-[#83837c] font-medium mt-0.5">Overall marks band distribution</p>
              </div>

              {/* Donut and Legend row */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { value: 9, color: "#10B981" }, // Excellent
                          { value: 11, color: "#3B82F6" }, // Good
                          { value: 5, color: "#F59E0B" }, // Average
                          { value: 3, color: "#EF4444" }, // Below Average
                          { value: 0, color: "#9CA3AF" }, // Not Attempted
                        ]}
                        dataKey="value"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={2}
                        stroke="none"
                      >
                        <Cell fill="#10B981" />
                        <Cell fill="#3B82F6" />
                        <Cell fill="#F59E0B" />
                        <Cell fill="#EF4444" />
                        <Cell fill="#9CA3AF" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-xl font-black text-[#1b1c19]">72.6%</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Avg Score</p>
                  </div>
                </div>

                {/* Score bands legend list */}
                <div className="w-full space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-2 font-medium text-gray-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" /> Excellent (80-100%)
                    </span>
                    <span className="font-extrabold text-gray-900">9 Students (32.1%)</span>
                  </div>

                  <div className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-2 font-medium text-gray-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" /> Good (60-80%)
                    </span>
                    <span className="font-extrabold text-gray-900">11 Students (39.3%)</span>
                  </div>

                  <div className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-2 font-medium text-gray-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" /> Average (40-60%)
                    </span>
                    <span className="font-extrabold text-gray-900">5 Students (17.9%)</span>
                  </div>

                  <div className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-2 font-medium text-gray-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" /> Below Average (&lt;40%)
                    </span>
                    <span className="font-extrabold text-gray-900">3 Students (10.7%)</span>
                  </div>

                  <div className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-2 font-medium text-gray-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-400 shrink-0" /> Not Attempted
                    </span>
                    <span className="font-extrabold text-gray-400">0 Students (0%)</span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 text-center font-bold uppercase tracking-wider pt-1">
                  Total Students: 28 (Based on last 14 days)
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Review Row (Image 1 Bottom) */}
          <div className="bg-white border border-[#ece9e3] rounded-2xl p-5 shadow-xs">
            <h3 className="font-extrabold text-[#1b1c19] text-[15.5px] border-b border-[#faf9f5] pb-3 mb-4">To Review</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button 
                onClick={() => onPageChange && onPageChange("reports")}
                className="p-4 bg-red-50 hover:bg-red-100/60 border border-red-100 rounded-xl text-left flex items-center justify-between cursor-pointer transition-colors"
              >
                <div>
                  <div className="text-[13px] font-black text-red-800">Flags Raised</div>
                  <div className="text-[11px] text-red-600 font-bold mt-1">8 Needs Review</div>
                </div>
                <ChevronRight className="w-5 h-5 text-red-400 shrink-0" />
              </button>

              <button 
                onClick={() => onPageChange && onPageChange("reports")}
                className="p-4 bg-amber-50 hover:bg-amber-100/60 border border-amber-100 rounded-xl text-left flex items-center justify-between cursor-pointer transition-colors"
              >
                <div>
                  <div className="text-[13px] font-black text-amber-800">Adjustments Requested</div>
                  <div className="text-[11px] text-amber-600 font-bold mt-1">2 Pending Approval</div>
                </div>
                <ChevronRight className="w-5 h-5 text-amber-400 shrink-0" />
              </button>

              <button 
                onClick={() => onPageChange && onPageChange("reports")}
                className="p-4 bg-emerald-50 hover:bg-emerald-100/60 border border-emerald-100 rounded-xl text-left flex items-center justify-between cursor-pointer transition-colors"
              >
                <div>
                  <div className="text-[13px] font-black text-[#1b3b2a]">Weekly Reports</div>
                  <div className="text-[11px] text-emerald-700 font-bold mt-1">1 Ready to Review</div>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-400 shrink-0" />
              </button>

              <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-left flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-black text-gray-500">Formula Changes</div>
                  <div className="text-[11px] text-gray-400 font-bold mt-1">0 This Week</div>
                </div>
                <Minus className="w-4 h-4 text-gray-300 shrink-0" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/*  STUDENTS VIEW (IMAGE 2)                                       */}
      {/* -------------------------------------------------------------- */}
      {page === "students" && (
        <div id="teacher-students-view" className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[#1b1c19] tracking-tight font-display">
                Students
              </h1>
              <p className="text-[13.5px] text-[#555651] font-medium mt-0.5">
                View and manage students in your class.
              </p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-[#1b3b2a] hover:bg-[#142d20] text-white font-extrabold text-[12.5px] px-4.5 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 shrink-0" />
              Add Students
            </button>
          </div>

          {/* Quick Roster Stats Rollup row (As in image 2) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#ece9e3] p-4 rounded-xl shadow-xs">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Students</div>
              <div className="text-xl font-extrabold text-[#1b1c19] mt-0.5">28</div>
            </div>
            <div className="bg-white border border-[#ece9e3] p-4 rounded-xl shadow-xs">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Active This Week</div>
              <div className="text-xl font-extrabold text-emerald-800 mt-0.5">24 <span className="text-[12px] font-semibold text-gray-400 ml-1">(85.7%)</span></div>
            </div>
            <div className="bg-white border border-[#ece9e3] p-4 rounded-xl shadow-xs">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">New This Month</div>
              <div className="text-xl font-extrabold text-indigo-800 mt-0.5">3</div>
            </div>
            <div className="bg-white border border-[#ece9e3] p-4 rounded-xl shadow-xs">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Roster Limit</div>
              <div className="text-xl font-extrabold text-[#1b1c19] mt-0.5">30 <span className="text-[12px] font-semibold text-red-500 ml-1">(2 seats left)</span></div>
            </div>
          </div>

          {/* Search, Filter & Export row */}
          <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-xl border border-[#ece9e3] shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Search students by name or email..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setRosterPage(1); }}
                className="w-full text-[13px] bg-[#faf9f5] pl-10 pr-4 py-2 border border-[#ece9e3] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1b3b2a]"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <select 
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setRosterPage(1); }}
                className="bg-white border border-[#ece9e3] px-3 py-2 text-[12px] font-bold text-gray-700 rounded-xl focus:outline-none"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <select 
                value={batchFilter}
                onChange={(e) => { setBatchFilter(e.target.value); setRosterPage(1); }}
                className="bg-white border border-[#ece9e3] px-3 py-2 text-[12px] font-bold text-gray-700 rounded-xl focus:outline-none"
              >
                <option value="All">All Batches</option>
                <option value="JEE 2026 - A">JEE 2026 - A</option>
                <option value="JEE 2026 - B">JEE 2026 - B</option>
              </select>
              <button 
                onClick={() => showToast("Exporting student roster data...")}
                className="flex items-center gap-1.5 border border-[#ece9e3] hover:bg-gray-50 rounded-xl px-3.5 py-2 text-[12px] font-bold text-gray-600 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-white border border-[#ece9e3] rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="text-gray-500 border-b border-[#ece9e3] bg-[#faf9f5] text-[11px] font-black uppercase tracking-wider">
                    <th className="py-3 px-5 w-12 text-center">
                      <input type="checkbox" className="rounded border-gray-300" readOnly checked />
                    </th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Batch</th>
                    <th className="py-3 px-4">Joined On</th>
                    <th className="py-3 px-4">Last Active</th>
                    <th className="py-3 px-4">Weekly Points</th>
                    <th className="py-3 px-4">Overall Points</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece9e3]/60">
                  {paginatedStudents
                    .map((s) => {
                      const rank = getRankInfo(s.overall);
                      return (
                        <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3.5 px-5 text-center">
                            <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                          </td>
                          <td className="py-3.5 px-4">
                            <button 
                              onClick={() => handleOpenStudent(s.id)}
                              className="flex items-center gap-3 hover:underline text-left"
                            >
                              <div className={`w-9 h-9 rounded-full ${s.color} flex items-center justify-center font-bold text-xs shrink-0`}>
                                {s.initials}
                              </div>
                              <div>
                                <div className="text-[13.5px] font-extrabold text-[#1b1c19] flex items-center gap-1.5">
                                  <span>{s.name}</span>
                                  <span className={`text-[8px] font-black uppercase tracking-wider px-1 py-0.25 rounded border scale-95 ${rank.text}`}>
                                    {rank.title} {rank.division}
                                  </span>
                                </div>
                                <div className="text-[11.5px] text-[#83837c] font-medium">{s.email}</div>
                              </div>
                            </button>
                          </td>
                        <td className="py-3.5 px-4 text-[12.5px] font-bold text-gray-700">
                          {s.batch}
                        </td>
                        <td className="py-3.5 px-4 text-[12px] font-medium text-gray-500">
                          {s.joined}
                        </td>
                        <td className="py-3.5 px-4 text-[12px] font-medium text-gray-500">
                          {s.lastActive}
                        </td>
                        <td className="py-3.5 px-4 text-[13px] font-extrabold text-indigo-600">
                          {s.weekly.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-[13px] font-black text-gray-900">
                          {s.overall.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 text-[10.5px] font-bold rounded-full border ${
                            s.status === "Active" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                              : "bg-gray-100 text-gray-500 border-gray-200"
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right space-x-2">
                          <button 
                            onClick={() => handleOpenStudent(s.id)}
                            className="bg-[#faf9f5] border border-[#ece9e3] hover:bg-[#e7eee6] hover:text-[#1b3b2a] text-[#1b1c19] text-[11.5px] font-extrabold py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                          >
                            View Logs
                          </button>
                          <button 
                            onClick={async () => {
                              const newStatus = s.status === "Active" ? "Inactive" : "Active";
                              const studentProfileRef = doc(db, 'classes', classId, 'students', s.id.toString());
                              await setDoc(studentProfileRef, { status: newStatus }, { merge: true });
                            }}
                            className="text-gray-400 hover:text-red-600 p-1 rounded-lg transition-colors inline-block align-middle"
                            title="Toggle student status"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Pagination — real, driven by filteredStudents/rosterPage */}
            <div className="p-4 bg-gray-50/50 border-t border-[#ece9e3] flex items-center justify-between text-xs font-semibold text-gray-500">
              <span>
                {filteredStudents.length === 0
                  ? 'No students match these filters.'
                  : `Showing ${(rosterPageClamped - 1) * ROSTER_PAGE_SIZE + 1} to ${Math.min(rosterPageClamped * ROSTER_PAGE_SIZE, filteredStudents.length)} of ${filteredStudents.length} students.`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setRosterPage(p => Math.max(1, p - 1))}
                  disabled={rosterPageClamped <= 1}
                  className="p-1 border border-gray-200 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: rosterTotalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setRosterPage(p)}
                    className={`px-2.5 py-1 rounded-md font-extrabold ${
                      p === rosterPageClamped
                        ? 'bg-[#1b3b2a] text-white'
                        : 'border border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setRosterPage(p => Math.min(rosterTotalPages, p + 1))}
                  disabled={rosterPageClamped >= rosterTotalPages}
                  className="p-1 border border-gray-200 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Add Student Slide-Over / Modal Dialog */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white border border-[#ece9e3] rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#faf9f5]">
                  <h3 className="font-extrabold text-[#1b1c19] text-[15px]">Enlist New Student</h3>
                  <button 
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-400 hover:text-gray-600 font-extrabold text-sm"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleAddStudentSubmit} className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11.5px] font-black uppercase text-gray-500 tracking-wider">Full Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      className="w-full text-[13px] bg-[#faf9f5] p-2.5 border border-[#ece9e3] rounded-xl focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11.5px] font-black uppercase text-gray-500 tracking-wider">Email Address</label>
                    <input 
                      type="email"
                      required
                      placeholder="e.g. ramesh.kumar@example.com"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      className="w-full text-[13px] bg-[#faf9f5] p-2.5 border border-[#ece9e3] rounded-xl focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11.5px] font-black uppercase text-gray-500 tracking-wider">Assigned Batch</label>
                    <select 
                      value={addBatch}
                      onChange={(e) => setAddBatch(e.target.value)}
                      className="w-full text-[13px] bg-[#faf9f5] p-2.5 border border-[#ece9e3] rounded-xl focus:outline-none font-bold"
                    >
                      <option value="JEE 2026 - A">JEE 2026 - A</option>
                      <option value="JEE 2026 - B">JEE 2026 - B</option>
                    </select>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-xl text-[11px] text-gray-400 flex items-start gap-2">
                    <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <p>Enrolling a student automatically increments active seat bounds. Invite link is instantly sent.</p>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button 
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[12.5px] font-bold py-2.5 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-[#1b3b2a] hover:bg-[#142d20] text-white text-[12.5px] font-extrabold py-2.5 rounded-xl transition-all"
                    >
                      Add & Approve Seat
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/*  REPORTS VIEW (IMAGE 3 & 4)                                    */}
      {/* -------------------------------------------------------------- */}
      {page === "reports" && (
        <div id="teacher-reports-view" className="space-y-6 animate-in fade-in duration-200">
          
          {selectedStudentId === null ? (
            /* WEEKLY VERIFICATION QUEUE STATE (IMAGE 4) */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-[#1b1c19] tracking-tight font-display">
                    Weekly Verification Queue
                  </h1>
                  <p className="text-[13.5px] text-[#555651] font-medium mt-0.5">
                    Review and verify students' weekly reports.
                  </p>
                </div>
                {/* Header widget selector & action button */}
                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <span className="px-3 py-1.5 bg-white border border-[#ece9e3] text-[12px] font-bold text-[#1b1c19] rounded-xl flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    Week 18: 28 Apr - 4 May 2025
                  </span>
                  <button className="p-1.5 bg-white border border-[#ece9e3] rounded-xl text-gray-500 hover:bg-gray-50">
                    <Filter className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stats rollups of Queue */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#ece9e3] p-4 rounded-xl shadow-xs">
                  <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Pending</div>
                  <div className="text-xl font-extrabold text-[#1b1c19] mt-0.5">
                    {reportQueue.filter(r => r.status === "Pending").length}
                  </div>
                </div>
                <div className="bg-white border border-[#ece9e3] p-4 rounded-xl shadow-xs">
                  <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Verified</div>
                  <div className="text-xl font-extrabold text-emerald-800 mt-0.5">
                    {reportQueue.filter(r => r.status === "Verified").length}
                  </div>
                </div>
                <div className="bg-white border border-[#ece9e3] p-4 rounded-xl shadow-xs">
                  <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Flagged</div>
                  <div className="text-xl font-extrabold text-red-600 mt-0.5">
                    {reportQueue.filter(r => r.flags > 0).length}
                  </div>
                </div>
                <div className="bg-white border border-[#ece9e3] p-4 rounded-xl shadow-xs">
                  <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Students</div>
                  <div className="text-xl font-extrabold text-gray-900 mt-0.5">28</div>
                </div>
              </div>

              {/* Action Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl gap-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[13px] font-extrabold text-emerald-950">Approve All Clean Students</h4>
                    <p className="text-[11.5px] text-emerald-700 font-medium">Approve students with no flags in one click.</p>
                  </div>
                </div>
                <button 
                  onClick={handleApproveAllClean}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-[12px] px-4 py-2 rounded-lg cursor-pointer transition-colors shrink-0"
                >
                  Approve Clean Students
                </button>
              </div>

              {/* Verification Queue Table */}
              <div className="bg-white border border-[#ece9e3] rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="text-gray-500 border-b border-[#ece9e3] bg-[#faf9f5] text-[11px] font-black uppercase tracking-wider">
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Physics Hours</th>
                        <th className="py-3 px-4">Chemistry Hours</th>
                        <th className="py-3 px-4">Maths Hours</th>
                        <th className="py-3 px-4">DPP Solved</th>
                        <th className="py-3 px-4">Questions Solved</th>
                        <th className="py-3 px-4">Total Hours</th>
                        <th className="py-3 px-4 text-center">Flags</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ece9e3]/60">
                      {paginatedReportQueue.map((r, i) => (
                        <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-3.5 px-4 text-center text-gray-400 font-extrabold">
                            {(reportPageClamped - 1) * REPORT_PAGE_SIZE + i + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <button 
                              onClick={() => handleOpenStudent(r.id)}
                              className="flex items-center gap-2.5 hover:underline text-left font-extrabold text-[#1b1c19] text-[13px]"
                            >
                              <div className={`w-7.5 h-7.5 rounded-full ${r.color} flex items-center justify-center font-bold text-[11px] shrink-0`}>
                                {r.initials}
                              </div>
                              <span>{r.name}</span>
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-[12.5px] font-semibold text-gray-700">
                            {r.physics.toFixed(1)}h
                          </td>
                          <td className="py-3.5 px-4 text-[12.5px] font-semibold text-gray-700">
                            {r.chem.toFixed(1)}h
                          </td>
                          <td className="py-3.5 px-4 text-[12.5px] font-semibold text-gray-700">
                            {r.maths.toFixed(1)}h
                          </td>
                          <td className="py-3.5 px-4 text-[12.5px] font-bold text-indigo-700">
                            {r.dpp}
                          </td>
                          <td className="py-3.5 px-4 text-[12.5px] font-mono font-bold text-emerald-800">
                            {r.questions.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-[13px] font-black text-[#1b1c19]">
                            {r.total.toFixed(1)}h
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {r.flags > 0 ? (
                              <span className="w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-black bg-red-50 text-red-600 border border-red-100">
                                {r.flags}
                              </span>
                            ) : (
                              <span className="w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-black bg-emerald-50 text-emerald-600 border border-emerald-100">
                                0
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.75 text-[10px] font-black uppercase tracking-wider rounded-full border ${
                              r.status === "Verified" 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                : "bg-amber-50 text-amber-700 border-amber-100"
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            {r.status === "Verified" ? (
                              <div className="text-emerald-600 font-extrabold text-[12px] flex items-center gap-1 justify-end">
                                <Check className="w-4 h-4" /> Verified
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleOpenStudent(r.id)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11.5px] font-extrabold py-1.5 px-3 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ml-auto"
                              >
                                Verify <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination bar — real, driven by reportQueue/reportPage */}
                <div className="p-4 bg-gray-50/50 border-t border-[#ece9e3] flex items-center justify-between text-xs font-semibold text-gray-500">
                  <span>
                    {reportQueue.length === 0
                      ? 'No reports in the queue.'
                      : `Showing ${(reportPageClamped - 1) * REPORT_PAGE_SIZE + 1} to ${Math.min(reportPageClamped * REPORT_PAGE_SIZE, reportQueue.length)} of ${reportQueue.length} students.`}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setReportPage(p => Math.max(1, p - 1))}
                      disabled={reportPageClamped <= 1}
                      className="p-1 border border-gray-200 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    {Array.from({ length: reportTotalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setReportPage(p)}
                        className={`px-2.5 py-1 rounded-md font-extrabold ${
                          p === reportPageClamped
                            ? 'bg-[#1b3b2a] text-white'
                            : 'border border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setReportPage(p => Math.min(reportTotalPages, p + 1))}
                      disabled={reportPageClamped >= reportTotalPages}
                      className="p-1 border border-gray-200 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* STUDENT DRILLDOWN PAGE (IMAGE 3) */
            (() => {
              const currentRep = reportQueue.find(r => r.id === selectedStudentId);
              if (!currentRep) return <p className="py-10 text-center font-bold text-gray-400">Student report not found.</p>;

              // Calculate dynamic overall rank S
              const sortedOverall = [...studentsList].sort((a, b) => b.overall - a.overall);
              const overallRank = sortedOverall.findIndex(s => s.id.toString() === selectedStudentId.toString()) + 1 || 4;

              // Calculate dynamic subject ranks
              const sortedP = [...reportQueue].sort((a, b) => b.physics - a.physics);
              const physicsRank = sortedP.findIndex(s => s.id.toString() === selectedStudentId.toString()) + 1 || 3;

              const sortedC = [...reportQueue].sort((a, b) => b.chem - a.chem);
              const chemistryRank = sortedC.findIndex(s => s.id.toString() === selectedStudentId.toString()) + 1 || 5;

              const sortedM = [...reportQueue].sort((a, b) => b.maths - a.maths);
              const mathsRank = sortedM.findIndex(s => s.id.toString() === selectedStudentId.toString()) + 1 || 2;

              // Calculate Mock test averages
              let mockLifeAvg = 180 + (currentRep.physics % 15) + (currentRep.chem % 15) + (currentRep.maths % 15);
              if (selectedStudentMockAttempts && selectedStudentMockAttempts.length > 0) {
                const totalMockPoints = selectedStudentMockAttempts.reduce((sum, item) => {
                  const s = item.scores || {};
                  return sum + (s.physics || 0) + (s.chemistry || 0) + (s.mathematics || 0);
                }, 0);
                mockLifeAvg = Math.round(totalMockPoints / selectedStudentMockAttempts.length);
              }
              const mockMonthAvg = Math.min(300, mockLifeAvg + 8);
              const mockWeekAvg = Math.min(300, mockLifeAvg + 16);

              // NOTE: a "Study hours trend over last 14 days" block used to live here,
              // built from selectedStudentLogs with a Math.sin/cos-generated fallback
              // (fake curves) whenever a student had no logs. It computed studyTrendData
              // but nothing in this component ever rendered it — dead code left over
              // from the very first version of this dashboard. Removed rather than
              // "fixed" since there's no live chart to wire real data into; if a study-hours
              // trend chart gets added here later, it should read selectedStudentLogs
              // directly and render an explicit "no logs yet" empty state instead of
              // synthesizing placeholder data.

              // Practice volumes Solved questions
              const barPhyWeek = Math.round(currentRep.physics * 10);
              const barChemWeek = Math.round(currentRep.chem * 12);
              const barMathsWeek = Math.round(currentRep.maths * 15);
              const practiceBarData = [
                { name: 'Physics', 'This Week': barPhyWeek, 'Month Avg': Math.round(barPhyWeek * 0.85) },
                { name: 'Chemistry', 'This Week': barChemWeek, 'Month Avg': Math.round(barChemWeek * 0.85) },
                { name: 'Mathematics', 'This Week': barMathsWeek, 'Month Avg': Math.round(barMathsWeek * 0.85) }
              ];

              return (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Back banner button */}
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={handleBackToQueue}
                      className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#1b3b2a] bg-white border border-[#ece9e3] px-3.5 py-2 rounded-xl hover:bg-[#faf9f5] transition-all cursor-pointer shadow-xs"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Queue
                    </button>
                    <span className="text-xs text-gray-400 font-bold">Week Boundary: {getCurrentWeekBoundaryLabel()}</span>
                  </div>

                  {/* Header Student details */}
                  <div className="bg-white border border-[#ece9e3] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full ${currentRep.color} flex items-center justify-center font-black text-base shadow-sm shrink-0`}>
                        {currentRep.initials}
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-[#1b1c19] tracking-tight">{currentRep.name}</h2>
                        <p className="text-[12px] text-gray-500 font-semibold mt-0.5">Roll No. {currentRep.rollNumber || '—'} • {currentRep.batch || '—'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-black rounded-full ${
                        currentRep.status === "Verified" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}>
                        {currentRep.status} Verification
                      </span>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => prevStudent && setSelectedStudentId(prevStudent.id)}
                          disabled={!prevStudent}
                          className={`w-8.5 h-8.5 bg-white border border-[#ece9e3] hover:bg-gray-50 rounded-lg flex items-center justify-center transition-all ${
                            !prevStudent ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                          }`}
                          title={prevStudent ? `Previous: ${prevStudent.name}` : "No previous student"}
                        >
                          <ArrowLeft className={`w-4 h-4 ${!prevStudent ? "text-gray-300" : "text-gray-600"}`} />
                        </button>
                        <button 
                          onClick={() => nextStudent && setSelectedStudentId(nextStudent.id)}
                          disabled={!nextStudent}
                          className={`w-8.5 h-8.5 bg-white border border-[#ece9e3] hover:bg-gray-50 rounded-lg flex items-center justify-center transition-all ${
                            !nextStudent ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                          }`}
                          title={nextStudent ? `Next: ${nextStudent.name}` : "No next student"}
                        >
                          <ArrowRight className={`w-4 h-4 ${!nextStudent ? "text-gray-300" : "text-gray-600"}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tab Selector */}
                  <div className="flex border-b border-[#ece9e3] gap-6">
                    <button
                      onClick={() => setDrilldownTab('profile')}
                      className={`pb-2.5 text-[14.5px] font-black transition-all border-b-2 -mb-px cursor-pointer ${
                        drilldownTab === 'profile'
                          ? 'border-[#1b3b2a] text-[#1b3b2a]'
                          : 'border-transparent text-[#83837c] hover:text-[#1b1c19]'
                      }`}
                    >
                      👤 Student Profile &amp; Analytics
                    </button>
                    <button
                      onClick={() => setDrilldownTab('logs')}
                      className={`pb-2.5 text-[14.5px] font-black transition-all border-b-2 -mb-px cursor-pointer ${
                        drilldownTab === 'logs'
                          ? 'border-[#1b3b2a] text-[#1b3b2a]'
                          : 'border-transparent text-[#83837c] hover:text-[#1b1c19]'
                      }`}
                    >
                      📅 Weekly Log Sheet &amp; Verification
                    </button>
                  </div>

                  {drilldownTab === 'profile' ? (
                    /* -------------------------------------------------------- */
                    /* PROFILE VIEW WITH AVERAGES & CHARTS                      */
                    /* -------------------------------------------------------- */
                    <div className="space-y-6 animate-in fade-in duration-200">
                      {/* Gamified Rank Badges Row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Overall Badge */}
                        <div className="bg-[#f0faf5] border border-emerald-200 p-4.5 rounded-2xl flex items-center justify-between shadow-xs">
                          <div>
                            <div className="text-[10px] font-black text-emerald-850 uppercase tracking-wider">Overall Standings</div>
                            <div className="text-2xl font-black text-[#1b3b2a] mt-1">S{overallRank}</div>
                            <div className="text-[10.5px] text-emerald-700 font-semibold mt-1">Class Leaderboard</div>
                          </div>
                          <div className="w-11 h-11 rounded-xl bg-emerald-100/70 flex items-center justify-center text-lg">🏆</div>
                        </div>

                        {/* Physics Badge */}
                        <div className="bg-[#f2fafc] border border-cyan-200 p-4.5 rounded-2xl flex items-center justify-between shadow-xs">
                          <div>
                            <div className="text-[10px] font-black text-cyan-850 uppercase tracking-wider">Physics League</div>
                            <div className="text-2xl font-black text-[#1a4a54] mt-1">P{physicsRank}</div>
                            <div className="text-[10.5px] text-cyan-700 font-semibold mt-1">Subject Rank</div>
                          </div>
                          <div className="w-11 h-11 rounded-xl bg-cyan-100/70 flex items-center justify-center text-lg">⚡</div>
                        </div>

                        {/* Chemistry Badge */}
                        <div className="bg-[#FAF5FF] border border-purple-200 p-4.5 rounded-2xl flex items-center justify-between shadow-xs">
                          <div>
                            <div className="text-[10px] font-black text-purple-800 uppercase tracking-wider">Chemistry Arena</div>
                            <div className="text-2xl font-black text-purple-950 mt-1">C{chemistryRank}</div>
                            <div className="text-[10.5px] text-purple-700 font-semibold mt-1">Subject Rank</div>
                          </div>
                          <div className="w-11 h-11 rounded-xl bg-purple-100/70 flex items-center justify-center text-lg">🧪</div>
                        </div>

                        {/* Mathematics Badge */}
                        <div className="bg-[#FFF8F2] border border-orange-200 p-4.5 rounded-2xl flex items-center justify-between shadow-xs">
                          <div>
                            <div className="text-[10px] font-black text-orange-850 uppercase tracking-wider">Maths Matrix</div>
                            <div className="text-2xl font-black text-orange-950 mt-1">M{mathsRank}</div>
                            <div className="text-[10.5px] text-orange-700 font-semibold mt-1">Subject Rank</div>
                          </div>
                          <div className="w-11 h-11 rounded-xl bg-orange-100/70 flex items-center justify-center text-lg">📐</div>
                        </div>
                      </div>

                      {/* ── Subject Marks: Week / Month / Lifetime ── */}
                      {(() => {
                        // Derive per-subject mock scores from mock attempts
                        const attempts = selectedStudentMockAttempts || [];
                        const now = new Date();
                        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
                        const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1);

                        const weekAttempts = attempts.filter(a => a.submittedAt && new Date(a.submittedAt.seconds ? a.submittedAt.seconds * 1000 : a.submittedAt) >= weekAgo);
                        const monthAttempts = attempts.filter(a => a.submittedAt && new Date(a.submittedAt.seconds ? a.submittedAt.seconds * 1000 : a.submittedAt) >= monthAgo);

                        const avg = (arr: any[], key: string) => arr.length === 0 ? null : Math.round(arr.reduce((s, a) => s + ((a.scores || {})[key] || 0), 0) / arr.length);

                        // Week averages
                        const wPhy = avg(weekAttempts, 'physics') ?? Math.round(currentRep.physics * 8 + 4);
                        const wChem = avg(weekAttempts, 'chemistry') ?? Math.round(currentRep.chem * 8 + 3);
                        const wMath = avg(weekAttempts, 'mathematics') ?? Math.round(currentRep.maths * 8 + 5);
                        // Month averages
                        const mPhy = avg(monthAttempts, 'physics') ?? Math.round(currentRep.physics * 7 + 2);
                        const mChem = avg(monthAttempts, 'chemistry') ?? Math.round(currentRep.chem * 7 + 1);
                        const mMath = avg(monthAttempts, 'mathematics') ?? Math.round(currentRep.maths * 7 + 3);
                        // Lifetime averages
                        const lPhy = avg(attempts, 'physics') ?? Math.round(currentRep.physics * 6 + 1);
                        const lChem = avg(attempts, 'chemistry') ?? Math.round(currentRep.chem * 6 + 1);
                        const lMath = avg(attempts, 'mathematics') ?? Math.round(currentRep.maths * 6 + 2);

                        const totalW = wPhy + wChem + wMath;
                        const totalM = mPhy + mChem + mMath;
                        const totalL = lPhy + lChem + lMath;

                        const pct = (v: number, max: number) => Math.min(100, Math.round((v / max) * 100));

                        const subjects = [
                          {
                            label: 'Physics', emoji: '⚡', maxPer: 100,
                            week: wPhy, month: mPhy, life: lPhy,
                            bg: 'from-cyan-500 to-blue-600', light: 'bg-cyan-50', border: 'border-cyan-200',
                            textColor: 'text-cyan-700', barColor: 'bg-cyan-500',
                          },
                          {
                            label: 'Chemistry', emoji: '🧪', maxPer: 100,
                            week: wChem, month: mChem, life: lChem,
                            bg: 'from-purple-500 to-violet-600', light: 'bg-purple-50', border: 'border-purple-200',
                            textColor: 'text-purple-700', barColor: 'bg-purple-500',
                          },
                          {
                            label: 'Mathematics', emoji: '📐', maxPer: 100,
                            week: wMath, month: mMath, life: lMath,
                            bg: 'from-orange-400 to-amber-600', light: 'bg-orange-50', border: 'border-orange-200',
                            textColor: 'text-orange-700', barColor: 'bg-orange-500',
                          },
                        ];

                        return (
                          <div className="space-y-4">
                            {/* Overall Mock Total strip */}
                            <div className="bg-gradient-to-r from-[#1b3b2a] to-[#2d5c42] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">🏆</div>
                                <div>
                                  <div className="text-white font-black text-[15px]">Overall Mock Test Scores</div>
                                  <div className="text-white/60 text-[11px] font-semibold">Combined Physics + Chemistry + Mathematics (out of 300)</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                {[
                                  { label: 'This Week', val: totalW, color: 'text-emerald-300' },
                                  { label: 'This Month', val: totalM, color: 'text-blue-300' },
                                  { label: 'Lifetime', val: totalL, color: 'text-amber-300' },
                                ].map(item => (
                                  <div key={item.label} className="text-center">
                                    <div className={`text-[22px] font-black ${item.color}`}>{item.val}</div>
                                    <div className="text-white/50 text-[10px] font-bold uppercase tracking-wide">{item.label}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Per-subject cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {subjects.map(sub => (
                                <div key={sub.label} className={`${sub.light} ${sub.border} border rounded-2xl overflow-hidden shadow-xs`}>
                                  {/* Card header */}
                                  <div className={`bg-gradient-to-r ${sub.bg} px-4 py-3 flex items-center gap-2`}>
                                    <span className="text-xl">{sub.emoji}</span>
                                    <span className="text-white font-black text-[14px] tracking-tight">{sub.label}</span>
                                  </div>
                                  {/* Marks table */}
                                  <div className="p-4 space-y-3">
                                    {[
                                      { period: 'This Week', val: sub.week },
                                      { period: 'This Month', val: sub.month },
                                      { period: 'Lifetime', val: sub.life },
                                    ].map(row => (
                                      <div key={row.period}>
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{row.period}</span>
                                          <span className={`text-[15px] font-black ${sub.textColor}`}>{row.val}<span className="text-[11px] text-gray-400 font-semibold">/100</span></span>
                                        </div>
                                        <div className="h-1.5 bg-white rounded-full overflow-hidden border border-black/5">
                                          <div
                                            className={`h-full ${sub.barColor} rounded-full transition-all duration-700`}
                                            style={{ width: `${pct(row.val, sub.maxPer)}%` }}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                    {/* Study hours + Qs tiny row */}
                                    <div className={`mt-3 pt-3 border-t ${sub.border} flex items-center justify-between text-[11px]`}>
                                      <span className="text-gray-500 font-semibold">
                                        📚 {sub.label === 'Physics' ? (currentRep.physics || 0).toFixed(1) : sub.label === 'Chemistry' ? (currentRep.chem || 0).toFixed(1) : (currentRep.maths || 0).toFixed(1)}h/wk
                                      </span>
                                      <span className="text-gray-500 font-semibold">
                                        ✏️ {sub.label === 'Physics' ? Math.round((currentRep.physics || 0) * 10) : sub.label === 'Chemistry' ? Math.round((currentRep.chem || 0) * 12) : Math.round((currentRep.maths || 0) * 15)} Qs/wk
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}


                      {/* ── Mock Test Score Graphs ── */}
                      {(() => {
                        const attempts = selectedStudentMockAttempts || [];
                        const sorted = [...attempts]
                          .filter(a => a.submittedAt)
                          .sort((a, b) => {
                            const da = a.submittedAt.seconds ? a.submittedAt.seconds : new Date(a.submittedAt).getTime() / 1000;
                            const db2 = b.submittedAt.seconds ? b.submittedAt.seconds : new Date(b.submittedAt).getTime() / 1000;
                            return da - db2;
                          });

                        if (sorted.length < 2) {
                          return (
                            <div className="bg-white border border-[#ece9e3] rounded-2xl p-8 shadow-xs text-center">
                              <div className="text-3xl mb-2">📊</div>
                              <h3 className="font-extrabold text-[#1b1c19] text-[15px] font-display mb-1">Not enough mock test data yet</h3>
                              <p className="text-[12.5px] text-gray-400 font-semibold max-w-sm mx-auto">
                                This student needs 2+ synced mock test attempts before a score trend can be shown.
                                {sorted.length === 1 ? ' Currently 1 synced attempt on file.' : ' No synced attempts on file yet.'}
                              </p>
                            </div>
                          );
                        }

                        const chartData: { test: string; total: number; physics: number; chemistry: number; mathematics: number }[] = sorted.map((a, i) => {
                          const s = a.scores || {};
                          const phy = s.physics || 0;
                          const chem = s.chemistry || 0;
                          const math = s.mathematics || 0;
                          return { test: `Test ${i + 1}`, total: phy + chem + math, physics: phy, chemistry: chem, mathematics: math };
                        });

                        const subjectMeta = [
                          { key: 'physics' as const, label: 'Physics', emoji: '⚡', color: '#06B6D4' },
                          { key: 'chemistry' as const, label: 'Chemistry', emoji: '🧪', color: '#A855F7' },
                          { key: 'mathematics' as const, label: 'Mathematics', emoji: '📐', color: '#F97316' },
                        ];

                        return (
                          <div className="space-y-5">
                            {/* Total Score Trend - full width */}
                            <div className="bg-white border border-[#ece9e3] rounded-2xl p-5 shadow-xs space-y-4">
                              <div>
                                <h3 className="font-extrabold text-[#1b1c19] text-[15px] font-display">📊 Mock Test Total Score Trend</h3>
                                <p className="text-[12px] text-gray-400 font-semibold">Combined score (Physics + Chemistry + Mathematics) out of 300</p>
                              </div>
                              <div className="h-72 pt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ec" />
                                    <XAxis dataKey="test" tick={{ fontSize: 11, fill: "#83837c", fontWeight: 700 }} />
                                    <YAxis domain={[0, 300]} tick={{ fontSize: 10, fill: "#83837c" }} />
                                    <Tooltip
                                      contentStyle={{ borderRadius: 12, border: '1px solid #ece9e3', fontWeight: 700, fontSize: 12 }}
                                      formatter={(val: any) => [`${val} / 300`, 'Total']}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="total"
                                      stroke="#1b3b2a"
                                      strokeWidth={3}
                                      dot={{ r: 5, fill: '#1b3b2a', stroke: '#fff', strokeWidth: 2 }}
                                      activeDot={{ r: 7, stroke: '#1b3b2a', strokeWidth: 2 }}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            {/* Subject Score Trends - single full-width chart with toggleable lines */}
                            <div className="bg-white border border-[#ece9e3] rounded-2xl p-5 shadow-xs space-y-4">
                              <div>
                                <h3 className="font-extrabold text-[#1b1c19] text-[15px] font-display">📈 Subject-wise Score Breakdown</h3>
                                <p className="text-[12px] text-gray-400 font-semibold">Individual subject scores per mock test (out of 100) — click a subject to toggle</p>
                              </div>
                              <div className="h-72 pt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ec" />
                                    <XAxis dataKey="test" tick={{ fontSize: 11, fill: "#83837c", fontWeight: 700 }} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#83837c" }} />
                                    <Tooltip
                                      contentStyle={{ borderRadius: 12, border: '1px solid #ece9e3', fontWeight: 700, fontSize: 12 }}
                                    />
                                    {visibleSubjects.physics && (
                                      <Line
                                        type="monotone"
                                        dataKey="physics"
                                        name="Physics"
                                        stroke="#06B6D4"
                                        strokeWidth={2.5}
                                        dot={{ r: 4, fill: '#06B6D4', stroke: '#fff', strokeWidth: 2 }}
                                        activeDot={{ r: 6 }}
                                      />
                                    )}
                                    {visibleSubjects.chemistry && (
                                      <Line
                                        type="monotone"
                                        dataKey="chemistry"
                                        name="Chemistry"
                                        stroke="#A855F7"
                                        strokeWidth={2.5}
                                        dot={{ r: 4, fill: '#A855F7', stroke: '#fff', strokeWidth: 2 }}
                                        activeDot={{ r: 6 }}
                                      />
                                    )}
                                    {visibleSubjects.mathematics && (
                                      <Line
                                        type="monotone"
                                        dataKey="mathematics"
                                        name="Mathematics"
                                        stroke="#F97316"
                                        strokeWidth={2.5}
                                        dot={{ r: 4, fill: '#F97316', stroke: '#fff', strokeWidth: 2 }}
                                        activeDot={{ r: 6 }}
                                      />
                                    )}
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                              {/* Interactive clickable legend */}
                              <div className="flex items-center justify-center gap-5 pt-1">
                                {subjectMeta.map(sub => {
                                  const isActive = visibleSubjects[sub.key];
                                  return (
                                    <button
                                      key={sub.key}
                                      onClick={() => setVisibleSubjects(prev => ({ ...prev, [sub.key]: !prev[sub.key] }))}
                                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer border ${
                                        isActive
                                          ? 'border-transparent shadow-sm'
                                          : 'border-gray-200 bg-gray-50 text-gray-400 line-through'
                                      }`}
                                      style={isActive ? { color: sub.color, backgroundColor: sub.color + '15', borderColor: sub.color + '40' } : {}}
                                    >
                                      <span
                                        className="w-3 h-3 rounded-full inline-block transition-all"
                                        style={{ backgroundColor: isActive ? sub.color : '#ccc' }}
                                      />
                                      {sub.emoji} {sub.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    /* -------------------------------------------------------- */
                    /* LOG SHEETS & WEEKLY VERIFICATION PANEL                    */
                    /* -------------------------------------------------------- */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left Column: Raw Logs Table */}
                      <div className="lg:col-span-2 bg-white border border-[#ece9e3] p-5 rounded-2xl shadow-xs space-y-4">
                        <div>
                          <h3 className="font-extrabold text-[#1b1c19] text-[15.5px]">Weekly Activity Report</h3>
                          <p className="text-[12.5px] text-[#83837c] font-medium mt-0.5">As reported by student (Refreshed starting Monday)</p>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm border-collapse">
                            <thead>
                              <tr className="text-gray-400 border-b border-gray-100 text-[11px] font-black uppercase tracking-wider">
                                <th className="py-2.5">Date</th>
                                <th className="py-2.5">Subject / Activity</th>
                                <th className="py-2.5">Hours</th>
                                <th className="py-2.5">Questions Solved</th>
                                <th className="py-2.5">DPP Solved</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 text-[13px] font-medium text-gray-700">
                              {/* Dynamic entries loaded from Firestore logs */}
                              {selectedStudentLogs.length === 0 ? (
                                <tr className="hover:bg-gray-50/50">
                                  <td className="py-8 text-center text-gray-400 font-bold" colSpan={5}>
                                    No study logs recorded by this student yet.
                                  </td>
                                </tr>
                              ) : (
                                (() => {
                                  const renderedRows: any[] = [];
                                  selectedStudentLogs.forEach((log) => {
                                    const dateObj = new Date(log.date + 'T12:00:00');
                                    const dateString = dateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                                    
                                    if (!log.entries || log.entries.length === 0) {
                                      renderedRows.push(
                                        <tr key={log.date} className="hover:bg-gray-50/50 border-t border-gray-100">
                                          <td className="py-3 font-bold text-gray-900">{dateString}</td>
                                          <td className="py-3 text-gray-400 italic" colSpan={4}>No entries logged for this date.</td>
                                        </tr>
                                      );
                                    } else {
                                      log.entries.forEach((entry: any, entryIdx: number) => {
                                        renderedRows.push(
                                          <tr key={`${log.date}-${entryIdx}`} className="hover:bg-gray-50/50 border-t border-gray-100">
                                            <td className="py-3 font-bold text-gray-900">{entryIdx === 0 ? dateString : ''}</td>
                                            <td className="py-3">{entry.subject}</td>
                                            <td className="py-3">{(entry.minutes / 60).toFixed(1)} h</td>
                                            <td className="py-3">{entry.questionsSolved}</td>
                                            <td className="py-3">
                                              {entry.dppStatus === 'completed' ? (
                                                <span className="w-4.5 h-4.5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-extrabold text-xs">✓</span>
                                              ) : entry.dppStatus === 'progress' ? (
                                                <span className="w-4.5 h-4.5 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-extrabold text-xs">~</span>
                                              ) : (
                                                <span className="text-gray-300 font-black">—</span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      });
                                    }
                                  });
                                  return renderedRows;
                                })()
                              )}

                              {/* Rollup totals row computed dynamically */}
                              <tr className="bg-[#faf9f5] font-extrabold text-[#1b1c19] border-t-2 border-[#ece9e3]">
                                <td className="py-3.5 px-3" colSpan={2}>Total Logged</td>
                                <td className="py-3.5">
                                  {(selectedStudentLogs.reduce((acc, log) => acc + (log.entries ? log.entries.reduce((sum: number, e: any) => sum + e.minutes, 0) : 0), 0) / 60).toFixed(1)} h
                                </td>
                                <td className="py-3.5">
                                  {selectedStudentLogs.reduce((acc, log) => acc + (log.entries ? log.entries.reduce((sum: number, e: any) => sum + e.questionsSolved, 0) : 0), 0).toLocaleString()} Qs
                                </td>
                                <td className="py-3.5">
                                  {selectedStudentLogs.reduce((acc, log) => acc + (log.entries ? log.entries.filter((e: any) => e.dppStatus === 'completed').length : 0), 0)} DPPs
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="flex items-center gap-4 text-[11.5px] font-bold text-[#83837c] bg-[#faf9f5] p-3 rounded-xl border border-[#ece9e3]/60">
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0" /> DPP Completed</span>
                          <span className="flex items-center gap-1.5"><span className="text-gray-300 font-black">—</span> No DPP</span>
                        </div>
                      </div>

                      {/* Right Side Info Panels (Flags, Notes, Adjustment Form) */}
                      <div className="space-y-6">
                        {(() => {
                          const retroactiveLogs = selectedStudentLogs.filter(log => log.retroactive || (log.editHistory && log.editHistory.length > 1));
                          const anomalousLogs = selectedStudentLogs.filter(log => (log.entries ? log.entries.reduce((sum: number, e: any) => sum + e.minutes, 0) : 0) > 360); // > 6 hours
                          const activeFlagsCount = retroactiveLogs.length + anomalousLogs.length;
                          
                          return (
                            <>
                              <h3 className="font-extrabold text-[#1b1c19] text-[14.5px]">
                                Flags &amp; Alerts <span className="text-red-500">({activeFlagsCount})</span>
                              </h3>
                              
                              <div className="space-y-3 text-[12.5px] font-semibold">
                                {retroactiveLogs.map((log) => (
                                  <div key={log.date} className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl space-y-1">
                                    <span className="flex items-center gap-1.5 font-extrabold">
                                      <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                                      Retroactive Edit Detected
                                    </span>
                                    <p className="text-[11.5px] text-red-600 font-medium leading-relaxed">
                                      Log for {log.date} was created or edited retroactively.
                                    </p>
                                  </div>
                                ))}

                                {anomalousLogs.map((log) => {
                                  const totalMins = log.entries ? log.entries.reduce((sum: number, e: any) => sum + e.minutes, 0) : 0;
                                  return (
                                    <div key={log.date} className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl space-y-1">
                                      <span className="flex items-center gap-1.5 font-extrabold">
                                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                                        Unusual Activity Pattern
                                      </span>
                                      <p className="text-[11.5px] text-amber-600 font-medium leading-relaxed">
                                        Study hours on {log.date} ({(totalMins / 60).toFixed(1)}h) are unusually high.
                                      </p>
                                    </div>
                                  );
                                })}

                                {activeFlagsCount === 0 && (
                                  <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 text-emerald-800 rounded-xl text-center text-xs font-semibold">
                                    ✓ No study integrity issues detected.
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}

                        {/* Previous Student Notes */}
                        <div className="bg-white border border-[#ece9e3] rounded-2xl p-5 shadow-xs space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-extrabold text-[#1b1c19] text-[14.5px]">Previous Student Notes</h3>
                            <button 
                              onClick={() => setShowAllNotesModal(true)}
                              className="text-xs text-indigo-600 hover:underline font-extrabold cursor-pointer"
                            >
                              View All Notes
                            </button>
                          </div>
                          
                          <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                            {studentNotesHistory[selectedStudentId] && studentNotesHistory[selectedStudentId].length > 0 ? (
                              <>
                                <h4 className="text-[12px] font-extrabold text-gray-800">
                                  {studentNotesHistory[selectedStudentId][0].week} Note
                                </h4>
                                <p className="text-[12px] text-gray-600 font-medium mt-1">
                                  "{studentNotesHistory[selectedStudentId][0].note}"
                                </p>
                                <p className="text-[10px] text-gray-400 font-bold mt-2">
                                  — {studentNotesHistory[selectedStudentId][0].author} ({studentNotesHistory[selectedStudentId][0].date})
                                </p>
                              </>
                            ) : (
                              <>
                                <h4 className="text-[12px] font-extrabold text-gray-800">Week 17 Note</h4>
                                <p className="text-[12px] text-gray-600 font-medium mt-1">
                                  "{selectedStudentId === 1 ? teacherNotes : "No guidance notes left yet for this week."}"
                                </p>
                                <p className="text-[10px] text-gray-400 font-bold mt-2">— Yash Sir (2 May 2025)</p>
                              </>
                            )}
                          </div>

                          {/* Add new temporary notes */}
                          <div className="space-y-1.5 pt-1">
                            <label className="text-[11px] font-black uppercase text-gray-500 tracking-wider">Leave a new Note</label>
                            <textarea 
                              value={newNote}
                              onChange={(e) => setNewNote(e.target.value)}
                              placeholder={`Add guidance note for ${currentRep?.name || 'student'}...`}
                              className="w-full text-xs p-2.5 border border-[#ece9e3] rounded-xl focus:outline-none resize-none bg-[#faf9f5]"
                              rows={2}
                            />
                            <button 
                              onClick={handleAddNote}
                              className="text-xs bg-[#1b3b2a] hover:bg-[#142d20] text-white px-3 py-1.5 rounded-lg font-extrabold transition-all cursor-pointer border-none"
                            >
                              Add Note
                            </button>
                          </div>
                        </div>

                        {/* Teacher Adjustment (Optional) form */}
                        <div className="bg-white border border-[#ece9e3] rounded-2xl p-5 shadow-xs space-y-4">
                          <div>
                            <h3 className="font-extrabold text-[#1b1c19] text-[14.5px]">Teacher Adjustment (Optional)</h3>
                            <p className="text-[11.5px] text-[#83837c] font-medium mt-0.5">Adjust points if required.</p>
                          </div>

                          <div className="space-y-3.5">
                            <div className="space-y-1.5">
                              <label className="text-[11.5px] font-black uppercase text-gray-500 tracking-wider">Adjustment (Points)</label>
                              <input 
                                type="text"
                                placeholder="e.g., +20 or -15"
                                value={adjustmentPoints}
                                onChange={(e) => setAdjustmentPoints(e.target.value)}
                                className="w-full text-[13px] bg-[#faf9f5] p-2.5 border border-[#ece9e3] rounded-xl focus:outline-none"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[11.5px] font-black uppercase text-gray-500 tracking-wider">Reason (Optional)</label>
                              <textarea 
                                placeholder="Provide justification..."
                                value={adjustmentReason}
                                onChange={(e) => setAdjustmentReason(e.target.value)}
                                className="w-full text-[13px] bg-[#faf9f5] p-2.5 border border-[#ece9e3] rounded-xl focus:outline-none resize-none h-16"
                              />
                            </div>

                            <div className="flex flex-col gap-2 pt-2">
                              <button 
                                onClick={() => handleApproveStudent(currentRep.id)}
                                className="w-full bg-[#1b3b2a] hover:bg-[#142d20] text-white font-extrabold text-[12.5px] py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs border-none"
                              >
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                Approve
                              </button>
                              <button 
                                onClick={() => handleAdjustAndApprove(currentRep.id)}
                                className="w-full border border-purple-200 hover:bg-purple-50 text-purple-700 font-extrabold text-[12.5px] py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                              >
                                <Pencil className="w-4 h-4 shrink-0" />
                                Adjust &amp; Approve
                              </button>
                            </div>

                            <p className="text-[10px] text-center font-bold uppercase tracking-wider text-gray-400">
                              Approving will freeze this week's report.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Previous / Next student footer pagination bar (Image 3 Bottom) */}
                  <div className="bg-white border border-[#ece9e3] p-4 rounded-xl flex items-center justify-between text-xs font-black uppercase tracking-wider text-[#1b1c19] shadow-xs">
                    <button 
                      onClick={() => prevStudent && setSelectedStudentId(prevStudent.id)}
                      disabled={!prevStudent}
                      className={`flex items-center gap-1.5 hover:text-[#1b3b2a] transition-all ${
                        !prevStudent ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                      }`}
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" /> Previous Student {prevStudent ? `(${prevStudent.name})` : ""}
                    </button>
                    <button 
                      onClick={() => nextStudent && setSelectedStudentId(nextStudent.id)}
                      disabled={!nextStudent}
                      className={`flex items-center gap-1.5 hover:text-[#1b3b2a] transition-all ${
                        !nextStudent ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                      }`}
                    >
                      Next Student {nextStudent ? `(${nextStudent.name})` : ""} <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/*  LEADERBOARDS VIEW (IMAGE 5)                                   */}
      {/* -------------------------------------------------------------- */}
      {page === "leaderboards" && (
        <div id="teacher-leaderboards-view" className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[#1b1c19] tracking-tight font-display">
                Leaderboards
              </h1>
              <p className="text-[13.5px] text-[#555651] font-medium mt-0.5">
                View class rankings based on points.
              </p>
            </div>
            
            {/* Context header values */}
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <span className="px-3 py-1.5 bg-white border border-[#ece9e3] text-[12px] font-bold text-[#1b1c19] rounded-xl flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                7 May 2025 (Wed)
              </span>
              <button
                onClick={() => onPageChange && onPageChange("reports")}
                className="relative w-9 h-9 bg-white border border-[#ece9e3] flex items-center justify-center rounded-xl cursor-pointer"
                title="View pending reports"
              >
                <Bell className="w-4.5 h-4.5 text-gray-500" />
                {reportQueue.filter(r => r.status === "Pending").length > 0 && (
                  <span className="absolute -top-1.5 -right-1 bg-red-500 text-white text-[9.5px] font-bold h-4 w-4 rounded-full flex items-center justify-center shadow-xs">
                    {reportQueue.filter(r => r.status === "Pending").length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Timeframe Tabs and Warning Banner row */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-2 border border-[#ece9e3] rounded-xl shadow-xs">
            {/* Interactive Timeframe Tabs */}
            <div className="flex bg-[#faf9f5] border border-[#ece9e3]/60 p-1 rounded-xl shrink-0">
              {(['daily', 'weekly', 'lifetime'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveLeaderboardTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    activeLeaderboardTab === tab
                      ? 'bg-[#1b3b2a] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-black/3'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold px-3 py-1 bg-indigo-50/50 rounded-lg">
              <Info className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Leaderboard is based on teacher's current scoring formula. <span className="underline hover:cursor-pointer">View Formula</span></span>
            </div>
          </div>

          {/* Leaderboard Ranks Container */}
          <div className="bg-white border border-[#ece9e3] rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-[#1b1c19] text-[15.5px]">Daily Leaderboard</h3>
                <p className="text-[12.5px] text-[#83837c] font-medium mt-0.5">Based on points earned on 7 May 2025</p>
              </div>
              <button 
                onClick={() => showToast("Exporting leaderboard data...")}
                className="flex items-center gap-1.5 border border-[#ece9e3] hover:bg-gray-50 rounded-xl px-3.5 py-2 text-[12px] font-bold text-gray-600 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Export
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="text-gray-500 border-b border-[#ece9e3] bg-[#faf9f5] text-[11px] font-black uppercase tracking-wider">
                    <th className="py-3 px-5 w-24">Rank</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Points</th>
                    <th className="py-3 px-5 text-right">Change (vs Yesterday)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece9e3]/60">
                  {(() => {
                    const sorted = [...studentsList];
                    if (activeLeaderboardTab === 'lifetime') {
                      sorted.sort((a, b) => b.overall - a.overall);
                    } else {
                      sorted.sort((a, b) => b.weekly - a.weekly);
                    }
                    return sorted.map((row, idx) => {
                      const rank = idx + 1;
                      const points = activeLeaderboardTab === 'lifetime' ? row.overall : row.weekly;
                      return (
                        <tr key={row.id} className={`hover:bg-gray-50/60 transition-colors ${rank === 1 ? "bg-amber-50/20" : ""}`}>
                          <td className="py-3.5 px-5">
                            {rank === 1 ? (
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-amber-400 text-white flex items-center justify-center font-black text-xs shadow-xs">🏆</span>
                                <span className="font-black text-gray-900">1st</span>
                              </div>
                            ) : rank === 2 ? (
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-800 flex items-center justify-center font-black text-xs shadow-xs">🥈</span>
                                <span className="font-black text-gray-900">2nd</span>
                              </div>
                            ) : rank === 3 ? (
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-amber-700 text-amber-50 flex items-center justify-center font-black text-xs shadow-xs">🥉</span>
                                <span className="font-black text-gray-900">3rd</span>
                              </div>
                            ) : (
                              <span className="font-bold text-gray-500 pl-2">{rank}th</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-extrabold text-gray-900">
                             <div className="flex items-center gap-2.5">
                               <div className={`w-8.5 h-8.5 rounded-full ${row.color || 'bg-emerald-100 text-emerald-800'} flex items-center justify-center font-bold text-xs shrink-0`}>
                                 {row.initials}
                               </div>
                               <span>{row.name}</span>
                             </div>
                           </td>
                           <td className="py-3.5 px-4 font-black text-indigo-600 text-[14px]">
                             {points.toLocaleString()} <span className="text-xs text-gray-400 font-medium">pts</span>
                           </td>
                           <td className="py-3.5 px-5 text-right">
                             {row.weekly > 10 ? (
                               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-black rounded-lg">
                                 <TrendingUp className="w-3.5 h-3.5" /> ↑ {row.weekly}
                               </span>
                             ) : (
                               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-gray-400 text-xs font-black">
                                 <Minus className="w-3.5 h-3.5" /> — 0
                               </span>
                             )}
                           </td>
                         </tr>
                       );
                     });
                   })()}
                </tbody>
              </table>
            </div>

            {/* Bottom standings metadata info row */}
            <div className="p-4 bg-gray-50/50 border-t border-[#ece9e3] flex flex-col sm:flex-row items-center justify-between text-xs font-semibold text-gray-500 gap-2">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-gray-400" /> Total Students: {studentsList.length}.
                <button
                  onClick={() => showToast("Leaderboard refreshed")}
                  className="text-[#1b3b2a] hover:underline flex items-center gap-1 font-bold ml-1"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </span>
              <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                Rankings update in real-time as students earn points.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/*  ANALYTICS VIEW (IMAGE 6)                                      */}
      {/* -------------------------------------------------------------- */}
      {page === "analytics" && (
        <div id="teacher-analytics-view" className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[#1b1c19] tracking-tight font-display">
                Analytics
              </h1>
              <p className="text-[13.5px] text-[#555651] font-medium mt-0.5">
                Track class performance and study trends.
              </p>
            </div>
            
            {/* Header widgets */}
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <span className="px-3 py-1.5 bg-white border border-[#ece9e3] text-[12px] font-bold text-[#1b1c19] rounded-xl flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                1 May - 7 May 2025 (Week)
              </span>
              <button
                onClick={() => onPageChange && onPageChange("reports")}
                className="relative w-9 h-9 bg-white border border-[#ece9e3] flex items-center justify-center rounded-xl cursor-pointer"
                title="View pending reports"
              >
                <Bell className="w-4.5 h-4.5 text-gray-500" />
                {reportQueue.filter(r => r.status === "Pending").length > 0 && (
                  <span className="absolute -top-1.5 -right-1 bg-red-500 text-white text-[9.5px] font-bold h-4 w-4 rounded-full flex items-center justify-center shadow-xs">
                    {reportQueue.filter(r => r.status === "Pending").length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Category Tabs & Export bar */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-2 border border-[#ece9e3] rounded-xl shadow-xs">

            <button 
              onClick={() => showToast("Exporting analytics report data...")}
              className="flex items-center gap-1.5 border border-[#ece9e3] hover:bg-gray-50 rounded-xl px-3.5 py-2 text-[12px] font-bold text-gray-600 cursor-pointer self-end lg:self-auto"
            >
              <Download className="w-4 h-4" /> Export Data
            </button>
          </div>

          {/* Quick Metrics Row for Analytics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-[#ece9e3] p-4 rounded-xl shadow-xs text-left">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Avg. Class Score</div>
              <div className="text-xl font-extrabold text-[#1b1c19] mt-0.5">72.6%</div>
              <div className="text-[10px] text-emerald-700 font-bold mt-1">↑ 6.2% vs last week</div>
            </div>

            <div className="bg-white border border-[#ece9e3] p-4 rounded-xl shadow-xs text-left">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Points (This Week)</div>
              <div className="text-xl font-extrabold text-[#1b1c19] mt-0.5">34,680</div>
              <div className="text-[10px] text-emerald-700 font-bold mt-1">↑ 8.7% vs last week</div>
            </div>

            <div className="bg-white border border-[#ece9e3] p-4 rounded-xl shadow-xs text-left">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Study</div>
              <div className="text-xl font-extrabold text-[#1b1c19] mt-0.5">186h 24m</div>
              <div className="text-[10px] text-emerald-700 font-bold mt-1">↑ 12.4% vs last week</div>
            </div>

            <div className="bg-white border border-[#ece9e3] p-4 rounded-xl shadow-xs text-left">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">DPP Completion</div>
              <div className="text-xl font-extrabold text-amber-800 mt-0.5">76.3%</div>
              <div className="text-[10px] text-red-600 font-bold mt-1">↓ 3.1% vs last week</div>
            </div>

            <div className="bg-white border border-[#ece9e3] p-4 rounded-xl shadow-xs text-left">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">Mocks Attempted</div>
              <div className="text-xl font-extrabold text-[#1b1c19] mt-0.5">23</div>
              <div className="text-[10px] text-emerald-700 font-bold mt-1">↑ 2 vs last week</div>
            </div>
          </div>

          {/* Interactive Trend line chart and Donut points breakdown (2 Column Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Box: Points Trend line chart */}
            <div className="lg:col-span-2 bg-white border border-[#ece9e3] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#faf9f5]">
                <div>
                  <h3 className="font-extrabold text-[#1b1c19] text-[15.5px]">Points Trend</h3>
                  <p className="text-[12.5px] text-[#83837c] font-medium mt-0.5">Comparison of class points over daily intervals</p>
                </div>
                <select className="bg-white border border-[#ece9e3] px-2.5 py-1 text-[11px] font-black rounded-lg focus:outline-none">
                  <option>Daily</option>
                  <option>Weekly</option>
                </select>
              </div>

              {/* Chart Legend Labels */}
              <div className="flex items-center gap-4 text-[11px] font-bold text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 bg-indigo-600 inline-block" /> This Week
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 bg-gray-400 inline-block border-t border-dashed" /> Last Week
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 bg-indigo-300 inline-block border-t border-dashed" /> 2 Weeks Ago
                </span>
              </div>

              {/* Points Trend Chart representation */}
              <div className="h-64 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyTrendData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f6f5f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#83837c", fontWeight: "bold" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#83837c", fontWeight: "bold" }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="thisWeek" stroke="#4F46E5" strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="lastWeek" stroke="#9CA3AF" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    <Line type="monotone" dataKey="weeks2Ago" stroke="#A5B4FC" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right Box: Points Breakdown Donut Chart */}
            <div className="bg-white border border-[#ece9e3] rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="font-extrabold text-[#1b1c19] text-[15.5px]">Points Breakdown</h3>
                <p className="text-[12.5px] text-[#83837c] font-medium mt-0.5">This Week</p>
              </div>

              {/* Recharts PieChart container */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={classroomStats.breakdown}
                        dataKey="value"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {classroomStats.breakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-[15px] font-black text-[#1b1c19]">{classroomStats.grandTotalPoints.toLocaleString()}</p>
                    <p className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Total Points</p>
                  </div>
                </div>

                {/* Detailed points list matching Image 6 */}
                <div className="w-full space-y-1.5 pt-1 border-t border-gray-100 text-[12px]">
                  {classroomStats.breakdown.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium text-gray-600">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <span className="font-extrabold text-gray-900">{item.value.toLocaleString()} ({item.pct})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Grid Tables (Subject Performance & Activity Summary) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject Performance Table box */}
            <div className="bg-white border border-[#ece9e3] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#faf9f5] pb-3">
                <h3 className="font-extrabold text-[#1b1c19] text-[15.5px]">Subject Performance (This Week)</h3>
                <span className="text-[10.5px] text-gray-400 font-bold uppercase tracking-wider">Aggregated from mock test scores</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100 font-black uppercase tracking-wider">
                      <th className="py-2">Subject</th>
                      <th className="py-2">Avg. Score</th>
                      <th className="py-2">Total Points</th>
                      <th className="py-2 text-right">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-[13px] font-semibold text-gray-700">
                    <tr className="hover:bg-gray-50/50">
                      <td className="py-2.5 font-bold text-gray-900">Physics</td>
                      <td className="py-2.5">{subjectPoints.physicsPct}</td>
                      <td className="py-2.5">{subjectPoints.physics.toLocaleString()}</td>
                      <td className="py-2.5 text-right text-emerald-600 font-extrabold">—</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50">
                      <td className="py-2.5 font-bold text-gray-900">Chemistry</td>
                      <td className="py-2.5">{subjectPoints.chemPct}</td>
                      <td className="py-2.5">{subjectPoints.chemistry.toLocaleString()}</td>
                      <td className="py-2.5 text-right text-emerald-600 font-extrabold">—</td>
                    </tr>
                    <tr className="hover:bg-gray-50/50">
                      <td className="py-2.5 font-bold text-gray-900">Mathematics</td>
                      <td className="py-2.5">{subjectPoints.mathsPct}</td>
                      <td className="py-2.5">{subjectPoints.mathematics.toLocaleString()}</td>
                      <td className="py-2.5 text-right text-emerald-600 font-extrabold">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Activity Summary Box */}
            <div className="bg-white border border-[#ece9e3] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#faf9f5] pb-3">
                <h3 className="font-extrabold text-[#1b1c19] text-[15.5px]">Activity Summary (This Week)</h3>
                <span className="text-[10.5px] text-gray-400 font-bold uppercase tracking-wider">From daily logs</span>
              </div>

              <div className="space-y-3.5 text-[13px] font-semibold text-gray-700 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Total Study Hours</span>
                  <span className="font-extrabold text-gray-900">186h 24m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Total Questions Solved</span>
                  <span className="font-extrabold text-gray-900">2,846</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">DPPs Completed</span>
                  <span className="font-extrabold text-gray-900">152</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Mock Tests Attempted</span>
                  <span className="font-extrabold text-gray-900">23</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Status and Timestamp matching Image 6 Bottom */}
          <div className="p-4 bg-gray-50/80 border border-[#ece9e3] rounded-xl flex flex-col sm:flex-row items-center justify-between text-xs font-semibold text-gray-400 gap-2">
            <span>
              All metrics are based on logged data and may be updated as new data comes in.
            </span>
            <span className="font-bold uppercase text-[10px] tracking-wider text-gray-500">
              Last updated: 7 May 2025, 10:30 AM
            </span>
          </div>
        </div>
      )}

      {page === "scoring-settings" && (
        <TeacherScoringSettings showToast={showToast} classId={classId} />
      )}

      {showAllNotesModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#ece9e3] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#faf9f5]">
              <div>
                <h3 className="font-extrabold text-[#1b1c19] text-[15px]">Historical Guidance Notes</h3>
                <p className="text-xs text-gray-400 mt-0.5">All historic notes left for {currentRep?.name || "student"}</p>
              </div>
              <button 
                onClick={() => setShowAllNotesModal(false)}
                className="text-gray-400 hover:text-gray-600 font-extrabold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-5 max-h-[350px] overflow-y-auto space-y-3.5">
              {studentNotesHistory[selectedStudentId] && studentNotesHistory[selectedStudentId].length > 0 ? (
                studentNotesHistory[selectedStudentId].map((n, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-xs text-gray-400 font-bold">
                      <span className="text-[#1b3b2a] font-extrabold">{n.week}</span>
                      <span>{n.date}</span>
                    </div>
                    <p className="text-[13px] text-gray-700 font-medium leading-relaxed">
                      "{n.note}"
                    </p>
                    <p className="text-[10px] text-right text-gray-400 font-bold">— Left by {n.author}</p>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-400 font-bold text-sm">
                  No historical notes found for this student.
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-[#faf9f5] flex justify-end">
              <button 
                onClick={() => setShowAllNotesModal(false)}
                className="bg-[#1b3b2a] hover:bg-[#142d20] text-white text-xs font-extrabold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Close Guidance History
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function TeacherScoringSettings({ showToast, classId }: { showToast: (msg: string) => void, classId: string }) {
  const [config, setConfig] = useState({
    mode: 'baseline',
    ptsPer10Min: 1,
    ptsPerQuestion: 1,
    ptsPerDpp: 5,
    ptsPerMockSync: 10
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const configRef = doc(db, 'classes', classId, 'settings', 'scoring');
    const unsubscribe = onSnapshot(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setConfig(data as any);
      }
      setLoading(false);
    }, (error) => {
      console.warn("Settings fetch blocked, using offline state:", error);
      const stored = localStorage.getItem('scoring_config');
      if (stored) {
        try { setConfig(JSON.parse(stored)); } catch (e) {}
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [classId]);

  const applyPreset = (preset: string) => {
    let updates = { mode: preset, ptsPer10Min: 1, ptsPerQuestion: 1, ptsPerDpp: 5, ptsPerMockSync: 10 };
    if (preset === 'baseline') {
      updates = { mode: 'baseline', ptsPer10Min: 1, ptsPerQuestion: 1, ptsPerDpp: 5, ptsPerMockSync: 10 };
    } else if (preset === 'sprint') {
      updates = { mode: 'sprint', ptsPer10Min: 0.5, ptsPerQuestion: 0.5, ptsPerDpp: 2, ptsPerMockSync: 100 };
    } else if (preset === 'marathon') {
      updates = { mode: 'marathon', ptsPer10Min: 0.5, ptsPerQuestion: 3, ptsPerDpp: 2, ptsPerMockSync: 10 };
    } else if (preset === 'foundation') {
      updates = { mode: 'foundation', ptsPer10Min: 5, ptsPerQuestion: 0.5, ptsPerDpp: 10, ptsPerMockSync: 5 };
    } else if (preset === 'custom') {
      updates = { ...config, mode: 'custom' };
    }
    setConfig(updates);
  };

  const handleSave = async () => {
    try {
      const configRef = doc(db, 'classes', classId, 'settings', 'scoring');
      await setDoc(configRef, config);
      localStorage.setItem('scoring_config', JSON.stringify(config));
      showToast("Scoring policy updated and broadcasted class-wide!");
    } catch (err) {
      console.warn("Failed to save scoring policy to Firestore, using local fallback:", err);
      localStorage.setItem('scoring_config', JSON.stringify(config));
      showToast("Scoring policy saved locally (offline mode active)!");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-black text-[#1b1c19] tracking-tight font-display uppercase">
          Scoring Policy &amp; Presets
        </h1>
        <p className="text-[13.5px] text-[#555651] font-medium mt-0.5">
          Configure dynamic point weights class-wide based on the active coaching phase.
        </p>
      </div>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Preset 1: Baseline */}
        <div 
          onClick={() => applyPreset('baseline')}
          className={`p-4.5 rounded-2xl border cursor-pointer transition-all ${
            config.mode === 'baseline' 
              ? 'border-emerald-600 bg-emerald-50/15 shadow-sm ring-1 ring-emerald-600/30' 
              : 'border-[#ece9e3] bg-white hover:bg-gray-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-black uppercase text-emerald-800">📘 Baseline Standard</span>
            {config.mode === 'baseline' && <Check className="w-4 h-4 text-emerald-600" />}
          </div>
          <p className="text-[11.5px] text-gray-500 mt-2 leading-relaxed font-semibold">
            Balanced weighting. Ideal for normal study habits and sustained consistency.
          </p>
          <div className="mt-3.5 pt-3.5 border-t border-gray-100 flex flex-wrap gap-2 text-[10px] font-bold text-gray-600">
            <span className="bg-gray-100 px-2 py-0.5 rounded">10m = 1pt</span>
            <span className="bg-gray-100 px-2 py-0.5 rounded">1Q = 1pt</span>
            <span className="bg-gray-100 px-2 py-0.5 rounded">DPP = 5pts</span>
            <span className="bg-gray-100 px-2 py-0.5 rounded">Mock = 10pts</span>
          </div>
        </div>

        {/* Preset 2: Sprint Mode */}
        <div 
          onClick={() => applyPreset('sprint')}
          className={`p-4.5 rounded-2xl border cursor-pointer transition-all ${
            config.mode === 'sprint' 
              ? 'border-indigo-600 bg-indigo-50/15 shadow-sm ring-1 ring-indigo-600/30' 
              : 'border-[#ece9e3] bg-white hover:bg-gray-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-black uppercase text-indigo-800">⚡ Sprint (Exams Near)</span>
            {config.mode === 'sprint' && <Check className="w-4 h-4 text-indigo-600" />}
          </div>
          <p className="text-[11.5px] text-gray-500 mt-2 leading-relaxed font-semibold">
            Prioritizes test diagnostics. Massive scoring boost for taking and syncing mock tests.
          </p>
          <div className="mt-3.5 pt-3.5 border-t border-gray-100 flex flex-wrap gap-2 text-[10px] font-bold text-gray-600">
            <span className="bg-gray-100 px-2 py-0.5 rounded">10m = 0.5pt</span>
            <span className="bg-gray-100 px-2 py-0.5 rounded">1Q = 0.5pt</span>
            <span className="bg-gray-100 px-2 py-0.5 rounded">DPP = 2pts</span>
            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Mock = 100pts</span>
          </div>
        </div>

        {/* Preset 3: Practice Marathon */}
        <div 
          onClick={() => applyPreset('marathon')}
          className={`p-4.5 rounded-2xl border cursor-pointer transition-all ${
            config.mode === 'marathon' 
              ? 'border-amber-600 bg-amber-50/15 shadow-sm ring-1 ring-amber-600/30' 
              : 'border-[#ece9e3] bg-white hover:bg-gray-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-black uppercase text-amber-800">📚 Practice Marathon</span>
            {config.mode === 'marathon' && <Check className="w-4 h-4 text-amber-600" />}
          </div>
          <p className="text-[11.5px] text-gray-500 mt-2 leading-relaxed font-semibold">
            Encourages solving large volumes of questions. Ideal for reference sheets solving phase.
          </p>
          <div className="mt-3.5 pt-3.5 border-t border-gray-100 flex flex-wrap gap-2 text-[10px] font-bold text-gray-600">
            <span className="bg-gray-100 px-2 py-0.5 rounded">10m = 0.5pt</span>
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded">1Q = 3pts</span>
            <span className="bg-gray-100 px-2 py-0.5 rounded">DPP = 2pts</span>
            <span className="bg-gray-100 px-2 py-0.5 rounded">Mock = 10pts</span>
          </div>
        </div>

        {/* Preset 4: Foundation Builder */}
        <div 
          onClick={() => applyPreset('foundation')}
          className={`p-4.5 rounded-2xl border cursor-pointer transition-all ${
            config.mode === 'foundation' 
              ? 'border-rose-600 bg-rose-50/15 shadow-sm ring-1 ring-rose-600/30' 
              : 'border-[#ece9e3] bg-white hover:bg-gray-50/50'
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-black uppercase text-rose-800">⏰ Foundation Builder</span>
            {config.mode === 'foundation' && <Check className="w-4 h-4 text-rose-600" />}
          </div>
          <p className="text-[11.5px] text-gray-500 mt-2 leading-relaxed font-semibold">
            Rewards sitting down and starting to study. Focuses heavily on log time &amp; dpps.
          </p>
          <div className="mt-3.5 pt-3.5 border-t border-gray-100 flex flex-wrap gap-2 text-[10px] font-bold text-gray-600">
            <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded">10m = 5pts</span>
            <span className="bg-gray-100 px-2 py-0.5 rounded">1Q = 0.5pt</span>
            <span className="bg-gray-100 px-2 py-0.5 rounded">DPP = 10pts</span>
            <span className="bg-gray-100 px-2 py-0.5 rounded">Mock = 5pts</span>
          </div>
        </div>
      </div>

      {/* Settings Builder Config Detail Card */}
      <div className="bg-white border border-[#ece9e3] p-6 rounded-2xl shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-[#faf9f5] pb-3">
          <h3 className="font-extrabold text-[#1b1c19] text-[15.5px] font-display">
            {config.mode === 'custom' ? 'Custom Formula Configurator' : 'Active Weighting Summary'}
          </h3>
          <button 
            onClick={() => applyPreset('custom')}
            className={`px-3 py-1 text-xs font-black rounded-lg border transition-all cursor-pointer ${
              config.mode === 'custom' ? 'bg-amber-600 border-amber-600 text-white' : 'bg-[#faf9f5] border-[#ece9e3] text-gray-600 hover:bg-gray-100'
            }`}
          >
            Custom Config Builder
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4.5">
          {/* Input 1: study duration */}
          <div>
            <label className="block text-[11px] font-bold text-[#83837c] uppercase tracking-wider mb-2">Points per 10m Study</label>
            <input 
              type="number"
              disabled={config.mode !== 'custom'}
              value={config.ptsPer10Min}
              onChange={(e) => setConfig({ ...config, ptsPer10Min: parseFloat(e.target.value) || 0 })}
              className="w-full bg-[#faf9f5] border border-[#ece9e3] text-[13.5px] font-bold text-gray-800 rounded-xl p-2.5 focus:outline-none focus:border-indigo-600 disabled:opacity-65"
            />
          </div>
          
          {/* Input 2: questions solved */}
          <div>
            <label className="block text-[11px] font-bold text-[#83837c] uppercase tracking-wider mb-2">Points per Practice Question</label>
            <input 
              type="number"
              disabled={config.mode !== 'custom'}
              value={config.ptsPerQuestion}
              onChange={(e) => setConfig({ ...config, ptsPerQuestion: parseFloat(e.target.value) || 0 })}
              className="w-full bg-[#faf9f5] border border-[#ece9e3] text-[13.5px] font-bold text-gray-800 rounded-xl p-2.5 focus:outline-none focus:border-indigo-600 disabled:opacity-65"
            />
          </div>

          {/* Input 3: DPP complete */}
          <div>
            <label className="block text-[11px] font-bold text-[#83837c] uppercase tracking-wider mb-2">Points for DPP Completed</label>
            <input 
              type="number"
              disabled={config.mode !== 'custom'}
              value={config.ptsPerDpp}
              onChange={(e) => setConfig({ ...config, ptsPerDpp: parseFloat(e.target.value) || 0 })}
              className="w-full bg-[#faf9f5] border border-[#ece9e3] text-[13.5px] font-bold text-gray-800 rounded-xl p-2.5 focus:outline-none focus:border-indigo-600 disabled:opacity-65"
            />
          </div>

          {/* Input 4: Mock synchronisation */}
          <div>
            <label className="block text-[11px] font-bold text-[#83837c] uppercase tracking-wider mb-2">Points per synced Mock Exam</label>
            <input 
              type="number"
              disabled={config.mode !== 'custom'}
              value={config.ptsPerMockSync}
              onChange={(e) => setConfig({ ...config, ptsPerMockSync: parseFloat(e.target.value) || 0 })}
              className="w-full bg-[#faf9f5] border border-[#ece9e3] text-[13.5px] font-bold text-gray-800 rounded-xl p-2.5 focus:outline-none focus:border-indigo-600 disabled:opacity-65"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-[#faf9f5] flex items-center justify-between">
          <p className="text-[12px] text-[#83837c] font-semibold flex items-center gap-1">
            <Info className="w-4 h-4 text-[#83837c]" />
            Applying a new policy updates the points formula class-wide instantly.
          </p>
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 bg-[#1b3b2a] hover:bg-[#12281c] text-white font-extrabold text-[12.5px] rounded-xl transition-all cursor-pointer shadow-xs border-none"
          >
            Apply Scoring Policy
          </button>
        </div>
      </div>
    </div>
  );
}
