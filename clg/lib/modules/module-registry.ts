import type { FeatureKey } from "@/lib/features/feature-keys";

export type ModuleAudience = "college_admin" | "student";

export interface ModuleDefinition<TModuleId extends string = string> {
  id: TModuleId;
  label: string;
  href: string;
  featureKey: FeatureKey | null;
  audiences: readonly ModuleAudience[];
  summary: string;
}

const MODULE_REGISTRY = {
  dashboard: {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    featureKey: null,
    audiences: ["college_admin"],
    summary: "Main overview of college operations and key metrics.",
  },
  content_assignments: {
    id: "content_assignments",
    label: "Assigned Courses",
    href: "/content",
    featureKey: null,
    audiences: ["college_admin"],
    summary: "Browse curriculum and content provisioned by SuperAdmin for your institution.",
  },
  students: {
    id: "students",
    label: "My Students",
    href: "/students",
    featureKey: null,
    audiences: ["college_admin"],
    summary: "Student roster, details, and cohort-level monitoring.",
  },
  analytics: {
    id: "analytics",
    label: "Analytics",
    href: "/activity/performance",
    featureKey: null,
    audiences: ["college_admin"],
    summary: "In-depth analytics on student performance, courses, and placements.",
  },
  activity: {
    id: "activity",
    label: "Activity",
    href: "/activity",
    featureKey: null,
    audiences: ["college_admin"],
    summary: "Activity logs, performance analytics, and student video analytics.",
  },
  mentorship_sessions: {
    id: "mentorship_sessions",
    label: "Mentorship Sessions",
    href: "/mentorship",
    featureKey: null,
    audiences: ["college_admin"],
    summary: "Scheduled mentorship sessions for your students.",
  },
  sheets: {
    id: "sheets",
    label: "Sheets",
    href: "/sheets",
    featureKey: null,
    audiences: ["college_admin"],
    summary: "View DSA sheet and student progress.",
  },
  quizzes: {
    id: "quizzes",
    label: "Quizzes",
    href: "/quizzes",
    featureKey: null,
    audiences: ["college_admin"],
    summary: "View quiz scores, attempt analytics, and student performance.",
  },
} as const satisfies Record<string, ModuleDefinition>;

export type ModuleId = keyof typeof MODULE_REGISTRY;
export type ModuleRegistry = Record<ModuleId, ModuleDefinition<ModuleId>>;

export function getModuleRegistry(): ModuleRegistry {
  return MODULE_REGISTRY as ModuleRegistry;
}
