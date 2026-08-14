'use client';

import React, { useState, useRef } from 'react';
import {
  Github,
  Linkedin,
  FileText,
  ExternalLink,
  Pencil,
  Check,
  X,
  Loader2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateStudentProfile } from '@/lib/actions/profile';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type LinkItem = {
  key: string;
  label: string;
  platform: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string | null;
  placeholder: string;
};

const LINK_ITEMS: LinkItem[] = [
  {
    key: 'github_url',
    label: 'GitHub',
    platform: 'github.com',
    icon: Github,
    value: null,
    placeholder: 'https://github.com/username',
  },
  {
    key: 'linkedin_url',
    label: 'LinkedIn',
    platform: 'linkedin.com',
    icon: Linkedin,
    value: null,
    placeholder: 'https://linkedin.com/in/username',
  },
  {
    key: 'resume_url',
    label: 'Resume',
    platform: 'Google Drive',
    icon: FileText,
    value: null,
    placeholder: 'https://drive.google.com/file/d/…/view',
  },
];

function linkLabel(value: string, key: string): string {
  if (key === 'github_url') return 'View on GitHub';
  if (key === 'linkedin_url') return 'View on LinkedIn';
  if (key === 'resume_url') return 'View on Google Drive';
  try {
    const host = new URL(value).hostname.replace(/^www\./, '');
    return host;
  } catch {
    return 'Open link';
  }
}

function normalizeUrl(url: string, key: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (key === 'github_url') {
    const fromUrl = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_-]+)\/?$/i);
    if (fromUrl) return `https://github.com/${fromUrl[1]}`;
    const username = trimmed.replace(/^@/, '');
    if (/^[A-Za-z0-9_-]+$/.test(username)) return `https://github.com/${username}`;
  }
  if (trimmed && !/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

type PortfolioLinksProps = {
  fields: { key: string; value: string | null }[];
  collegeId: string;
  collegeSlug: string;
};

export function PortfolioLinks({ fields, collegeId, collegeSlug }: PortfolioLinksProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string | null>>(
    () => Object.fromEntries(fields.map((f) => [f.key, f.value]))
  );
  const [formData, setFormData] = useState<Record<string, string>>({});

  const prevFieldsRef = useRef(fields);
  if (fields !== prevFieldsRef.current) {
    prevFieldsRef.current = fields;
    setFieldValues(Object.fromEntries(fields.map((f) => [f.key, f.value])));
  }

  const items = LINK_ITEMS.map((item) => ({
    ...item,
    value: fieldValues[item.key] ?? null,
  }));

  const handleStartEdit = () => {
    const initial: Record<string, string> = {};
    items.forEach((item) => {
      initial[item.key] = item.value || '';
    });
    setFormData(initial);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({});
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = { collegeSlug };
      const newFieldValues = { ...fieldValues };

      items.forEach((item) => {
        const raw = formData[item.key] ?? '';
        const normalized = normalizeUrl(raw, item.key);
        payload[item.key] = normalized || '';
        newFieldValues[item.key] = normalized || null;
      });

      const result = await updateStudentProfile(collegeId, payload);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Portfolio links updated');
        setIsEditing(false);
        setFieldValues(newFieldValues);
      }
    } catch {
      toast.error('Could not save portfolio links. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Header with Universal Save Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Portfolio Links</h2>
        {!isEditing ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartEdit}
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Links
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={saving}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-8 gap-1 bg-amber-700 hover:bg-amber-800 text-white font-medium shadow-xs"
            >
              {saving ? (
                <div className="animate-spin"><Loader2 className="h-4 w-4" /></div>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Links List */}
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const hasValue = Boolean(item.value);

          return (
            <div
              key={item.key}
              className={cn(
                'group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors duration-200',
                isEditing
                  ? 'border-amber-700/20 bg-amber-700/[0.03]'
                  : 'hover:bg-secondary/40',
              )}
            >
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
                  hasValue
                    ? 'bg-muted text-foreground'
                    : 'bg-muted/50 text-muted-foreground group-hover:bg-amber-700/10 group-hover:text-amber-700 dark:group-hover:text-amber-400',
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block">
                  {item.label}
                </span>

                {isEditing ? (
                  item.key === 'github_url' ? (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <a
                        href="/api/integrations/github/connect"
                        className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-100 dark:text-zinc-900 transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-2xs"
                      >
                        <Github className="h-3.5 w-3.5" />
                        <span>{item.value ? 'Reconnect GitHub OAuth' : 'Connect GitHub OAuth'}</span>
                      </a>
                      <span className="text-[11px] text-muted-foreground">
                        {item.value ? 'OAuth Linked' : 'OAuth Required'}
                      </span>
                    </div>
                  ) : (
                    <Input
                      value={formData[item.key] ?? ''}
                      onChange={(e) =>
                        setFormData({ ...formData, [item.key]: e.target.value })
                      }
                      placeholder={item.placeholder}
                      className="h-8 text-sm mt-1 border-amber-700/30 bg-background/50 focus-visible:ring-amber-700/20 focus-visible:border-amber-700"
                      disabled={saving}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                        if (e.key === 'Escape') handleCancel();
                      }}
                    />
                  )
                ) : item.value ? (
                  <div className="mt-0.5 flex items-center gap-2">
                    <a
                      href={item.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md bg-amber-700/10 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300 transition-colors duration-200 hover:bg-amber-700 hover:text-white"
                    >
                      <span className="truncate">{linkLabel(item.value, item.key)}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                    </a>
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="text-muted-foreground hover:text-foreground transition-colors duration-150 p-1"
                      aria-label={`Edit ${item.label}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                ) : item.key === 'github_url' ? (
                  <a
                    href="/api/integrations/github/connect"
                    className="mt-0.5 inline-flex items-center gap-1 text-xs text-amber-800 dark:text-amber-400 font-semibold hover:underline transition-colors duration-150"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Connect GitHub OAuth</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="mt-0.5 inline-flex items-center gap-1 text-xs text-amber-800 dark:text-amber-400 font-semibold hover:underline transition-colors duration-150"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{item.placeholder}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
