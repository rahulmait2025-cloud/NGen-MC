'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Trash2,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { CollegeLead, LeadPriority, LeadStatus } from '@/lib/services/college-leads';

const PRIORITY_OPTIONS: { value: LeadPriority; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700 border-green-200' },
];

const INTEREST_LABELS: Record<string, string> = {
  demo: 'Demo',
  partnership: 'Partnership',
  pilot_program: 'Pilot Program',
  placement_bootcamp: 'Placement Bootcamp',
  custom_lms: 'Custom LMS',
};

const COLLEGE_TYPE_LABELS: Record<string, string> = {
  bca: 'BCA',
  btech: 'B.Tech',
  engineering: 'Engineering',
  university: 'University',
  other: 'Other',
};

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  contacted: 'bg-purple-100 text-purple-700 border-purple-200',
  qualified: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  demo_scheduled: 'bg-orange-100 text-orange-700 border-orange-200',
  converted: 'bg-green-100 text-green-700 border-green-200',
  closed: 'bg-gray-100 text-gray-700 border-gray-200',
  spam: 'bg-red-100 text-red-700 border-red-200',
};

const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  demo_scheduled: 'Demo Scheduled',
  converted: 'Converted',
  closed: 'Closed',
  spam: 'Spam',
};

function StatusBadge({ status }: { status: LeadStatus }) {

  return (
    <Badge variant="outline" className={`${LEAD_STATUS_COLORS[status]} border text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5`}>
      {LEAD_STATUS_LABELS[status]}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: LeadPriority }) {
  const option = PRIORITY_OPTIONS.find((p) => p.value === priority);
  if (!option) return null;

  return (
    <Badge variant="outline" className={cn('text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 border', option.color)}>
      {option.label}
    </Badge>
  );
}

function NotesEditor({
  leadId,
  initialValue,
  onSave,
  disabled,
}: {
  leadId: string;
  initialValue: string;
  onSave: (notes: string) => void;
  disabled?: boolean;
}) {
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const value = draftValue ?? initialValue;
  const hasChanges = value !== initialValue;

  return (
    <div key={leadId} className="space-y-2">
      <Textarea
        id="internal-notes"
        className="min-h-[100px]"
        placeholder="Add internal notes about this lead..."
        value={value}
        onChange={(e) => setDraftValue(e.target.value)}
        disabled={disabled}
      />
      {hasChanges && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onSave(value)} disabled={disabled}>
            Save Notes
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDraftValue(null)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

export function CollegeLeadDetailSheet({
  selectedLead,
  setSelectedLead,
  deleteLead,
  setDeleteLead,
  deletePending,
  updatePending,
  handleDelete,
  handleMarkContacted,
  handleSaveNotes,
  copyToClipboard,
}: {
  selectedLead: CollegeLead | null;
  setSelectedLead: (lead: CollegeLead | null) => void;
  deleteLead: CollegeLead | null;
  setDeleteLead: (lead: CollegeLead | null) => void;
  deletePending: boolean;
  updatePending: boolean;
  handleDelete: () => Promise<void>;
  handleMarkContacted: (lead: CollegeLead) => Promise<void>;
  handleSaveNotes: (lead: CollegeLead, notes: string) => Promise<void>;
  copyToClipboard: (text: string, label: string) => Promise<void>;
}) {
  return (
    <>
      <Sheet open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedLead && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <User className="size-5" />
                  {selectedLead.full_name}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={selectedLead.status} />
                  <PriorityBadge priority={selectedLead.priority} />
                </div>

                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 text-muted-foreground" />
                      <span className="text-sm">{selectedLead.work_email}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyToClipboard(selectedLead.work_email, 'Email')}>
                      <Copy className="size-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 text-muted-foreground" />
                      <span className="text-sm">{selectedLead.phone_number}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyToClipboard(selectedLead.phone_number, 'Phone')}>
                      <Copy className="size-3.5" />
                    </Button>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{selectedLead.college_name}</span>
                    </div>
                    {selectedLead.designation && <p className="text-xs text-muted-foreground pl-6">{selectedLead.designation}</p>}
                    {(selectedLead.city || selectedLead.state) && (
                      <div className="flex items-center gap-1 pl-6">
                        <MapPin className="size-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {[selectedLead.city, selectedLead.state].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                    {selectedLead.website_url && (
                      <a
                        href={selectedLead.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 pl-6 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="size-3" />
                        Visit Website
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">College Type</p>
                      <p className="text-sm font-medium">
                        {selectedLead.college_type
                          ? COLLEGE_TYPE_LABELS[selectedLead.college_type] || selectedLead.college_type
                          : '-'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Batch Size</p>
                      <p className="text-sm font-medium">{selectedLead.student_count || '-'}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Interest</p>
                    <p className="text-sm font-medium">
                      {selectedLead.interest_type
                        ? INTEREST_LABELS[selectedLead.interest_type] || selectedLead.interest_type
                        : '-'}
                    </p>
                  </div>

                  {selectedLead.message && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Message</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedLead.message}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="size-3.5" />
                      <span>Submitted: {formatDateTime(selectedLead.created_at)}</span>
                    </div>
                    {selectedLead.last_contacted_at && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="size-3.5" />
                        <span>Last contacted: {formatDateTime(selectedLead.last_contacted_at)}</span>
                      </div>
                    )}
                  </div>

                  {(selectedLead.utm_source || selectedLead.utm_medium || selectedLead.utm_campaign) && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-2">Attribution</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {selectedLead.utm_source && (
                          <span className="px-2 py-0.5 rounded bg-background border">source: {selectedLead.utm_source}</span>
                        )}
                        {selectedLead.utm_medium && (
                          <span className="px-2 py-0.5 rounded bg-background border">medium: {selectedLead.utm_medium}</span>
                        )}
                        {selectedLead.utm_campaign && (
                          <span className="px-2 py-0.5 rounded bg-background border">campaign: {selectedLead.utm_campaign}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label htmlFor="internal-notes" className="text-sm font-medium">Internal Notes</label>
                  <NotesEditor
                    leadId={selectedLead.id}
                    initialValue={selectedLead.notes || ''}
                    onSave={(notes) => handleSaveNotes(selectedLead, notes)}
                    disabled={updatePending}
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                  <Button variant="outline" size="sm" onClick={() => handleMarkContacted(selectedLead)} disabled={updatePending}>
                    <CheckCircle2 className="size-3.5 mr-1" />
                    Mark Contacted
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setSelectedLead(null);
                      setDeleteLead(selectedLead);
                    }}
                  >
                    <Trash2 className="size-3.5 mr-1" />
                    Delete Lead
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteLead}
        onClose={() => setDeleteLead(null)}
        title="Delete Lead"
        description={`Are you sure you want to delete the lead from ${deleteLead?.college_name}? This action cannot be undone.`}
        confirmLabel={deletePending ? 'Deleting...' : 'Delete Lead'}
        onConfirm={handleDelete}
      />
    </>
  );
}
