import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function LearningPageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
}: {
  title: string;
  subtitle: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="pt-2">
      {backHref ? (
        <Link
          href={backHref}
          className="group mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 transition-transform [@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-x-0.5" />
          {backLabel}
        </Link>
      ) : null}
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-2 max-w-[65ch] text-base leading-relaxed text-muted-foreground">
        {subtitle}
      </p>
    </div>
  );
}
