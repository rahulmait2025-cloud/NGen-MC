import { BarChart3 } from 'lucide-react';
import { BentoCard } from './bento-card';

export function LearningEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <BentoCard>
      <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
        <div className="mb-5 rounded-full bg-muted p-4">
          <BarChart3 className="size-7 text-muted-foreground/30" />
        </div>
        <h3 className="text-sm font-semibold text-muted">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p>
      </div>
    </BentoCard>
  );
}
