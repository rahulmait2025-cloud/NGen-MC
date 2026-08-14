import { Github, Globe, Instagram, Linkedin, Mail, Youtube } from 'lucide-react';
import type { TeamMemberRow } from '@/lib/superadmin/team-members/types';

type SocialMember = Pick<
  TeamMemberRow,
  | 'email'
  | 'linkedin_url'
  | 'twitter_url'
  | 'github_url'
  | 'instagram_url'
  | 'youtube_url'
  | 'personal_website_url'
>;

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const linkClassName =
  'inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

export function TeamSocialLinks({ member }: { member: SocialMember }) {
  const items = [
    member.linkedin_url
      ? { href: member.linkedin_url, label: `${member.linkedin_url.includes('linkedin') ? 'LinkedIn' : 'Social'} profile`, icon: Linkedin }
      : null,
    member.twitter_url
      ? { href: member.twitter_url, label: 'X profile', icon: XIcon }
      : null,
    member.github_url
      ? { href: member.github_url, label: 'GitHub profile', icon: Github }
      : null,
    member.instagram_url
      ? { href: member.instagram_url, label: 'Instagram profile', icon: Instagram }
      : null,
    member.youtube_url
      ? { href: member.youtube_url, label: 'YouTube channel', icon: Youtube }
      : null,
    member.personal_website_url
      ? { href: member.personal_website_url, label: 'Personal website', icon: Globe }
      : null,
    member.email
      ? { href: `mailto:${member.email}`, label: `Email ${member.email}`, icon: Mail }
      : null,
  ].filter(Boolean) as { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];

  if (!items.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        const external = item.href.startsWith('http');
        return (
          <a
            key={item.href}
            href={item.href}
            className={linkClassName}
            aria-label={item.label}
            {...(external
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
          >
            <Icon className="size-4" />
          </a>
        );
      })}
    </div>
  );
}
