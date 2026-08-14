'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import type { TeamMemberListItem, TeamMemberSummary } from '@/lib/superadmin/team-members/types';
import { getTeamMemberPhotoPublicUrl } from '@/lib/superadmin/team-members/photo-url';
import {
  deleteTeamMemberAction,
  moveTeamMemberAction,
  toggleTeamMemberPublishedAction,
} from '@/app/(app)/team/actions';
import { TeamFeaturedBadge, TeamFounderBadge, TeamStatusBadge } from './team-status-badge';
import { TeamPreviewCard } from './team-preview-card';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

interface TeamListClientProps {
  members: TeamMemberListItem[];
  summary: TeamMemberSummary;
  publishedFilter: string;
  featuredFilter: string;
  search: string;
}

export function TeamListClient({
  members,
  summary,
  publishedFilter,
  featuredFilter,
  search: initialSearch,
}: TeamListClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();
  const [memberToDelete, setMemberToDelete] = useState<TeamMemberListItem | null>(null);
  const [previewMember, setPreviewMember] = useState<TeamMemberListItem | null>(null);

  const applyFilters = (overrides: Partial<{ published: string; featured: string; search: string }>) => {
    const params = new URLSearchParams();
    const nextPublished = overrides.published ?? publishedFilter;
    const nextFeatured = overrides.featured ?? featuredFilter;
    const nextSearch = overrides.search ?? search;
    if (nextPublished !== 'all') params.set('published', nextPublished);
    if (nextFeatured !== 'all') params.set('featured', nextFeatured);
    if (nextSearch) params.set('search', nextSearch);
    router.push(`/team?${params.toString()}`);
  };

  const handleTogglePublished = (member: TeamMemberListItem) => {
    startTransition(async () => {
      const result = await toggleTeamMemberPublishedAction(member.id, !member.is_published);
      if (result.success) {
        toast.success(member.is_published ? 'Member unpublished.' : 'Member published.');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Failed to update status.');
      }
    });
  };

  const handleMove = (memberId: string, direction: 'up' | 'down') => {
    startTransition(async () => {
      const result = await moveTeamMemberAction(memberId, direction);
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error ?? 'Failed to reorder.');
      }
    });
  };

  const handleDelete = () => {
    if (!memberToDelete) return;
    startTransition(async () => {
      const result = await deleteTeamMemberAction(memberToDelete.id);
      if (result.success) {
        toast.success('Team member deleted.');
        if (result.warning) toast.warning(result.warning);
        setMemberToDelete(null);
        router.refresh();
      } else {
        toast.error(result.error ?? 'Failed to delete team member.');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total members', value: summary.total },
          { label: 'Published', value: summary.published },
          { label: 'Draft', value: summary.draft },
          { label: 'Featured', value: summary.featured },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="text-2xl font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters({ search });
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Search by name or role"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72"
          />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          {(['all', 'published', 'draft'] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={publishedFilter === value ? 'default' : 'outline'}
              onClick={() => applyFilters({ published: value })}
            >
              {value === 'all' ? 'All status' : value === 'published' ? 'Published' : 'Draft'}
            </Button>
          ))}
          {(['all', 'featured', 'not_featured'] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={featuredFilter === value ? 'default' : 'outline'}
              onClick={() => applyFilters({ featured: value })}
            >
              {value === 'all' ? 'All featured' : value === 'featured' ? 'Featured' : 'Not featured'}
            </Button>
          ))}
        </div>
      </div>

      {members.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">No team members yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add the first person who should appear on the public team page.
          </p>
          <Button asChild className="mt-6">
            <Link href="/team/new">
              <Plus className="mr-2 size-4" />
              Add Team Member
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Last updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member, index) => {
                const photoUrl = getTeamMemberPhotoPublicUrl(member.photo_path);
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-[220px]">
                        <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {photoUrl ? (
                            <Image src={photoUrl} alt="" fill className="object-cover" sizes="40px" />
                          ) : (
                            <div className="flex size-full items-center justify-center text-xs font-semibold text-muted-foreground">
                              {getInitials(member.name)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium truncate">{member.name}</p>
                            {member.is_founder ? <TeamFounderBadge /> : null}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate">{member.role}</TableCell>
                    <TableCell>
                      {member.is_featured ? <TeamFeaturedBadge /> : <Badge variant="outline">—</Badge>}
                    </TableCell>
                    <TableCell>
                      <TeamStatusBadge isPublished={member.is_published} />
                    </TableCell>
                    <TableCell>{member.display_order}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(member.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Move ${member.name} up`}
                          disabled={isPending || index === 0}
                          onClick={() => handleMove(member.id, 'up')}
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Move ${member.name} down`}
                          disabled={isPending || index === members.length - 1}
                          onClick={() => handleMove(member.id, 'down')}
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" aria-label={`Preview ${member.name}`} onClick={() => setPreviewMember(member)}>
                          <Eye className="size-4" />
                        </Button>
                        <Button asChild size="icon" variant="ghost" aria-label={`Edit ${member.name}`}>
                          <Link href={`/team/${member.id}/edit`}>
                            <Pencil className="size-4" />
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => handleTogglePublished(member)}
                        >
                          {member.is_published ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          aria-label={`Delete ${member.name}`}
                          onClick={() => setMemberToDelete(member)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={Boolean(memberToDelete)} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team member?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {memberToDelete?.name} and their profile photo from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(previewMember)} onOpenChange={(open) => !open && setPreviewMember(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          {previewMember ? (
            <TeamPreviewCard
              member={{
                ...previewMember,
                short_bio: null,
                full_bio: null,
                location: null,
                email: null,
                linkedin_url: null,
                twitter_url: null,
                github_url: null,
                instagram_url: null,
                youtube_url: null,
                personal_website_url: null,
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
