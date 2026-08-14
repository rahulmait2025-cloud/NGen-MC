'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CollegeLead, LeadStats, LeadStatus, LeadPriority } from '@/lib/services/college-leads';
import { updateLeadAction, deleteLeadAction, exportLeadsAction, bulkUpdateStatusAction } from '@/app/(app)/college-leads/actions';

const CollegeLeadDetailSheet = dynamic(
  () => import('@/components/pages/college-leads-detail-sheet').then((mod) => ({ default: mod.CollegeLeadDetailSheet })),
  { ssr: false, loading: () => <div className="hidden" /> }
);

const STATUS_FILTERS = ['All', 'New', 'Contacted', 'Qualified', 'Demo Scheduled', 'Converted', 'Closed', 'Spam'] as const;
const PRIORITY_OPTIONS: { value: LeadPriority; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700 border-green-200' },
];

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'demo_scheduled', label: 'Demo Scheduled' },
  { value: 'converted', label: 'Converted' },
  { value: 'closed', label: 'Closed' },
  { value: 'spam', label: 'Spam' },
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function StatsCard({ label, value, icon: Icon, highlight }: { label: string; value: number; icon: React.ElementType; highlight?: boolean }) {
  return (
    <div className={cn(
      'rounded-xl border p-4 flex items-center gap-3',
      highlight ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'
    )}>
      <div className={cn(
        'size-10 rounded-lg flex items-center justify-center',
        highlight ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
      )}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export const CollegeLeadsPage = React.memo(function CollegeLeadsPage({
  initialLeads,
  initialStats,
}: {
  initialLeads: CollegeLead[];
  initialStats: LeadStats;
}) {
  const router = useRouter();
  const [leads, setLeads] = useState<CollegeLead[]>(initialLeads);
  const [stats] = useState<LeadStats>(initialStats);
  const [filter, setFilter] = useState<typeof STATUS_FILTERS[number]>('All');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<CollegeLead | null>(null);
  const [deleteLead, setDeleteLead] = useState<CollegeLead | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [updatePending, setUpdatePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  const filtered = useMemo(() => {
    let list = leads;

    if (filter !== 'All') {
      const statusMap: Record<string, LeadStatus> = {
        'New': 'new',
        'Contacted': 'contacted',
        'Qualified': 'qualified',
        'Demo Scheduled': 'demo_scheduled',
        'Converted': 'converted',
        'Closed': 'closed',
        'Spam': 'spam',
      };
      const status = statusMap[filter];
      if (status) {
        list = list.filter((l) => l.status === status);
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.full_name.toLowerCase().includes(q) ||
          l.work_email.toLowerCase().includes(q) ||
          l.college_name.toLowerCase().includes(q) ||
          l.phone_number.includes(q)
      );
    }

    return list;
  }, [leads, filter, search]);

  const handleStatusChange = useCallback(async (lead: CollegeLead, newStatus: LeadStatus) => {
    setUpdatePending(true);
    const formData = new FormData();
    formData.set('id', lead.id);
    formData.set('status', newStatus);

    const result = await updateLeadAction(formData);
    setUpdatePending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success('Status updated');
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: newStatus } : l)));
    if (selectedLead?.id === lead.id) {
      setSelectedLead({ ...selectedLead, status: newStatus });
    }
  }, [selectedLead]);

  const handlePriorityChange = useCallback(async (lead: CollegeLead, newPriority: LeadPriority) => {
    setUpdatePending(true);
    const formData = new FormData();
    formData.set('id', lead.id);
    formData.set('priority', newPriority);

    const result = await updateLeadAction(formData);
    setUpdatePending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success('Priority updated');
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, priority: newPriority } : l)));
    if (selectedLead?.id === lead.id) {
      setSelectedLead({ ...selectedLead, priority: newPriority });
    }
  }, [selectedLead]);

  const handleMarkContacted = useCallback(async (lead: CollegeLead) => {
    setUpdatePending(true);
    const formData = new FormData();
    formData.set('id', lead.id);
    formData.set('mark_contacted', 'true');

    const result = await updateLeadAction(formData);
    setUpdatePending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success('Marked as contacted');
    const now = new Date().toISOString();
    setLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id
          ? { ...l, status: l.status === 'new' ? 'contacted' : l.status, last_contacted_at: now }
          : l
      )
    );
    if (selectedLead?.id === lead.id) {
      setSelectedLead({
        ...selectedLead,
        status: selectedLead.status === 'new' ? 'contacted' : selectedLead.status,
        last_contacted_at: now,
      });
    }
    router.refresh();
  }, [selectedLead, router]);

  const handleSaveNotes = useCallback(async (lead: CollegeLead, notes: string) => {
    setUpdatePending(true);
    const formData = new FormData();
    formData.set('id', lead.id);
    formData.set('notes', notes);

    const result = await updateLeadAction(formData);
    setUpdatePending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success('Notes saved');
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, notes } : l)));
    if (selectedLead?.id === lead.id) {
      setSelectedLead({ ...selectedLead, notes });
    }
  }, [selectedLead]);

  const handleDelete = useCallback(async () => {
    if (!deleteLead) return;

    setDeletePending(true);
    const formData = new FormData();
    formData.set('id', deleteLead.id);

    const result = await deleteLeadAction(formData);
    setDeletePending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success('Lead deleted');
    setLeads((prev) => prev.filter((l) => l.id !== deleteLead.id));
    setDeleteLead(null);
    if (selectedLead?.id === deleteLead.id) {
      setSelectedLead(null);
    }
    router.refresh();
  }, [deleteLead, selectedLead, router]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    const result = await exportLeadsAction();
    setIsExporting(false);

    if (!result.ok || !result.csv) {
      toast.error(result.error || 'Export failed');
      return;
    }

    const blob = new Blob([result.csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `college-leads-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Leads exported successfully');
  }, []);

  const handleBulkStatusUpdate = useCallback(async () => {
    if (!bulkAction || selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    const result = await bulkUpdateStatusAction(ids, bulkAction);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`Updated ${ids.length} leads`);
    setSelectedIds(new Set());
    setBulkAction(null);
    router.refresh();
  }, [bulkAction, selectedIds, router]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((l) => l.id)));
    }
  }, [filtered, selectedIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Copy failed');
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total Leads" value={stats.total} icon={Building2} />
        <StatsCard label="New" value={stats.new} icon={Sparkles} highlight />
        <StatsCard label="Demo Scheduled" value={stats.demo_scheduled} icon={Calendar} />
        <StatsCard label="Converted" value={stats.converted} icon={CheckCircle2} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((label) => (
            <Button
              key={label}
              type="button"
              size="sm"
              variant={filter === label ? 'default' : 'outline'}
              className="rounded-full h-7 px-3 text-xs"
              onClick={() => setFilter(label)}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          <Input
            placeholder="Search leads..."
            className="min-w-0 flex-1 max-w-48 h-8 text-xs sm:w-44"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="size-3.5 mr-1" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Select
            value={bulkAction || ''}
            onValueChange={(v) => setBulkAction(v || null)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Bulk action..." />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  Mark as {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8"
            disabled={!bulkAction}
            onClick={handleBulkStatusUpdate}
          >
            Apply
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      <section className="rounded-xl border border-border bg-background p-4 pb-6 min-w-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="min-w-[100px]">Date</TableHead>
              <TableHead className="min-w-[150px]">Name</TableHead>
              <TableHead className="min-w-[180px]">College</TableHead>
              <TableHead className="min-w-[160px] hidden md:table-cell">Email</TableHead>
              <TableHead className="min-w-[120px] hidden md:table-cell">Phone</TableHead>
              <TableHead className="min-w-[100px] hidden lg:table-cell">Interest</TableHead>
              <TableHead className="min-w-[100px]">Status</TableHead>
              <TableHead className="min-w-[80px] hidden lg:table-cell">Priority</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                  {leads.length === 0
                    ? 'No leads yet. They will appear here when colleges submit the contact form.'
                    : 'No leads match the current filter or search.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedLead(lead)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(lead.id)}
                      onCheckedChange={() => toggleSelect(lead.id)}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(lead.created_at)}
                  </TableCell>
                  <TableCell className="font-medium">{lead.full_name}</TableCell>
                  <TableCell>
                    <div className="max-w-[180px] truncate" title={lead.college_name}>
                      {lead.college_name}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{lead.work_email}</TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{lead.phone_number}</TableCell>
                  <TableCell className="text-xs hidden lg:table-cell">{lead.interest_type ? lead.interest_type.replaceAll('_', ' ') : '-'}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={lead.status}
                      onValueChange={(v) => handleStatusChange(lead, v as LeadStatus)}
                      disabled={updatePending}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()} className="hidden lg:table-cell">
                    <Select
                      value={lead.priority}
                      onValueChange={(v) => handlePriorityChange(lead, v as LeadPriority)}
                      disabled={updatePending}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      {(selectedLead || deleteLead) && (
        <CollegeLeadDetailSheet
          selectedLead={selectedLead}
          setSelectedLead={setSelectedLead}
          deleteLead={deleteLead}
          setDeleteLead={setDeleteLead}
          deletePending={deletePending}
          updatePending={updatePending}
          handleDelete={handleDelete}
          handleMarkContacted={handleMarkContacted}
          handleSaveNotes={handleSaveNotes}
          copyToClipboard={copyToClipboard}
        />
      )}
    </div>
  );
});
