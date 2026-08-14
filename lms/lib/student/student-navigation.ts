import {
  BarChart3,
  BookOpen,
  BookOpenCheck,
  BriefcaseBusiness,
  ClipboardList,
  Compass,
  LayoutDashboard,
  Library,
  Receipt,
  StickyNote,
  Users,
  Award,
  Code2,
  type LucideIcon,
} from 'lucide-react';
import {
  studentBasePath,
  studentDashboardHref,
} from '@/lib/student/student-home-route';

export type StudentNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

function path(collegeSlug: string, segment: string): string {
  const base = studentBasePath(collegeSlug);
  if (!segment) return base;
  return `${base}/${segment.replace(/^\//, '')}`;
}

/** Compact icon rail on the Explore landing page only. */
export function buildExploreIconNavItems(collegeSlug: string): StudentNavItem[] {
  const dashboardHref = studentDashboardHref(collegeSlug);
  return [
    { id: 'explore', label: 'Explore', href: studentBasePath(collegeSlug), icon: Compass },
    { id: 'courses', label: 'Courses', href: path(collegeSlug, 'courses'), icon: BookOpen },
    { id: 'dashboard', label: 'Dashboard', href: dashboardHref, icon: LayoutDashboard },
    { id: 'my-courses', label: 'My Courses', href: path(collegeSlug, 'my-courses'), icon: Library },
    { id: 'jobs', label: 'Jobs', href: path(collegeSlug, 'jobs'), icon: BriefcaseBusiness },
    {
      id: 'applications',
      label: 'Applications',
      href: path(collegeSlug, 'my-applications'),
      icon: ClipboardList,
    },
    { id: 'mentorship', label: 'Mentorship', href: path(collegeSlug, 'mentorship'), icon: Users },
    { id: 'analytics', label: 'Analytics', href: path(collegeSlug, 'analytics'), icon: BarChart3 },
    { id: 'notes', label: 'Notes', href: path(collegeSlug, 'notes'), icon: StickyNote },
  ];
}

/** Grouped links for Explore mobile sheet (full labels). */
export function buildExploreMobileMenuGroups(collegeSlug: string): {
  title: string;
  items: StudentNavItem[];
}[] {
  const dashboardHref = studentDashboardHref(collegeSlug);
  const base = studentBasePath(collegeSlug);
  return [
    {
      title: 'Learning',
      items: [
        { id: 'explore', label: 'Explore', href: base, icon: Compass },
        { id: 'courses', label: 'Courses', href: path(collegeSlug, 'courses'), icon: BookOpen },
        { id: 'dashboard', label: 'Dashboard', href: dashboardHref, icon: LayoutDashboard },
        { id: 'my-courses', label: 'My Courses', href: path(collegeSlug, 'my-courses'), icon: Library },
        { id: 'notes', label: 'Notes', href: path(collegeSlug, 'notes'), icon: StickyNote },
      ],
    },
    {
      title: 'Career',
      items: [
        { id: 'jobs', label: 'Jobs', href: path(collegeSlug, 'jobs'), icon: BriefcaseBusiness },
        {
          id: 'applications',
          label: 'My Applications',
          href: path(collegeSlug, 'my-applications'),
          icon: ClipboardList,
        },
        { id: 'mentorship', label: 'Mentorship', href: path(collegeSlug, 'mentorship'), icon: Users },
      ],
    },
    {
      title: 'Insights',
      items: [
        { id: 'analytics', label: 'Analytics', href: path(collegeSlug, 'analytics'), icon: BarChart3 },
        { id: 'stats', label: 'Code Pulse', href: path(collegeSlug, 'stats'), icon: Code2 },
        {
          id: 'payment-history',
          label: 'Payment History',
          href: path(collegeSlug, 'payment-history'),
          icon: Receipt,
        },
      ],
    },
  ];
}

/** Top landing navbar (primary links only). */
export function buildLandingTopNavItems(collegeSlug: string): StudentNavItem[] {
  const dashboardHref = studentDashboardHref(collegeSlug);
  return [
    { id: 'explore', label: 'Explore', href: studentBasePath(collegeSlug), icon: Compass },
    { id: 'courses', label: 'Courses', href: path(collegeSlug, 'courses'), icon: BookOpen },
    { id: 'dashboard', label: 'Dashboard', href: dashboardHref, icon: LayoutDashboard },
    { id: 'my-courses', label: 'My Courses', href: path(collegeSlug, 'my-courses'), icon: Library },
    { id: 'jobs', label: 'Jobs', href: path(collegeSlug, 'jobs'), icon: BriefcaseBusiness },
  ];
}

/** Full app sidebar groups (non-home routes). */
export function buildAppSidebarNavGroups(
  collegeSlug: string,
  isAmbassador = false,
): {
  title: string;
  items: StudentNavItem[];
}[] {
  const dashboardHref = studentDashboardHref(collegeSlug);
  const groups = [
    {
      title: 'Learn',
      items: [
        {
          id: 'explore',
          label: 'Explore',
          href: studentBasePath(collegeSlug),
          icon: Compass,
          description: 'Premium landing & discover',
        },
        {
          id: 'dashboard',
          label: 'Dashboard',
          href: dashboardHref,
          icon: LayoutDashboard,
          description: 'Your learning overview',
        },
        {
          id: 'my-courses',
          label: 'My Courses',
          href: path(collegeSlug, 'my-courses'),
          icon: Library,
          description: 'Enrolled & assigned',
        },
        {
          id: 'courses',
          label: 'Courses',
          href: path(collegeSlug, 'courses'),
          icon: BookOpen,
          description: 'Explore all courses',
        },
        {
          id: 'sheets',
          label: 'Sheets',
          href: path(collegeSlug, 'sheets'),
          icon: BookOpenCheck,
          description: 'Track your DSA progress',
        },
        {
          id: 'notes',
          label: 'Notes',
          href: path(collegeSlug, 'notes'),
          icon: StickyNote,
          description: 'Handwritten & scanned notes',
        },
      ],
    },
    {
      title: 'Career',
      items: [
        { id: 'jobs', label: 'Jobs', href: path(collegeSlug, 'jobs'), icon: BriefcaseBusiness },
        {
          id: 'applications',
          label: 'My Applications',
          href: path(collegeSlug, 'my-applications'),
          icon: ClipboardList,
        },
        { id: 'mentorship', label: 'Mentorship', href: path(collegeSlug, 'mentorship'), icon: Users },
      ],
    },
    {
      title: 'Insights',
      items: [
        { id: 'analytics', label: 'Analytics', href: path(collegeSlug, 'analytics'), icon: BarChart3 },
        {
          id: 'stats',
          label: 'Code Pulse',
          href: path(collegeSlug, 'stats'),
          icon: Code2,
          description: 'Coding & platform activity',
        },
        {
          id: 'payment-history',
          label: 'Payment History',
          href: path(collegeSlug, 'payment-history'),
          icon: Receipt,
          description: 'Transactions & receipts',
        },
      ],
    },
  ];

  // Conditionally add Ambassador group
  if (isAmbassador) {
    groups.push({
      title: 'Program',
      items: [
        {
          id: 'ambassador',
          label: 'Campus Ambassador',
          href: path(collegeSlug, 'dashboard/campus-ambassador'),
          icon: Award,
          description: 'Your ambassador dashboard',
        },
      ],
    });
  }

  return groups;
}

export function isStudentNavItemActive(
  pathname: string,
  item: StudentNavItem,
  collegeSlug: string,
): boolean {
  const normalized = pathname.replace(/\/+$/, '') || pathname;
  const exploreHome = studentBasePath(collegeSlug);

  if (item.id === 'explore') {
    return normalized === exploreHome;
  }

  // Courses hub + pillar/bootcamp course catalog landings (explore shell)
  if (item.id === 'courses') {
    return (
      normalized === item.href ||
      normalized.startsWith(`${item.href}/`) ||
      /^\/c\/[^/]+\/student\/pillars\/[^/]+\/courses\/[^/]+$/.test(normalized) ||
      /^\/c\/[^/]+\/student\/bootcamp\/pillars\/[^/]+\/courses\/[^/]+$/.test(normalized) ||
      normalized === `${exploreHome}/paid-courses` ||
      normalized === `${exploreHome}/free-courses`
    );
  }

  if (item.id === 'dashboard') {
    const isAmbassadorRoute = normalized.startsWith(`${exploreHome}/dashboard/campus-ambassador`);
    if (isAmbassadorRoute) return false;
    return (
      normalized === item.href ||
      normalized.startsWith(`${exploreHome}/dashboard`) ||
      normalized.startsWith(`${exploreHome}/progress`)
    );
  }

  // Ambassador nav item — active on /campus-ambassador route and new dashboard path
  if (item.id === 'ambassador') {
    return (
      normalized === item.href ||
      normalized.startsWith(`${item.href}/`) ||
      normalized === '/campus-ambassador' ||
      normalized.startsWith('/campus-ambassador/')
    );
  }

  return normalized === item.href || normalized.startsWith(`${item.href}/`);
}
