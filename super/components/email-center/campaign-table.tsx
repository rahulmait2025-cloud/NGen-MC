'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import type { EmailCampaign } from '@/lib/email-center/types';
import { Edit, Copy, Send } from 'lucide-react';

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  test_sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ready: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  sending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  sent: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

const approvalStatusColors: Record<string, string> = {
  not_required: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  pending_review: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

interface CampaignTableProps {
  campaigns: EmailCampaign[];
  onDuplicate?: (campaignId: string) => void;
  onSendTest?: (campaignId: string, campaignName: string) => void;
}

export function CampaignTable({ campaigns, onDuplicate, onSendTest }: CampaignTableProps) {
  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4">
          <Send className="size-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 font-semibold text-card-foreground">No campaigns yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first campaign to get started.
        </p>
        <Button asChild className="mt-4">
          <Link href="/email-center/compose">Create Campaign</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border bg-muted/50 text-left text-sm hover:bg-transparent">
            <TableHead className="px-4 py-3 font-medium">Name</TableHead>
            <TableHead className="px-4 py-3 font-medium">Type</TableHead>
            <TableHead className="px-4 py-3 font-medium">Status</TableHead>
            <TableHead className="px-4 py-3 font-medium">Approval</TableHead>
            <TableHead className="px-4 py-3 font-medium text-right">Recipients</TableHead>
            <TableHead className="px-4 py-3 font-medium text-right">Sent</TableHead>
            <TableHead className="px-4 py-3 font-medium">Subject</TableHead>
            <TableHead className="px-4 py-3 font-medium text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow
              key={campaign.id}
              className="border-b border-border last:border-0 transition-colors hover:bg-muted/30"
            >
              <TableCell className="px-4 py-3">
                <Link
                  href={`/email-center/campaigns/${campaign.id}`}
                  className="font-medium text-card-foreground hover:text-primary"
                >
                  {campaign.name}
                </Link>
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                {campaign.campaign_type.replace('_', ' ')}
              </TableCell>
              <TableCell className="px-4 py-3">
                <Badge className={cn('text-xs font-medium', statusColors[campaign.status])}>
                  {campaign.status.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell className="px-4 py-3">
                <Badge className={cn('text-xs font-medium', approvalStatusColors[campaign.approval_status ?? 'not_required'])}>
                  {(campaign.approval_status ?? 'not_required').replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-right font-medium">
                {campaign.recipient_count ?? 0}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-right text-green-600">
                {campaign.sent_count ?? 0}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-muted-foreground max-w-[150px] truncate">
                {campaign.subject}
              </TableCell>
              <TableCell className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/email-center/compose?campaign=${campaign.id}`}>
                      <Edit className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDuplicate?.(campaign.id)}
                  >
                    <Copy className="size-4" />
                  </Button>
                  {(campaign.status === 'draft' || campaign.status === 'test_sent') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onSendTest?.(campaign.id, campaign.name)}
                    >
                      <Send className="size-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}