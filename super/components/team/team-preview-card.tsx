'use client';

import Image from 'next/image';
import type { TeamMemberRow } from '@/lib/superadmin/team-members/types';
import { getTeamMemberPhotoPublicUrl } from '@/lib/superadmin/team-members/photo-url';
import { TeamFeaturedBadge, TeamFounderBadge } from './team-status-badge';
import { TeamSocialLinks } from './team-social-links';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function TeamPreviewCard({
  member,
}: {
  member: Pick<
    TeamMemberRow,
    | 'name'
    | 'role'
    | 'short_bio'
    | 'full_bio'
    | 'photo_path'
    | 'photo_alt_text'
    | 'location'
    | 'is_founder'
    | 'is_featured'
    | 'email'
    | 'linkedin_url'
    | 'twitter_url'
    | 'github_url'
    | 'instagram_url'
    | 'youtube_url'
    | 'personal_website_url'
  >;
}) {
  const photoUrl = getTeamMemberPhotoPublicUrl(member.photo_path);
  const alt = member.photo_alt_text ?? `Portrait of ${member.name}`;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm max-w-md">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
        Public preview
      </p>
      <div className="flex items-start gap-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
          {photoUrl ? (
            <Image src={photoUrl} alt={alt} fill className="object-cover" sizes="80px" />
          ) : (
            <div className="flex size-full items-center justify-center text-lg font-semibold text-muted-foreground">
              {getInitials(member.name)}
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            {member.is_founder ? <TeamFounderBadge /> : null}
            {member.is_featured ? <TeamFeaturedBadge /> : null}
          </div>
          <h3 className="text-lg font-semibold leading-tight">{member.name}</h3>
          <p className="text-sm text-muted-foreground">{member.role}</p>
          {member.location ? (
            <p className="text-xs text-muted-foreground">{member.location}</p>
          ) : null}
        </div>
      </div>
      {member.short_bio ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{member.short_bio}</p>
      ) : member.full_bio ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground line-clamp-4">
          {member.full_bio}
        </p>
      ) : null}
      <div className="mt-4">
        <TeamSocialLinks member={member} />
      </div>
    </div>
  );
}
