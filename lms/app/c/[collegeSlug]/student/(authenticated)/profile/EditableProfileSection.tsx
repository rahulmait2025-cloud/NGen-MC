'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Check,
  X,
  Loader2,
  HelpCircle,
  User,
  Mail,
  GraduationCap,
  Calendar,
  MapPin,
  Shield,
  Github,
  Linkedin,
  FileText,
  Pencil,
} from 'lucide-react';
import { updateStudentProfile } from '@/lib/actions/profile';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const IconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  User,
  Mail,
  GraduationCap,
  Calendar,
  MapPin,
  Shield,
  Github,
  Linkedin,
  FileText,
};

function IconRenderer({ name, className }: { name: string; className?: string }) {
  const Icon = IconMap[name] || HelpCircle;
  return <Icon className={className} />;
}

interface Field {
  label: string;
  key: string;
  value: string | null;
  icon: string;
  editable?: boolean;
  type?: string;
  placeholder?: string;
  capitalize?: boolean;
  isLink?: boolean;
  maxLength?: number;
}

interface EditableProfileSectionProps {
  title: string;
  icon: string;
  fields: Field[];
  collegeId: string;
  collegeSlug: string;
  sectionId?: string;
}

export function EditableProfileSection({
  title,
  icon: _icon,
  fields,
  collegeId,
  collegeSlug,
  sectionId,
}: EditableProfileSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const getInitialData = useCallback(() => {
    const initial: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.editable) {
        initial[f.key] = f.value ?? '';
      }
    });
    return initial;
  }, [fields]);

  const [formData, setFormData] = useState<Record<string, string>>(getInitialData);
  const prevFieldsKey = useRef(fields);

  if (!isEditing && fields !== prevFieldsKey.current) {
    prevFieldsKey.current = fields;
    setFormData(getInitialData());
  }

  const handleSave = async () => {
    setIsPending(true);
    try {
      const currentData = { ...formData };

      fields.forEach((f) => {
        if (f.editable && f.isLink) {
          const trimmed = currentData[f.key]?.trim() || '';
          if (trimmed && !/^https?:\/\//i.test(trimmed)) {
            currentData[f.key] = `https://${trimmed}`;
          }
        }
      });

      const result = await updateStudentProfile(collegeId, { ...currentData, collegeSlug });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Updated successfully');
        setIsEditing(false);
      }
    } catch (error) {
      console.error('[EditableProfileSection] Error:', error);
      toast.error('Could not save profile. Try again.');
    } finally {
      setIsPending(false);
    }
  };

  const handleCancel = () => {
    setFormData(getInitialData());
    setIsEditing(false);
  };

  return (
    <div id={sectionId} className="scroll-mt-24 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
        {!isEditing ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Info
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isPending}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending}
              className="h-8 gap-1 bg-amber-700 hover:bg-amber-800 text-white font-medium shadow-xs"
            >
              {isPending ? (
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

      <div className="space-y-1">
        {fields.map((field) => (
          <div
            key={field.label}
            className={cn(
              'group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition duration-200',
              'hover:bg-secondary/40',
              isEditing && field.editable
                ? 'border-amber-700/20 bg-amber-700/[0.03]'
                : '',
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/80 text-muted-foreground group-hover:bg-amber-700/10 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors duration-200">
              <IconRenderer
                name={field.icon}
                className="h-4 w-4 transition-colors"
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground block">
                {field.label}
              </span>
              {isEditing && field.editable ? (
                <Input
                  value={formData[field.key] ?? ''}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  placeholder={field.placeholder || `Enter ${field.label}`}
                  maxLength={field.maxLength}
                  className="h-8 text-sm mt-1 border-amber-700/30 bg-background/50 focus-visible:ring-amber-700/20 focus-visible:border-amber-700"
                  disabled={isPending}
                />
              ) : (
                <p
                  className={cn(
                    'mt-0.5 text-sm font-semibold text-foreground truncate',
                    field.capitalize && 'capitalize',
                    !(field.editable ? formData[field.key] : field.value) && 'text-muted-foreground font-normal',
                  )}
                >
                  {(field.editable ? (formData[field.key] || field.value) : field.value) || field.placeholder || '—'}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
