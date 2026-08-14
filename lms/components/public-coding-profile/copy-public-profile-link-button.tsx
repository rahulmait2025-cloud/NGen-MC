'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildPublicProfilePath } from '@/lib/profile/public-profile-url';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CopyPublicProfileLinkButtonProps {
  username: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
  showLabel?: boolean;
  className?: string;
}

function copyWithTextareaFallback(value: string): boolean {
  if (typeof document === 'undefined') return false;

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';

  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, value.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    if (textarea.parentNode) {
      document.body.removeChild(textarea);
    }
  }

  return copied;
}

export function CopyPublicProfileLinkButton({
  username,
  variant = 'outline',
  size = 'sm',
  showLabel = true,
  className,
}: CopyPublicProfileLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = async () => {
    if (isCopying || !username || !username.trim()) return;

    setIsCopying(true);
    const normalizedUsername = username.trim().toLowerCase();
    const publicUrl = new URL(
      buildPublicProfilePath(normalizedUsername),
      window.location.origin,
    ).toString();

    let success = false;

    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(publicUrl);
        success = true;
      } catch {
        success = copyWithTextareaFallback(publicUrl);
      }
    } else {
      success = copyWithTextareaFallback(publicUrl);
    }

    setIsCopying(false);

    if (success) {
      setCopied(true);
      toast.success('Profile link copied!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Could not copy the profile link.');
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      disabled={isCopying}
      aria-label="Share public coding profile link"
      className={cn(
        'gap-1.5 font-bold rounded-xl shrink-0 cursor-pointer transition-all duration-150 active:scale-95 shadow-2xs hover:shadow-xs',
        copied ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : '',
        className
      )}
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-500 shrink-0 animate-in zoom-in-50 duration-200" />
      ) : (
        <Share2 className="size-3.5 shrink-0 transition-transform group-hover:scale-110" />
      )}
      {showLabel ? <span>{copied ? 'Link Copied!' : 'Share Profile'}</span> : null}
    </Button>
  );
}
