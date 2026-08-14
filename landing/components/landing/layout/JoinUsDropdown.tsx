'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GraduationCap, Building2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackCtaClick } from '@/lib/analytics/track';

const STUDENT_PORTAL_URL =
  process.env.NEXT_PUBLIC_STUDENT_PORTAL_URL || 'https://nextgen-cto-lms-product-git-stage-next-gen-cto.vercel.app/';
const COLLEGE_ADMIN_URL =
  process.env.NEXT_PUBLIC_COLLEGE_ADMIN_URL || 'https://college-admin-nextgen.vercel.app/';

const JOIN_OPTIONS = [
  {
    label: 'Student Portal',
    description: 'Access courses & track progress',
    href: STUDENT_PORTAL_URL,
    icon: GraduationCap,
  },
  {
    label: 'College Admin',
    description: 'Manage your institution',
    href: COLLEGE_ADMIN_URL,
    icon: Building2,
  },
];

interface JoinUsDropdownProps {
  variant?: 'desktop' | 'mobile';
  buttonClassName?: string;
  activePersona?: string;
  onMobileClose?: () => void;
}

export function JoinUsDropdown({
  variant = 'desktop',
  buttonClassName,
  activePersona = 'Campus',
  onMobileClose,
}: JoinUsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  if (variant === 'mobile') {
    return (
      <div className="flex flex-col gap-3 w-full">
        <p className="text-sm font-semibold text-muted-foreground text-center mb-1">Login</p>
        {JOIN_OPTIONS.map((option) => (
          <Link
            key={option.label}
            href={option.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              trackCtaClick({
                cta_name: option.label === 'Student Portal' ? 'login_student' : 'login_college',
                cta_location: 'navbar',
                current_path: typeof window !== 'undefined' ? window.location.pathname : '',
              });
              onMobileClose?.();
            }}
            className={cn(
              'flex items-center gap-3 p-4 rounded-xl border transition-all',
              'bg-card hover:bg-muted border-border hover:border-primary/30',
              'group'
            )}
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <option.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{option.label}</p>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Button
        size="sm"
        className={cn(
          'rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 font-bold text-[13px] px-5 cursor-pointer border-0 gap-1.5',
          activePersona === 'Corporate'
            ? 'bg-foreground text-background shadow-lg shadow-foreground/20 hover:shadow-foreground/40'
            : 'bg-gradient-to-r from-primary to-orange-600 text-white shadow-lg shadow-primary/20 hover:shadow-primary/40',
          buttonClassName
        )}
      >
        Login
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', isOpen && 'rotate-180')} />
      </Button>

      <div
        className={cn(
          'absolute top-full right-0 w-64 pt-2 transition-all duration-200 z-50',
          isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
        )}
      >
        <div className="rounded-xl border border-border bg-card shadow-xl overflow-hidden p-2">
          {JOIN_OPTIONS.map((option, index) => (
            <Link
              key={option.label}
              href={option.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackCtaClick({
                  cta_name: option.label === 'Student Portal' ? 'login_student' : 'login_college',
                  cta_location: 'navbar',
                  current_path: typeof window !== 'undefined' ? window.location.pathname : '',
                })
              }
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg transition-all group',
                'hover:bg-muted',
                index > 0 && 'mt-1'
              )}
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                <option.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{option.label}</p>
                <p className="text-xs text-muted-foreground truncate">{option.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
