import { PublicStudentCodingProfileResult } from '@/types/student-stats';
import { PublicProfileHeader } from './public-profile-header';
import { PublicPlatformLinks } from './public-platform-links';
import { PublicActivityHeatmapContainer } from './public-activity-heatmap-container';

interface PublicCodingProfileProps {
  profile: PublicStudentCodingProfileResult;
  currentYear?: number;
}

export function PublicCodingProfile({ profile }: PublicCodingProfileProps) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 1. Identity Header with Connected Platform Indicators & Share */}
      <PublicProfileHeader
        studentName={profile.studentName}
        username={profile.username}
        avatarUrl={profile.avatarUrl}
        bio={profile.bio}
        platformLinks={profile.platformLinks}
      />

      {/* 2. Platform & Document Links */}
      <PublicPlatformLinks links={profile.platformLinks} />

      {/* 3. Unified Activity Heatmap Grid (Same as Code Pulse) */}
      <PublicActivityHeatmapContainer
        activitiesMap={profile.activitiesMap}
        selectedYear={profile.selectedYear}
        selectedPlatform={profile.selectedPlatform || 'combined'}
        availableYearsByPlatform={profile.availableYearsByPlatform}
      />
    </div>
  );
}

