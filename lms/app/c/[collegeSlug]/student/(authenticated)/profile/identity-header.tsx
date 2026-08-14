'use client';

import { LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/auth/logout';
import { UsernameOnboarding } from './username-onboarding';
import { CopyPublicProfileLinkButton } from '@/components/public-coding-profile/copy-public-profile-link-button';

type IdentityHeaderProps = {
  collegeSlug: string;
  collegeId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  username: string | null;
  usernameSet: boolean;
  initials: string;
  membershipStatus: string;
};

export function IdentityHeader({
  collegeSlug,
  collegeId: _collegeId,
  fullName,
  email,
  avatarUrl,
  username,
  usernameSet,
  initials,
  membershipStatus,
}: IdentityHeaderProps) {
  const loginHref = '/login';

  return (
    <div className="flex flex-col space-y-4 w-full">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 min-w-0">
          <div className="relative shrink-0">
            <Avatar className="relative h-20 w-20 sm:h-24 sm:w-24 border border-border bg-card shadow-xs">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={fullName} className="object-cover" />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                {fullName}
              </h1>
              <Badge variant="outline" className="text-xs font-semibold capitalize shrink-0 border-primary/20 text-primary bg-primary/[0.06] rounded-full px-2.5 py-0.5">
                {membershipStatus}
              </Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start">
          {username ? (
            <CopyPublicProfileLinkButton
              username={username}
              variant="outline"
              size="sm"
              showLabel
            />
          ) : null}

          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5 h-9 font-semibold rounded-xl"
            onClick={() => void logout(loginHref)}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </div>

      <UsernameOnboarding
        username={username}
        usernameSet={usernameSet}
        collegeSlug={collegeSlug}
      />
    </div>
  );
}
