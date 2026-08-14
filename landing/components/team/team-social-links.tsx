import type { ComponentType } from 'react';
import { Github, Globe, Instagram, Linkedin, Mail, Youtube } from 'lucide-react';
import type { PublicTeamMember } from '@/lib/data/team-members';

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

type SocialMember = Pick<
  PublicTeamMember,
  | 'email'
  | 'linkedinUrl'
  | 'twitterUrl'
  | 'githubUrl'
  | 'instagramUrl'
  | 'youtubeUrl'
  | 'personalWebsiteUrl'
>;

const iconLinkClassName =
  'inline-flex size-11 min-h-11 min-w-11 items-center justify-center border border-[#111111] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5f36]';

const textLinkClassName =
  'inline-flex min-h-11 items-center border border-[#111111] px-4 py-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5f36]';

export function TeamSocialLinks({
  member,
  variant = 'icons',
}: {
  member: SocialMember;
  variant?: 'icons' | 'text';
}) {
  const items = [
    member.linkedinUrl ? { href: member.linkedinUrl, label: 'LinkedIn', icon: Linkedin } : null,
    member.twitterUrl ? { href: member.twitterUrl, label: 'X', icon: XIcon } : null,
    member.githubUrl ? { href: member.githubUrl, label: 'GitHub', icon: Github } : null,
    member.instagramUrl ? { href: member.instagramUrl, label: 'Instagram', icon: Instagram } : null,
    member.youtubeUrl ? { href: member.youtubeUrl, label: 'YouTube', icon: Youtube } : null,
    member.personalWebsiteUrl
      ? { href: member.personalWebsiteUrl, label: 'Website', icon: Globe }
      : null,
    member.email ? { href: `mailto:${member.email}`, label: 'Email', icon: Mail } : null,
  ].filter(Boolean) as {
    href: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
  }[];

  if (!items.length) return null;

  if (variant === 'text') {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const external = item.href.startsWith('http');
          return (
            <a
              key={item.href}
              href={item.href}
              className={textLinkClassName}
              aria-label={`${item.label} profile`}
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {item.label}
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        const external = item.href.startsWith('http');
        return (
          <a
            key={item.href}
            href={item.href}
            className={iconLinkClassName}
            aria-label={`${item.label} profile`}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            <Icon className="size-4" />
          </a>
        );
      })}
    </div>
  );
}
