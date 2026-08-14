'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, UserPlus, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  deleteCollegeAction,
  inviteCollegeAdminAction,
} from '@/app/(app)/colleges/actions';
import type { CollegeWithCounts } from '@/lib/services/colleges';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { CreateCollegeDialog } from '@/components/colleges/create-college-dialog';
import { EmptyState } from '@/components/shared/empty-state';

const FILTERS = ['All', 'Active', 'Inactive', 'Suspended'] as const;

export const CollegesPage = React.memo(function CollegesPage({
  initialColleges,
}: {
  initialColleges: CollegeWithCounts[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCollege, setInviteCollege] = useState<CollegeWithCounts | null>(null);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [deleteCollege, setDeleteCollege] = useState<CollegeWithCounts | null>(null);
  const [invitePending, setInvitePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const filtered = useMemo(() => {
    let list = initialColleges;
    if (filter === 'Active') list = list.filter((c) => c.status === 'active');
    else if (filter === 'Inactive') list = list.filter((c) => c.status === 'inactive');
    else if (filter === 'Suspended') list = list.filter((c) => c.status === 'suspended');

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          (c.short_name && c.short_name.toLowerCase().includes(q))
      );
    }

    return list;
  }, [initialColleges, filter, search]);

  const handleInviteSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inviteCollege) return;

    setInvitePending(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set('college_id', inviteCollege.id);
    const result = await inviteCollegeAdminAction(formData);

    setInvitePending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    if (result.invite_link) {
      setLastInviteLink(result.invite_link);
      try {
        await navigator.clipboard.writeText(result.invite_link);
        toast.success('Invite link copied to clipboard.');
      } catch {
        toast.success('Invite link generated.');
      }
    } else {
      setLastInviteLink(null);
      toast.success('College admin created.');
    }
    setInviteOpen(false);
    setInviteCollege(null);
    form.reset();
    router.refresh();
  };

  const handleDeleteCollege = async () => {
    if (!deleteCollege) return;

    setDeletePending(true);
    const formData = new FormData();
    formData.set('college_id', deleteCollege.id);
    const result = await deleteCollegeAction(formData);

    setDeletePending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`College deleted. Removed ${result.deletedUsers} linked credentials.`);
    setDeleteCollege(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5 mr-1" /> New College
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((label) => (
          <Button
            key={label}
            type="button"
            size="sm"
            variant={filter === label ? 'default' : 'outline'}
            className="rounded-full h-8 px-4 text-sm"
            onClick={() => setFilter(label)}
          >
            {label}
          </Button>
        ))}
        <Input
          placeholder="Search college..."
          className="min-w-0 flex-1 max-w-56 h-9 text-sm sm:w-56"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <section className="rounded-xl border border-border bg-background min-w-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-0">College</TableHead>
              <TableHead className="max-w-[180px]">Slug</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="whitespace-nowrap hidden md:table-cell">Admins</TableHead>
              <TableHead className="whitespace-nowrap hidden md:table-cell">Students</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    icon={Building2}
                    title={initialColleges.length === 0 ? 'No colleges yet' : 'No matching colleges'}
                    description={
                      initialColleges.length === 0
                        ? 'Create your first partner college to get started.'
                        : 'Try a different search term or status filter.'
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium whitespace-normal min-w-0 max-w-[240px]">
                    <Link href={`/colleges/${row.id}`} className="underline-offset-4 hover:underline">
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs max-w-[180px] truncate" title={row.slug}>
                    {row.slug}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
                      row.status === 'active' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10' :
                      row.status === 'suspended' ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 dark:border-red-500/20 dark:bg-red-500/10' :
                      'border-muted-foreground/30 bg-muted/50 text-muted-foreground'
                    )}>
                      {row.status}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{row.admins_count ?? 0}</TableCell>
                  <TableCell className="hidden md:table-cell">{row.students_count ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs shrink-0"
                        onClick={() => {
                          setInviteCollege(row);
                          setInviteOpen(true);
                        }}
                      >
                        <UserPlus className="size-3 sm:mr-1" /> <span className="hidden sm:inline">Invite admin</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs shrink-0"
                        onClick={() => setDeleteCollege(row)}
                      >
                        <Trash2 className="size-3 sm:mr-1" /> <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      {createOpen ? <CreateCollegeDialog open={createOpen} onOpenChange={setCreateOpen} /> : null}

      {inviteOpen ? (
        <Dialog open={inviteOpen} onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) {
            setInviteCollege(null);
            setLastInviteLink(null);
          }
        }}>
          <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite College Admin</DialogTitle>
            {inviteCollege && (
              <p className="text-sm text-muted-foreground">Add an admin for {inviteCollege.name}.</p>
            )}
          </DialogHeader>

          {inviteCollege && (
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label htmlFor="invite-admin-email" className="text-xs font-medium mb-1 block">Email</label>
                <Input id="invite-admin-email" name="email" type="email" required placeholder="admin@college.edu" className="h-9" />
              </div>
              <div>
                <label htmlFor="invite-admin-full-name" className="text-xs font-medium mb-1 block">Full name</label>
                <Input id="invite-admin-full-name" name="full_name" required placeholder="Jane Doe" className="h-9" />
              </div>
              <div>
                <label htmlFor="invite-admin-password" className="text-xs font-medium mb-1 block">Password (optional)</label>
                <Input
                  id="invite-admin-password"
                  name="password"
                  type="password"
                  minLength={8}
                  placeholder="Leave blank to generate invite link"
                  className="h-9"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Leave blank to generate an invite link (admin sets password on first visit).
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={invitePending}>
                  {invitePending ? 'Inviting...' : 'Invite'}
                </Button>
              </DialogFooter>
            </form>
          )}

          {lastInviteLink && (
            <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs font-semibold">Invite link</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">{lastInviteLink}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 h-7"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(lastInviteLink);
                    toast.success('Copied.');
                  } catch {
                    toast.error('Copy failed. Select and copy manually.');
                  }
                }}
              >
                Copy
              </Button>
            </div>
          )}
          </DialogContent>
        </Dialog>
      ) : null}

      <ConfirmDialog
        open={!!deleteCollege}
        onClose={() => setDeleteCollege(null)}
        title="Delete College"
        description={`Delete ${deleteCollege?.name ?? 'this college'} and remove linked student/admin credentials?`}
        confirmLabel={deletePending ? 'Deleting...' : 'Delete College'}
        onConfirm={handleDeleteCollege}
      />
    </div>
  );
});

