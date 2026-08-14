'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  filter: 'all' | 'todo' | 'done' | 'favorites';
  onFilterChange: (filter: 'all' | 'todo' | 'done' | 'favorites') => void;
  difficultyFilter: 'all' | 'easy' | 'medium' | 'hard';
  onDifficultyFilterChange: (difficulty: 'all' | 'easy' | 'medium' | 'hard') => void;
  search: string;
  onSearchChange: (search: string) => void;
}

const filters = [
  { key: 'all' as const, label: 'All' },
  { key: 'todo' as const, label: 'To Do' },
  { key: 'done' as const, label: 'Done' },
  { key: 'favorites' as const, label: 'Revision' },
];

export function DsaFilterBar({
  filter,
  onFilterChange,
  difficultyFilter,
  onDifficultyFilterChange,
  search,
  onSearchChange,
}: Props) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border/80 rounded-2xl p-2.5 sm:p-3 shadow-2xs font-sans">
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Filter Group */}
        <div className="p-1 bg-muted/80 border border-border/60 rounded-xl flex items-center gap-1">
          {filters.map((f) => {
            const isActive = filter === f.key;
            return (
              <Button
                key={f.key}
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 px-3.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer',
                  isActive
                    ? 'bg-primary text-primary-foreground font-bold shadow-sm shadow-primary/20 scale-[1.02]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                )}
                onClick={() => onFilterChange(f.key)}
              >
                {f.key === 'favorites' && (
                  <Star className={cn('w-3.5 h-3.5 mr-1.5', isActive ? 'fill-primary-foreground text-primary-foreground' : 'text-amber-400')} />
                )}
                {f.label}
              </Button>
            );
          })}
        </div>

        {/* Vertical Divider */}
        <div className="h-5 w-px bg-border/60 hidden sm:block" />

        {/* Difficulty Filter Group */}
        <div className="p-1 bg-muted/80 border border-border/60 rounded-xl flex items-center gap-1">
          {([
            { key: 'easy', label: 'Easy', activeStyle: 'bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-600/20' },
            { key: 'medium', label: 'Medium', activeStyle: 'bg-amber-600 text-white font-bold shadow-sm shadow-amber-600/20' },
            { key: 'hard', label: 'Hard', activeStyle: 'bg-rose-600 text-white font-bold shadow-sm shadow-rose-600/20' },
          ] as const).map((d) => {
            const isActive = difficultyFilter === d.key;
            return (
              <Button
                key={d.key}
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 px-3.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer',
                  isActive
                    ? `${d.activeStyle} scale-[1.02]`
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                )}
                onClick={() => {
                  onDifficultyFilterChange(isActive ? 'all' : d.key);
                }}
              >
                {d.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Search Input Box */}
      <div className="relative w-full md:w-64 shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search problems..."
          className="pl-9 pr-8 h-9 text-xs font-medium bg-background border-input text-foreground rounded-xl focus-visible:ring-2 focus-visible:ring-primary/30 shadow-2xs placeholder:text-muted-foreground/60"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
