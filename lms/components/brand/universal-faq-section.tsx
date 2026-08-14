'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FaqItemData {
  q: string;
  a: string;
  tag?: string;
}

export interface UniversalFaqSectionProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  items: FaqItemData[];
  className?: string;
  id?: string;
}

function UniversalFaqAccordionItem({ item }: { item: FaqItemData }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--landing-border)] bg-[color-mix(in_oklab,var(--landing-fg)_2%,var(--landing-card))] transition-all duration-200',
        isOpen && 'border-[var(--landing-orange)]/40 shadow-sm'
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6 cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex flex-col gap-1.5">
          {item.tag && (
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--landing-orange)]">
              {item.tag}
            </span>
          )}
          <h3 className="text-base font-bold leading-snug landing-heading sm:text-lg">
            {item.q}
          </h3>
        </div>
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--landing-fg)_6%,var(--landing-card))] transition-transform duration-200 ease-out',
            isOpen && 'rotate-180 bg-[var(--landing-orange)]/15 text-[var(--landing-orange)]'
          )}
        >
          <ChevronDown className="size-4" />
        </div>
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
          isOpen ? 'grid-rows-[1fr] opacity-100 p-5 pt-0 sm:p-6 sm:pt-0' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <p className="border-t border-[var(--landing-border)]/60 pt-4 text-[15px] font-medium leading-[1.7] text-[color-mix(in_oklab,var(--landing-fg)_85%,var(--landing-muted))] sm:text-base">
            {item.a}
          </p>
        </div>
      </div>
    </div>
  );
}

export function UniversalFaqSection({
  eyebrow = 'FAQ',
  title = 'Last checks before choosing.',
  description = 'Short answers only. The goal is to remove doubts, not add another section to study.',
  items,
  className,
  id = 'faq',
}: UniversalFaqSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'border-t border-[var(--landing-border)] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 gsap-reveal',
        className
      )}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-12">
        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--landing-orange)]/25 bg-[var(--landing-orange)]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--landing-orange)]">
            <HelpCircle className="size-3.5" />
            {eyebrow}
          </span>
          <h2 className="text-balance text-3xl font-bold tracking-tight landing-heading sm:text-4xl lg:text-5xl">
            {title}
          </h2>
          {description && (
            <p className="max-w-md text-pretty text-base leading-relaxed landing-muted">
              {description}
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-3 sm:p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="space-y-3 gsap-stagger-item">
            {items.map((item) => (
              <UniversalFaqAccordionItem key={item.q} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
