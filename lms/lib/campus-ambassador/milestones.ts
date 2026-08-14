export const MILESTONES = [
  { target: 5, label: 'Bronze Ambassador' },
  { target: 15, label: 'Silver Ambassador' },
  { target: 30, label: 'Gold Ambassador' },
  { target: 50, label: 'Campus Leader' },
] as const;

export type MilestoneState = 'achieved' | 'current' | 'locked';

export interface MilestoneView {
  target: number;
  label: string;
  state: MilestoneState;
}

export function getMilestoneFor(paidReferrals: number): MilestoneView {
  const achieved = [...MILESTONES].reverse().find((m) => paidReferrals >= m.target);
  if (achieved) {
    return { target: achieved.target, label: achieved.label, state: 'achieved' };
  }
  const next = MILESTONES.find((m) => paidReferrals < m.target);
  if (next) {
    return { target: next.target, label: next.label, state: 'current' };
  }
  return {
    target: MILESTONES[MILESTONES.length - 1].target,
    label: MILESTONES[MILESTONES.length - 1].label,
    state: 'achieved',
  };
}

export function getNextMilestone(paidReferrals: number): MilestoneView | null {
  const next = MILESTONES.find((m) => paidReferrals < m.target);
  return next ? { target: next.target, label: next.label, state: 'current' } : null;
}
