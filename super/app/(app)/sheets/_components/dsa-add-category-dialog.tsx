'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, color: string) => void;
}

const COLORS: { name: string; hex: string }[] = [
  { name: 'primary', hex: 'var(--primary)' },
  { name: 'blue-600', hex: '#2563eb' },
  { name: 'violet-600', hex: '#7c3aed' },
  { name: 'amber-600', hex: '#d97706' },
  { name: 'emerald-600', hex: '#059669' },
  { name: 'rose-600', hex: '#e11d48' },
  { name: 'cyan-600', hex: '#0891b2' },
  { name: 'orange-600', hex: '#ea580c' },
  { name: 'teal-600', hex: '#0d9488' },
  { name: 'pink-600', hex: '#db2777' },
  { name: 'indigo-600', hex: '#4f46e5' },
  { name: 'lime-600', hex: '#65a30d' },
  { name: 'yellow-600', hex: '#ca8a04' },
  { name: 'fuchsia-600', hex: '#c026d3' },
  { name: 'sky-600', hex: '#0284c7' },
  { name: 'red-600', hex: '#dc2626' },
];

export function DsaAddCategoryDialog({ open, onOpenChange, onAdd }: Props) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('primary');

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setName('');
      setColor('primary');
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      onAdd(name.trim(), color);
    },
    [name, color, onAdd]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Category</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Category Name *</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Arrays, Strings, Trees"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className={`size-8 rounded-full border-2 transition-[border-color,transform] ease-[var(--ease-out)] ${
                    color === c.name
                      ? 'border-foreground scale-110'
                      : 'border-transparent [@media(hover:hover)_and_(pointer:fine)]:hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => setColor(c.name)}
                >
                  <span className="sr-only">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Add Category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
