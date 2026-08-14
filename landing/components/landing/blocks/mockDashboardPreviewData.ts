export type DateRange = "7" | "30" | "90";
export type PipelineStage = "lead" | "contacted" | "scheduled" | "closed";

export interface KpiCard {
  label: string;
  value: string;
  detail: string;
}

export interface UpliftPoint {
  day: string;
  value: number;
}

export interface PipelineData {
  active: number;
  percent: number;
}

export interface CollegeMetrics {
  kpis: KpiCard[];
  upliftData: UpliftPoint[];
  upliftDelta: string;
  pipeline: Record<PipelineStage, PipelineData>;
  engagement: number;
  reportsReady: number;
}

export interface ModuleSection {
  name: string;
  completed: boolean;
}

export interface InterviewSession {
  id: string;
  date: string;
  topic: string;
  status: "Completed" | "Scheduled" | "Missed";
}

export interface ResumeCheckItem {
  id: string;
  label: string;
  passed: boolean;
}

export interface CareerBreakdown {
  label: string;
  value: number;
}

export interface JobAlert {
  id: string;
  role: string;
  company: string;
  matchPercent: number;
}

const UPLIFT_BASE: UpliftPoint[] = [
  { day: "Mon", value: 20 },
  { day: "Tue", value: 25 },
  { day: "Wed", value: 22 },
  { day: "Thu", value: 30 },
  { day: "Fri", value: 35 },
  { day: "Sat", value: 38 },
  { day: "Sun", value: 42 },
];

const UPLIFT_30: UpliftPoint[] = [
  { day: "W1", value: 15 },
  { day: "W2", value: 22 },
  { day: "W3", value: 28 },
  { day: "W4", value: 36 },
];

const UPLIFT_90: UpliftPoint[] = [
  { day: "M1", value: 10 },
  { day: "M2", value: 20 },
  { day: "M3", value: 32 },
];

const PIPELINE_DATA: Record<PipelineStage, PipelineData> = {
  lead: { active: 12, percent: 75 },
  contacted: { active: 9, percent: 56 },
  scheduled: { active: 6, percent: 38 },
  closed: { active: 4, percent: 25 },
};

const KPI_DETAILS: Record<DateRange, KpiCard[]> = {
  "7": [
    { label: "Enrolled", value: "240", detail: "+8 this week" },
    { label: "Attendance", value: "94%", detail: "Avg across 6 batches" },
    { label: "Placed", value: "42", detail: "12 offers pending" },
  ],
  "30": [
    { label: "Enrolled", value: "235", detail: "+22 this month" },
    { label: "Attendance", value: "91%", detail: "Avg across 6 batches" },
    { label: "Placed", value: "38", detail: "8 offers pending" },
  ],
  "90": [
    { label: "Enrolled", value: "210", detail: "+65 this quarter" },
    { label: "Attendance", value: "89%", detail: "Avg across 5 batches" },
    { label: "Placed", value: "30", detail: "5 offers pending" },
  ],
};

const UPLIFT_DELTAS: Record<DateRange, string> = {
  "7": "+24%",
  "30": "+18%",
  "90": "+32%",
};

const ENGAGEMENT: Record<DateRange, number> = {
  "7": 87,
  "30": 82,
  "90": 79,
};

const REPORTS_READY: Record<DateRange, number> = {
  "7": 3,
  "30": 5,
  "90": 8,
};

export function getCollegeMetrics(range: DateRange): CollegeMetrics {
  const upliftMap: Record<DateRange, UpliftPoint[]> = {
    "7": UPLIFT_BASE,
    "30": UPLIFT_30,
    "90": UPLIFT_90,
  };

  return {
    kpis: KPI_DETAILS[range],
    upliftData: upliftMap[range],
    upliftDelta: UPLIFT_DELTAS[range],
    pipeline: PIPELINE_DATA,
    engagement: ENGAGEMENT[range],
    reportsReady: REPORTS_READY[range],
  };
}

export const MODULE_SECTIONS: ModuleSection[] = [
  { name: "Arrays & Strings", completed: true },
  { name: "Linked Lists", completed: true },
  { name: "Stacks & Queues", completed: true },
  { name: "Trees & Graphs", completed: false },
  { name: "Dynamic Programming", completed: false },
];

export const INTERVIEW_SESSIONS: InterviewSession[] = [
  { id: "i1", date: "Feb 14", topic: "System Design", status: "Completed" },
  { id: "i2", date: "Feb 10", topic: "DSA Round", status: "Completed" },
  { id: "i3", date: "Feb 6", topic: "Behavioral", status: "Completed" },
  { id: "i4", date: "Feb 2", topic: "Frontend Live", status: "Completed" },
  { id: "i5", date: "Feb 18", topic: "HR Round", status: "Scheduled" },
  { id: "i6", date: "Feb 22", topic: "Backend Deep Dive", status: "Scheduled" },
];

export const RESUME_CHECKLIST: ResumeCheckItem[] = [
  { id: "r1", label: "Contains target keywords", passed: true },
  { id: "r2", label: "Proper section headings", passed: true },
  { id: "r3", label: "No spelling / grammar errors", passed: true },
  { id: "r4", label: "Quantified achievements", passed: false },
  { id: "r5", label: "Single-page format", passed: true },
  { id: "r6", label: "Contact info present", passed: true },
  { id: "r7", label: "Skills section optimized", passed: false },
];

export const CAREER_BREAKDOWN: CareerBreakdown[] = [
  { label: "Technical Skills", value: 85 },
  { label: "Projects", value: 72 },
  { label: "Communication", value: 80 },
  { label: "Interview Readiness", value: 74 },
];

export const JOB_ALERTS: JobAlert[] = [
  { id: "j1", role: "Frontend Engineer", company: "Razorpay", matchPercent: 94 },
  { id: "j2", role: "SDE Intern", company: "Google", matchPercent: 88 },
  { id: "j3", role: "Full Stack Dev", company: "Swiggy", matchPercent: 82 },
  { id: "j4", role: "Backend Engineer", company: "Zerodha", matchPercent: 79 },
  { id: "j5", role: "SDE I", company: "Microsoft", matchPercent: 76 },
];
