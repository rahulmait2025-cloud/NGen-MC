/** Pillar path segment -> module key (aligned with CollegeAdmin module registry). */
export const PILLAR_MODULE_KEYS = [
  'technical_bootcamp',   // Technical Bootcamp
  'ai_modern_development', // AI & Modern Development
  'behavioral_skills',    // Behavioral Skills
  'resume_interview',     // Resume & Interview
  'github_monitoring',    // GitHub Optimization
  'linkedin_optimization', // LinkedIn Optimization
] as const;

export type StudentPillarModuleKey = (typeof PILLAR_MODULE_KEYS)[number];

export type StudentModuleAccessMap = Partial<Record<StudentPillarModuleKey, boolean>>;

/** Pillar href segment (e.g. cs-bootcamp) -> module key */
const PILLAR_HREF_TO_MODULE: Record<string, StudentPillarModuleKey> = {
  'cs-bootcamp': 'technical_bootcamp',
  'technical-bootcamp': 'technical_bootcamp',
  'ai-modern-development': 'ai_modern_development',
  'behavioral-skills': 'behavioral_skills',
  'resume-interview': 'resume_interview',
  'github-optimization': 'github_monitoring',
  'github-monitoring': 'github_monitoring',
  'linkedin-optimization': 'linkedin_optimization',
};

function _getModuleKeyFromPillarHref(hrefSegment: string): StudentPillarModuleKey | null {
  const key = PILLAR_HREF_TO_MODULE[hrefSegment];
  return key ?? null;
}
