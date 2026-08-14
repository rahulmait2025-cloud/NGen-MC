'use client';

import { Rocket, Timer, GraduationCap, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LessonItemPlaceholderProps {
  type: 'quiz' | 'assignment' | 'live' | 'unknown';
  title?: string;
}

const CONFIG = {
  quiz: {
    icon: Timer,
    label: 'Interactive Quiz',
    description: 'A knowledge assessment will be available here soon to help you master this topic.',
    color: 'text-primary bg-primary/10'
  },
  assignment: {
    icon: GraduationCap,
    label: 'Assignment',
    description: 'A hands-on assignment is being prepared for this module. Stay tuned!',
    color: 'text-indigo-500 bg-indigo-500/10'
  },
  live: {
    icon: Video,
    label: 'Live Class',
    description: 'This is a scheduled live session. Join links will appear here before the class starts.',
    color: 'text-destructive bg-destructive/10'
  },
  unknown: {
    icon: Rocket,
    label: 'Coming Soon',
    description: 'New content is on its way. We are working hard to bring you the best learning experience.',
    color: 'text-primary bg-primary/10'
  }
};

export function LessonItemPlaceholder({ type, title }: LessonItemPlaceholderProps) {
  const config = CONFIG[type] || CONFIG.unknown;
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 md:p-16 text-center animate-in fade-in zoom-in duration-300">
      <div className={cn(
        "size-24 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl transition-transform duration-200 ease-out hover:scale-110 active:scale-95 rotate-3",
        config.color
      )}>
        <Icon className="size-10" />
      </div>
      
      <div className="max-w-md space-y-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            {title || config.label}
          </h2>
        </div>
        
        <p className="text-base text-muted-foreground font-medium leading-relaxed">
          {config.description}
        </p>
      </div>
    </div>
  );
}
