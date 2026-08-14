import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import type { ReactNode } from 'react';
import { listActiveTemplates } from '@/lib/email-center/templates';
import { getCampaignById } from '@/lib/email-center/campaigns';
import { EmailCenterShell } from '@/components/email-center/email-center-shell';
import { ComposeForm } from '@/components/email-center/compose-form';


interface ComposePageProps {
  searchParams: Promise<{ template?: string; campaign?: string }>;
}

export default async function EmailCenterComposePage({ searchParams }: ComposePageProps): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  const [params, templates] = await Promise.all([
    searchParams,
    listActiveTemplates(),
  ]);

  let existingCampaign = null;
  let mode: 'create' | 'edit' = 'create';

  if (params.campaign) {
    existingCampaign = await getCampaignById(params.campaign);
    if (existingCampaign) {
      mode = 'edit';
    }
  }

  return (
    <EmailCenterShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {mode === 'create' ? 'Create Campaign' : 'Edit Campaign'}
          </h1>
          <p className="text-muted-foreground">
            {mode === 'create'
              ? 'Create a new email campaign using a template or custom content'
              : 'Edit your existing campaign'}
          </p>
        </div>

        <ComposeForm
          templates={templates}
          existingCampaign={existingCampaign}
          mode={mode}
          preselectedTemplateId={mode === 'create' ? params.template : undefined}
        />
      </div>
    </EmailCenterShell>
  );
}
