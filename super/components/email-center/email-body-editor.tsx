'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading2,
  Link2,
  Minus,
  Undo2,
  Redo2,
  RemoveFormatting,
} from 'lucide-react';

interface EmailBodyEditorProps {
  value: string;
  onChange: (html: string, text: string) => void;
  onInsertRequest?: (insert: (text: string) => void) => void;
  placeholder?: string;
}

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export function EmailBodyEditor({
  value,
  onChange,
  onInsertRequest,
  placeholder = 'Write your email…',
}: EmailBodyEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef(value);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value !== lastHtmlRef.current && value !== el.innerHTML) {
      el.innerHTML = value || '';
      lastHtmlRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (!onInsertRequest) return;
    onInsertRequest((text) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      exec('insertText', text);
      const html = el.innerHTML;
      const plain = el.innerText || '';
      lastHtmlRef.current = html;
      onChange(html, plain);
    });
  }, [onInsertRequest, onChange]);

  const emitChange = () => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    const plain = el.innerText || '';
    lastHtmlRef.current = html;
    onChange(html, plain);
  };

  const run = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    exec(command, commandValue);
    emitChange();
  };

  const addLink = () => {
    const url = window.prompt('Enter https:// URL');
    if (!url) return;
    if (!/^https:\/\//i.test(url.trim())) {
      window.alert('Only https:// links are allowed.');
      return;
    }
    run('createLink', url.trim());
  };

  return (
    <div className="rounded-md border border-border">
      <div className="flex flex-wrap gap-1 border-b border-border bg-muted/40 p-2">
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => run('bold')} title="Bold">
          <Bold className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => run('italic')} title="Italic">
          <Italic className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => run('underline')} title="Underline">
          <Underline className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => run('formatBlock', 'h2')} title="Heading">
          <Heading2 className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => run('insertUnorderedList')} title="Bulleted list">
          <List className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => run('insertOrderedList')} title="Numbered list">
          <ListOrdered className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={addLink} title="Link">
          <Link2 className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => run('insertHorizontalRule')} title="Divider">
          <Minus className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => run('undo')} title="Undo">
          <Undo2 className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => run('redo')} title="Redo">
          <Redo2 className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => run('removeFormat')} title="Clear formatting">
          <RemoveFormatting className="size-4" />
        </Button>
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-label="Email body"
        contentEditable
        suppressContentEditableWarning
        className="min-h-[240px] max-h-[480px] overflow-y-auto px-3 py-3 text-sm leading-relaxed outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain');
          exec('insertText', text);
          emitChange();
        }}
      />
    </div>
  );
}
