import { SubjectTarget, LeaderboardEntry, Goal, SyllabusTopic, DailyLog, BacklogItem } from '../types';

export const initialSubjects: SubjectTarget[] = [
  { id: 'physics', name: 'Physics', ic: '⚛️', bg: '#eaf1fb', barColor: '#4a7fd6', target: 0, done: 0 },
  { id: 'chemistry', name: 'Chemistry', ic: '🧪', bg: '#eafaf0', barColor: '#1f9d51', target: 0, done: 0 },
  { id: 'mathematics', name: 'Mathematics', ic: '🧮', bg: '#fdf3e0', barColor: '#e8871e', target: 0, done: 0 },
];

export const initialDailyLogs: DailyLog[] = [];

export const initialLeaderboard: { daily: LeaderboardEntry[]; weekly: LeaderboardEntry[]; lifetime: LeaderboardEntry[] } = {
  daily: [],
  weekly: [],
  lifetime: []
};

export const initialGoals: Goal[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// COMPREHENSIVE JEE (MAINS + ADVANCED) SYLLABUS
// ─────────────────────────────────────────────────────────────────────────────
// Status rules applied: Clean Slate (All notstarted)
// ─────────────────────────────────────────────────────────────────────────────

export const initialSyllabus: SyllabusTopic[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // PHYSICS — 23 chapters, 95 subtopics, 0 completed
  // cur = 0, tot = 95, pct = 0
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'phys-1',
    name: 'Physics',
    cur: 0,
    tot: 99,
    pct: 0,
    subtopics: [
      // ── 1. Units & Dimensions ──────────────────────────────────────────
      { id: 'p-sub-1', name: 'Significant Figures & Error Propagation', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Units & Dimensions', scope: 'both' },
      { id: 'p-sub-2', name: 'Dimensional Analysis & Applications', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Units & Dimensions', scope: 'both' },
      { id: 'p-sub-3', name: 'Unit Conversion & SI System', time: '0 / 25 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Units & Dimensions', scope: 'both' },

      // ── 2. Kinematics ──────────────────────────────────────────────────
      { id: 'p-sub-4', name: 'Motion in a Straight Line', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Kinematics', scope: 'both' },
      { id: 'p-sub-5', name: 'Projectile Motion', time: '0 / 60 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Kinematics', scope: 'both' },
      { id: 'p-sub-6', name: 'Relative Velocity', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Kinematics', scope: 'both' },
      { id: 'p-sub-7', name: 'Circular Motion Basics', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Kinematics', scope: 'both' },

      // ── 3. Laws of Motion ──────────────────────────────────────────────
      { id: 'p-sub-8', name: 'Newton\'s Three Laws', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Laws of Motion', scope: 'both' },
      { id: 'p-sub-9', name: 'Free Body Diagrams', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Laws of Motion', scope: 'both' },
      { id: 'p-sub-10', name: 'Friction (Static & Kinetic)', time: '0 / 60 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Laws of Motion', scope: 'both' },
      { id: 'p-sub-11', name: 'Constraint Relations', time: '0 / 60 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Laws of Motion', scope: 'both' },
      { id: 'p-sub-12', name: 'Pseudo Forces', time: '0 / 60 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Laws of Motion', scope: 'advanced-only' },

      // ── 4. Work, Energy & Power ────────────────────────────────────────
      { id: 'p-sub-13', name: 'Work-Energy Theorem', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Work, Energy & Power', scope: 'both' },
      { id: 'p-sub-14', name: 'Conservative & Non-Conservative Forces', time: '0 / 60 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Work, Energy & Power', scope: 'both' },
      { id: 'p-sub-15', name: 'Power & Efficiency', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Work, Energy & Power', scope: 'both' },
      { id: 'p-sub-16', name: 'Potential Energy Curves', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Work, Energy & Power', scope: 'advanced-only' },

      // ── 5. Centre of Mass & Momentum ───────────────────────────────────
      { id: 'p-sub-17', name: 'Centre of Mass Calculation', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Centre of Mass & Momentum', scope: 'both' },
      { id: 'p-sub-18', name: 'Conservation of Linear Momentum', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Centre of Mass & Momentum', scope: 'both' },
      { id: 'p-sub-19', name: 'Collisions (Elastic & Inelastic)', time: '0 / 60 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Centre of Mass & Momentum', scope: 'both' },
      { id: 'p-sub-20', name: 'Rocket Propulsion', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Centre of Mass & Momentum', scope: 'advanced-only' },

      // ── 6. Rotational Motion ────────────────────────────────────────────
      { id: 'p-sub-21', name: 'Moment of Inertia & Axis Theorems', time: '0 / 70 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Rotational Motion', scope: 'both' },
      { id: 'p-sub-22', name: 'Torque & Angular Momentum', time: '0 / 60 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Rotational Motion', scope: 'both' },
      { id: 'p-sub-23', name: 'Rolling Motion', time: '0 / 65 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Rotational Motion', scope: 'advanced-only' },
      { id: 'p-sub-24', name: 'Angular Momentum Conservation', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Rotational Motion', scope: 'both' },

      // ── 7. Gravitation ─────────────────────────────────────────────────
      { id: 'p-sub-25', name: 'Newton\'s Law of Gravitation', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Gravitation', scope: 'both' },
      { id: 'p-sub-26', name: 'Gravitational Potential & Field', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Gravitation', scope: 'both' },
      { id: 'p-sub-27', name: 'Kepler\'s Laws', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Gravitation', scope: 'both' },
      { id: 'p-sub-28', name: 'Escape Velocity & Orbital Mechanics', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Gravitation', scope: 'both' },
      { id: 'p-sub-29', name: 'Satellites', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Gravitation', scope: 'both' },

      // ── 8. Properties of Solids & Fluids ───────────────────────────────
      { id: 'p-sub-30', name: 'Elasticity (Young\'s/Bulk/Shear Modulus)', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Properties of Solids & Fluids', scope: 'both' },
      { id: 'p-sub-31', name: 'Surface Tension & Capillarity', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Properties of Solids & Fluids', scope: 'both' },
      { id: 'p-sub-32', name: 'Viscosity & Stokes\' Law', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Properties of Solids & Fluids', scope: 'both' },
      { id: 'p-sub-33', name: 'Bernoulli\'s Principle', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Properties of Solids & Fluids', scope: 'both' },
      { id: 'p-sub-34', name: 'Pascal\'s & Archimedes\' Principle', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Properties of Solids & Fluids', scope: 'both' },

      // ── 9. Thermodynamics & KTG ────────────────────────────────────────
      { id: 'p-sub-35', name: 'Kinetic Theory of Gases', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Thermodynamics & KTG', scope: 'both' },
      { id: 'p-sub-36', name: 'First Law of Thermodynamics', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Thermodynamics & KTG', scope: 'both' },
      { id: 'p-sub-37', name: 'Second Law & Entropy', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Thermodynamics & KTG', scope: 'both' },
      { id: 'p-sub-38', name: 'Carnot Engine', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Thermodynamics & KTG', scope: 'both' },
      { id: 'p-sub-39', name: 'Heat Transfer', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Thermodynamics & KTG', scope: 'both' },

      // ── 10. Oscillations ───────────────────────────────────────────────
      { id: 'p-sub-40', name: 'Simple Harmonic Motion', time: '0 / 60 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Oscillations', scope: 'both' },
      { id: 'p-sub-41', name: 'Damped & Forced Oscillations', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Oscillations', scope: 'advanced-only' },
      { id: 'p-sub-42', name: 'Spring-Mass & Pendulum Systems', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Oscillations', scope: 'both' },
      { id: 'p-sub-43', name: 'Energy in SHM', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Oscillations', scope: 'both' },

      // ── 11. Waves ──────────────────────────────────────────────────────
      { id: 'p-sub-44', name: 'Transverse & Longitudinal Waves', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Waves', scope: 'both' },
      { id: 'p-sub-45', name: 'Superposition & Standing Waves', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Waves', scope: 'both' },
      { id: 'p-sub-46', name: 'Doppler Effect', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Waves', scope: 'both' },
      { id: 'p-sub-47', name: 'Beats', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Waves', scope: 'both' },
      { id: 'p-sub-48', name: 'Sound Waves & Resonance', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Waves', scope: 'both' },

      // ── 12. Electrostatics ─────────────────────────────────────────────
      { id: 'p-sub-49', name: 'Coulomb\'s Law & Electric Field', time: '0 / 55 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Electrostatics', scope: 'both' },
      { id: 'p-sub-50', name: 'Gauss\'s Law', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Electrostatics', scope: 'both' },
      { id: 'p-sub-51', name: 'Electric Potential & Equipotential Surfaces', time: '0 / 55 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Electrostatics', scope: 'both' },
      { id: 'p-sub-52', name: 'Capacitance & Dielectrics', time: '0 / 60 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Electrostatics', scope: 'both' },
      { id: 'p-sub-53', name: 'Energy Stored in Capacitors', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Electrostatics', scope: 'both' },

      // ── 13. Current Electricity ────────────────────────────────────────
      { id: 'p-sub-54', name: 'Ohm\'s Law & Drift Velocity', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Current Electricity', scope: 'both' },
      { id: 'p-sub-55', name: 'Kirchhoff\'s Laws', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Current Electricity', scope: 'both' },
      { id: 'p-sub-56', name: 'Wheatstone Bridge & Potentiometer', time: '0 / 55 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Current Electricity', scope: 'both' },
      { id: 'p-sub-57', name: 'RC Circuits', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Current Electricity', scope: 'advanced-only' },
      { id: 'p-sub-58', name: 'Heating Effect of Current', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Current Electricity', scope: 'both' },

      // ── 14. Magnetic Effects of Current ─────────────────────────────────
      { id: 'p-sub-59', name: 'Biot-Savart Law', time: '0 / 55 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Magnetic Effects of Current', scope: 'both' },
      { id: 'p-sub-60', name: 'Ampere\'s Law', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Magnetic Effects of Current', scope: 'both' },
      { id: 'p-sub-61', name: 'Force on Current-Carrying Conductor', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Magnetic Effects of Current', scope: 'both' },
      { id: 'p-sub-62', name: 'Moving Coil Galvanometer', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Magnetic Effects of Current', scope: 'both' },
      { id: 'p-sub-63', name: 'Solenoid & Toroid', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Magnetic Effects of Current', scope: 'both' },

      // ── 15. Magnetism & Matter ──────────────────────────────────────────
      { id: 'p-sub-64', name: 'Magnetic Dipole Moment', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Magnetism & Matter', scope: 'both' },
      { id: 'p-sub-65', name: 'Earth\'s Magnetism', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Magnetism & Matter', scope: 'both' },
      { id: 'p-sub-66', name: 'Dia/Para/Ferromagnetic Materials', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Magnetism & Matter', scope: 'both' },
      { id: 'p-sub-67', name: 'Hysteresis', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Magnetism & Matter', scope: 'both' },

      // ── 16. EMI & AC ───────────────────────────────────────────────────
      { id: 'p-sub-68', name: 'Faraday\'s & Lenz\'s Law', time: '0 / 55 mins', qs: '0 Qs', status: 'notstarted', chapter: 'EMI & Alternating Current', scope: 'both' },
      { id: 'p-sub-69', name: 'Self & Mutual Inductance', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'EMI & Alternating Current', scope: 'both' },
      { id: 'p-sub-70', name: 'LCR Series Circuits', time: '0 / 60 mins', qs: '0 Qs', status: 'notstarted', chapter: 'EMI & Alternating Current', scope: 'both' },
      { id: 'p-sub-71', name: 'Resonance & Power Factor', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'EMI & Alternating Current', scope: 'both' },
      { id: 'p-sub-72', name: 'Transformers', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'EMI & Alternating Current', scope: 'both' },

      // ── 17. Electromagnetic Waves ──────────────────────────────────────
      { id: 'p-sub-73', name: 'Displacement Current & Maxwell\'s Equations', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Electromagnetic Waves', scope: 'main-only' },
      { id: 'p-sub-74', name: 'EM Spectrum', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Electromagnetic Waves', scope: 'both' },
      { id: 'p-sub-75', name: 'Properties of EM Waves', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Electromagnetic Waves', scope: 'both' },

      // ── 18. Ray Optics ─────────────────────────────────────────────────
      { id: 'p-sub-76', name: 'Reflection & Refraction', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Ray Optics', scope: 'both' },
      { id: 'p-sub-77', name: 'Lens Maker\'s Formula', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Ray Optics', scope: 'both' },
      { id: 'p-sub-78', name: 'Prism & Dispersion', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Ray Optics', scope: 'both' },
      { id: 'p-sub-79', name: 'Optical Instruments', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Ray Optics', scope: 'both' },
      { id: 'p-sub-80', name: 'Total Internal Reflection', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Ray Optics', scope: 'both' },

      // ── 19. Wave Optics ────────────────────────────────────────────────
      { id: 'p-sub-81', name: 'Young\'s Double Slit Experiment', time: '0 / 55 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Wave Optics', scope: 'both' },
      { id: 'p-sub-82', name: 'Diffraction', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Wave Optics', scope: 'advanced-only' },
      { id: 'p-sub-83', name: 'Polarization', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Wave Optics', scope: 'advanced-only' },
      { id: 'p-sub-84', name: 'Interference', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Wave Optics', scope: 'both' },

      // ── 20. Dual Nature of Matter ──────────────────────────────────────
      { id: 'p-sub-85', name: 'Photoelectric Effect', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Dual Nature of Matter', scope: 'both' },
      { id: 'p-sub-86', name: 'de Broglie Wavelength', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Dual Nature of Matter', scope: 'both' },
      { id: 'p-sub-87', name: 'Davisson-Germer Experiment', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Dual Nature of Matter', scope: 'advanced-only' },

      // ── 21. Atoms & Nuclei ─────────────────────────────────────────────
      { id: 'p-sub-88', name: 'Bohr Model & Hydrogen Spectrum', time: '0 / 55 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Atoms & Nuclei', scope: 'both' },
      { id: 'p-sub-89', name: 'Nuclear Binding Energy & Mass Defect', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Atoms & Nuclei', scope: 'both' },
      { id: 'p-sub-90', name: 'Radioactivity', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Atoms & Nuclei', scope: 'both' },
      { id: 'p-sub-91', name: 'Nuclear Fission & Fusion', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Atoms & Nuclei', scope: 'both' },

      // ── 22. Semiconductor Electronics ───────────────────────────────────
      { id: 'p-sub-92', name: 'p-n Junction Diode', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Semiconductor Electronics', scope: 'main-only' },
      { id: 'p-sub-93', name: 'Zener Diode', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Semiconductor Electronics', scope: 'main-only' },
      { id: 'p-sub-94', name: 'Transistors', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Semiconductor Electronics', scope: 'main-only' },
      { id: 'p-sub-95', name: 'Logic Gates', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Semiconductor Electronics', scope: 'main-only' },

      // ── 23. Experimental Physics ────────────────────────────────────────
      { id: 'p-sub-96', name: 'Vernier Calipers & Screw Gauge', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Experimental Physics', scope: 'advanced-only' },
      { id: 'p-sub-97', name: 'Meter Bridge & Post Office Box', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Experimental Physics', scope: 'advanced-only' },
      { id: 'p-sub-98', name: 'Error Analysis', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Experimental Physics', scope: 'advanced-only' },
      { id: 'p-sub-99', name: 'Focal Length Experiments', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Experimental Physics', scope: 'advanced-only' },
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHEMISTRY — 30 chapters, 120 subtopics, 0 completed
  // cur = 0, tot = 120, pct = 0
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'chem-1',
    name: 'Chemistry',
    cur: 0,
    tot: 129,
    pct: 0,
    subtopics: [
      // ══════════════════════════════════════════════════════════════════
      // PHYSICAL CHEMISTRY
      // ══════════════════════════════════════════════════════════════════

      // ── 1. Some Basic Concepts & Mole Concept ─────────────────────────
      { id: 'c-sub-1', name: 'Stoichiometry & Molarity', time: '0 / 60 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Some Basic Concepts & Mole Concept', scope: 'both' },
      { id: 'c-sub-2', name: 'Equivalent Weight & Normality', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Some Basic Concepts & Mole Concept', scope: 'advanced-only' },
      { id: 'c-sub-3', name: 'Empirical & Molecular Formula', time: '0 / 60 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Some Basic Concepts & Mole Concept', scope: 'both' },
      { id: 'c-sub-4', name: 'Limiting Reagent & % Yield', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Some Basic Concepts & Mole Concept', scope: 'both' },

      // ── 2. Atomic Structure ────────────────────────────────────────────
      { id: 'c-sub-5', name: 'Bohr\'s Model', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Atomic Structure', scope: 'both' },
      { id: 'c-sub-6', name: 'Quantum Numbers & Orbitals', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Atomic Structure', scope: 'both' },
      { id: 'c-sub-7', name: 'Electronic Configuration', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Atomic Structure', scope: 'both' },
      { id: 'c-sub-8', name: 'Photoelectric Effect', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Atomic Structure', scope: 'both' },

      // ── 3. Chemical Bonding ────────────────────────────────────────────
      { id: 'c-sub-9', name: 'Ionic & Covalent Bonding', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemical Bonding', scope: 'both' },
      { id: 'c-sub-10', name: 'VSEPR Theory', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemical Bonding', scope: 'both' },
      { id: 'c-sub-11', name: 'Molecular Orbital Theory', time: '0 / 60 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemical Bonding', scope: 'both' },
      { id: 'c-sub-12', name: 'Hybridization', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemical Bonding', scope: 'both' },
      { id: 'c-sub-13', name: 'Hydrogen Bonding & Van der Waals', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemical Bonding', scope: 'both' },

      // ── 4. States of Matter ────────────────────────────────────────────
      { id: 'c-sub-14', name: 'Ideal Gas Equation', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'States of Matter', scope: 'both' },
      { id: 'c-sub-15', name: 'Real Gases & Van der Waals', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'States of Matter', scope: 'both' },
      { id: 'c-sub-16', name: 'Graham\'s Law', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'States of Matter', scope: 'both' },
      { id: 'c-sub-17', name: 'Kinetic Molecular Theory', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'States of Matter', scope: 'both' },

      // ── 5. Chemical Thermodynamics ─────────────────────────────────────
      { id: 'c-sub-18', name: 'First Law & Enthalpy', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemical Thermodynamics', scope: 'both' },
      { id: 'c-sub-19', name: 'Hess\'s Law', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemical Thermodynamics', scope: 'both' },
      { id: 'c-sub-20', name: 'Entropy & Spontaneity', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemical Thermodynamics', scope: 'both' },
      { id: 'c-sub-21', name: 'Gibbs Free Energy', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemical Thermodynamics', scope: 'both' },
      { id: 'c-sub-22', name: 'Bond Enthalpy', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemical Thermodynamics', scope: 'both' },

      // ── 6. Chemical & Ionic Equilibrium ────────────────────────────────
      { id: 'c-sub-23', name: 'Law of Mass Action', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemical & Ionic Equilibrium', scope: 'both' },
      { id: 'c-sub-24', name: 'Le Chatelier\'s Principle', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemical & Ionic Equilibrium', scope: 'both' },
      { id: 'c-sub-25', name: 'Solubility Product', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemical & Ionic Equilibrium', scope: 'both' },
      { id: 'c-sub-26', name: 'Buffer Solutions', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemical & Ionic Equilibrium', scope: 'both' },
      { id: 'c-sub-27', name: 'Common Ion Effect', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemical & Ionic Equilibrium', scope: 'both' },

      // ── 7. Redox & Electrochemistry ────────────────────────────────────
      { id: 'c-sub-28', name: 'Oxidation States & Balancing', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Redox & Electrochemistry', scope: 'both' },
      { id: 'c-sub-29', name: 'Nernst Equation', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Redox & Electrochemistry', scope: 'both' },
      { id: 'c-sub-30', name: 'Faraday\'s Laws', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Redox & Electrochemistry', scope: 'both' },
      { id: 'c-sub-31', name: 'Electrochemical Cells', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Redox & Electrochemistry', scope: 'both' },
      { id: 'c-sub-32', name: 'Conductance & Kohlrausch', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Redox & Electrochemistry', scope: 'both' },

      // ── 8. Chemical Kinetics ───────────────────────────────────────────
      { id: 'c-sub-33', name: 'Rate Law & Order', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemical Kinetics', scope: 'both' },
      { id: 'c-sub-34', name: 'Integrated Rate Equations', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemical Kinetics', scope: 'both' },
      { id: 'c-sub-35', name: 'Arrhenius Equation', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemical Kinetics', scope: 'both' },
      { id: 'c-sub-36', name: 'Collision Theory', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemical Kinetics', scope: 'both' },
      { id: 'c-sub-37', name: 'Molecularity', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemical Kinetics', scope: 'both' },

      // ── 9. Solutions & Colligative Properties ──────────────────────────
      { id: 'c-sub-38', name: 'Raoult\'s Law', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Solutions & Colligative Properties', scope: 'both' },
      { id: 'c-sub-39', name: 'Vapour Pressure Lowering', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Solutions & Colligative Properties', scope: 'both' },
      { id: 'c-sub-40', name: 'Boiling Point Elevation & Freezing Point Depression', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Solutions & Colligative Properties', scope: 'both' },
      { id: 'c-sub-41', name: 'Osmotic Pressure', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Solutions & Colligative Properties', scope: 'both' },
      { id: 'c-sub-42', name: 'Van\'t Hoff Factor', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Solutions & Colligative Properties', scope: 'both' },

      // ── 10. Surface Chemistry ──────────────────────────────────────────
      { id: 'c-sub-43', name: 'Adsorption', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Surface Chemistry', scope: 'both' },
      { id: 'c-sub-44', name: 'Catalysis', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Surface Chemistry', scope: 'both' },
      { id: 'c-sub-45', name: 'Colloids', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Surface Chemistry', scope: 'both' },
      { id: 'c-sub-46', name: 'Emulsions', time: '0 / 25 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Surface Chemistry', scope: 'both' },

      // ── 11. Solid State ────────────────────────────────────────────────
      { id: 'c-sub-47', name: 'Crystal Lattice & Unit Cell', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Solid State', scope: 'both' },
      { id: 'c-sub-48', name: 'Packing Efficiency', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Solid State', scope: 'both' },
      { id: 'c-sub-49', name: 'Defects in Solids', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Solid State', scope: 'both' },
      { id: 'c-sub-50', name: 'Electrical & Magnetic Properties', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Solid State', scope: 'both' },

      // ── 12. Nuclear Chemistry ──────────────────────────────────────────
      { id: 'c-sub-51', name: 'Radioactivity Types', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Nuclear Chemistry', scope: 'both' },
      { id: 'c-sub-52', name: 'Half-Life & Carbon Dating', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Nuclear Chemistry', scope: 'both' },
      { id: 'c-sub-53', name: 'Fission & Fusion', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Nuclear Chemistry', scope: 'both' },

      // ══════════════════════════════════════════════════════════════════
      // INORGANIC CHEMISTRY
      // ══════════════════════════════════════════════════════════════════

      // ── 13. Classification & Periodicity ───────────────────────────────
      { id: 'c-sub-54', name: 'Periodic Table Trends', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Classification & Periodicity', scope: 'both' },
      { id: 'c-sub-55', name: 'Ionization Enthalpy', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Classification & Periodicity', scope: 'both' },
      { id: 'c-sub-56', name: 'Electronegativity', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Classification & Periodicity', scope: 'both' },
      { id: 'c-sub-57', name: 'Metallic Character', time: '0 / 25 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Classification & Periodicity', scope: 'both' },

      // ── 14. s-Block Elements ────────────────────────────────────────────
      { id: 'c-sub-58', name: 'Group 1 Elements', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 's-Block Elements', scope: 'both' },
      { id: 'c-sub-59', name: 'Group 2 Elements', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 's-Block Elements', scope: 'both' },
      { id: 'c-sub-60', name: 'Anomalous Behaviour', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 's-Block Elements', scope: 'both' },
      { id: 'c-sub-61', name: 'Important Compounds', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 's-Block Elements', scope: 'both' },

      // ── 15. p-Block Elements ────────────────────────────────────────────
      { id: 'c-sub-62', name: 'Group 13-14 Elements', time: '0 / 55 mins', qs: '0 Qs', status: 'notstarted', chapter: 'p-Block Elements', scope: 'both' },
      { id: 'c-sub-63', name: 'Group 15-16 Elements', time: '0 / 55 mins', qs: '0 Qs', status: 'notstarted', chapter: 'p-Block Elements', scope: 'both' },
      { id: 'c-sub-64', name: 'Group 17 (Halogens)', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'p-Block Elements', scope: 'both' },
      { id: 'c-sub-65', name: 'Group 18 (Noble Gases)', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'p-Block Elements', scope: 'both' },
      { id: 'c-sub-66', name: 'Interhalogen Compounds', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'p-Block Elements', scope: 'advanced-only' },

      // ── 16. d-Block & f-Block ──────────────────────────────────────────
      { id: 'c-sub-67', name: 'Transition Metal Properties', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'd-Block & f-Block Elements', scope: 'both' },
      { id: 'c-sub-68', name: 'Lanthanoid/Actinoid Contraction', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'd-Block & f-Block Elements', scope: 'both' },
      { id: 'c-sub-69', name: 'Variable Oxidation States', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'd-Block & f-Block Elements', scope: 'both' },
      { id: 'c-sub-70', name: 'Colored Ions', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'd-Block & f-Block Elements', scope: 'both' },

      // ── 17. Coordination Compounds ─────────────────────────────────────
      { id: 'c-sub-71', name: 'Werner\'s Theory', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Coordination Compounds', scope: 'both' },
      { id: 'c-sub-72', name: 'Crystal Field Theory', time: '0 / 55 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Coordination Compounds', scope: 'both' },
      { id: 'c-sub-73', name: 'Isomerism in Coordination Compounds', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Coordination Compounds', scope: 'both' },
      { id: 'c-sub-74', name: 'Stability Constants', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Coordination Compounds', scope: 'advanced-only' },
      { id: 'c-sub-75', name: 'Applications of Coordination Compounds', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Coordination Compounds', scope: 'both' },

      // ── 18. Principles of Metallurgy ───────────────────────────────────
      { id: 'c-sub-76', name: 'Ore Concentration', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Principles of Metallurgy', scope: 'advanced-only' },
      { id: 'c-sub-77', name: 'Thermodynamic Principles (Ellingham)', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Principles of Metallurgy', scope: 'advanced-only' },
      { id: 'c-sub-78', name: 'Refining', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Principles of Metallurgy', scope: 'advanced-only' },
      { id: 'c-sub-79', name: 'Extraction of Al/Cu/Fe/Zn', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Principles of Metallurgy', scope: 'advanced-only' },

      // ── 19. Qualitative Analysis ───────────────────────────────────────
      { id: 'c-sub-80', name: 'Cation Analysis', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Qualitative Analysis', scope: 'advanced-only' },
      { id: 'c-sub-81', name: 'Anion Analysis', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Qualitative Analysis', scope: 'advanced-only' },
      { id: 'c-sub-82', name: 'Flame Tests', time: '0 / 25 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Qualitative Analysis', scope: 'advanced-only' },
      { id: 'c-sub-83', name: 'Borax Bead Test', time: '0 / 25 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Qualitative Analysis', scope: 'advanced-only' },

      // ── 20. Hydrogen ───────────────────────────────────────────────────
      { id: 'c-sub-84', name: 'Position in Periodic Table', time: '0 / 25 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Hydrogen', scope: 'both' },
      { id: 'c-sub-85', name: 'Isotopes of Hydrogen', time: '0 / 20 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Hydrogen', scope: 'both' },
      { id: 'c-sub-86', name: 'Water Properties', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Hydrogen', scope: 'both' },
      { id: 'c-sub-87', name: 'H₂O₂ (Hydrogen Peroxide)', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Hydrogen', scope: 'both' },

      // ══════════════════════════════════════════════════════════════════
      // ORGANIC CHEMISTRY
      // ══════════════════════════════════════════════════════════════════

      // ── 21. GOC (General Organic Chemistry) ────────────────────────────
      { id: 'c-sub-88', name: 'IUPAC Nomenclature', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'General Organic Chemistry', scope: 'both' },
      { id: 'c-sub-89', name: 'Inductive & Resonance Effects', time: '0 / 55 mins', qs: '0 Qs', status: 'notstarted', chapter: 'General Organic Chemistry', scope: 'both' },
      { id: 'c-sub-90', name: 'Isomerism', time: '0 / 60 mins', qs: '0 Qs', status: 'notstarted', chapter: 'General Organic Chemistry', scope: 'both' },
      { id: 'c-sub-91', name: 'Hyperconjugation', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'General Organic Chemistry', scope: 'both' },
      { id: 'c-sub-92', name: 'Reaction Intermediates', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'General Organic Chemistry', scope: 'both' },

      // ── 22. Hydrocarbons ───────────────────────────────────────────────
      { id: 'c-sub-93', name: 'Alkanes', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Hydrocarbons', scope: 'both' },
      { id: 'c-sub-94', name: 'Alkenes (Markovnikov\'s Rule)', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Hydrocarbons', scope: 'both' },
      { id: 'c-sub-95', name: 'Alkynes', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Hydrocarbons', scope: 'both' },
      { id: 'c-sub-96', name: 'Aromatic Hydrocarbons', time: '0 / 55 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Hydrocarbons', scope: 'both' },

      // ── 23. Haloalkanes & Haloarenes ────────────────────────────────────
      { id: 'c-sub-97', name: 'SN1/SN2 Mechanisms', time: '0 / 55 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Haloalkanes & Haloarenes', scope: 'both' },
      { id: 'c-sub-98', name: 'E1/E2 Elimination', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Haloalkanes & Haloarenes', scope: 'both' },
      { id: 'c-sub-99', name: 'Grignard Reagents', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Haloalkanes & Haloarenes', scope: 'both' },
      { id: 'c-sub-100', name: 'Wurtz Reaction', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Haloalkanes & Haloarenes', scope: 'both' },

      // ── 24. Alcohols, Phenols & Ethers ─────────────────────────────────
      { id: 'c-sub-101', name: 'Preparation & Reactions', time: '0 / 55 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Alcohols, Phenols & Ethers', scope: 'both' },
      { id: 'c-sub-102', name: 'Lucas & Victor Meyer Test', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Alcohols, Phenols & Ethers', scope: 'both' },
      { id: 'c-sub-103', name: 'Reimer-Tiemann Reaction', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Alcohols, Phenols & Ethers', scope: 'both' },
      { id: 'c-sub-104', name: 'Williamson Synthesis', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Alcohols, Phenols & Ethers', scope: 'both' },

      // ── 25. Aldehydes, Ketones & Carboxylic Acids ──────────────────────
      { id: 'c-sub-105', name: 'Nucleophilic Addition', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Aldehydes, Ketones & Carboxylic Acids', scope: 'both' },
      { id: 'c-sub-106', name: 'Aldol Condensation', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Aldehydes, Ketones & Carboxylic Acids', scope: 'both' },
      { id: 'c-sub-107', name: 'Cannizzaro Reaction', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Aldehydes, Ketones & Carboxylic Acids', scope: 'both' },
      { id: 'c-sub-108', name: 'Clemmensen/Wolff-Kishner Reduction', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Aldehydes, Ketones & Carboxylic Acids', scope: 'both' },
      { id: 'c-sub-109', name: 'HVZ Reaction', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Aldehydes, Ketones & Carboxylic Acids', scope: 'advanced-only' },

      // ── 26. Organic Nitrogen Compounds ─────────────────────────────────
      { id: 'c-sub-110', name: 'Amines', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Organic Nitrogen Compounds', scope: 'both' },
      { id: 'c-sub-111', name: 'Gabriel Synthesis', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Organic Nitrogen Compounds', scope: 'both' },
      { id: 'c-sub-112', name: 'Hoffmann Degradation', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Organic Nitrogen Compounds', scope: 'both' },
      { id: 'c-sub-113', name: 'Diazonium Salts', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Organic Nitrogen Compounds', scope: 'both' },

      // ── 27. Biomolecules ───────────────────────────────────────────────
      { id: 'c-sub-114', name: 'Carbohydrates', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Biomolecules', scope: 'both' },
      { id: 'c-sub-115', name: 'Amino Acids & Proteins', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Biomolecules', scope: 'both' },
      { id: 'c-sub-116', name: 'Enzymes', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Biomolecules', scope: 'both' },
      { id: 'c-sub-117', name: 'Nucleic Acids', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Biomolecules', scope: 'both' },
      { id: 'c-sub-118', name: 'Vitamins', time: '0 / 25 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Biomolecules', scope: 'both' },

      // ── 28. Polymers ───────────────────────────────────────────────────
      { id: 'c-sub-119', name: 'Addition & Condensation Polymers', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Polymers', scope: 'both' },
      { id: 'c-sub-120', name: 'Rubber', time: '0 / 25 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Polymers', scope: 'both' },
      { id: 'c-sub-121', name: 'Biodegradable Polymers', time: '0 / 25 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Polymers', scope: 'both' },
      { id: 'c-sub-122', name: 'Bakelite/Nylon/Teflon', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Polymers', scope: 'both' },

      // ── 29. Chemistry in Everyday Life ─────────────────────────────────
      { id: 'c-sub-123', name: 'Drugs', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemistry in Everyday Life', scope: 'main-only' },
      { id: 'c-sub-124', name: 'Food Preservatives', time: '0 / 25 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemistry in Everyday Life', scope: 'main-only' },
      { id: 'c-sub-125', name: 'Soaps & Detergents', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Chemistry in Everyday Life', scope: 'main-only' },

      // ── 30. Environmental Chemistry ────────────────────────────────────
      { id: 'c-sub-126', name: 'Air/Water Pollution', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Environmental Chemistry', scope: 'main-only' },
      { id: 'c-sub-127', name: 'Ozone Depletion', time: '0 / 25 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Environmental Chemistry', scope: 'main-only' },
      { id: 'c-sub-128', name: 'Greenhouse Effect', time: '0 / 25 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Environmental Chemistry', scope: 'main-only' },
      { id: 'c-sub-129', name: 'Green Chemistry', time: '0 / 25 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Environmental Chemistry', scope: 'main-only' },
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MATHEMATICS — 25 chapters, 102 subtopics, 0 completed
  // cur = 0, tot = 102, pct = 0
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'math-1',
    name: 'Mathematics',
    cur: 0,
    tot: 108,
    pct: 0,
    subtopics: [
      // ── 1. Sets, Relations & Functions ──────────────────────────────────
      { id: 'm-sub-1', name: 'Types of Sets', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Sets, Relations & Functions', scope: 'both' },
      { id: 'm-sub-2', name: 'Types of Relations', time: '0 / 60 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Sets, Relations & Functions', scope: 'both' },
      { id: 'm-sub-3', name: 'Composite & Inverse Functions', time: '0 / 60 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Sets, Relations & Functions', scope: 'both' },
      { id: 'm-sub-4', name: 'Domain & Range', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Sets, Relations & Functions', scope: 'both' },
      { id: 'm-sub-5', name: 'Bijective Functions', time: '0 / 60 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Sets, Relations & Functions', scope: 'both' },

      // ── 2. Complex Numbers ─────────────────────────────────────────────
      { id: 'm-sub-6', name: 'Algebra of Complex Numbers', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Complex Numbers', scope: 'both' },
      { id: 'm-sub-7', name: 'Argand Plane & Polar Form', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Complex Numbers', scope: 'both' },
      { id: 'm-sub-8', name: 'De Moivre\'s Theorem', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Complex Numbers', scope: 'both' },
      { id: 'm-sub-9', name: 'Roots of Unity', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Complex Numbers', scope: 'both' },
      { id: 'm-sub-10', name: 'Geometric Applications', time: '0 / 55 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Complex Numbers', scope: 'advanced-only' },

      // ── 3. Matrices & Determinants ─────────────────────────────────────
      { id: 'm-sub-11', name: 'Types of Matrices', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Matrices & Determinants', scope: 'both' },
      { id: 'm-sub-12', name: 'Matrix Operations & Inverse', time: '0 / 55 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Matrices & Determinants', scope: 'both' },
      { id: 'm-sub-13', name: 'Properties of Determinants', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Matrices & Determinants', scope: 'both' },
      { id: 'm-sub-14', name: 'Cramer\'s Rule', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Matrices & Determinants', scope: 'both' },
      { id: 'm-sub-15', name: 'System of Linear Equations', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Matrices & Determinants', scope: 'both' },

      // ── 4. Permutations & Combinations ─────────────────────────────────
      { id: 'm-sub-16', name: 'Fundamental Counting Principle', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Permutations & Combinations', scope: 'both' },
      { id: 'm-sub-17', name: 'Permutations', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Permutations & Combinations', scope: 'both' },
      { id: 'm-sub-18', name: 'Combinations', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Permutations & Combinations', scope: 'both' },
      { id: 'm-sub-19', name: 'Circular Permutations', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Permutations & Combinations', scope: 'both' },
      { id: 'm-sub-20', name: 'Derangements & Multinomial', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Permutations & Combinations', scope: 'advanced-only' },

      // ── 5. Mathematical Induction ──────────────────────────────────────
      { id: 'm-sub-21', name: 'Principle of Induction', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Mathematical Induction', scope: 'main-only' },
      { id: 'm-sub-22', name: 'Strong Induction', time: '0 / 25 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Mathematical Induction', scope: 'main-only' },
      { id: 'm-sub-23', name: 'Applications of Induction', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Mathematical Induction', scope: 'main-only' },

      // ── 6. Binomial Theorem ────────────────────────────────────────────
      { id: 'm-sub-24', name: 'Binomial Expansion & General Term', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Binomial Theorem', scope: 'both' },
      { id: 'm-sub-25', name: 'Middle Term', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Binomial Theorem', scope: 'both' },
      { id: 'm-sub-26', name: 'Binomial Coefficients', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Binomial Theorem', scope: 'both' },
      { id: 'm-sub-27', name: 'Multinomial Theorem', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Binomial Theorem', scope: 'advanced-only' },

      // ── 7. Sequences & Series ──────────────────────────────────────────
      { id: 'm-sub-28', name: 'Arithmetic Progression (AP)', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Sequences & Series', scope: 'both' },
      { id: 'm-sub-29', name: 'Geometric Progression (GP)', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Sequences & Series', scope: 'both' },
      { id: 'm-sub-30', name: 'Harmonic Progression (HP)', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Sequences & Series', scope: 'both' },
      { id: 'm-sub-31', name: 'AGP & Special Series', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Sequences & Series', scope: 'both' },
      { id: 'm-sub-32', name: 'Method of Differences', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Sequences & Series', scope: 'advanced-only' },

      // ── 8. Limits, Continuity & Differentiability ──────────────────────
      { id: 'm-sub-33', name: 'Limits', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Limits, Continuity & Differentiability', scope: 'both' },
      { id: 'm-sub-34', name: 'L\'Hopital\'s Rule', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Limits, Continuity & Differentiability', scope: 'both' },
      { id: 'm-sub-35', name: 'Continuity', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Limits, Continuity & Differentiability', scope: 'both' },
      { id: 'm-sub-36', name: 'Differentiability & Rolle\'s MVT', time: '0 / 55 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Limits, Continuity & Differentiability', scope: 'both' },

      // ── 9. Differentiation ─────────────────────────────────────────────
      { id: 'm-sub-37', name: 'Chain Rule & Implicit Differentiation', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Differentiation', scope: 'both' },
      { id: 'm-sub-38', name: 'Logarithmic Differentiation', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Differentiation', scope: 'both' },
      { id: 'm-sub-39', name: 'Parametric Differentiation', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Differentiation', scope: 'both' },
      { id: 'm-sub-40', name: 'Higher Order Derivatives', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Differentiation', scope: 'both' },

      // ── 10. Application of Derivatives ─────────────────────────────────
      { id: 'm-sub-41', name: 'Tangents & Normals', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Application of Derivatives', scope: 'both' },
      { id: 'm-sub-42', name: 'Monotonicity', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Application of Derivatives', scope: 'both' },
      { id: 'm-sub-43', name: 'Maxima & Minima', time: '0 / 55 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Application of Derivatives', scope: 'both' },
      { id: 'm-sub-44', name: 'Mean Value Theorems', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Application of Derivatives', scope: 'both' },

      // ── 11. Indefinite Integrals ────────────────────────────────────────
      { id: 'm-sub-45', name: 'Basic Integration Formulas', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Indefinite Integrals', scope: 'both' },
      { id: 'm-sub-46', name: 'Substitution', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Indefinite Integrals', scope: 'both' },
      { id: 'm-sub-47', name: 'Integration by Parts', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Indefinite Integrals', scope: 'both' },
      { id: 'm-sub-48', name: 'Partial Fractions', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Indefinite Integrals', scope: 'both' },
      { id: 'm-sub-49', name: 'Special Integrals', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Indefinite Integrals', scope: 'both' },

      // ── 12. Definite Integrals ─────────────────────────────────────────
      { id: 'm-sub-50', name: 'Properties of Definite Integrals', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Definite Integrals', scope: 'both' },
      { id: 'm-sub-51', name: 'Leibniz Rule', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Definite Integrals', scope: 'advanced-only' },
      { id: 'm-sub-52', name: 'Wallis\' Formula', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Definite Integrals', scope: 'advanced-only' },
      { id: 'm-sub-53', name: 'Reduction Formulas', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Definite Integrals', scope: 'advanced-only' },
      { id: 'm-sub-54', name: 'Gamma Function', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Definite Integrals', scope: 'advanced-only' },

      // ── 13. Area Under Curves ──────────────────────────────────────────
      { id: 'm-sub-55', name: 'Area between Curves', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Area Under Curves', scope: 'both' },
      { id: 'm-sub-56', name: 'Area using Integration', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Area Under Curves', scope: 'both' },
      { id: 'm-sub-57', name: 'Standard Curves', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Area Under Curves', scope: 'both' },

      // ── 14. Differential Equations ─────────────────────────────────────
      { id: 'm-sub-58', name: 'Formation of ODE', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Differential Equations', scope: 'both' },
      { id: 'm-sub-59', name: 'Variable Separable', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Differential Equations', scope: 'both' },
      { id: 'm-sub-60', name: 'Homogeneous Equations', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Differential Equations', scope: 'both' },
      { id: 'm-sub-61', name: 'Linear First Order', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Differential Equations', scope: 'both' },
      { id: 'm-sub-62', name: 'Bernoulli\'s Equation', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Differential Equations', scope: 'advanced-only' },

      // ── 15. Straight Lines ─────────────────────────────────────────────
      { id: 'm-sub-63', name: 'Slope & Intercept Forms', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Straight Lines', scope: 'both' },
      { id: 'm-sub-64', name: 'Angle between Lines', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Straight Lines', scope: 'both' },
      { id: 'm-sub-65', name: 'Family of Lines', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Straight Lines', scope: 'both' },
      { id: 'm-sub-66', name: 'Point-to-Line Distance', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Straight Lines', scope: 'both' },
      { id: 'm-sub-67', name: 'Concurrent Lines', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Straight Lines', scope: 'both' },

      // ── 16. Circles ────────────────────────────────────────────────────
      { id: 'm-sub-68', name: 'Standard & General Equation', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Circles', scope: 'both' },
      { id: 'm-sub-69', name: 'Tangent & Normal to Circle', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Circles', scope: 'both' },
      { id: 'm-sub-70', name: 'Family of Circles', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Circles', scope: 'both' },
      { id: 'm-sub-71', name: 'Radical Axis', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Circles', scope: 'advanced-only' },
      { id: 'm-sub-72', name: 'Power of a Point', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Circles', scope: 'advanced-only' },

      // ── 17. Conic Sections ─────────────────────────────────────────────
      { id: 'm-sub-73', name: 'Parabola (Standard Forms, Tangent, Normal)', time: '0 / 60 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Conic Sections', scope: 'both' },
      { id: 'm-sub-74', name: 'Ellipse (Standard Forms, Tangent, Normal)', time: '0 / 60 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Conic Sections', scope: 'both' },
      { id: 'm-sub-75', name: 'Hyperbola (Standard Forms, Tangent, Normal)', time: '0 / 60 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Conic Sections', scope: 'both' },

      // ── 18. Vector Algebra ─────────────────────────────────────────────
      { id: 'm-sub-76', name: 'Dot & Cross Product', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Vector Algebra', scope: 'both' },
      { id: 'm-sub-77', name: 'Scalar Triple Product', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Vector Algebra', scope: 'both' },
      { id: 'm-sub-78', name: 'Vector Triple Product', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Vector Algebra', scope: 'advanced-only' },
      { id: 'm-sub-79', name: 'Section Formula & Collinearity', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Vector Algebra', scope: 'both' },

      // ── 19. Three Dimensional Geometry ──────────────────────────────────
      { id: 'm-sub-80', name: 'Direction Cosines', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Three Dimensional Geometry', scope: 'both' },
      { id: 'm-sub-81', name: 'Line & Plane Equations', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Three Dimensional Geometry', scope: 'both' },
      { id: 'm-sub-82', name: 'Angle between Line & Plane', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Three Dimensional Geometry', scope: 'both' },
      { id: 'm-sub-83', name: 'Skew Lines', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Three Dimensional Geometry', scope: 'both' },
      { id: 'm-sub-84', name: 'Foot of Perpendicular', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Three Dimensional Geometry', scope: 'both' },

      // ── 20. Probability ────────────────────────────────────────────────
      { id: 'm-sub-85', name: 'Conditional Probability', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Probability', scope: 'both' },
      { id: 'm-sub-86', name: 'Multiplication & Addition Theorems', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Probability', scope: 'both' },
      { id: 'm-sub-87', name: 'Bayes\' Theorem', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Probability', scope: 'both' },
      { id: 'm-sub-88', name: 'Random Variables', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Probability', scope: 'both' },
      { id: 'm-sub-89', name: 'Binomial Distribution', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Probability', scope: 'both' },

      // ── 21. Trigonometric Ratios & Equations ────────────────────────────
      { id: 'm-sub-90', name: 'Trigonometric Identities', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Trigonometric Ratios & Equations', scope: 'both' },
      { id: 'm-sub-91', name: 'Multiple/Sub-Multiple Angle Formulas', time: '0 / 50 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Trigonometric Ratios & Equations', scope: 'both' },
      { id: 'm-sub-92', name: 'General Solutions', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Trigonometric Ratios & Equations', scope: 'both' },
      { id: 'm-sub-93', name: 'Heights & Distances', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Trigonometric Ratios & Equations', scope: 'both' },

      // ── 22. Inverse Trigonometric Functions ─────────────────────────────
      { id: 'm-sub-94', name: 'Domain & Range of Inverse Trig', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Inverse Trigonometric Functions', scope: 'both' },
      { id: 'm-sub-95', name: 'Principal Values', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Inverse Trigonometric Functions', scope: 'both' },
      { id: 'm-sub-96', name: 'Properties of Inverse Trig', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Inverse Trigonometric Functions', scope: 'both' },
      { id: 'm-sub-97', name: 'Composition of Trig & Inverse Trig', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Inverse Trigonometric Functions', scope: 'both' },

      // ── 23. Properties of Triangles ────────────────────────────────────
      { id: 'm-sub-98', name: 'Sine Rule & Cosine Rule', time: '0 / 45 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Properties of Triangles', scope: 'both' },
      { id: 'm-sub-99', name: 'Half-Angle Formulas', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Properties of Triangles', scope: 'both' },
      { id: 'm-sub-100', name: 'Area of Triangle', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Properties of Triangles', scope: 'both' },
      { id: 'm-sub-101', name: 'Circumradius & Inradius', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Properties of Triangles', scope: 'advanced-only' },

      // ── 24. Mathematical Reasoning ─────────────────────────────────────
      { id: 'm-sub-102', name: 'Statements & Logical Connectives', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Mathematical Reasoning', scope: 'main-only' },
      { id: 'm-sub-103', name: 'Conditional/Biconditional', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Mathematical Reasoning', scope: 'main-only' },
      { id: 'm-sub-104', name: 'Truth Tables', time: '0 / 25 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Mathematical Reasoning', scope: 'main-only' },

      // ── 25. Statistics ─────────────────────────────────────────────────
      { id: 'm-sub-105', name: 'Mean/Median/Mode', time: '0 / 35 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Statistics', scope: 'main-only' },
      { id: 'm-sub-106', name: 'Variance & Standard Deviation', time: '0 / 40 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Statistics', scope: 'main-only' },
      { id: 'm-sub-107', name: 'Frequency Distribution', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Statistics', scope: 'main-only' },
      { id: 'm-sub-108', name: 'Quartiles & Percentiles', time: '0 / 30 mins', qs: '0 Qs', status: 'notstarted', chapter: 'Statistics', scope: 'main-only' },
    ]
  }
];

export const initialBacklogs: BacklogItem[] = [];
