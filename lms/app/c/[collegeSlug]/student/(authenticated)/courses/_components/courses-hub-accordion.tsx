'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AccordionItem({
  question,
  answer,
  tag,
}: {
  question: string;
  answer: string;
  tag: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={cn(
        'border-border/60 bg-card rounded-2xl transition-[border-color,box-shadow] duration-200',
        isOpen && 'border-primary/30',
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-4 p-6 text-left"
      >
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">{tag}</span>
          <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">{question}</h3>
        </div>
        <div
          className={cn(
            'size-8 rounded-full bg-muted flex items-center justify-center shrink-0 transition-transform duration-200 ease-out',
            isOpen && 'rotate-180 bg-primary/10 text-primary',
          )}
        >
          <ChevronDown className="size-5" />
        </div>
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
          isOpen ? 'grid-rows-[1fr] opacity-100 p-6 pt-0' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <p className="text-[15px] sm:text-base font-medium leading-[1.7] text-foreground/80 border-t border-border/40 pt-4">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}
