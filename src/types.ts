export interface LogEntry {
  subject: string;
  minutes: number;
  questionsSolved: number;
  dppStatus: 'completed' | 'progress' | 'none';
  focus: number;
}

export interface DailyLog {
  date: string;
  entries: LogEntry[];
  editedAt?: string;
  editHistory?: string[];
  retroactive?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  points: number;
  delta: number;
  isMe?: boolean;
  avatar?: string;
  emoji: string;
  uid?: string;
  classId?: string;
  photoURL?: string | null;
  initials?: string;
}

export interface Goal {
  id: string;
  icon: string;
  bg: string;
  title: string;
  sub: string;
  cur: number;
  tot: number;
  pct: number;
  prio: 'High' | 'Medium' | 'Low';
  date: string;
  left: string;
  color: string;
  completed: boolean;
}

export interface SubTopic {
  id: string;
  name: string;
  time: string;
  qs: string;
  status: 'completed' | 'progress' | 'notstarted';
  scope?: 'both' | 'main-only' | 'advanced-only';
  chapter?: string;
}

export interface SyllabusTopic {
  id: string;
  name: string;
  cur: number;
  tot: number;
  pct: number;
  subtopics: SubTopic[];
}

export interface SubjectTarget {
  id: string;
  name: string;
  ic: string;
  bg: string;
  barColor: string;
  target: number;
  done: number;
}

export interface BacklogItem {
  id: string;
  subject: 'physics' | 'chemistry' | 'mathematics';
  topic: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'pending' | 'progress' | 'cleared';
  createdDate: string;
  targetDate: string;
  points: number;
}
