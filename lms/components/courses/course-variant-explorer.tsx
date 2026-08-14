import Link from 'next/link';
import { ArrowRight, ChevronRight, Layers, Sparkles, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CourseVariantLandingOption } from '@/lib/services/resolved-course-scope';
import { buildPillarCourseDetailHref } from '@/lib/utils/variant-learn-url';

interface CourseVariantExplorerProps {
  masterCourseTitle: string;
  variants: CourseVariantLandingOption[];
  activeVariantId: string | null;
  collegeSlug: string;
  pillarSlug: string;
  courseId: string;
}

export function CourseVariantExplorer({
  masterCourseTitle,
  variants,
  activeVariantId,
  collegeSlug,
  pillarSlug,
  courseId,
}: CourseVariantExplorerProps) {
  if (variants.length === 0) {
    return null;
  }

  return (
    <div className="mt-16 pt-12 border-t border-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary font-heading">
            <Sparkles className="size-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Course paths</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground font-heading">
            Explore more variants of this course
          </h2>
          <p className="text-sm text-muted-foreground/70 font-medium leading-relaxed font-body">
            {masterCourseTitle} is offered in multiple program paths. Open another variant to see its
            curriculum.
          </p>
        </div>
        <Badge
          variant="outline"
          className="rounded-full px-4 py-1.5 font-bold border-primary/20 bg-primary/5 text-primary shrink-0 self-start sm:self-center"
        >
          {variants.length} variant{variants.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="space-y-4">
        {variants.map((variant, index) => {
          const href = buildPillarCourseDetailHref(
            collegeSlug,
            pillarSlug,
            courseId,
            variant.variantId,
          );
          const isActive = activeVariantId === variant.variantId;

          return (
            <Link
              key={variant.variantId}
              href={href}
              className={cn(
                'group block relative rounded-[2rem] border bg-card',
                'hover:border-primary/30 transition-[box-shadow,border-color] duration-300',
                isActive
                  ? 'border-primary/40 ring-1 ring-primary/15'
                  : 'border-border/50',
              )}
            >
              <div className="p-6 md:p-8 flex items-start justify-between gap-6">
                <div className="flex gap-6 min-w-0">
                  <div className="size-12 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center shrink-0 font-black text-sm tabular-nums text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-[background-color,color,border-color] duration-300">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                        {variant.title}
                      </h3>
                      <Badge
                        variant="outline"
                        className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border-primary/20 bg-primary/5 text-primary"
                      >
                        Variant
                      </Badge>
                      {isActive && (
                        <Badge className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-primary text-primary-foreground">
                          Viewing
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground/60">{variant.code}</p>
                    {variant.description ? (
                      <p className="text-sm text-muted-foreground leading-relaxed font-medium line-clamp-2">
                        {variant.description}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground/70 leading-relaxed font-medium italic line-clamp-2">
                        A curated lesson path for your program.
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <Layers className="size-3.5 text-primary/60" />
                        <span>{variant.moduleCount} Modules</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <Video className="size-3.5 text-primary/60" />
                        <span>{variant.videoCount} Videos</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary/80 group-hover:text-primary transition-colors">
                        <span>{isActive ? 'Current path' : 'View curriculum'}</span>
                        <ArrowRight className="size-3" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex shrink-0 opacity-0 group-hover:opacity-100 transition-[opacity,transform] duration-300 translate-x-4 group-hover:translate-x-0">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <ChevronRight className="size-6" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
