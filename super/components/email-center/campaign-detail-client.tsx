'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComposeForm } from '@/components/email-center/compose-form';
import { EmailPreview } from '@/components/email-center/email-preview';
import { AudienceSendTab } from '@/components/email-center/audience-send-tab';
import { CampaignApprovalTab } from '@/components/email-center/campaign-approval-tab';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import type { CampaignSendStats } from '@/lib/email-center/stats';
import type { EmailCampaign, EmailTemplate, EmailCampaignTest } from '@/lib/email-center/types';
import {
  formatEmailFromHeader,
  resolveSenderProfileOrDefault,
  extractSenderProfileIdFromComposerState,
} from '@/lib/email-center/sender-profiles';

interface CampaignDetailClientProps {
  campaign: EmailCampaign;
  templates: EmailTemplate[];
  tests: EmailCampaignTest[];
  stats: CampaignSendStats;
  recentEvents: { event_type: string; email: string | null }[];
  topLinks: { original_url: string; click_count: number }[];
  /** Initial tab from ?tab=audience (Save & Continue). */
  initialTab?: string;
}

const VALID_TABS = new Set(['content', 'audience', 'approval', 'analytics', 'tests']);

export function CampaignDetailClient({
  campaign,
  templates,
  tests,
  stats,
  recentEvents,
  topLinks,
  initialTab,
}: CampaignDetailClientProps) {
  const [activeTab, setActiveTab] = useState(
    initialTab && VALID_TABS.has(initialTab) ? initialTab : 'content'
  );
  const { refresh } = useRouter();
  const handleRefresh = () => refresh();

  const audienceType = typeof campaign.audience_config === 'object' && campaign.audience_config !== null 
    ? String((campaign.audience_config as Record<string, unknown>).type ?? 'unknown') 
    : 'unknown';

  const approvalData = {
    approval_status: campaign.approval_status ?? 'not_required',
    approval_requested_at: campaign.approval_requested_at,
    approved_at: campaign.approved_at,
    rejected_at: campaign.rejected_at,
    rejection_reason: campaign.rejection_reason,
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full h-auto grid grid-cols-2 md:grid-cols-5 gap-2 bg-transparent p-0 mb-6">
        <TabsTrigger
          value="content"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border bg-card text-card-foreground shadow-sm py-2 px-4"
        >
          Content
        </TabsTrigger>
        <TabsTrigger
          value="audience"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border bg-card text-card-foreground shadow-sm py-2 px-4"
        >
          Audience & Send
        </TabsTrigger>
        <TabsTrigger
          value="approval"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border bg-card text-card-foreground shadow-sm py-2 px-4"
        >
          Approval
        </TabsTrigger>
        <TabsTrigger
          value="analytics"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border bg-card text-card-foreground shadow-sm py-2 px-4"
        >
          Analytics
        </TabsTrigger>
        <TabsTrigger
          value="tests"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border bg-card text-card-foreground shadow-sm py-2 px-4"
        >
          Test History
        </TabsTrigger>
      </TabsList>

      <TabsContent value="content" className="m-0 focus-visible:outline-none focus-visible:ring-0">
        <ComposeForm
          templates={templates}
          existingCampaign={campaign}
          mode="edit"
        />
      </TabsContent>

      <TabsContent value="audience" className="m-0 focus-visible:outline-none focus-visible:ring-0">
        <AudienceSendTab
          campaignId={campaign.id}
          initialStatus={campaign.status}
          campaignName={campaign.name}
          campaignSubject={campaign.subject}
          audienceType={audienceType}
          stats={stats}
          onRefresh={handleRefresh}
          initialAudienceConfig={campaign.audience_config as unknown as import('./audience-builder').AudienceConfig | null}
          emailCategory={campaign.email_category}
          isCustomComposer={
            campaign.content_mode === 'custom_composer'
            || (!campaign.template_id && campaign.content_mode !== 'template')
          }
          senderFromHeader={
            campaign.content_mode === 'custom_composer'
            || (!campaign.template_id && campaign.content_mode !== 'template')
              ? (() => {
                  const profile = resolveSenderProfileOrDefault(
                    extractSenderProfileIdFromComposerState(campaign.composer_state),
                  );
                  return formatEmailFromHeader(profile.fromName, profile.fromEmail);
                })()
              : null
          }
          senderReplyTo={
            campaign.content_mode === 'custom_composer'
            || (!campaign.template_id && campaign.content_mode !== 'template')
              ? resolveSenderProfileOrDefault(
                  extractSenderProfileIdFromComposerState(campaign.composer_state),
                ).replyTo
              : null
          }
        />
      </TabsContent>

      <TabsContent value="approval" className="m-0 focus-visible:outline-none focus-visible:ring-0">
        <CampaignApprovalTab
          campaignId={campaign.id}
          initialStatus={campaign.status}
          approvalData={approvalData}
          onRefresh={handleRefresh}
        />
      </TabsContent>

      <TabsContent value="analytics" className="m-0 focus-visible:outline-none focus-visible:ring-0">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="size-5" />
              Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground mb-1">Delivered</p>
                <p className="text-3xl font-semibold">{stats.delivered}</p>
              </div>
              <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 p-4 shadow-sm">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Opened</p>
                <p className="text-3xl font-semibold text-blue-600 dark:text-blue-400">{stats.opened}</p>
              </div>
              <div className="rounded-lg border bg-green-50/50 dark:bg-green-950/20 p-4 shadow-sm">
                <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Clicked</p>
                <p className="text-3xl font-semibold text-green-600 dark:text-green-400">{stats.clicked}</p>
              </div>
              <div className="rounded-lg border bg-red-50/50 dark:bg-red-950/20 p-4 shadow-sm">
                <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Bounced</p>
                <p className="text-3xl font-semibold text-red-600 dark:text-red-400">{stats.bounced}</p>
              </div>
            </div>

            {topLinks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Top Clicked Links</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Clicks</TableHead>
                        <TableHead>URL</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topLinks.map((link) => (
                        <TableRow key={link.original_url}>
                          <TableCell className="font-medium">{link.click_count}</TableCell>
                          <TableCell className="max-w-[400px] truncate text-muted-foreground">
                            <a href={link.original_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {link.original_url}
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Recent Events</h3>
              {recentEvents.length === 0 ? (
                <div className="rounded-md border p-8 text-center text-muted-foreground">
                  No events recorded yet.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentEvents.slice(0, 10).map((event) => (
                        <TableRow key={`${event.email}-${event.event_type}`}>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {event.event_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm font-mono">
                            {event.email ? event.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="tests" className="m-0 focus-visible:outline-none focus-visible:ring-0 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Test History</CardTitle>
          </CardHeader>
          <CardContent>
            {tests.length === 0 ? (
              <div className="rounded-md border p-8 text-center text-muted-foreground">
                No test emails sent yet.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sent To</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tests.slice(0, 10).map((test) => (
                      <TableRow key={test.id}>
                        <TableCell className="font-medium">{test.sent_to}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={test.status === 'sent' ? 'default' : 'destructive'} className={test.status === 'sent' ? 'bg-green-600' : ''}>
                            {test.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Content Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-muted/50 p-4 overflow-hidden min-w-0 max-w-full">
              <EmailPreview
                subject={campaign.subject}
                previewText={campaign.preview_text || undefined}
                htmlContent={campaign.html_body}
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
