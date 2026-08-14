'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, File, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ResourceUploadDropzoneProps {
  accept: '.pdf' | '.md,.txt';
  maxSizeMB: number;
  onUpload: (file: File, title: string) => Promise<void>;
  onCancel?: () => void;
}

const ACCEPT_MAP = {
  '.pdf': '.pdf,application/pdf',
  '.md,.txt': '.md,.txt,text/markdown,text/plain',
} as const;

export function ResourceUploadDropzone({
  accept,
  maxSizeMB,
  onUpload,
  onCancel,
}: ResourceUploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (!selected) return;

      setError(null);

      if (selected.size > maxSizeMB * 1024 * 1024) {
        setError(`File size must be under ${maxSizeMB}MB`);
        return;
      }

      const ext = selected.name.split('.').pop()?.toLowerCase();
      const allowedExts = accept.split(',').map((a) => a.replace('.', '').trim());
      if (ext && !allowedExts.includes(ext)) {
        setError(`Only ${accept} files are allowed`);
        return;
      }

      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ''));
      }
    },
    [accept, maxSizeMB, title],
  );

  const handleUpload = useCallback(async () => {
    if (!file || !title.trim()) return;
    setIsUploading(true);
    try {
      await onUpload(file, title.trim());
    } finally {
      setIsUploading(false);
    }
  }, [file, title, onUpload]);

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

      {!file ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border/60 bg-muted/20 p-6 text-center transition-colors hover:border-primary/40 hover:bg-muted/40"
        >
          <Upload className="size-6 text-muted-foreground" />
          <div className="text-xs font-medium text-muted-foreground">
            Click to select {accept} file (max {maxSizeMB}MB)
          </div>
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
          {file.name.endsWith('.pdf') ? (
            <File className="size-5 text-red-500" />
          ) : (
            <FileText className="size-5 text-blue-500" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{file.name}</p>
            <p className="truncate text-[10px] text-muted-foreground">
              {(file.size / 1024).toFixed(0)}KB
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            className="size-7"
            onClick={() => {
              setFile(null);
              setError(null);
            }}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_MAP[accept]}
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload resource file"
      />

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!file || !title.trim() || isUploading}
          onClick={handleUpload}
        >
          {isUploading && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
          Upload
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
