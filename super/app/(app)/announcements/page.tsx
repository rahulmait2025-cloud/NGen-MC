import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import type { ReactNode } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Megaphone, CheckCircle2, Clock, Type, Code2, Tag, AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { AnnouncementsClient } from './announcements-client';

type AnnouncementStatus = 'active' | 'expired' | 'scheduled' | 'draft';

interface AnnouncementRow {
  id: string;
  type: 'text' | 'coupon' | 'custom_html';
  title: string;
  message: string | null;
  html_content: string | null;
  cta_label: string | null;
  cta_url: string | null;
  coupon_id: string | null;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
  coupons?: { code: string; discount_type: string; discount_value: number; valid_until: string | null } | null;
}

function getStatus(announcement: AnnouncementRow): AnnouncementStatus {
  const now = new Date();
  if (announcement.is_active && (!announcement.expires_at || new Date(announcement.expires_at) > now)) {
    return 'active';
  }
  if (announcement.expires_at && new Date(announcement.expires_at) <= now) {
    return 'expired';
  }
  if (new Date(announcement.starts_at) > now) {
    return 'scheduled';
  }
  return 'draft';
}

const statusMeta: Record<AnnouncementStatus, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
  active: { label: 'Active', icon: <CheckCircle2 className="size-3" />, bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20' },
  expired: { label: 'Expired', icon: <Clock className="size-3" />, bg: 'bg-zinc-500/10', text: 'text-zinc-500', border: 'border-zinc-500/20' },
  scheduled: { label: 'Scheduled', icon: <Clock className="size-3" />, bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20' },
  draft: { label: 'Draft', icon: <Type className="size-3" />, bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20' },
};

const typeMeta: Record<string, { label: string; icon: React.ReactNode }> = {
  text: { label: 'Text', icon: <Type className="size-3.5" /> },
  coupon: { label: 'Coupon', icon: <Tag className="size-3.5" /> },
  custom_html: { label: 'HTML', icon: <Code2 className="size-3.5" /> },
};

function fmtDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
}

function StatusPill({ status }: { status: AnnouncementStatus }) {
  const m = statusMeta[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold', m.bg, m.text, m.border)}>
      {m.icon}
      {m.label}
    </span>
  );
}

async function fetchAnnouncements() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('platform_announcements')
    .select('*, coupons(code, discount_type, discount_value, valid_until)')
    .order('created_at', { ascending: false })
    .range(0, 99);

  if (error) {
    // Table may not exist yet — migration not applied
    if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
      return [] as AnnouncementRow[];
    }
    throw new Error(`Failed to fetch announcements: ${error.message}`);
  }
  return (data ?? []) as AnnouncementRow[];
}

async function fetchCoupons() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('coupons')
    .select('id, code, discount_type, discount_value, status')
    .eq('status', 'active')
    .order('code', { ascending: true });

  if (error) return [] as { id: string; code: string; discount_type: string; discount_value: number; status: string }[];
  return (data ?? []) as { id: string; code: string; discount_type: string; discount_value: number; status: string }[];
}

export default async function AnnouncementsPage(): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders();
  if (!_auth) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  const [announcements, coupons] = await Promise.all([fetchAnnouncements(), fetchCoupons()]);

  const active = announcements.filter((a) => getStatus(a) === 'active').length;
  const total = announcements.length;
  const tableMissing = total === 0 && coupons.length === 0;

  return (
    <div className="space-y-8 pb-16">
      {/* Migration Notice */}
      {tableMissing && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Migration not applied yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Run the migration SQL in your Supabase SQL Editor to create the{' '}
                  <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">platform_announcements</code> table.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  File: <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">supabase/migrations/00236_platform_announcements.sql</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Announcements
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global banner shown to all students on the landing page. Only one announcement is active at a time.
          </p>
        </div>
        <AnnouncementsClient coupons={coupons} mode="header-button" />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Active</p>
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1.5">
                <CheckCircle2 className="size-3.5 text-zinc-500" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{active}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Shown to students</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Total</p>
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1.5">
                <Megaphone className="size-3.5 text-zinc-500" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{total}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Announcements created</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">With Coupons</p>
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1.5">
                <Tag className="size-3.5 text-zinc-500" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
              {announcements.filter((a) => a.type === 'coupon').length}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Coupon-linked</p>
          </CardContent>
        </Card>
      </div>

      {/* Announcements Table */}
      <Card className="border-border/60 overflow-hidden">
        <CardContent className="p-0">
          {announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="size-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                <Megaphone className="size-7 text-zinc-400" />
              </div>
              <h3 className="text-base font-medium text-foreground">No announcements yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-xs">
                Create your first announcement to display a global banner to students.
              </p>
              <AnnouncementsClient coupons={coupons} mode="empty-state" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/40">
                    <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground pl-5 py-3 text-left">Title</TableHead>
                    <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground py-3 text-left">Type</TableHead>
                    <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground py-3 text-left">Status</TableHead>
                    <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground py-3 text-left">Coupon</TableHead>
                    <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground py-3 text-left">Schedule</TableHead>
                    <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground py-3 text-left">Expires</TableHead>
                    <TableHead className="text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground pr-5 py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((announcement) => {
                    const status = getStatus(announcement);
                    const tm = typeMeta[announcement.type];
                    return (
                      <TableRow key={announcement.id} className="border-b border-border/20 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                        <TableCell className="py-3.5 pl-5">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground truncate max-w-[240px]">
                              {announcement.title}
                            </span>
                            {announcement.message && (
                              <span className="text-xs text-muted-foreground truncate max-w-[240px]">
                                {announcement.message}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            {tm.icon}
                            {tm.label}
                          </span>
                        </TableCell>

                        <TableCell className="py-3.5">
                          <StatusPill status={status} />
                        </TableCell>

                        <TableCell className="py-3.5">
                          {announcement.coupons ? (
                            <div className="flex flex-col gap-0.5">
                              <code className="font-mono text-xs font-medium bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-foreground w-fit">
                                {announcement.coupons.code}
                              </code>
                              <span className="text-[11px] text-muted-foreground">
                                {announcement.coupons.discount_type === 'percentage'
                                  ? `${announcement.coupons.discount_value}% off`
                                  : `₹${(announcement.coupons.discount_value / 100).toFixed(0)} off`}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className="py-3.5">
                          <span className="text-xs text-muted-foreground">
                            {fmtDate(announcement.starts_at)}
                          </span>
                        </TableCell>

                        <TableCell className="py-3.5">
                          {announcement.expires_at ? (
                            <span className="text-xs text-muted-foreground">
                              {fmtDate(announcement.expires_at)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">No expiry</span>
                          )}
                        </TableCell>

                        <TableCell className="py-3.5 pr-5">
                          <div className="flex items-center justify-end gap-1">
                            <AnnouncementsClient
                              mode="edit"
                              announcement={announcement}
                              coupons={coupons}
                            />
                            <AnnouncementsClient
                              mode="toggle"
                              announcement={announcement}
                              coupons={coupons}
                            />
                            <AnnouncementsClient
                              mode="delete"
                              announcement={announcement}
                              coupons={coupons}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
