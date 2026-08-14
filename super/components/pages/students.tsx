'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Users,
  GraduationCap,
  Building2,
  UserCheck,
  Plus,
  Search,
  Filter,
  BarChart3,
} from 'lucide-react';
import { inviteStudentAction } from '@/app/(app)/students/actions';
import type { StudentListItem } from '@/lib/services/students';
import type { CollegeWithCounts } from '@/lib/services/colleges';
import { EmptyState } from '@/components/shared/empty-state';
import { StudentAnalyticsSheet } from '@/components/shared/student-analytics-sheet';

type StudentTypeFilter = 'all' | 'partnered' | 'direct_learner';

export const StudentsPage = React.memo(function StudentsPage({
  initialStudents = [],
  colleges = [],
}: {
  initialStudents?: StudentListItem[];
  colleges?: CollegeWithCounts[];
}) {
  const router = useRouter();
  const [collegeFilter, setCollegeFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<StudentTypeFilter>('all');
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCollegeId, setInviteCollegeId] = useState('');
  const [invitePending, setInvitePending] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [analyticsStudentId, setAnalyticsStudentId] = useState<string | null>(null);
  const [analyticsCollegeId, setAnalyticsCollegeId] = useState<string>('');
  const [analyticsStudentName, setAnalyticsStudentName] = useState<string | null>(null);
  const [analyticsStudentEmail, setAnalyticsStudentEmail] = useState<string | null>(null);

  const stats = useMemo(() => {
    const partnered = initialStudents.filter((s) => s.student_classification === 'partnered').length;
    const direct = initialStudents.filter((s) => s.student_classification === 'direct_learner').length;
    return { total: initialStudents.length, partnered, direct };
  }, [initialStudents]);

  const filtered = useMemo(() => {
    let list = initialStudents;

    if (typeFilter !== 'all') {
      list = list.filter((s) => s.student_classification === typeFilter);
    }

    if (collegeFilter) {
      list = list.filter((s) => s.college_id === collegeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => {
        return (
          (s.full_name?.toLowerCase().includes(q) ?? false) ||
          (s.email?.toLowerCase().includes(q) ?? false) ||
          (s.student_code?.toLowerCase().includes(q) ?? false) ||
          (s.college_name?.toLowerCase().includes(q) ?? false) ||
          s.college_display.toLowerCase().includes(q) ||
          (s.self_reported_college_name?.toLowerCase().includes(q) ?? false) ||
          s.student_classification.includes(q)
        );
      });
    }

    return list;
  }, [initialStudents, typeFilter, collegeFilter, search]);

  const handleInviteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInvitePending(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await inviteStudentAction(formData);
    setInvitePending(false);
    if (result.ok) {
      setLastInviteLink(null);
      toast.success('Invite sent. The student will receive an email with a link to set their password.');
      setInviteOpen(false);
      form.reset();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Students
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage all students across colleges and learner types.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setInviteOpen(true)}>
          <Plus className="size-4" />
          Invite student
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Total students',
            value: stats.total,
            icon: Users,
          },
          {
            label: 'Partnered (B2B)',
            value: stats.partnered,
            icon: Building2,
          },
          {
            label: 'Direct learners (B2C)',
            value: stats.direct,
            icon: UserCheck,
          },
          {
            label: 'Active colleges',
            value: colleges.length,
            icon: GraduationCap,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-xl px-5 py-4"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/50">
              <stat.icon className="size-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {stat.value.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as StudentTypeFilter)}
        >
          <SelectTrigger className="h-9 w-[170px] text-xs">
            <Filter className="size-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Students</SelectItem>
            <SelectItem value="partnered">Partnered (B2B)</SelectItem>
            <SelectItem value="direct_learner">Direct Learners (B2C)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={collegeFilter} onValueChange={(v) => setCollegeFilter(v === 'all-colleges' ? '' : v)}>
          <SelectTrigger className="h-9 w-[200px] text-xs">
            <SelectValue placeholder="All colleges" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-colleges">All Colleges</SelectItem>
            {colleges.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, college..."
            className="pl-9 h-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {(typeFilter !== 'all' || collegeFilter || search) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => { setTypeFilter('all'); setCollegeFilter(''); setSearch(''); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Results Summary */}
      {(typeFilter !== 'all' || collegeFilter) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{filtered.length.toLocaleString()}</span>
          <span>result{filtered.length !== 1 ? 's' : ''}</span>
          {typeFilter !== 'all' && (
            <>
              <span className="text-border">/</span>
              <Badge variant="outline" className="text-[11px] font-normal rounded-md px-1.5 py-0">
                {typeFilter === 'direct_learner' ? 'B2C' : 'B2B'}
              </Badge>
            </>
          )}
          {collegeFilter && (
            <>
              <span className="text-border">/</span>
              <Badge variant="outline" className="text-[11px] font-normal rounded-md px-1.5 py-0">
                {colleges.find(c => c.id === collegeFilter)?.name ?? collegeFilter}
              </Badge>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20">
            <EmptyState
              icon={Users}
              title={initialStudents.length === 0 ? 'No students yet' : 'No matching students'}
              description={
                initialStudents.length === 0
                  ? 'Use Invite student to enrol your first student.'
                  : 'Try a different filter or search term.'
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40 hover:bg-transparent">
                    <TableHead className="text-[11px] font-medium text-muted-foreground pl-5 pr-3 py-3">
                      Name
                    </TableHead>
                    <TableHead className="text-[11px] font-medium text-muted-foreground px-3 py-3">
                      Email
                    </TableHead>
                    <TableHead className="text-center text-[11px] font-medium text-muted-foreground px-3 py-3">
                      Type
                    </TableHead>
                    <TableHead className="text-[11px] font-medium text-muted-foreground px-3 py-3">
                      College
                    </TableHead>
                    <TableHead className="text-right text-[11px] font-medium text-muted-foreground pl-3 pr-5 py-3">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow
                      key={row.id}
                      className="border-b border-border/20 last:border-0 hover:bg-foreground/[0.02] transition-colors cursor-pointer"
                      onClick={() => {
                        setAnalyticsStudentId(row.id);
                        setAnalyticsCollegeId(row.college_id);
                        setAnalyticsStudentName(row.full_name);
                        setAnalyticsStudentEmail(row.email);
                      }}
                    >
                      <TableCell className="py-3 pl-5 pr-3">
                        <span className="text-sm font-medium text-foreground truncate block max-w-[180px]">
                          {row.full_name ?? '-'}
                        </span>
                        {row.student_code && (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {row.student_code}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <span className="text-sm text-muted-foreground truncate block max-w-[200px]">
                          {row.email ?? '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-3 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium',
                            row.student_classification === 'direct_learner'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                          )}
                        >
                          {row.student_classification === 'direct_learner' ? 'B2C' : 'B2B'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <span className="text-sm text-muted-foreground truncate block max-w-[220px]" title={row.college_display}>
                          {row.college_display}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 pl-3 pr-5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAnalyticsStudentId(row.id);
                            setAnalyticsCollegeId(row.college_id);
                            setAnalyticsStudentName(row.full_name);
                            setAnalyticsStudentEmail(row.email);
                          }}
                        >
                          <BarChart3 className="size-3.5" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-border/30">
              <span className="text-xs text-muted-foreground">
                {filtered.length} of {initialStudents.length} students
              </span>
            </div>
          </>
        )}
      </div>

      {/* Student Analytics Sheet */}
      <StudentAnalyticsSheet
        open={!!analyticsStudentId}
        onClose={() => {
          setAnalyticsStudentId(null);
          setAnalyticsCollegeId('');
          setAnalyticsStudentName(null);
          setAnalyticsStudentEmail(null);
        }}
        studentId={analyticsStudentId ?? ''}
        collegeId={analyticsCollegeId}
        studentName={analyticsStudentName}
        studentEmail={analyticsStudentEmail}
      />

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); if (!open) setLastInviteLink(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite student</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div>
              <label htmlFor="invite-college" className="text-xs font-medium mb-1.5 block">College</label>
              <input type="hidden" name="college_id" value={inviteCollegeId} />
              <Select value={inviteCollegeId} onValueChange={setInviteCollegeId} required>
                <SelectTrigger id="invite-college" className="w-full">
                  <SelectValue placeholder="Select college" />
                </SelectTrigger>
                <SelectContent>
                  {colleges.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="invite-email" className="text-xs font-medium mb-1.5 block">Email</label>
              <Input id="invite-email" name="email" type="email" required placeholder="student@example.com" className="h-9" />
            </div>
            <div>
              <label htmlFor="invite-full-name" className="text-xs font-medium mb-1.5 block">Full name</label>
              <Input id="invite-full-name" name="full_name" required placeholder="Jane Doe" className="h-9" />
            </div>
            <div>
              <label htmlFor="invite-student-code" className="text-xs font-medium mb-1.5 block">Student code (optional)</label>
              <Input id="invite-student-code" name="student_code" placeholder="STU001" className="h-9" />
            </div>
            <div>
              <label htmlFor="invite-password" className="text-xs font-medium mb-1.5 block">Password (optional)</label>
              <Input id="invite-password" name="password" type="password" minLength={8} placeholder="Leave blank to generate invite link" className="h-9" />
              <p className="mt-1.5 text-[11px] text-muted-foreground">Leave blank to send an invite link instead.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={invitePending}>{invitePending ? 'Inviting...' : 'Invite'}</Button>
            </DialogFooter>
          </form>
          {lastInviteLink && (
            <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium">Invite link</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">{lastInviteLink}</p>
              <Button
                type="button" variant="outline" size="sm" className="mt-2 h-7 text-xs"
                onClick={async () => { try { await navigator.clipboard.writeText(lastInviteLink); toast.success('Copied.'); } catch { toast.error('Copy failed.'); } }}
              >
                Copy
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
});
