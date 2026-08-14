'use client';

import { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MarkdownResourceEditorProps {
  initialTitle?: string;
  initialContent?: string;
  onSave: (title: string, content: string) => Promise<void>;
  onCancel?: () => void;
  saveLabel?: string;
}

export function MarkdownResourceEditor({
  initialTitle = '',
  initialContent = '',
  onSave,
  onCancel,
  saveLabel = 'Save',
}: MarkdownResourceEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      await onSave(title.trim(), content);
    } finally {
      setIsSaving(false);
    }
  }, [title, content, onSave]);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Resource title"
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Markdown Content</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="# Heading&#10;&#10;Write your notes in Markdown..."
          rows={12}
          className="font-mono text-sm resize-y"
        />
        <p className="text-[10px] text-muted-foreground">
          Supports GFM syntax: **bold**, *italic*, `code`, tables, checklists, links.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!title.trim() || isSaving}
          onClick={handleSave}
        >
          {isSaving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
          {saveLabel}
        </Button>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
