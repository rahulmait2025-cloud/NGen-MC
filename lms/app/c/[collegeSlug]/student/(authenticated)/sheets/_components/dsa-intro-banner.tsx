'use client';

import React, { useState, useCallback } from 'react';
import { MarkdownRenderer } from '@/components/student/markdown-renderer';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  markdown: string;
}

export function DsaIntroBanner({ markdown }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldTruncate, setShouldTruncate] = useState(false);

  const contentRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    // Check if content exceeds 130px (approx 3-4 lines of rendered markdown)
    setShouldTruncate(node.scrollHeight > 130);
  }, []);

  if (!markdown || !markdown.trim()) return null;

  return (
    <div className="relative rounded-2xl border border-primary/20 bg-card p-5 sm:p-6 shadow-2xs font-sans transition-all duration-300">
      {/* Content wrapper with max-height truncation */}
      <div
        key={markdown}
        ref={contentRef}
        className={cn(
          'relative transition-all duration-300 ease-in-out overflow-hidden',
          shouldTruncate && !isExpanded ? 'max-h-[120px]' : 'max-h-none'
        )}
      >
        <MarkdownRenderer content={markdown} />

        {/* Gradient fade overlay when collapsed */}
        {shouldTruncate && !isExpanded && (
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Read More / Show Less Toggle Button */}
      {shouldTruncate && (
        <div className={cn('flex items-center justify-start mt-2', !isExpanded && 'pt-1')}>
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/90 px-3.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/20 transition-all duration-150 cursor-pointer shadow-2xs"
          >
            <span>{isExpanded ? 'Show Less' : 'Read More'}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-primary" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-primary" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
