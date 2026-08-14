'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EmailCenterShell } from './email-center-shell';
import { CampaignTable } from './campaign-table';
import { TestSendDialog } from './test-send-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { duplicateCampaignAction } from '@/app/(app)/email-center/actions';
import type { EmailCampaign } from '@/lib/email-center/types';

export function CampaignsClient({ initialCampaigns }: { initialCampaigns: EmailCampaign[] }) {
  const router = useRouter();
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'test_sent' | 'sending' | 'sent' | 'failed' | 'cancelled'>('all');

  const filteredCampaigns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return initialCampaigns.filter((campaign) => {
      const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
      const matchesQuery = !query
        || campaign.name.toLowerCase().includes(query)
        || campaign.subject.toLowerCase().includes(query);

      return matchesStatus && matchesQuery;
    });
  }, [initialCampaigns, searchQuery, statusFilter]);

  const handleDuplicate = async (campaignId: string) => {
    const result = await duplicateCampaignAction(campaignId);
    if (result.ok && result.newCampaignId) {
      router.push(`/email-center/campaigns/${result.newCampaignId}`);
    }
  };

  const handleSendTest = (campaignId: string, campaignName: string) => {
    setSelectedCampaign({ id: campaignId, name: campaignName });
    setTestDialogOpen(true);
  };

  return (
    <EmailCenterShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Email Campaigns</h1>
            <p className="text-muted-foreground">
              Manage your email campaigns and test sends
            </p>
          </div>
          <Button asChild>
            <Link href="/email-center/compose">Create Campaign</Link>
          </Button>
        </div>

        <Card>
          <CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_240px] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="campaign-search">Search campaigns</Label>
              <Input
                id="campaign-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by campaign name or subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-status">Status filter</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger id="campaign-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="test_sent">Test Sent</SelectItem>
                  <SelectItem value="sending">Sending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {filteredCampaigns.length === 0 && initialCampaigns.length > 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <h3 className="font-semibold text-card-foreground">No campaigns match your filters</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Try clearing the search box or status filter.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                Clear filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <CampaignTable
            campaigns={filteredCampaigns}
            onDuplicate={handleDuplicate}
            onSendTest={handleSendTest}
          />
        )}

        {selectedCampaign ? (
          <TestSendDialog
            open={testDialogOpen}
            onOpenChange={setTestDialogOpen}
            campaignId={selectedCampaign.id}
            campaignName={selectedCampaign.name}
            onSuccess={() => router.refresh()}
          />
        ) : null}
      </div>
    </EmailCenterShell>
  );
}
