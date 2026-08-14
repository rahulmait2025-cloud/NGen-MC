
import type { ReactNode } from 'react';
import Link from 'next/link';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { listActiveTemplates } from '@/lib/email-center/templates';
import { EmailCenterShell } from '@/components/email-center/email-center-shell';
import { Button } from '@/components/ui/button';
import type { EmailTemplate } from '@/lib/email-center/types';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const categoryColors: Record<string, string> = {
  marketing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  product_launch: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-blue-200',
  notice: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  announcement: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  notification: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  operational: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  custom: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
};

function TemplateCardServer({ template }: { template: EmailTemplate }) {
  return (
    <div className="group relative flex flex-col rounded-lg border border-border bg-card p-5 transition-[border-color,box-shadow] hover:border-primary/50 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="size-5 text-primary" />
        </div>

        <span className={cn('text-xs font-medium px-2 py-1 rounded', categoryColors[template.category] || categoryColors.custom)}>
          {template.category.replace('_', ' ')}
        </span>
      </div>

      <div className="mt-4">
        <h3 className="font-semibold text-card-foreground">{template.name}</h3>
        {template.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {template.description}
          </p>
        )}
      </div>

      {template.is_system && (
        <div className="mt-3">
          <span className="text-xs text-muted-foreground">System template</span>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button asChild size="sm" className="flex-1">
          <Link href={`/email-center/compose?template=${template.id}`}>
            Use Template
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default async function EmailCenterTemplatesPage(): Promise<ReactNode> {
  const _auth = await getSessionFromHeaders(); if (!_auth) { const { redirect } = await import('next/navigation'); redirect('/login'); }

  const templates = await listActiveTemplates();

  return (
    <EmailCenterShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Email Templates</h1>
            <p className="text-muted-foreground">
              Browse and use pre-built email templates
            </p>
          </div>
          <Button asChild>
            <Link href="/email-center/compose">Create Custom</Link>
          </Button>
        </div>

        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4">
              <svg
                className="size-6 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="mt-4 font-semibold text-card-foreground">No templates found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Templates will appear here once they are created.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <TemplateCardServer
                key={template.id}
                template={template}
              />
            ))}
          </div>
        )}
      </div>
    </EmailCenterShell>
  );
}