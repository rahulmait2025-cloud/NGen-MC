import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function ProvisioningSidebar({
  tenantName,
  pillarTitle,
  isVariant,
}: {
  tenantName: string;
  pillarTitle: string;
  isVariant: boolean;
}) {
  return (
    <aside className="lg:col-span-2 card-tier-1 rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-border/40 bg-primary/5 flex items-center gap-2 shrink-0">
        <ShieldCheck className="size-4 text-primary shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wider text-primary">
          Provisioning
        </span>
      </div>
      <div className="p-4 sm:p-5 space-y-3 flex-1">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground shrink-0">Institution</dt>
            <dd className="font-medium text-right truncate">{tenantName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground shrink-0">Pillar</dt>
            <dd className="font-medium text-right truncate">{pillarTitle}</dd>
          </div>
          <div className="flex justify-between gap-4 items-center">
            <dt className="text-muted-foreground shrink-0">Type</dt>
            <dd>
              <Badge
                variant="outline"
                className={
                  isVariant
                    ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[10px]'
                    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]'
                }
              >
                {isVariant ? 'Variant' : 'Master course'}
              </Badge>
            </dd>
          </div>
          <div className="flex justify-between gap-4 items-center">
            <dt className="text-muted-foreground shrink-0">Status</dt>
            <dd>
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
              >
                Active
              </Badge>
            </dd>
          </div>
        </dl>
        <p className="text-[11px] text-muted-foreground leading-relaxed pt-3 border-t border-border/40">
          {isVariant
            ? 'This variant\'s curriculum is managed by SuperAdmin. Your institution has read-only access to the selected lessons.'
            : 'Course structure is managed by SuperAdmin. Your institution has read-only access to this curriculum.'}
        </p>
      </div>
    </aside>
  );
}
