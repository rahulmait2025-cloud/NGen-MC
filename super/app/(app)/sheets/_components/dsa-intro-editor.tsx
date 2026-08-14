'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Eye, Pencil } from 'lucide-react';
import { MarkdownRenderer } from '@/components/shared/markdown-renderer';
import * as actions from '../actions';
import { toast } from 'sonner';

interface Props {
  sheetId: string;
  initialMarkdown: string;
}

export function DsaIntroEditor({ sheetId, initialMarkdown }: Props) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await actions.updateSheetIntro(sheetId, markdown);
      setHasChanges(false);
      toast.success('Intro content updated');
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  }, [sheetId, markdown]);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Intro Content</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Markdown content displayed above the problem table for students
          </p>
        </div>
        {hasChanges && (
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <div className="size-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Save
          </Button>
        )}
      </div>

      <Tabs defaultValue="edit" className="p-0">
        <div className="px-6 pt-3">
          <TabsList className="h-8">
            <TabsTrigger value="edit" className="text-xs gap-1.5 px-3">
              <Pencil className="size-3" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs gap-1.5 px-3">
              <Eye className="size-3" />
              Preview
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="edit" className="px-6 pb-6 pt-3">
          <Textarea
            value={markdown}
            onChange={(e) => {
              setMarkdown(e.target.value);
              setHasChanges(true);
            }}
            placeholder="Write your intro content in Markdown..."
            className="min-h-[200px] font-mono text-sm resize-y"
          />
        </TabsContent>

        <TabsContent value="preview" className="px-6 pb-6 pt-3">
          <div className="border border-border/50 rounded-lg p-4 min-h-[200px] bg-muted/10">
            {markdown ? (
              <MarkdownRenderer content={markdown} />
            ) : (
              <p className="text-muted-foreground text-sm italic">
                Nothing to preview yet. Write some markdown in the Edit tab.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
