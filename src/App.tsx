import React, { useState, useEffect } from 'react';
import { Menu, Settings as SettingsModalIcon, AlertTriangle as AlertTriangleIcon } from 'lucide-react';
import { db, auth } from './lib/firebase';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { DEFAULT_CLASS_ID, isAdminEmail } from './lib/config';
import { 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  query, 
  where,
  orderBy, 
  onSnapshot, 
  collectionGroup,
  deleteDoc 
} from 'firebase/firestore';

// Edofox sync now goes through a Cloudflare Worker instead of a Firebase
// Cloud Function — see src/lib/edofoxWorker.ts and /cf-worker in the project
// root. This avoids requiring Firebase's paid Blaze plan just for this one
// piece of server-side logic. syncEdofoxInteractive is used for the
// one-time interactive verification path (onboarding); syncEdofoxStored is
// used for routine re-syncs once credentials are already linked.
import { syncEdofoxInteractive, syncEdofoxStored } from './lib/edofoxWorker';

import { 
  initialSubjects, 
  initialDailyLogs, 
  initialLeaderboard, 
  initialGoals, 
  initialSyllabus,
  initialBacklogs
} from './data/mockData';
import { SubjectTarget, DailyLog, LeaderboardEntry, Goal, BacklogItem } from './types';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Leaderboard from './components/Leaderboard';
import Analytics from './components/Analytics';
import Syllabus from './components/Syllabus';
import Goals from './components/Goals';
import Subjects from './components/Subjects';
import LogSessionModal from './components/LogSessionModal';
import TeacherDashboard from './components/TeacherDashboard';
import AdminDashboard from './components/AdminDashboard';
import MockTests from './components/MockTests';
import Backlog from './components/Backlog';
import OnboardingScreen from './components/OnboardingScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [prefilledMinutes, setPrefilledMinutes] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [selectedProfileForModal, setSelectedProfileForModal] = useState<any>(null);
  
  // Track authenticated user profile for role-based routing
  const [profile, setProfile] = useState<any | null>(null);
  const [authUser, setAuthUser] = useState<any | null>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);

  // Status of a pending "I'm a teacher" access request, tracked independently of
  // `profile` so it survives even while the resolved role is still 'unassigned'.
  const [teacherRequestStatus, setTeacherRequestStatus] = useState<'none' | 'pending' | 'rejected'>('none');
  const [teacherRequestInfo, setTeacherRequestInfo] = useState<any>(null);

  // Monitor auth state to coordinate subscriptions and prevent permission errors
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);



  const handleProfileChange = (newProfile: any | null) => {
    setProfile(newProfile);
    if (newProfile) {
      if (newProfile.role === 'teacher') {
        setActiveTab('teacher-dashboard');
      } else if (newProfile.role === 'admin') {
        setActiveTab('admin-dashboard');
      } else {
        setActiveTab('dashboard');
      }
    } else {
      setActiveTab('dashboard');
    }
  };

  // Live-subscribe to the teacher allowlist doc for the signed-in email. Unlike the
  // one-time getDoc check in setupSync (which only runs once per auth change), this
  // stays subscribed so that when an admin approves a teacher request and creates
  // this doc, the signed-in user is promoted to the teacher dashboard immediately —
  // no reload required.
  useEffect(() => {
    if (loadingAuth || !authUser || !authUser.email) return;
    const teacherDocId = authUser.email.replace(/[@.]/g, '_');
    const teacherRef = doc(db, 'platform', 'main', 'teachers', teacherDocId);
    const unsubscribe = onSnapshot(teacherRef, (snap) => {
      if (snap.exists()) {
        const tData: any = snap.data() || {};
        setProfile((prev: any) => ({
          fullName: authUser.displayName || tData.name || prev?.fullName || 'Teacher User',
          role: 'teacher',
          email: authUser.email || '',
          uid: authUser.uid,
          classId: tData.classId || '',
          createdAt: tData.createdAt || prev?.createdAt || new Date().toISOString()
        }));
        if (tData.classId) setActiveClassId(tData.classId);
      }
    }, (err) => console.warn("Teacher allowlist subscription failed:", err));
    return () => unsubscribe();
  }, [authUser, loadingAuth]);

  // Live-subscribe to this user's own teacher access request, if any, so the
  // waiting/rejected onboarding screens update in real time as an admin acts on it.
  useEffect(() => {
    if (loadingAuth || !authUser) {
      setTeacherRequestStatus('none');
      setTeacherRequestInfo(null);
      return;
    }
    const reqRef = doc(db, 'platform', 'main', 'teacherRequests', authUser.uid);
    const unsubscribe = onSnapshot(reqRef, (snap) => {
      if (snap.exists()) {
        const data: any = snap.data();
        setTeacherRequestInfo(data);
        setTeacherRequestStatus(data.status === 'rejected' ? 'rejected' : 'pending');
      } else {
        setTeacherRequestInfo(null);
        setTeacherRequestStatus('none');
      }
    }, (err) => console.warn("Teacher request subscription failed:", err));
    return () => unsubscribe();
  }, [authUser, loadingAuth]);

  // Role-selection screen: "Continue as a Student" — no Firestore write yet, this
  // just moves local state into the existing Edofox-verification flow. The real
  // student record is only created once verification succeeds.
  const handleSelectStudentRole = () => {
    if (!authUser) return;
    setProfile({
      fullName: authUser.displayName || '',
      role: 'student',
      edofoxLinked: false,
      email: authUser.email || '',
      streak: 0,
      todayPoints: 0,
      points: 0,
      subjects: initialSubjects,
      goals: initialGoals,
      syllabus: initialSyllabus,
      backlogs: [],
      createdAt: new Date().toISOString()
    });
  };

  // Role-selection screen: fetch the list of admin-created classes so a
  // teacher applicant can pick which one they're requesting to join. Any
  // signed-in user is already allowed to read `classes/{classId}` per
  // firestore.rules, so no rules change is needed for this.
  const fetchAvailableClasses = async () => {
    const snap = await getDocs(collection(db, 'classes'));
    return snap.docs.map((d) => {
      const data: any = d.data() || {};
      return {
        id: d.id,
        name: data.name || 'Unnamed Class',
        teacher: data.teacher || 'Unassigned',
        students: data.students || 0,
        status: data.status || 'Active'
      };
    });
  };

  // Role-selection screen: "I'm a Teacher" — writes a pending request that an admin
  // must approve from the Admin Dashboard's Teachers page before this account is
  // granted the teacher role. Teachers can never self-assign the role directly;
  // this is enforced both here and in firestore.rules. The chosen class travels
  // with the request so the admin knows exactly which class to approve them into.
  const handleRequestTeacherAccess = async (details: { instituteName?: string; classId: string; className?: string }) => {
    if (!authUser) return;
    if (!details.classId) {
      throw new Error("Please select a class before submitting your request.");
    }
    const reqRef = doc(db, 'platform', 'main', 'teacherRequests', authUser.uid);
    await setDoc(reqRef, {
      uid: authUser.uid,
      name: authUser.displayName || 'Teacher Applicant',
      email: authUser.email || '',
      instituteName: details?.instituteName || '',
      classId: details.classId,
      className: details.className || '',
      status: 'pending',
      requestedAt: new Date().toISOString()
    }, { merge: true });
  };

  // Thin wrapper around the Edofox sync worker for MockTests — keeps the
  // worker call in one place instead of duplicated across components. No
  // password is passed here: the worker decrypts the stored credential
  // itself from the credentialsEnc blob we already have in `profile`.
  const runEdofoxSync = async () => {
    try {
      const result = await syncEdofoxStored((profile as any)?.edofoxUsername, (profile as any)?.edofoxPasswordEnc);
      return result as { success: boolean; studentInfo?: any; tests?: any[]; error?: string };
    } catch (err: any) {
      return { success: false, error: err.message || 'Sync failed' };
    }
  };

  const handleSelectStudent = async (uid: string, classId?: string) => {
    // Clicking myself in the leaderboard: just reuse my already-loaded profile.
    if (uid === auth.currentUser?.uid) {
      setSelectedProfileForModal({ ...(profile as any), role: 'student' });
      return;
    }

    const resolvedClassId = classId || activeClassId;
    try {
      const studentRef = doc(db, 'classes', resolvedClassId, 'students', uid);
      const snap = await getDoc(studentRef);
      if (snap.exists()) {
        const data = snap.data();
        setSelectedProfileForModal({
          fullName: data.fullName || 'Student',
          rollNumber: data.rollNumber || '—',
          points: data.points || 0,
          classroomName: data.classroomName || '',
          instituteName: data.instituteName || '',
          role: 'student'
        });
      } else {
        console.warn(`handleSelectStudent: no student doc at classes/${resolvedClassId}/students/${uid}`);
      }
    } catch (e) {
      console.warn('handleSelectStudent: failed to load student profile', e);
    }
  };

  // Core application states
  const [subjects, setSubjects] = useState<SubjectTarget[]>(initialSubjects);
  const [logs, setLogs] = useState<DailyLog[]>(initialDailyLogs);
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [leaderboardLoadError, setLeaderboardLoadError] = useState<string | null>(null);
  const [goals, setGoals] = useState(initialGoals);
  const [syllabus, setSyllabus] = useState<any[]>(initialSyllabus);
  const [backlogs, setBacklogs] = useState<BacklogItem[]>(initialBacklogs);
  const [streak, setStreak] = useState<number>(0);
  const [todayPoints, setTodayPoints] = useState<number>(0);
  const [scoringConfig, setScoringConfig] = useState<any>(null);

  // Dynamic admin states
  const [activeClassId, setActiveClassId] = useState<string>(localStorage.getItem('class_override') || DEFAULT_CLASS_ID);
  const [roleOverride, setRoleOverride] = useState<string | null>(localStorage.getItem('role_override'));
  const [showSwitchModal, setShowSwitchModal] = useState<boolean>(false);
  const [switchClassId, setSwitchClassId] = useState<string>(activeClassId);
  const [switchRole, setSwitchRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [switchMode, setSwitchMode] = useState<'inspect' | 'create'>('inspect');

  const handleApplyOverride = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    if (switchRole === 'admin') {
      localStorage.removeItem('role_override');
      localStorage.removeItem('class_override');
      setRoleOverride(null);
      setActiveClassId(DEFAULT_CLASS_ID);
      setShowSwitchModal(false);
      window.location.reload();
      return;
    }

    localStorage.setItem('role_override', switchRole);
    localStorage.setItem('class_override', switchClassId);
    setRoleOverride(switchRole);
    setActiveClassId(switchClassId);

    if (switchMode === 'create') {
      const email = auth.currentUser?.email || '';
      if (switchRole === 'student') {
        const studentProfileRef = doc(db, 'classes', switchClassId, 'students', uid);
        await setDoc(studentProfileRef, {
          fullName: auth.currentUser?.displayName || 'Student User',
          rollNumber: 'STUDENT-' + Math.floor(1000 + Math.random() * 9000),
          role: 'student',
          email: email,
          edofoxLinked: false,
          points: 0,
          todayPoints: 0,
          streak: 0,
          subjects: initialSubjects,
          goals: initialGoals,
          syllabus: initialSyllabus,
          backlogs: [],
          createdAt: new Date().toISOString()
        }, { merge: true });
      } else if (switchRole === 'teacher') {
        const teacherDocId = email.replace(/[@.]/g, '_');
        const teacherRef = doc(db, 'platform', 'main', 'teachers', teacherDocId);
        await setDoc(teacherRef, {
          name: auth.currentUser?.displayName || 'Teacher User',
          email: email,
          status: 'Active',
          joined: new Date().toLocaleDateString('en-GB')
        }, { merge: true });
      }
    }

    setShowSwitchModal(false);
    window.location.reload();
  };

  const [adminClasses, setAdminClasses] = useState<any[]>([]);

  const [adminTeachers, setAdminTeachers] = useState<any[]>([]);

  const [selectedAdminClassId, setSelectedAdminClassId] = useState<string | null>(null);

  // Centralized Mock Test States
  const [classMockTests, setClassMockTests] = useState<any[]>([]);
  const [studentMockAttempts, setStudentMockAttempts] = useState<any[]>([]);
  const [allMockAttempts, setAllMockAttempts] = useState<any[]>([]);
  const [globalSyncState, setGlobalSyncState] = useState<'idle' | 'syncing' | 'completed' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Automatically select the first available admin class as the switcher default
  useEffect(() => {
    if (adminClasses.length > 0) {
      setSwitchClassId(adminClasses[0].id);
    } else {
      setSwitchClassId('');
    }
  }, [adminClasses]);

  // Automatically switch tabs when role updates
  useEffect(() => {
    if (profile?.role) {
      if (profile.role === 'teacher') {
        if (!activeTab.startsWith('teacher-')) {
          setActiveTab('teacher-dashboard');
        }
      } else if (profile.role === 'admin') {
        if (!activeTab.startsWith('admin-')) {
          setActiveTab('admin-dashboard');
        }
      } else {
        // If they switched to student, make sure they are on a student tab
        const studentTabs = ['dashboard', 'leaderboard', 'analytics', 'syllabus', 'mock-tests', 'backlog-tracker', 'goals', 'subjects'];
        if (!studentTabs.includes(activeTab)) {
          setActiveTab('dashboard');
        }
      }
    }
  }, [profile?.role]);

  // Synchronize class-wide mock tests templates from Firestore
  useEffect(() => {
    localStorage.removeItem('mock_sandbox_user');
    localStorage.removeItem('mock_sandbox_profile');
    
    const defaultTemplates = [
      {
        id: '58638',
        name: 'XI_JEE-2026-27_CT-07 [MAINS]',
        date: '2026-06-21',
        maxSubjectScore: 100,
        syllabus: {
          physics: ['p-sub-1', 'p-sub-2'], // Significant figures & Projectile
          chemistry: ['c-sub-1', 'c-sub-2'], // equivalent weight & mole concept
          mathematics: ['m-sub-9'] // Progression Sums
        }
      },
      {
        id: '58546',
        name: 'XI_JEE-2026-27_CT-06 [MAINS]',
        date: '2026-06-14',
        maxSubjectScore: 100,
        syllabus: {
          physics: ['p-sub-4'], // Constraint relations
          chemistry: ['c-sub-3', 'c-sub-4'], // Bohr model & spectra
          mathematics: ['m-sub-10'] // L'Hopital
        }
      },
      {
        id: '57901',
        name: 'XI_JEE-2026-27_CT-05 [MAINS]',
        date: '2026-06-07',
        maxSubjectScore: 100,
        syllabus: {
          physics: ['p-sub-6'], // Rotational mechanics
          chemistry: ['c-sub-5'], // Hybridisation
          mathematics: ['m-sub-11'] // Rolle's Theorem
        }
      },
      {
        id: '57217',
        name: 'XI_JEE-2026-27_CT-04 [MAINS]',
        date: '2026-05-17',
        maxSubjectScore: 100,
        syllabus: {
          physics: ['p-sub-3'], // Projectile Motion
          chemistry: ['c-sub-2'], // Mole Concept
          mathematics: ['m-sub-8'] // Sets and Relations
        }
      },
      {
        id: '56830',
        name: 'XI_JEE-2026-27_CT-03 [MAINS]',
        date: '2026-05-10',
        maxSubjectScore: 100,
        syllabus: {
          physics: ['p-sub-2'], // Error Analysis
          chemistry: ['c-sub-2'], // Equivalent mass
          mathematics: ['m-sub-9'] // Progression Sums
        }
      },
      {
        id: '56520',
        name: 'XI_JEE-2026-27_CT-02 [MAINS]',
        date: '2026-05-03',
        maxSubjectScore: 100,
        syllabus: {
          physics: ['p-sub-1'], // Significant figures
          chemistry: ['c-sub-1'], // Stoichiometry
          mathematics: ['m-sub-9'] // Progression Sums
        }
      },
      {
        id: '56131',
        name: 'XI_JEE-2026-27_CT-01 [MAINS]',
        date: '2026-04-26',
        maxSubjectScore: 100,
        syllabus: {
          physics: ['p-sub-1'], // Significant figures
          chemistry: ['c-sub-1'], // Stoichiometry
          mathematics: ['m-sub-8'] // Sets
        }
      },
      {
        id: '55626',
        name: 'XI_JEE-2026-27_Diagnostic_Test',
        date: '2026-04-19',
        maxSubjectScore: 100,
        syllabus: {
          physics: ['p-sub-1'],
          chemistry: ['c-sub-1'],
          mathematics: ['m-sub-8']
        }
      }
    ];

    if (loadingAuth || !authUser || !activeClassId || activeClassId === 'demo_class') {
      setClassMockTests(defaultTemplates);
      return;
    }

    const classMockTestsRef = collection(db, 'classes', activeClassId, 'mockTests');
    const unsubscribe = onSnapshot(classMockTestsRef, async (snapshot) => {
      if (!snapshot.empty) {
        const list: any[] = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setClassMockTests(list);
      } else {
        // Seed class-wide mock test templates
        setClassMockTests(defaultTemplates);
        try {
          for (const test of defaultTemplates) {
            const testDocRef = doc(db, 'classes', activeClassId, 'mockTests', test.id);
            await setDoc(testDocRef, test, { merge: true });
          }
        } catch (err) {
          console.warn("Failed to seed class mock templates to Firestore (normal if student-write is blocked):", err);
        }
      }
    }, (error) => {
      console.warn("Class mock tests templates subscription failed, using local fallback:", error.message);
      setClassMockTests(defaultTemplates);
    });

    return () => unsubscribe();
  }, [authUser, loadingAuth, activeClassId]);

  // Synchronize student mock test attempt scores from Firestore
  useEffect(() => {
    if (loadingAuth || !authUser) {
      setStudentMockAttempts([]);
      return;
    }
    const uid = authUser.uid;
    const studentAttemptsRef = collection(db, 'classes', activeClassId, 'students', uid, 'mockTests');
    const unsubscribe = onSnapshot(studentAttemptsRef, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setStudentMockAttempts(list);
    }, (error) => {
      console.warn("Student mock test attempts subscription failed:", error);
    });

    return () => unsubscribe();
  }, [authUser, loadingAuth, activeClassId]);

  // Synchronize all student mock test attempt scores from Firestore for class-wide mock standings
  useEffect(() => {
    if (loadingAuth || !authUser) {
      setAllMockAttempts([]);
      return;
    }
    const q = collectionGroup(db, 'mockTests');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({
          id: docSnap.id,
          studentId: docSnap.ref.parent.parent?.id,
          ...docSnap.data()
        });
      });
      setAllMockAttempts(list);
    }, (error) => {
      console.warn("Collection Group query on mockTests failed (falling back to empty):", error);
    });

    return () => unsubscribe();
  }, [authUser, loadingAuth]);

  // Trigger Firestore bootstrap database seeding when user is logged in (DEACTIVATED: Prevent fake/demo data seeding)
  /*
  useEffect(() => {
    if (authUser) {
      import('./lib/seeding').then(({ bootstrapDatabase }) => {
        bootstrapDatabase();
      });
    }
  }, [authUser]);
  */

  // Synchronize admin classes from Firestore
  useEffect(() => {
    let unsubscribeClasses = () => {};

    if (profile && profile.role === 'admin') {
      const classesRef = collection(db, 'classes');
      unsubscribeClasses = onSnapshot(classesRef, async (snapshot) => {
        if (!snapshot.empty) {
          const classesList: any[] = [];
          snapshot.forEach((doc) => {
            classesList.push({
              id: doc.id,
              ...doc.data()
            });
          });
          classesList.sort((a, b) => parseInt(a.id || '0') - parseInt(b.id || '0'));
          setAdminClasses(classesList);
        } else {
          setAdminClasses([]);
        }
      }, (error) => {
        console.warn("Firestore classes subscription blocked or failed, using local fallback state:", error);
      });
    }

    return () => unsubscribeClasses();
  }, [profile]);

  // Synchronize admin teachers from Firestore
  useEffect(() => {
    let unsubscribeTeachers = () => {};

    if (profile && profile.role === 'admin') {
      const teachersRef = collection(db, 'platform', 'main', 'teachers');
      unsubscribeTeachers = onSnapshot(teachersRef, async (snapshot) => {
        if (!snapshot.empty) {
          const teachersList: any[] = [];
          snapshot.forEach((doc) => {
            teachersList.push({
              id: doc.id,
              ...doc.data()
            });
          });
          setAdminTeachers(teachersList);
        } else {
          setAdminTeachers([]);
        }
      }, (error) => {
        console.warn("Firestore teachers subscription blocked or failed, using local fallback state:", error);
      });
    }

    return () => unsubscribeTeachers();
  }, [profile]);

  // Synchronize pending teacher access requests for admin review
  const [adminTeacherRequests, setAdminTeacherRequests] = useState<any[]>([]);
  useEffect(() => {
    let unsubscribeRequests = () => {};

    if (profile && profile.role === 'admin') {
      const requestsRef = collection(db, 'platform', 'main', 'teacherRequests');
      unsubscribeRequests = onSnapshot(requestsRef, (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status === 'pending') {
            list.push({ id: docSnap.id, ...data });
          }
        });
        setAdminTeacherRequests(list);
      }, (error) => {
        console.warn("Firestore teacher requests subscription blocked or failed:", error);
      });
    } else {
      setAdminTeacherRequests([]);
    }

    return () => unsubscribeRequests();
  }, [profile]);

  // Approve a pending teacher request: creates the real allowlist doc (the same
  // shape TeachersPage's "onboard new teacher" flow writes) and marks the request
  // approved. The requester's own onSnapshot on the teachers doc then promotes
  // them to the teacher dashboard automatically.
  const handleApproveTeacherRequest = async (request: any) => {
    const teacherDocId = request.email.replace(/[@.]/g, '_');
    const teacherRef = doc(db, 'platform', 'main', 'teachers', teacherDocId);
    await setDoc(teacherRef, {
      name: request.name || 'Teacher User',
      email: request.email || '',
      status: 'Active',
      classes: request.classId ? 1 : 0,
      classId: request.classId || '',
      students: 0,
      limit: 40,
      joined: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    }, { merge: true });

    // Reflect the assignment on the class doc itself so it shows up correctly
    // in the Admin Dashboard's class list/detail views.
    if (request.classId) {
      const classRef = doc(db, 'classes', request.classId);
      await setDoc(classRef, { teacher: request.name || 'Teacher User' }, { merge: true });
    }

    const requestRef = doc(db, 'platform', 'main', 'teacherRequests', request.id);
    await setDoc(requestRef, { status: 'approved', decidedAt: new Date().toISOString() }, { merge: true });
  };

  // Reject a pending teacher request. Kept (not deleted) for an audit trail; the
  // requester's onboarding screen shows a "declined" state and offers to continue
  // as a student instead.
  const handleRejectTeacherRequest = async (requestId: string) => {
    const requestRef = doc(db, 'platform', 'main', 'teacherRequests', requestId);
    await setDoc(requestRef, { status: 'rejected', decidedAt: new Date().toISOString() }, { merge: true });
  };

  // Synchronize class-wide scoring configuration settings
  useEffect(() => {
    if (loadingAuth || !authUser) {
      const defaultConf = {
        mode: 'baseline',
        ptsPer10Min: 1,
        ptsPerQuestion: 1,
        ptsPerDpp: 5,
        ptsPerMockSync: 10
      };
      setScoringConfig(defaultConf);
      return;
    }
    const configRef = doc(db, 'classes', activeClassId, 'settings', 'scoring');
    const unsubscribe = onSnapshot(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setScoringConfig(data);
        localStorage.setItem('scoring_config', JSON.stringify(data));
      } else {
        const defaultConf = {
          mode: 'baseline',
          ptsPer10Min: 1,
          ptsPerQuestion: 1,
          ptsPerDpp: 5,
          ptsPerMockSync: 10
        };
        setScoringConfig(defaultConf);
        localStorage.setItem('scoring_config', JSON.stringify(defaultConf));
      }
    }, (error) => {
      console.warn("Error subscribing to scoring settings, using local fallback:", error);
      const stored = localStorage.getItem('scoring_config');
      if (stored) {
        try {
          setScoringConfig(JSON.parse(stored));
        } catch (e) {}
      } else {
        setScoringConfig({
          mode: 'baseline',
          ptsPer10Min: 1,
          ptsPerQuestion: 1,
          ptsPerDpp: 5,
          ptsPerMockSync: 10
        });
      }
    });

    return () => unsubscribe();
  }, [authUser, loadingAuth, activeClassId]);

  // Intercept AdminDashboard state setter calls and write changes to Firestore
  const handleSetAdminClasses = async (updater: any) => {
    let nextClasses: any[] = [];
    if (typeof updater === 'function') {
      nextClasses = updater(adminClasses);
    } else {
      nextClasses = updater;
    }

    // Set local state first for instant response
    setAdminClasses(nextClasses);

    for (const c of nextClasses) {
      const classRef = doc(db, 'classes', c.id);
      await setDoc(classRef, {
        name: c.name || '',
        teacher: c.teacher || '',
        initials: c.initials || '',
        color: c.color || '',
        status: c.status || 'Active',
        students: c.students || 0,
        reports: c.reports || 0,
        participation: c.participation || 0,
        lastReport: c.lastReport || '—',
        storage: c.storage || '15 GB',
        createdDate: c.createdDate || '',
        studentList: c.studentList || []
      }, { merge: true });
    }
  };

  const handleSetAdminTeachers = async (updater: any) => {
    let nextTeachers: any[] = [];
    if (typeof updater === 'function') {
      nextTeachers = updater(adminTeachers);
    } else {
      nextTeachers = updater;
    }

    // Set local state first for instant response
    setAdminTeachers(nextTeachers);

    for (const t of nextTeachers) {
      const teacherDocId = t.email.replace(/[@.]/g, '_');
      const teacherRef = doc(db, 'platform', 'main', 'teachers', teacherDocId);
      await setDoc(teacherRef, {
        name: t.name || '',
        email: t.email || '',
        status: t.status || 'Active',
        classes: t.classes || 0,
        students: t.students || 0,
        limit: t.limit || 40,
        joined: t.joined || ''
      }, { merge: true });
    }
  };

  const handleSyncEdofoxResult = async (
    testId: string, 
    scores: { physics: number, chemistry: number, mathematics: number, rank?: string, topperScore?: number }, 
    maxScore: number, 
    testSyllabus: { physics: string[], chemistry: string[], mathematics: string[] },
    testName?: string,
    testDate?: string
  ) => {
    let uid = auth.currentUser?.uid;
    if (!uid) {
      const stored = localStorage.getItem('mock_sandbox_user');
      if (stored) {
        try {
          uid = JSON.parse(stored).uid;
        } catch (e) {}
      }
    }
    if (!uid) return;

    // 1. Calculate percentage and save attempt to student's mockTests subcollection
    const totalScore = scores.physics + scores.chemistry + scores.mathematics;
    const totalMax = maxScore * 3;
    const percent = parseFloat(((totalScore / totalMax) * 100).toFixed(1));

    // Resolve date format safely
    let finalSubmittedAt: any = new Date().toISOString();
    if (testDate) {
      try {
        const parsedDate = new Date(testDate);
        if (!isNaN(parsedDate.getTime())) {
          finalSubmittedAt = parsedDate.toISOString();
        }
      } catch (e) {}
    }

    // Optimistically update local React state so it renders on the UI immediately
    setStudentMockAttempts(prev => {
      const filtered = prev.filter(a => a.id !== testId);
      return [...filtered, {
        id: testId,
        synced: true,
        scores: {
          physics: scores.physics,
          chemistry: scores.chemistry,
          mathematics: scores.mathematics
        },
        rank: scores.rank || 'N/A',
        topperScore: scores.topperScore || 0,
        percent,
        testName: testName || '',
        submittedAt: finalSubmittedAt,
        syncedAt: new Date().toISOString()
      }];
    });

    try {
      const attemptRef = doc(db, 'classes', activeClassId, 'students', uid, 'mockTests', testId);
      await setDoc(attemptRef, {
        synced: true,
        scores: {
          physics: scores.physics,
          chemistry: scores.chemistry,
          mathematics: scores.mathematics
        },
        rank: scores.rank || 'N/A',
        topperScore: scores.topperScore || 0,
        percent,
        testName: testName || '',
        submittedAt: finalSubmittedAt,
        syncedAt: new Date().toISOString()
      });
    } catch (dbErr) {
      console.warn("Failed to write mock test score attempt to Firestore (safe local fallback active):", dbErr);
    }

    // Award points for syncing a mock test based on the active scoring policy
    const config = scoringConfig || { ptsPerMockSync: 10 };
    const mockSyncReward = config.ptsPerMockSync !== undefined ? config.ptsPerMockSync : 10;
    
    if (mockSyncReward > 0) {
      const currentPoints = profile ? (profile as any).points || 0 : 0;
      const currentWeeklyPoints = profile ? (profile as any).weeklyPoints || 0 : 0;
      const newTotalPoints = currentPoints + mockSyncReward;
      const newWeeklyPoints = currentWeeklyPoints + mockSyncReward;
      
      // Update local profile state
      setProfile((prev: any) => prev ? { ...prev, points: newTotalPoints, weeklyPoints: newWeeklyPoints } : null);
      
      // Write updates to profile in Firestore
      try {
        const studentProfileRef = doc(db, 'classes', activeClassId, 'students', uid);
        await setDoc(studentProfileRef, { points: newTotalPoints, weeklyPoints: newWeeklyPoints }, { merge: true });
      } catch (err) {
        console.warn("Failed to write mock sync points reward to profile:", err);
      }
    }

    // 2. Process subject scores to trigger backlogs or syllabus checks
    const updatedSyllabus = [...syllabus];
    let syllabusChanged = false;
    const newBacklogs: any[] = [];

    const processSubject = (subjectId: 'physics' | 'chemistry' | 'mathematics', score: number, topicIds: string[]) => {
      const pct = (score / maxScore) * 100;
      if (pct < 60) {
        // Flag as Backlog!
        topicIds.forEach(topicId => {
          let topicName = '';
          const subSyllabus = updatedSyllabus.find(s => s.id === subjectId);
          if (subSyllabus && subSyllabus.subtopics) {
            const subtopic = subSyllabus.subtopics.find((st: any) => st.id === topicId);
            if (subtopic) {
              topicName = subtopic.name;
            }
          }
          if (!topicName) return;

          // Check if already in backlogs
          const alreadyBacklog = backlogs.some(b => b.topic.toLowerCase() === topicName.toLowerCase() && b.status !== 'cleared');
          if (!alreadyBacklog) {
            newBacklogs.push({
              id: 'back_' + Math.floor(Math.random() * 1000000),
              subject: subjectId,
              topic: topicName,
              priority: 'High',
              status: 'pending',
              createdDate: new Date().toISOString().split('T')[0],
              targetDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days
              points: 0,
              source: `Scored ${score}/${maxScore} (${Math.round(pct)}%) on Edofox ${testId}`
            });
          }
        });
      } else {
        // Update Syllabus Status!
        const statusToSet: 'completed' | 'progress' = pct >= 75 ? 'completed' : 'progress';
        const subIndex = updatedSyllabus.findIndex(s => s.id === subjectId);
        if (subIndex !== -1) {
          const subSyllabus = { ...updatedSyllabus[subIndex] };
          if (subSyllabus.subtopics) {
            let subtopicsChanged = false;
            const updatedSubtopics = subSyllabus.subtopics.map((st: any) => {
              if (topicIds.includes(st.id)) {
                if (st.status !== statusToSet) {
                  subtopicsChanged = true;
                  return { ...st, status: statusToSet };
                }
              }
              return st;
            });
            if (subtopicsChanged) {
              subSyllabus.subtopics = updatedSubtopics;
              const completedCount = updatedSubtopics.filter((st: any) => st.status === 'completed').length;
              subSyllabus.cur = completedCount;
              subSyllabus.pct = Math.round((completedCount / subSyllabus.tot) * 100) || 0;
              updatedSyllabus[subIndex] = subSyllabus;
              syllabusChanged = true;
            }
          }
        }
      }
    };

    if (testSyllabus.physics) processSubject('physics', scores.physics, testSyllabus.physics);
    if (testSyllabus.chemistry) processSubject('chemistry', scores.chemistry, testSyllabus.chemistry);
    if (testSyllabus.mathematics) processSubject('mathematics', scores.mathematics, testSyllabus.mathematics);

    // 3. Batch-write backlogs and syllabus updates to Firestore
    if (newBacklogs.length > 0) {
      const updatedBacklogsList = [...backlogs, ...newBacklogs];
      setBacklogs(updatedBacklogsList);
      
      for (const b of newBacklogs) {
        try {
          const blogRef = doc(db, 'classes', activeClassId, 'students', uid, 'backlogs', b.id);
          await setDoc(blogRef, b);
        } catch (dbErr) {
          console.warn("Failed to write backlog item to Firestore (safe local fallback active):", dbErr);
        }
      }
      alert(`AI Gap Analyzer: Identified and added ${newBacklogs.length} new High-Priority Backlogs from your synced Edofox test scores!`);
    }

    if (syllabusChanged) {
      setSyllabus(updatedSyllabus);
      try {
        const studentProfileRef = doc(db, 'classes', activeClassId, 'students', uid);
        await setDoc(studentProfileRef, { syllabus: updatedSyllabus }, { merge: true });
      } catch (dbErr) {
        console.warn("Failed to write updated syllabus checks to Firestore:", dbErr);
      }
    }
  };

  // Synchronize dark theme class with document body for styling consistency
  useEffect(() => {
    if (activeTab === 'analytics' || activeTab === 'teacher-analytics') {
      document.body.classList.add('dark-page');
    } else {
      document.body.classList.remove('dark-page');
    }
  }, [activeTab]);

  // Point derivation formula
  const calculatePoints = (minutes: number, questions: number, dpp: string, focus: number) => {
    const config = scoringConfig || { ptsPer10Min: 1, ptsPerQuestion: 1, ptsPerDpp: 5 };
    const factor10Min = config.ptsPer10Min !== undefined ? config.ptsPer10Min : 1;
    const factorQuestion = config.ptsPerQuestion !== undefined ? config.ptsPerQuestion : 1;
    const factorDpp = config.ptsPerDpp !== undefined ? config.ptsPerDpp : 5;

    const studyPoints = Math.floor(minutes / 10) * factor10Min;
    const questionPoints = questions * factorQuestion;
    const dppPoints = dpp === 'completed' ? factorDpp : dpp === 'progress' ? Math.round(factorDpp * 0.4) : 0;
    return studyPoints + questionPoints + dppPoints;
  };

  // Enforce background credentials validation check on mount
  useEffect(() => {
    let uid = auth.currentUser?.uid;
    if (!uid) {
      const stored = localStorage.getItem('mock_sandbox_user');
      if (stored) {
        try {
          uid = JSON.parse(stored).uid;
        } catch (e) {}
      }
    }
    if (!uid || !profile || !(profile as any).edofoxLinked || !(profile as any).edofoxUsername || !(profile as any).edofoxPasswordEnc) return;

    const verifyCredentials = async () => {
      try {
        setGlobalSyncState('syncing');
        const result: any = await syncEdofoxStored((profile as any).edofoxUsername, (profile as any).edofoxPasswordEnc);
        if (!result?.success) {
          throw new Error(result?.error || 'Authentication rejected');
        }
        setGlobalSyncState('completed');
        setSyncError(null);
      } catch (err: any) {
        console.warn("Background credentials check failed:", err.message);
        setGlobalSyncState('error');
        setSyncError(err.message || 'Authentication dropped');
      }
    };

    verifyCredentials();
  }, [profile?.edofoxUsername, profile?.edofoxPasswordEnc]);

  // Handle Edofox verification and profile onboarding
  const handleVerifyAndOnboard = async (username: string, password: string, logLine: (msg: string) => void) => {
    logLine("Handshaking with Sant Tukaram Model Junior College server...");
    
    let uid = auth.currentUser?.uid;
    if (!uid) {
      const stored = localStorage.getItem('mock_sandbox_user');
      if (stored) {
        try {
          uid = JSON.parse(stored).uid;
        } catch (e) {}
      }
    }
    if (!uid) {
      throw new Error("Local session expired. Please refresh the page.");
    }

    logLine("Validating credentials against school enrollment index...");
    let data: any;
    try {
      const result: any = await syncEdofoxInteractive(username, password);
      data = result;
    } catch (err: any) {
      throw new Error(err.message || "Authentication failed");
    }

    if (!data?.success) {
      throw new Error(data?.error || "Invalid credentials provided");
    }

    const studentInfo = data.studentInfo;
    if (!studentInfo || !studentInfo.name || !studentInfo.rollNo) {
      throw new Error("Authenticated successfully, but failed to retrieve verified profile metadata.");
    }

    // Classroom lock: the scraped class/section from Edofox must match a class
    // an admin has actually created in this platform. We no longer auto-create
    // a class or silently fall back to "the first class that exists" — either
    // of those let a student from any random school/section onto the platform.
    // If nothing matches, onboarding is rejected outright.
    const studentClassroom = studentInfo.classroom || "";

    logLine(`Verification successful!`);
    logLine(`- Name: ${studentInfo.name}`);
    logLine(`- Roll Number: ${studentInfo.rollNo}`);
    logLine(`- Classroom (from Edofox): ${studentClassroom || "Unknown"}`);
    logLine("Checking your class against classes created by an admin...");

    const classesRef = collection(db, 'classes');
    const classesSnap = await getDocs(classesRef);
    const dbClassroom = (studentClassroom || "").trim().toLowerCase();
    const matchedClass = classesSnap.docs.find(d => {
      const dbClassName = (d.data().name || "").trim().toLowerCase();
      return dbClassName.length > 0 && dbClassroom.length > 0 &&
        (dbClassroom.includes(dbClassName) || dbClassName.includes(dbClassroom));
    });

    if (!matchedClass) {
      throw new Error(
        `Access Denied: Your class "${studentClassroom || 'Unknown'}" is not authorised — ` +
        `this class hasn't been created by an admin yet. Ask your teacher/admin to create ` +
        `your class in the Admin Dashboard, then try onboarding again.`
      );
    }

    const classId = matchedClass.id;
    logLine(`Matched class: ${matchedClass.data().name}`);
    logLine("Finalizing profile metadata database synchronization...");

    setActiveClassId(classId);

    const studentProfileRef = doc(db, 'classes', classId, 'students', uid);
    
    const profileUpdates = {
      fullName: studentInfo.name,
      rollNumber: studentInfo.rollNo,
      role: 'student', // Include 'role' to comply with Firestore security rules
      edofoxLinked: true,
      edofoxUsername: username,
      // Encrypted (AES-256-GCM) by the syncEdofox Cloud Function — only that
      // function and syncEdofoxStored (via the Secret Manager key) can turn
      // this back into a usable password. Firestore security rules already
      // restrict who can *read* this field; this makes the stored value
      // useless to anyone who does get read access, and closes the
      // plaintext-at-rest gap this field used to have.
      edofoxPasswordEnc: data.credentialsEnc,
      phone: studentInfo.phone || '',
      email: studentInfo.email || '',
      classroomName: studentClassroom,
      classId: classId,
      instituteName: studentInfo.instituteName || 'Sant Tukaram National Model School'
    };

    // Persist the profile before declaring onboarding complete. This used to be
    // fire-and-forget against a path (`profile/main`) that security rules silently
    // rejected for students, so onboarding "succeeded" locally but never actually
    // saved. Now it's awaited against the single students/{uid} doc and a failure
    // here surfaces as a real error instead of a false success.
    logLine("Saving verified profile to your account...");
    await setDoc(studentProfileRef, profileUpdates, { merge: true });

    // Update local profile state
    setProfile((prev: any) => {
      const next = prev ? { ...prev, ...profileUpdates } : { ...profileUpdates, role: 'student' };
      return next;
    });
    
    // Save the username locally as a fallback for the mock-sandbox path — the
    // password is intentionally NOT cached here anymore (used to be stored in
    // localStorage in plaintext). Routine re-syncs now go through
    // syncEdofoxStored, which decrypts the credential server-side instead.
    localStorage.setItem('edofox_username', username);
    localStorage.setItem('edofox_linked', 'true');
    
    setGlobalSyncState('completed');
    setSyncError(null);
    logLine("Onboarding completed successfully! Redirecting...");
  };  // Synchronize student data from Firestore when logged in
  useEffect(() => {
    let unsubscribeLogs: () => void = () => {};
    let unsubscribeProfile: () => void = () => {};
    let active = true;

    const setupSync = async () => {
      if (loadingAuth || !authUser) {
        setSubjects(initialSubjects);
        setLogs(initialDailyLogs);
        setGoals(initialGoals);
        setSyllabus(initialSyllabus);
        setBacklogs(initialBacklogs);
        setStreak(0);
        setTodayPoints(0);
        return;
      }

      const uid = authUser.uid;
      const email = authUser.email;
      
      // 1. First, check if they are an admin (client-side email check or admin directory check)
      const adminDocId = email?.replace(/[@.]/g, '_') || '';
      const adminRef = doc(db, 'platform', 'main', 'admins', adminDocId);
      let isAdmin = isAdminEmail(email);
      
      try {
        const adminSnap = await getDoc(adminRef);
        if (adminSnap.exists()) {
          isAdmin = true;
        }
      } catch (e) {}

      if (isAdmin) {
        // Admin
        const finalProfile = {
          fullName: authUser.displayName || 'Admin User',
          role: 'admin',
          email: email || '',
          uid: uid,
          createdAt: new Date().toISOString()
        };
        if (!active) return;
        setProfile(finalProfile);
        return;
      }

      // 2. Next, check if they are a registered teacher in platform teachers registry
      const teacherDocId = email?.replace(/[@.]/g, '_') || '';
      const teacherRef = doc(db, 'platform', 'main', 'teachers', teacherDocId);
      try {
        const teacherSnap = await getDoc(teacherRef);
        if (teacherSnap.exists()) {
          const tData = teacherSnap.data() || {};
          const finalProfile = {
            fullName: authUser.displayName || tData.name || 'Teacher User',
            role: 'teacher',
            email: email || '',
            uid: uid,
            classId: tData.classId || '',
            createdAt: new Date().toISOString()
          };
          if (!active) return;
          setProfile(finalProfile);
          if (tData.classId) {
            setActiveClassId(tData.classId);
          }
          return;
        }
      } catch (e) {}

      // 3. Otherwise, look for an existing student record by email. Student docs
      // now live directly at classes/{classId}/students/{uid} (previously this
      // queried a separate `profile/main` subcollection via collectionGroup('profile'),
      // but that query used `where(...)` without ever importing it — a silent
      // ReferenceError that made every lookup fail and fall back to demo_class).
      let resolvedClassId = '';
      let studentDocRef = null;

      try {
        const q = query(collectionGroup(db, 'students'), where('email', '==', email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const matchedDoc = querySnapshot.docs[0];
          // Path shape: classes/{classId}/students/{uid}
          resolvedClassId = matchedDoc.ref.parent.parent!.id;
          studentDocRef = matchedDoc.ref;
        }
      } catch (err) {
        console.warn("Collection Group query for student record failed or denied:", err);
      }

      if (!resolvedClassId) {
        resolvedClassId = activeClassId;
      }

      if (resolvedClassId && resolvedClassId !== 'demo_class') {
        setActiveClassId(resolvedClassId);
      }

      const classIdToUse = resolvedClassId || 'demo_class';
      const studentProfileRef = studentDocRef || doc(db, 'classes', classIdToUse, 'students', uid);

      // Listen/Fetch Student Profile document
      unsubscribeProfile = onSnapshot(studentProfileRef, async (profileSnap) => {
        if (!active) return;
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          const finalProfile: any = { ...data, uid, classId: classIdToUse };
          setProfile(finalProfile);

          if (data.subjects) setSubjects(data.subjects);
          if (data.goals) setGoals(data.goals);
          if (data.syllabus) setSyllabus(data.syllabus);
          if (data.backlogs) setBacklogs(data.backlogs);
          if (data.streak !== undefined) setStreak(data.streak);
          if (data.todayPoints !== undefined) setTodayPoints(data.todayPoints);
        } else {
          // Brand new account: no student record, not an admin, not a registered
          // teacher. Route them to role selection instead of assuming 'student'.
          setProfile({
            fullName: authUser.displayName || '',
            role: 'unassigned',
            email: email || '',
            createdAt: new Date().toISOString()
          });
        }
      });

      // 4. Listen to Daily Logs subcollection
      const dailyLogsRef = collection(db, 'classes', classIdToUse, 'students', uid, 'dailyLogs');
      unsubscribeLogs = onSnapshot(dailyLogsRef, async (logsSnap) => {
        if (!active) return;
        if (!logsSnap.empty) {
          const loadedLogs: DailyLog[] = [];
          logsSnap.forEach(docS => {
            loadedLogs.push({
              date: docS.id,
              ...docS.data()
            } as DailyLog);
          });
          loadedLogs.sort((a, b) => b.date.localeCompare(a.date));
          setLogs(loadedLogs);
        } else {
          setLogs([]);
        }
      });
    };

    setupSync();

    return () => {
      active = false;
      unsubscribeProfile();
      unsubscribeLogs();
    };
  }, [authUser, loadingAuth]);

  // Compile live leaderboard from Firestore across all student profiles
  useEffect(() => {
    let unsubscribeLeaderboard = () => {};

    // Only subscribe to collection group if we have a valid profile
    if (profile) {
      const q = query(collectionGroup(db, 'students'), orderBy('points', 'desc'));
      
      unsubscribeLeaderboard = onSnapshot(q, (snapshot) => {
        const studentProfiles: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.role === 'student' || !data.role) {
            studentProfiles.push({
              uid: doc.id,
              classId: doc.ref.parent.parent?.id,
              ...data
            });
          }
        });

        // Map student profiles to the LeaderboardEntry structure
        const dailyMapped: LeaderboardEntry[] = [];
        const weeklyMapped: LeaderboardEntry[] = [];
        const lifetimeMapped: LeaderboardEntry[] = [];

        studentProfiles.forEach((p, idx) => {
          let mockUid = null;
          try {
            const stored = localStorage.getItem('mock_sandbox_user');
            if (stored) {
              mockUid = JSON.parse(stored).uid;
            }
          } catch (e) {}
          const isMe = p.uid === auth.currentUser?.uid || p.uid === mockUid;
          
          const entry: LeaderboardEntry = {
            rank: idx + 1,
            name: p.fullName || 'Anonymous Student',
            points: p.points || 0,
            delta: p.todayPoints || 0,
            emoji: '',
            isMe,
            uid: p.uid,
            classId: p.classId,
            photoURL: p.photoURL || null,
            initials: p.fullName ? p.fullName.split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase() : 'ST'
          };

          dailyMapped.push({ ...entry, points: p.todayPoints || 0, delta: p.todayPoints || 0 });
          weeklyMapped.push({ ...entry, points: p.weeklyPoints || 0 });
          lifetimeMapped.push({ ...entry, points: p.points || 0 });
        });

        if (dailyMapped.length > 0) {
          dailyMapped.sort((a, b) => b.points - a.points).forEach((e, idx) => e.rank = idx + 1);
          weeklyMapped.sort((a, b) => b.points - a.points).forEach((e, idx) => e.rank = idx + 1);
          lifetimeMapped.sort((a, b) => b.points - a.points).forEach((e, idx) => e.rank = idx + 1);

          setLeaderboardLoadError(null);
          setLeaderboard({
            daily: dailyMapped,
            weekly: weeklyMapped,
            lifetime: lifetimeMapped
          });
        } else {
          setLeaderboardLoadError(null);
          setLeaderboard(initialLeaderboard);
        }
      }, (error) => {
        console.warn("Collection Group query error (maybe needs indexing), falling back to initial mock leaderboard:", error);
        setLeaderboardLoadError("Couldn't load the leaderboard right now. Please try again later.");
        setLeaderboard(initialLeaderboard);
      });
    }

    return () => unsubscribeLeaderboard();
  }, [profile]);

  // Recalculate dynamic today's points
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLog = logs.find(log => log.date === todayStr);
    if (todayLog && todayLog.entries.length > 0) {
      let total = 0;
      todayLog.entries.forEach(entry => {
        total += calculatePoints(entry.minutes, entry.questionsSolved, entry.dppStatus, entry.focus);
      });
      setTodayPoints(total);
      
      // Update today's points back in Firestore so others see it in real-time
      let uid = auth.currentUser?.uid;
      if (!uid) {
        const stored = localStorage.getItem('mock_sandbox_user');
        if (stored) {
          try {
            uid = JSON.parse(stored).uid;
          } catch (e) {}
        }
      }
      if (uid) {
        const studentProfileRef = doc(db, 'classes', activeClassId, 'students', uid);
        setDoc(studentProfileRef, { todayPoints: total }, { merge: true }).catch(err => {
          console.warn("Firestore writing today's points blocked (safe local fallback active):", err);
        });
      }
    } else {
      setTodayPoints(0);
    }
  }, [logs]);

  // Study log submit handler
  const handleLogSubmit = async (newLog: {
    subject: string;
    minutes: number;
    questionsSolved: number;
    dppStatus: 'completed' | 'progress' | 'none';
    focus: number;
    date: string;
    retroactive: boolean;
  }) => {
    let uid = auth.currentUser?.uid;
    if (!uid) {
      const stored = localStorage.getItem('mock_sandbox_user');
      if (stored) {
        try {
          uid = JSON.parse(stored).uid;
        } catch (e) {}
      }
    }

    if (!uid) return;

    // Anti-Cheat Parameter Validation
    const MAX_DAILY_MINUTES = 960;
    const existingLogForDate = logs.find(log => log.date === newLog.date);
    const existingMinutes = existingLogForDate 
      ? existingLogForDate.entries.reduce((acc, entry) => acc + entry.minutes, 0) 
      : 0;

    if (existingMinutes + newLog.minutes > MAX_DAILY_MINUTES) {
      alert(`⚠️ Anti-Cheat Warning: Daily study time limit exceeded! You cannot exceed 16 hours (960 minutes) of logged study per day.`);
      return;
    }

    // Cap questions solved at 1 question per 2 minutes studied (min 2, max 45 per session)
    const maxQs = Math.max(2, Math.floor(newLog.minutes / 2));
    const validatedQuestions = newLog.questionsSolved > maxQs ? maxQs : newLog.questionsSolved;

    const classId = activeClassId;
    const logDocRef = doc(db, 'classes', classId, 'students', uid, 'dailyLogs', newLog.date);
    const studentProfileRef = doc(db, 'classes', classId, 'students', uid);

    // Calculate points awarded
    const pointsAwarded = calculatePoints(newLog.minutes, validatedQuestions, newLog.dppStatus, newLog.focus);

    // 1. Read existing log from local state
    const existingLogIndex = logs.findIndex(log => log.date === newLog.date);
    const newEntry = {
      subject: newLog.subject,
      minutes: newLog.minutes,
      questionsSolved: validatedQuestions,
      dppStatus: newLog.dppStatus,
      focus: newLog.focus,
      timestamp: new Date().toISOString(),
      timestampLabel: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    let updatedEntries = [newEntry];
    let updatedHistory = ['Initial save'];
    let isRetroactive = newLog.retroactive;

    if (existingLogIndex !== -1) {
      const targetLog = logs[existingLogIndex];
      updatedEntries = [...targetLog.entries, newEntry];
      updatedHistory = [...(targetLog.editHistory || []), `Added ${newLog.subject} session` + (newLog.retroactive ? ' (Retroactive)' : '')];
      isRetroactive = targetLog.retroactive || newLog.retroactive;
    }

    // Write log to Firestore
    try {
      await setDoc(logDocRef, {
        entries: updatedEntries,
        retroactive: isRetroactive,
        editHistory: updatedHistory,
        editedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Firestore daily log write blocked (safe fallback active):", err);
    }

    // 2. Compute updated streak dynamically
    let updatedStreak = streak;
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (newLog.date === todayStr) {
      const alreadyLoggedToday = logs.some(l => l.date === todayStr && l.entries.length > 0);
      if (!alreadyLoggedToday) {
        const loggedYesterday = logs.some(l => l.date === yesterdayStr && l.entries.length > 0);
        if (loggedYesterday || streak === 12 || streak === 0) {
          updatedStreak = streak + 1;
        }
      }
    }

    // 3. Compute updated subjects
    const updatedSubjects = subjects.map(sub => {
      if (sub.name === newLog.subject) {
        const addedHrs = newLog.minutes / 60;
        return {
          ...sub,
          done: parseFloat((sub.done + addedHrs).toFixed(1))
        };
      }
      return sub;
    });

    // 4. Compute updated goals
    const updatedGoals = goals.map(goal => {
      let updatedCur = goal.cur;
      if (goal.id === 'goal-2') { // Solve 5000 questions
        updatedCur = goal.cur + newLog.questionsSolved;
      } else if (goal.id === 'goal-4') { // Study 1200 Hours
        updatedCur = goal.cur + Math.round(newLog.minutes / 60);
      } else if (goal.id === 'goal-5' && newLog.dppStatus === 'completed') { // Complete 150 DPPs
        updatedCur = goal.cur + 1;
      }
      const pct = Math.min(100, Math.round((updatedCur / goal.tot) * 100));
      return {
        ...goal,
        cur: updatedCur,
        pct,
        completed: pct >= 100
      };
    });

    // 5. Get current profile points and write back
    let currentTotalPoints = profile ? (profile as any).points || 0 : 0;
    let currentWeeklyPoints = profile ? (profile as any).weeklyPoints || 0 : 0;
    const newTotalPoints = currentTotalPoints + pointsAwarded;
    const newWeeklyPoints = currentWeeklyPoints + pointsAwarded;

    // Optimistically update all local states in memory immediately
    setLogs(prev => {
      const existingIdx = prev.findIndex(l => l.date === newLog.date);
      const updatedLogEntry = {
        date: newLog.date,
        entries: updatedEntries,
        retroactive: isRetroactive,
        editHistory: updatedHistory,
        editedAt: new Date().toISOString()
      };
      if (existingIdx !== -1) {
        const next = [...prev];
        next[existingIdx] = updatedLogEntry;
        return next;
      }
      return [updatedLogEntry, ...prev];
    });
    setStreak(updatedStreak);
    setSubjects(updatedSubjects);
    setGoals(updatedGoals);
    setTodayPoints(prev => prev + pointsAwarded);
    setProfile((prev: any) => prev ? { ...prev, points: newTotalPoints, weeklyPoints: newWeeklyPoints, streak: updatedStreak, subjects: updatedSubjects, goals: updatedGoals } : null);

    try {
      await setDoc(studentProfileRef, {
        streak: updatedStreak,
        subjects: updatedSubjects,
        goals: updatedGoals,
        points: newTotalPoints,
        weeklyPoints: newWeeklyPoints,
        lastActive: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn("Firestore profile metrics write blocked (safe fallback active):", err);
    }
  };

  const handleToggleSubTopic = async (topicId: string, subTopicId: string) => {
    const updatedSyllabus = syllabus.map((topic: any) => {
      if (topic.id === topicId) {
        const updatedSubtopics = topic.subtopics.map((sub: any) => {
          if (sub.id === subTopicId) {
            const nextStatus: 'completed' | 'progress' | 'notstarted' = 
              sub.status === 'notstarted' ? 'progress' :
              sub.status === 'progress' ? 'completed' : 'notstarted';
            return { ...sub, status: nextStatus };
          }
          return sub;
        });

        const completedCount = updatedSubtopics.filter((s: any) => s.status === 'completed').length;
        const totalCount = updatedSubtopics.length;
        const originalUnchecked = topic.tot - totalCount;
        const newCur = originalUnchecked + completedCount;
        const newPct = Math.min(100, Math.round((newCur / topic.tot) * 100));

        return {
          ...topic,
          subtopics: updatedSubtopics,
          cur: newCur,
          pct: newPct
        };
      }
      return topic;
    });

    setSyllabus(updatedSyllabus);

    let uid = auth.currentUser?.uid;
    if (!uid) {
      const stored = localStorage.getItem('mock_sandbox_user');
      if (stored) {
        try {
          uid = JSON.parse(stored).uid;
        } catch (e) {}
      }
    }

    if (uid) {
      try {
        const classId = activeClassId;
        const studentProfileRef = doc(db, 'classes', classId, 'students', uid);
        await setDoc(studentProfileRef, { syllabus: updatedSyllabus }, { merge: true });
      } catch (err) {
        console.warn("Firestore syllabus update write blocked (safe fallback active):", err);
      }
    }
  };

  const handleToggleBacklog = async (backlogId: string) => {
    const updatedBacklogs = backlogs.map((b) => {
      if (b.id === backlogId) {
        const nextStatus: 'pending' | 'progress' | 'cleared' = b.status === 'cleared' ? 'pending' : 'cleared';
        return { ...b, status: nextStatus };
      }
      return b;
    });

    setBacklogs(updatedBacklogs);
    
    let uid = auth.currentUser?.uid;
    if (!uid) {
      const stored = localStorage.getItem('mock_sandbox_user');
      if (stored) {
        try {
          uid = JSON.parse(stored).uid;
        } catch (e) {}
      }
    }

    if (uid) {
      try {
        const classId = activeClassId;
        const studentProfileRef = doc(db, 'classes', classId, 'students', uid);
        await setDoc(studentProfileRef, { 
          backlogs: updatedBacklogs
        }, { merge: true });
      } catch (err) {
        console.warn("Firestore backlog toggle write blocked (safe fallback active):", err);
      }
    }
  };

  const handleAddBacklog = async (newItem: Omit<BacklogItem, 'id' | 'createdDate' | 'status' | 'points'>) => {
    const backlog: BacklogItem = {
      ...newItem,
      id: 'back-' + Date.now(),
      createdDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      points: 0
    };
    
    const updatedBacklogs = [backlog, ...backlogs];
    setBacklogs(updatedBacklogs);

    let uid = auth.currentUser?.uid;
    if (!uid) {
      const stored = localStorage.getItem('mock_sandbox_user');
      if (stored) {
        try {
          uid = JSON.parse(stored).uid;
        } catch (e) {}
      }
    }

    if (uid) {
      try {
        const classId = activeClassId;
        const studentProfileRef = doc(db, 'classes', classId, 'students', uid);
        await setDoc(studentProfileRef, { backlogs: updatedBacklogs }, { merge: true });
      } catch (err) {
        console.warn("Firestore backlog add write blocked (safe fallback active):", err);
      }
    }
  };

  const handleDeleteBacklog = async (backlogId: string) => {
    const targetBacklog = backlogs.find(b => b.id === backlogId);
    const pointsDeduction = (targetBacklog && targetBacklog.status === 'cleared') ? targetBacklog.points : 0;

    const updatedBacklogs = backlogs.filter(b => b.id !== backlogId);
    setBacklogs(updatedBacklogs);

    const currentPoints = profile ? (profile as any).points || 0 : 0;
    const newTotalPoints = Math.max(0, currentPoints - pointsDeduction);

    // Update local profile state
    setProfile((prev: any) => prev ? { ...prev, points: newTotalPoints } : null);

    let uid = auth.currentUser?.uid;
    if (!uid) {
      const stored = localStorage.getItem('mock_sandbox_user');
      if (stored) {
        try {
          uid = JSON.parse(stored).uid;
        } catch (e) {}
      }
    }

    if (uid) {
      try {
        const classId = activeClassId;
        const studentProfileRef = doc(db, 'classes', classId, 'students', uid);
        await setDoc(studentProfileRef, { 
          backlogs: updatedBacklogs,
          points: newTotalPoints 
        }, { merge: true });
      } catch (err) {
        console.warn("Firestore backlog delete write blocked (safe fallback active):", err);
      }
    }
  };

  const handleUpdateSubjectTargets = async (updatedSubjects: SubjectTarget[]) => {
    setSubjects(updatedSubjects);

    let uid = auth.currentUser?.uid;
    if (!uid) {
      const stored = localStorage.getItem('mock_sandbox_user');
      if (stored) {
        try {
          uid = JSON.parse(stored).uid;
        } catch (e) {}
      }
    }

    if (uid) {
      try {
        const classId = activeClassId;
        const studentProfileRef = doc(db, 'classes', classId, 'students', uid);
        await setDoc(studentProfileRef, { subjects: updatedSubjects }, { merge: true });
      } catch (err) {
        console.warn("Firestore subjects write blocked (safe fallback active):", err);
      }
    }
  };

  const handleUpdateGoals = async (updatedGoals: Goal[]) => {
    setGoals(updatedGoals);

    let uid = auth.currentUser?.uid;
    if (!uid) {
      const stored = localStorage.getItem('mock_sandbox_user');
      if (stored) {
        try {
          uid = JSON.parse(stored).uid;
        } catch (e) {}
      }
    }

    if (uid) {
      try {
        const classId = activeClassId;
        const studentProfileRef = doc(db, 'classes', classId, 'students', uid);
        await setDoc(studentProfileRef, { goals: updatedGoals }, { merge: true });
      } catch (err) {
        console.warn("Firestore goals write blocked (safe fallback active):", err);
      }
    }
  };

  // Open log modal with optional prefilled minutes from active stopwatch study timer
  const handleOpenLogModalWithPrefilled = (mins: number | null = null) => {
    setPrefilledMinutes(mins);
    setIsLogModalOpen(true);
  };

  // Render correct panel route
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            onOpenLogModal={() => handleOpenLogModalWithPrefilled(null)}
            onOpenWithPrefilled={handleOpenLogModalWithPrefilled}
            subjects={subjects}
            logs={logs}
            streak={streak}
            todayPoints={todayPoints}
            profile={profile}
          />
        );
      case 'teacher-dashboard':
        return <TeacherDashboard page="dashboard" onPageChange={(p) => setActiveTab(`teacher-${p}`)} classId={activeClassId} teacherEmail={authUser?.email || ""} teacherName={profile?.fullName || "Teacher"} />;
      case 'teacher-students':
        return <TeacherDashboard page="students" onPageChange={(p) => setActiveTab(`teacher-${p}`)} classId={activeClassId} teacherEmail={authUser?.email || ""} teacherName={profile?.fullName || "Teacher"} />;
      case 'teacher-reports':
        return <TeacherDashboard page="reports" onPageChange={(p) => setActiveTab(`teacher-${p}`)} classId={activeClassId} teacherEmail={authUser?.email || ""} teacherName={profile?.fullName || "Teacher"} />;
      case 'teacher-leaderboards':
        return <TeacherDashboard page="leaderboards" onPageChange={(p) => setActiveTab(`teacher-${p}`)} classId={activeClassId} teacherEmail={authUser?.email || ""} teacherName={profile?.fullName || "Teacher"} />;
      case 'teacher-analytics':
        return <TeacherDashboard page="analytics" onPageChange={(p) => setActiveTab(`teacher-${p}`)} classId={activeClassId} teacherEmail={authUser?.email || ""} teacherName={profile?.fullName || "Teacher"} />;
      case 'teacher-scoring':
        return <TeacherDashboard page="scoring-settings" onPageChange={(p) => setActiveTab(`teacher-${p}`)} classId={activeClassId} teacherEmail={authUser?.email || ""} teacherName={profile?.fullName || "Teacher"} />;
      case 'admin-dashboard':
        return (
          <AdminDashboard 
            page="dashboard" 
            onPageChange={(p) => setActiveTab(`admin-${p}`)}
            classes={adminClasses}
            setClasses={handleSetAdminClasses}
            teachers={adminTeachers}
            setTeachers={handleSetAdminTeachers}
            selectedClassId={selectedAdminClassId}
            setSelectedClassId={setSelectedAdminClassId}
            teacherRequests={adminTeacherRequests}
            onApproveTeacherRequest={handleApproveTeacherRequest}
            onRejectTeacherRequest={handleRejectTeacherRequest}
          />
        );
      case 'admin-classes':
        return (
          <AdminDashboard 
            page="classes" 
            onPageChange={(p) => setActiveTab(`admin-${p}`)}
            classes={adminClasses}
            setClasses={handleSetAdminClasses}
            teachers={adminTeachers}
            setTeachers={handleSetAdminTeachers}
            selectedClassId={selectedAdminClassId}
            setSelectedClassId={setSelectedAdminClassId}
            teacherRequests={adminTeacherRequests}
            onApproveTeacherRequest={handleApproveTeacherRequest}
            onRejectTeacherRequest={handleRejectTeacherRequest}
          />
        );
      case 'admin-teachers':
        return (
          <AdminDashboard 
            page="teachers" 
            onPageChange={(p) => setActiveTab(`admin-${p}`)}
            classes={adminClasses}
            setClasses={handleSetAdminClasses}
            teachers={adminTeachers}
            setTeachers={handleSetAdminTeachers}
            selectedClassId={selectedAdminClassId}
            setSelectedClassId={setSelectedAdminClassId}
            teacherRequests={adminTeacherRequests}
            onApproveTeacherRequest={handleApproveTeacherRequest}
            onRejectTeacherRequest={handleRejectTeacherRequest}
          />
        );
      case 'admin-onboarding':
        return (
          <AdminDashboard 
            page="onboarding" 
            onPageChange={(p) => setActiveTab(`admin-${p}`)}
            classes={adminClasses}
            setClasses={handleSetAdminClasses}
            teachers={adminTeachers}
            setTeachers={handleSetAdminTeachers}
            selectedClassId={selectedAdminClassId}
            setSelectedClassId={setSelectedAdminClassId}
            teacherRequests={adminTeacherRequests}
            onApproveTeacherRequest={handleApproveTeacherRequest}
            onRejectTeacherRequest={handleRejectTeacherRequest}
          />
        );
      case 'admin-class-detail':
        return (
          <AdminDashboard 
            page="class-detail" 
            onPageChange={(p) => setActiveTab(`admin-${p}`)}
            classes={adminClasses}
            setClasses={handleSetAdminClasses}
            teachers={adminTeachers}
            setTeachers={handleSetAdminTeachers}
            selectedClassId={selectedAdminClassId}
            setSelectedClassId={setSelectedAdminClassId}
            teacherRequests={adminTeacherRequests}
            onApproveTeacherRequest={handleApproveTeacherRequest}
            onRejectTeacherRequest={handleRejectTeacherRequest}
          />
        );
      case 'leaderboard':
        return (
          <Leaderboard 
            leaderboardData={leaderboard} 
            loadError={leaderboardLoadError}
            studentMockAttempts={studentMockAttempts}
            allMockAttempts={allMockAttempts}
            classMockTests={classMockTests}
            profile={profile}
            onSelectStudent={handleSelectStudent}
          />
        );
      case 'analytics':
        return <Analytics subjects={subjects} logs={logs} />;
      case 'syllabus':
        return <Syllabus syllabusData={syllabus} onToggleSubTopic={handleToggleSubTopic} />;
      case 'mock-tests':
        return (
          <MockTests 
            classMockTests={classMockTests}
            studentMockAttempts={studentMockAttempts}
            syllabusData={syllabus}
            onSyncEdofoxResult={handleSyncEdofoxResult}
            globalSyncState={globalSyncState}
            setGlobalSyncState={setGlobalSyncState}
            syncError={syncError}
            setSyncError={setSyncError}
            edofoxUsername={profile?.edofoxUsername || ''}
            isEdofoxLinked={!!(profile?.edofoxUsername && (profile as any)?.edofoxPasswordEnc)}
            runEdofoxSync={runEdofoxSync}
          />
        );
      case 'backlog-tracker':
        return (
          <Backlog 
            backlogData={backlogs}
            syllabusData={syllabus}
            onToggleBacklog={handleToggleBacklog}
            onAddBacklog={handleAddBacklog}
            onDeleteBacklog={handleDeleteBacklog}
          />
        );
      case 'goals':
        return <Goals goalsData={goals} onUpdateGoals={handleUpdateGoals} onOpenLogModal={() => handleOpenLogModalWithPrefilled(null)} />;
      case 'subjects':
        return <Subjects subjects={subjects} onUpdateSubjectTargets={handleUpdateSubjectTargets} onOpenLogModal={() => handleOpenLogModalWithPrefilled(null)} />;
      default:
        return (
          <Dashboard 
            onOpenLogModal={() => handleOpenLogModalWithPrefilled(null)}
            onOpenWithPrefilled={handleOpenLogModalWithPrefilled}
            subjects={subjects}
            logs={logs}
            streak={streak}
            todayPoints={todayPoints}
            profile={profile}
          />
        );
    }
  };

  // Enforce Student Verification & Password expiry Lockouts
  // Admin testing the student role should bypass onboarding/password-expiry lockouts
  const isStudent = profile && profile.role === 'student';
  const isRealStudent = isStudent && !isAdminEmail(profile?.email || auth.currentUser?.email);
  const isEdofoxLinked = profile && (profile as any).edofoxLinked === true;
  const isPasswordExpired = !!(isRealStudent && isEdofoxLinked && globalSyncState === 'error' && 
    (syncError?.toLowerCase().includes('credential') || 
     syncError?.toLowerCase().includes('password') || 
     syncError?.toLowerCase().includes('auth') || 
     syncError?.toLowerCase().includes('unauthorized') || 
     syncError?.toLowerCase().includes('login') ||
     syncError?.toLowerCase().includes('reject') ||
     syncError?.toLowerCase().includes('failed to download')));

  const needsOnboarding = isRealStudent && !isEdofoxLinked;

  // Overall onboarding routing. A signed-in user with no resolved role (not admin,
  // not a registered teacher, no existing student record) lands on 'role_select'.
  // From there they either verify as a student (existing Edofox flow) or request
  // teacher access, which is gated behind admin approval (see teacherRequestStatus).
  const isUnassigned = !!(profile && (profile as any).role === 'unassigned');
  let onboardingStage: 'none' | 'role_select' | 'teacher_pending' | 'teacher_rejected' | 'student_verify' = 'none';
  if (isUnassigned) {
    if (teacherRequestStatus === 'pending') onboardingStage = 'teacher_pending';
    else if (teacherRequestStatus === 'rejected') onboardingStage = 'teacher_rejected';
    else onboardingStage = 'role_select';
  } else if (profile && (needsOnboarding || isPasswordExpired)) {
    onboardingStage = 'student_verify';
  }

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.warn("Sign-In failed:", error);
      alert("Sign-in failed or popup blocked. Please allow popups or try again.");
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest animate-pulse">Loading Portal...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-[#ece9e3] rounded-3xl p-8 shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <span className="text-2xl font-black font-display select-none">J</span>
          </div>
          <div>
            <h2 className="text-[20px] font-black text-[#1b1c19] tracking-tight font-display">JEE Preparation Tracker</h2>
            <p className="text-[12.5px] text-[#83837c] font-medium mt-2 leading-relaxed px-4">
              Access is restricted to pre-registered students, teachers, and admins. Sign in with Google to continue.
            </p>
          </div>
          <button
            onClick={handleGoogleSignIn}
            className="w-full py-3.5 bg-[#1b1c19] hover:bg-black text-white font-extrabold text-[13.5px] rounded-2xl shadow-md transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (onboardingStage !== 'none') {
    return (
      <OnboardingScreen 
        stage={onboardingStage}
        profile={profile} 
        isPasswordExpired={isPasswordExpired} 
        syncError={syncError}
        teacherRequestInfo={teacherRequestInfo}
        onVerify={handleVerifyAndOnboard}
        onSelectStudentRole={handleSelectStudentRole}
        onRequestTeacherAccess={handleRequestTeacherAccess}
        onContinueAsStudentInstead={handleSelectStudentRole}
        onLoadClasses={fetchAvailableClasses}
      />
    );
  }

  return (
    <div className={`app min-h-screen flex ${
      activeTab === 'analytics' ? 'bg-[#0d1210]' : 'bg-[#faf9f5]'
    }`}>
      {/* Sidebar Component */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        streakDays={streak}
        profile={profile}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Floating Menu Toggle Button for mobile screens */}
      <button 
        onClick={() => setIsSidebarOpen(true)}
        className={`lg:hidden fixed top-4.5 left-4.5 z-40 w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer shadow-md hover:scale-105 active:scale-95 transition-all ${
          activeTab === 'analytics'
            ? 'bg-[#121a17] border-white/8 text-[#f4f4ef] hover:bg-white/5'
            : 'bg-white border-[#ece9e3] text-[#1b1c19] hover:bg-[#faf9f5]'
        }`}
        aria-label="Open sidebar menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Main Panel Content Wrap */}
      <main className="flex-1 min-w-0 px-4 sm:px-6 md:px-10 py-8 lg:py-10 relative">
        <Header 
          onProfileChange={handleProfileChange} 
          profileToView={selectedProfileForModal}
          onCloseProfileToView={() => setSelectedProfileForModal(null)}
          onOpenSwitchModal={() => setShowSwitchModal(true)}
        />
        {renderTabContent()}
      </main>

      {/* Interactive Logging Modal */}
      <LogSessionModal 
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setPrefilledMinutes(null);
        }}
        subjects={subjects}
        logs={logs}
        prefilledMinutes={prefilledMinutes}
        onLogSubmit={handleLogSubmit}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-[#ece9e3] shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#ece9e3] bg-[#f4f7f4] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <SettingsModalIcon className="w-5 h-5 text-[#1b3b2a]" />
                <h3 className="text-[16px] font-extrabold text-[#1b1c19] font-display">System Settings</h3>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-extrabold text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-5 text-left">
              {/* Profile card summary */}
              <div className="bg-[#faf9f5] border border-[#ece9e3] p-4 rounded-xl">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Signed-In Profile</span>
                <div className="mt-1.5 font-bold text-gray-800 text-[14px]">
                  <p>Name: <span className="font-extrabold text-[#1b1c19]">{profile?.fullName || "Guest User"}</span></p>
                  <p className="mt-0.5">ID/Roll No: <span className="font-extrabold text-[#1b1c19]">{profile?.rollNumber || "GUEST-01"}</span></p>
                  <p className="mt-0.5">Platform Role: <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase text-[10.5px] ml-1.5 inline-block">{profile?.role || "student"}</span></p>
                </div>
              </div>

              {/* Reset database card */}
              <div className="border border-red-100 bg-red-50/15 rounded-xl p-4.5 space-y-3">
                <h4 className="text-[13.5px] font-extrabold text-[#b33a3d] font-display flex items-center gap-1.5">
                  <AlertTriangleIcon className="w-4.5 h-4.5 text-[#b33a3d]" />
                  Demolition Zone: Reset Database
                </h4>
                <p className="text-[11.5px] text-[#83837c] leading-relaxed">
                  Reset My Account Data will overwrite your current active student profile and logs. WIPE &amp; RESET will delete all data across the platform.
                </p>
                
                <button
                  onClick={async () => {
                    let uid = auth.currentUser?.uid;
                    if (!uid) {
                      const stored = localStorage.getItem('mock_sandbox_user');
                      if (stored) {
                        try {
                          uid = JSON.parse(stored).uid;
                        } catch (e) {}
                      }
                    }
                    if (!uid) {
                      alert("Please sign in or launch sandbox mode first to reset your database.");
                      return;
                    }
                    if (!confirm("Are you sure you want to demolish your custom study logs, syllabus ticks, and start fresh? This cannot be undone.")) {
                      return;
                    }
                    try {
                      const classId = activeClassId;
                      const studentProfileRef = doc(db, 'classes', classId, 'students', uid);
                      
                      const defaultProfile = {
                        fullName: profile?.fullName || auth.currentUser?.displayName || 'Student User',
                        rollNumber: profile?.rollNumber || 'STUDENT-' + Math.floor(1000 + Math.random() * 9000),
                        role: profile?.role || 'student',
                        streak: 0,
                        todayPoints: 0,
                        points: 0,
                        weeklyPoints: 0,
                        edofoxLinked: false,
                        subjects: initialSubjects,
                        goals: initialGoals,
                        syllabus: initialSyllabus,
                        backlogs: [],
                        createdAt: new Date().toISOString()
                      };

                      await setDoc(studentProfileRef, defaultProfile);
                      localStorage.removeItem('edofox_linked');
                      localStorage.removeItem('edofox_username');
                      localStorage.removeItem('edofox_password');
                      localStorage.removeItem('role_override');
                      localStorage.removeItem('class_override');

                      // 1. Delete all daily logs
                      try {
                        const logsRef = collection(db, 'classes', classId, 'students', uid, 'dailyLogs');
                        const logsSnap = await getDocs(logsRef);
                        for (const docS of logsSnap.docs) {
                          await deleteDoc(docS.ref);
                        }
                      } catch (err) {
                        console.warn("Error deleting daily logs:", err);
                      }

                      // 2. Delete student backlogs
                      try {
                        const backlogsRef = collection(db, 'classes', classId, 'students', uid, 'backlogs');
                        const backSnap = await getDocs(backlogsRef);
                        for (const docS of backSnap.docs) {
                          await deleteDoc(docS.ref);
                        }
                      } catch (err) {
                        console.warn("Error deleting backlogs:", err);
                      }

                      // 3. Delete synced mock test attempts
                      try {
                        const mockAttemptsRef = collection(db, 'classes', classId, 'students', uid, 'mockTests');
                        const attemptsSnap = await getDocs(mockAttemptsRef);
                        for (const docS of attemptsSnap.docs) {
                          await deleteDoc(docS.ref);
                        }
                      } catch (err) {
                        console.warn("Error deleting mock attempts:", err);
                      }

                      alert("Database reset successfully completed!");
                      setIsSettingsOpen(false);
                      // Trigger page reload to re-subscribe to fresh data
                      window.location.reload();
                    } catch (err: any) {
                      alert("Reset error: " + err.message);
                    }
                  }}
                  className="w-full bg-[#b33a3d] hover:bg-[#c24245] text-white font-extrabold text-[12.5px] py-2 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Reset My Account Data
                </button>

                {profile?.role === 'admin' && (
                    <div>
                      <button
                        onClick={async () => {
                          if (!confirm("⚠️ CAUTION: This will delete ALL classes, students, daily logs, backlogs, and teachers from Firestore. Only pre-registered admins will be kept. Do you want to proceed?")) {
                            return;
                          }
                          try {
                            // 1. Delete all students and their subcollections (using collectionGroup to capture orphaned records)
                            const studentsSnap = await getDocs(collectionGroup(db, 'students'));
                            for (const sDoc of studentsSnap.docs) {
                              const subcollNames = ['dailyLogs', 'backlogs', 'mockTests', 'profile'];
                              for (const sub of subcollNames) {
                                const subRef = collection(db, sDoc.ref.path, sub);
                                const subSnap = await getDocs(subRef);
                                for (const subDoc of subSnap.docs) {
                                  await deleteDoc(subDoc.ref);
                                }
                              }
                              await deleteDoc(sDoc.ref);
                            }

                            // 2. Delete all classes and class-wide subcollections
                            const classesRef = collection(db, 'classes');
                            const classesSnap = await getDocs(classesRef);
                            for (const docS of classesSnap.docs) {
                              // Delete class-wide mockTests subcollection
                              try {
                                const classMocksRef = collection(db, 'classes', docS.id, 'mockTests');
                                const classMocksSnap = await getDocs(classMocksRef);
                                for (const mDoc of classMocksSnap.docs) {
                                  await deleteDoc(mDoc.ref);
                                }
                              } catch (err) {
                                console.warn("Error deleting class-wide mockTests:", err);
                              }

                              // Delete class-wide settings subcollection
                              try {
                                const classSettingsRef = collection(db, 'classes', docS.id, 'settings');
                                const classSettingsSnap = await getDocs(classSettingsRef);
                                for (const setDocSnap of classSettingsSnap.docs) {
                                  await deleteDoc(setDocSnap.ref);
                                }
                              } catch (err) {
                                console.warn("Error deleting class-wide settings:", err);
                              }

                              await deleteDoc(docS.ref);
                            }

                            // 2. Delete all teachers from allowlist
                            const teachersRef = collection(db, 'platform', 'main', 'teachers');
                            const teachersSnap = await getDocs(teachersRef);
                            for (const tDoc of teachersSnap.docs) {
                              await deleteDoc(tDoc.ref);
                            }

                            // 3. Pre-register admins
                            const adminEmail1 = 'awacharshyam13@gmail.com';
                            const adminRef1 = doc(db, 'admins', adminEmail1);
                            await setDoc(adminRef1, { email: adminEmail1, role: 'admin', createdAt: new Date().toISOString() });

                            const adminEmail2 = 'yashawachar101@gmail.com';
                            const adminRef2 = doc(db, 'admins', adminEmail2);
                            await setDoc(adminRef2, { email: adminEmail2, role: 'admin', createdAt: new Date().toISOString() });

                            localStorage.removeItem('role_override');
                            localStorage.removeItem('class_override');

                            alert("💥 Firestore database successfully wiped! All classes and teachers have been cleared.");
                            setIsSettingsOpen(false);
                            window.location.reload();
                          } catch (err: any) {
                             console.error("💥 Platform Wipe failed with details:", err);
                             alert("Wipe failed: " + err.message + "\nCheck developer console (F12) for the exact document path that triggered the permission block.");
                           }
                        }}
                        className="w-full bg-[#1b1c19] hover:bg-black text-white font-extrabold text-[12.5px] py-2 px-4 rounded-xl shadow-xs transition-colors cursor-pointer mt-2"
                      >
                        💥 WIPE &amp; RESET ALL FIRESTORE DATA
                      </button>
                      <p className="text-[10px] text-gray-400 text-center mt-1">
                        Logged in as: <strong>{auth.currentUser?.email || "Anonymous/None"}</strong>.
                        Must match <code>firestore.rules</code> admin emails to execute.
                      </p>
                    </div>
                  )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#ece9e3] bg-[#faf9f5] flex justify-end">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 bg-[#faf9f5] border border-[#ece9e3] hover:bg-[#f2f0ea] text-gray-700 font-bold text-[12.5px] rounded-xl cursor-pointer"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Role and Class Switcher Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-[#ece9e3] rounded-2xl shadow-xl w-full max-w-md overflow-hidden text-left animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 bg-[#faf9f5]">
              <h3 className="font-extrabold text-[#1b1c19] text-[15px] flex items-center gap-1.5 font-display">
                🔄 Admin Portal Role Switcher
              </h3>
              <p className="text-xs text-gray-500 mt-1">Select the target class, role, and configuration to switch portals.</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">Target Portal Role</label>
                <div className="flex gap-2">
                  {(['student', 'teacher', 'admin'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setSwitchRole(r)}
                      className={`flex-1 py-2 text-[12px] font-extrabold uppercase rounded-xl border transition-all cursor-pointer ${
                        switchRole === r
                          ? 'bg-[#1b1c19] text-white border-[#1b1c19] shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Class Selection - Only relevant if not switching back to Admin */}
              {switchRole !== 'admin' && (
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">Target Classroom Context</label>
                  {adminClasses.length === 0 ? (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-[11.5px] font-bold leading-relaxed">
                      ⚠️ No classrooms found. You must create a classroom in the Admin Dashboard (Classes tab) first.
                    </div>
                  ) : (
                    <select
                      value={switchClassId}
                      onChange={(e) => setSwitchClassId(e.target.value)}
                      className="w-full bg-[#faf9f5] border border-[#ece9e3] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-700 outline-none focus:ring-1 focus:ring-[#1b1c19]"
                    >
                      {adminClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Inspect / Create Selection - Only relevant if student or teacher */}
              {switchRole !== 'admin' && (
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">Presence Configuration</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSwitchMode('inspect')}
                      className={`flex-1 py-2 px-3 text-[11.5px] font-bold rounded-xl border transition-all cursor-pointer ${
                        switchMode === 'inspect'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      🔍 Inspect Only (Read-Only)
                    </button>
                    <button
                      onClick={() => setSwitchMode('create')}
                      className={`flex-1 py-2 px-3 text-[11.5px] font-bold rounded-xl border transition-all cursor-pointer ${
                        switchMode === 'create'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ✨ Create Account (Write Record)
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    {switchMode === 'inspect' 
                      ? "Allows inspecting the portal in this class without registering your email profile in Firestore." 
                      : `Will write a live ${switchRole} profile document to Firestore for this class, creating a persistent account.`}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#ece9e3] bg-[#faf9f5] flex justify-end gap-2">
              <button 
                onClick={() => setShowSwitchModal(false)}
                className="px-4 py-2 border border-[#ece9e3] hover:bg-[#f2f0ea] text-gray-700 font-bold text-[12.5px] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleApplyOverride}
                disabled={switchRole !== 'admin' && adminClasses.length === 0}
                className={`px-5 py-2 font-extrabold text-[12.5px] rounded-xl transition-all ${
                  (switchRole !== 'admin' && adminClasses.length === 0)
                    ? 'bg-gray-150 text-gray-400 border border-gray-250 cursor-not-allowed'
                    : 'bg-[#1b1c19] text-white hover:bg-black cursor-pointer'
                }`}
              >
                Apply Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
