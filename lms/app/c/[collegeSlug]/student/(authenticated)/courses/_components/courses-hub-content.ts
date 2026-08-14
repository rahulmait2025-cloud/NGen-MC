import {
  Code2,
  Bot,
  Wrench,
  FileText,
  Mic,
  Users,
  Rocket,
  Layers,
  ShieldCheck,
  Library,
  Sparkles,
} from 'lucide-react';

export const COURSES_HUB_FAQ = [
  {
    q: 'Which path should I start with?',
    a: 'If you are a complete beginner, start with the Free Learning Library. If you want to master specific advanced topics, explore Paid Courses. For a complete end-to-end career journey, Job Ready Bootcamp is the best choice.',
    tag: 'Path Choice',
  },
  {
    q: 'Are free courses really free?',
    a: 'Yes! Our free learning library is designed to help students build foundational skills in Git, DSA, and Web Development without any cost.',
    tag: 'Pricing',
  },
  {
    q: 'What is the difference between paid courses and bootcamp?',
    a: 'Paid courses are deep-dives into specific technologies or topics. The Bootcamp is a structured 6-month journey covering all 6 career pillars, including mentorship and profile building.',
    tag: 'Bootcamp',
  },
  {
    q: 'Will I get projects?',
    a: 'Yes, both our Paid Courses and Bootcamp are heavily project-focused. You will build real-world applications that you can showcase on your portfolio.',
    tag: 'Projects',
  },
  {
    q: 'Will my progress be tracked?',
    a: 'Absolutely. Every course you take inside the NextGen CTO LMS includes progress tracking, so you can pick up exactly where you left off.',
    tag: 'LMS',
  },
  {
    q: 'Do I get a certificate?',
    a: 'Yes, upon successful completion of our premium courses and the bootcamp, you will receive a certificate of completion from NextGen CTO.',
    tag: 'Certification',
  },
  {
    q: 'Can college students access these courses?',
    a: 'Yes, our LMS is specifically designed for college students who want to bridge the gap between their curriculum and industry requirements.',
    tag: 'Eligibility',
  },
  {
    q: 'Can I switch from free courses to paid courses later?',
    a: 'Yes, you can upgrade to premium courses or join the bootcamp at any time once you have built your foundations in the free library.',
    tag: 'Upgrade',
  },
  {
    q: 'Is this suitable for beginners?',
    a: 'Yes, we have learning paths for every level — from absolute beginners to advanced developers looking to master system design.',
    tag: 'Experience',
  },
  {
    q: 'How is this different from YouTube playlists?',
    a: 'NextGen CTO provides structure, vetted curriculum, project reviews, progress tracking, and a clear roadmap to career readiness that scattered YouTube videos lack.',
    tag: 'Difference',
  },
];

export const TRUST_STRIP_ITEMS = [
  { icon: Layers, label: '6 Career Pillars' },
  { icon: Rocket, label: 'Premium Courses' },
  { icon: Library, label: 'Free Learning Library' },
  { icon: ShieldCheck, label: 'Interview Readiness' },
];

export const COURSE_LEVELS = [
  {
    id: 'free',
    title: 'Free Courses',
    shortTitle: 'Free',
    eyebrow: 'Foundation',
    href: 'free-courses',
    cta: 'Start Free',
    icon: Library,
    tone: 'text-emerald-600 dark:text-emerald-400',
    ring: 'border-emerald-500/25 bg-emerald-500/10',
    summary: 'Free courses help beginners start without payment pressure.',
    description:
      'Use these when you want clean foundations, beginner-friendly concepts, and a safe place to build momentum before choosing a deeper path.',
    includes: ['No payment needed', 'Beginner-friendly structure', 'Progress tracked in the LMS'],
    outcome: 'You understand the basics and know what to learn next.',
  },
  {
    id: 'paid',
    title: 'Paid Courses',
    shortTitle: 'Paid',
    eyebrow: 'Curated Depth',
    href: 'paid-courses',
    cta: 'Explore Paid',
    icon: Sparkles,
    tone: 'text-[var(--landing-orange)]',
    ring: 'border-[var(--landing-orange)]/30 bg-[var(--landing-orange)]/10',
    summary: 'Paid courses are focused tracks for stronger, curated learning.',
    description:
      'Pick these when you know the area you want to improve and need a more guided, project-first path than random tutorials.',
    includes: ['Curated modules', 'Project-based practice', 'Sharper interview and profile proof'],
    outcome: 'You build deeper skill and proof of work in one topic.',
  },
  {
    id: 'bootcamp',
    title: 'Job Ready Bootcamp',
    shortTitle: 'Bootcamp',
    eyebrow: 'Complete Career Path',
    href: 'bootcamp',
    cta: 'Explore Bootcamp',
    icon: Rocket,
    tone: 'text-sky-600 dark:text-sky-300',
    ring: 'border-sky-500/25 bg-sky-500/10',
    summary: 'Bootcamp combines courses, projects, mentorship, and career readiness.',
    description:
      'Choose this when you want the full software-engineer-ready journey: technical foundations, real projects, profile work, communication, and interview confidence.',
    includes: ['Combination of guided courses', 'Mentorship and accountability', 'Career-ready software engineering path'],
    outcome: 'You move from learner to internship and interview readiness.',
    recommended: true,
  },
];

export const PILLAR_CARDS = [
  { icon: Code2, title: 'Technical Foundations', desc: 'Master DSA, LLD, and core engineering concepts.' },
  { icon: Bot, title: 'AI & Modern Dev', desc: 'Leverage AI tools for faster, better development.' },
  { icon: Wrench, title: 'Hands-on Projects', desc: 'Build production-ready full-stack applications.' },
  { icon: FileText, title: 'Career Readiness', desc: 'Resume, GitHub, and LinkedIn profile optimization.' },
  { icon: Mic, title: 'Communication Skills', desc: 'Soft skills and technical communication mastery.' },
  { icon: Users, title: 'Mentorship & Community', desc: '1-on-1 guidance and peer-to-peer learning.' },
];
