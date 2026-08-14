import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  Briefcase,
  Code2,
  FileText,
  GraduationCap,
  MessageSquare,
  Mic,
  School,
  UserCircle,
  Wrench,
} from 'lucide-react';

export const BOOTCAMP_HERO_FEATURES = [
  { icon: Code2, label: 'DSA Thinking' },
  { icon: Bot, label: 'AI Developer Tools' },
  { icon: FileText, label: 'Resume + GitHub + LinkedIn' },
  { icon: MessageSquare, label: 'Mock Interviews' },
  { icon: Mic, label: 'Communication Skills' },
  { icon: GraduationCap, label: 'Certificate' },
] as const;

export const BOOTCAMP_PROBLEMS = [
  {
    title: 'You watch tutorials, but cannot build independently.',
    description: 'Building under constraints is where most fail.',
  },
  {
    title: 'Your projects look basic and forgettable.',
    description: 'Recruiters care about proof of thinking.',
  },
  {
    title: 'Your GitHub and LinkedIn do not sell your skills.',
    description: 'Skill must be visible.',
  },
  {
    title: 'You know concepts, but cannot explain them in interviews.',
    description: 'Technical knowledge without communication is not enough.',
  },
  {
    title: 'You lack structure, feedback, and accountability.',
    description: 'Random learning creates random outcomes.',
  },
] as const;

export const BOOTCAMP_JOURNEY_STEPS = [
  { icon: School, title: 'Learn', description: 'DSA & Core Concepts', muted: false },
  { icon: Wrench, title: 'Build', description: 'Full-stack Apps & AI', muted: false },
  { icon: UserCircle, title: 'Profile', description: 'GitHub, LinkedIn & Resume', muted: false },
  { icon: MessageSquare, title: 'Interview', description: 'Mock & Behavioral', muted: false },
  { icon: GraduationCap, title: 'Certify', description: 'Job Ready', muted: true },
] as const;

export type BootcampCurriculumTabId =
  | 'technical'
  | 'ai'
  | 'projects'
  | 'career'
  | 'communication'
  | 'mentorship';

export interface BootcampCurriculumTab {
  id: BootcampCurriculumTabId;
  label: string;
  title: string;
  description: string;
  focus: string;
  impact: string;
  deliverables: string[];
  modules: { title: string; description: string }[];
}

export const BOOTCAMP_CURRICULUM_TABS: BootcampCurriculumTab[] = [
  {
    id: 'technical',
    label: 'Technical Foundations',
    title: 'Technical Foundations',
    description:
      'Master the core concepts of programming, data structures, and algorithms needed to pass technical rounds and build robust software.',
    focus: 'Core programming, DSA, Problem Solving',
    impact: 'Crucial for clearing primary technical rounds',
    deliverables: ['Solid DSA Understanding', 'Complexity Analysis Skills', 'Problem Solving Intuition'],
    modules: [
      { title: 'Program Introduction', description: 'Platform overview, expectations, and environment setup.' },
      { title: 'Foundation Skills', description: 'Programming basics, control flow, loops, and functions.' },
      { title: 'Data Structures', description: 'Arrays, linked lists, stacks, queues, trees, and graphs.' },
      { title: 'Algorithms', description: 'Sorting, searching, recursion, and dynamic programming intro.' },
    ],
  },
  {
    id: 'ai',
    label: 'AI & Modern Dev',
    title: 'AI & Modern Dev',
    description:
      'Learn to leverage generative AI to accelerate your development workflow and solve complex problems faster.',
    focus: 'AI Tools, Productivity, Prompt Engineering',
    impact: 'Shows modern workflow adaptability',
    deliverables: ['AI-assisted coding workflows', 'Prompt patterns for dev tasks'],
    modules: [
      { title: 'AI Tooling Basics', description: 'Using AI assistants responsibly in real projects.' },
      { title: 'Modern Dev Workflows', description: 'Integrating AI into review, testing, and delivery.' },
    ],
  },
  {
    id: 'projects',
    label: 'Hands-on Projects',
    title: 'Hands-on Projects',
    description: 'Build production-ready applications to showcase in your portfolio.',
    focus: 'Portfolio projects, real constraints',
    impact: 'Proof of work for recruiters',
    deliverables: ['Deployed project artifacts', 'Documented case studies'],
    modules: [
      { title: 'Project Foundations', description: 'Scoping, architecture, and execution plan.' },
      { title: 'Build & Ship', description: 'Iterative build cycles with mentor feedback.' },
    ],
  },
  {
    id: 'career',
    label: 'Career Readiness',
    title: 'Career Readiness',
    description: 'Optimize your profile to get past ATS and recruiter screens.',
    focus: 'Resume, GitHub, LinkedIn',
    impact: 'Improves recruiter conversion',
    deliverables: ['ATS-ready resume', 'Optimized GitHub profile'],
    modules: [
      { title: 'Profile Optimization', description: 'GitHub, LinkedIn, and resume structure.' },
      { title: 'Application Strategy', description: 'Targeting roles and tracking outcomes.' },
    ],
  },
  {
    id: 'communication',
    label: 'Communication Skills',
    title: 'Communication Skills',
    description: 'Master behavioral interviews and team communication.',
    focus: 'Behavioral answers, clarity under pressure',
    impact: 'Stronger interview performance',
    deliverables: ['Behavioral story bank', 'Mock interview practice'],
    modules: [
      { title: 'Story Frameworks', description: 'STAR and structured technical explanations.' },
      { title: 'Mock Interviews', description: 'Practice rounds with actionable feedback.' },
    ],
  },
  {
    id: 'mentorship',
    label: 'Mentorship & Community',
    title: 'Mentorship & Community',
    description: 'Get guided by industry experts and build alongside ambitious peers.',
    focus: 'Mentor sessions, peer accountability',
    impact: 'Sustained momentum through the program',
    deliverables: ['Mentor check-ins', 'Community learning rhythm'],
    modules: [
      { title: 'Mentor Onboarding', description: 'How to use mentorship inside the LMS.' },
      { title: 'Community Rhythm', description: 'Weekly goals, reviews, and progress cadence.' },
    ],
  },
];

export const BOOTCAMP_BUILD_ITEMS = [
  { icon: Briefcase, title: 'Portfolio Website' },
  { icon: Code2, title: 'Interactive Web App' },
  { icon: Wrench, title: 'Real-world Application Practice' },
  { icon: FileText, title: 'GitHub Project Showcase' },
] as const;

export const BOOTCAMP_OUTCOME_ITEMS = [
  { icon: FileText, title: 'ATS-ready Resume' },
  { icon: Code2, title: 'Optimized GitHub Profile' },
  { icon: Briefcase, title: 'Professional LinkedIn Profile' },
  { icon: MessageSquare, title: 'Interview Answer Framework' },
  { icon: GraduationCap, title: 'Behavioral Story Bank' },
  { icon: Bot, title: 'AI-powered Workflow Exposure' },
  { icon: Mic, title: 'Communication Confidence' },
  { icon: GraduationCap, title: 'Industry Ready Certificate' },
] as const;

export const BOOTCAMP_COMPARISON = {
  random: [
    'Scattered videos',
    'No accountability',
    'Unstructured path leading nowhere',
    'No feedback on code quality',
  ],
  structured: [
    'Guided roadmap',
    'Pillar-wise curriculum',
    'Active community & mentorship',
    'Code reviews & interview prep',
  ],
} as const;

export const BOOTCAMP_FAQ = [
  {
    q: 'Who is this bootcamp for?',
    a: 'Eligible college students who want a structured path from fundamentals to career readiness inside the LMS.',
    tag: 'Eligibility',
  },
  {
    q: 'How do I get access?',
    a: 'Access depends on your college eligibility and assigned entitlements. Enroll through your pillar courses when unlocked.',
    tag: 'Access',
  },
  {
    q: 'Can I resume where I left off?',
    a: 'Yes. If you are already entitled, continue from your in-progress course and lessons.',
    tag: 'Progress',
  },
  {
    q: 'What makes this different from random tutorials?',
    a: 'A guided pillar curriculum with projects, profile work, and interview preparation — not scattered videos.',
    tag: 'Structure',
  },
] as const;

export type BootcampIconItem = { icon: LucideIcon; title: string };
