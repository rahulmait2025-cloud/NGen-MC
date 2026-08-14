'use client';

import { IdentityHeader } from './identity-header';
import { BioSection } from './bio-section';
import { EditableProfileSection } from './EditableProfileSection';
import { PortfolioLinks } from './portfolio-links';
import { ChangeCollegeSection } from './change-college-section';
import { CollegeUpdatedBanner } from './college-updated-banner';
import type { ProfileField } from './profile-types';

export type ProfileDashboardProps = {
  collegeSlug: string;
  collegeId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  username: string | null;
  usernameSet: boolean;
  initials: string;
  membershipStatus: string;
  personalFields: ProfileField[];
  linkFields: ProfileField[];
  isUnknownCollege: boolean;
  collegeUpdated: boolean;
  bio: string | null;
};

/**
 * Static profile shell — renders immediately with auth data.
 */
export function ProfileDashboard({
  collegeSlug,
  collegeId,
  fullName,
  email,
  avatarUrl,
  username,
  usernameSet,
  initials,
  membershipStatus,
  personalFields,
  linkFields,
  isUnknownCollege,
  collegeUpdated,
  bio,
}: ProfileDashboardProps) {
  return (
    <div className="relative max-w-3xl mx-auto space-y-6">
      {collegeUpdated && isUnknownCollege ? <CollegeUpdatedBanner /> : null}

      {/* Main Professional Profile Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-8 shadow-sm max-md:p-6 space-y-8">
        {/* Identity Info */}
        <IdentityHeader
          collegeSlug={collegeSlug}
          collegeId={collegeId}
          fullName={fullName}
          email={email}
          avatarUrl={avatarUrl}
          username={username}
          usernameSet={usernameSet}
          initials={initials}
          membershipStatus={membershipStatus}
        />

        {/* Full-width Bio content */}
        <div className="pt-6 border-t border-border/60">
          <BioSection
            bio={bio}
            collegeId={collegeId}
            collegeSlug={collegeSlug}
          />
        </div>

        {/* Two-column layout for Academic Info & Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border/60">
          <EditableProfileSection
            title="Academic info"
            icon="GraduationCap"
            fields={personalFields}
            collegeId={collegeId}
            collegeSlug={collegeSlug}
            sectionId="profile-personal"
          />

          <PortfolioLinks
            fields={linkFields}
            collegeId={collegeId}
            collegeSlug={collegeSlug}
          />
        </div>
      </div>

      {/* College change sections (conditional) */}
      {isUnknownCollege && <ChangeCollegeSection />}
    </div>
  );
}
