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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { DsaProblem } from '@/types/dsa';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  problem?: DsaProblem;
  onAdd: (data: {
    name: string;
    difficulty: string;
    lc_url: string;
    yt_url: string;
    resource_url: string;
    notes: string;
  }) => void;
}

export function DsaAddEditProblemDialog({ open, onOpenChange, problem, onAdd }: Props) {
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [lcUrl, setLcUrl] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (open) {
      if (problem) {
        setName(problem.name || '');
        setDifficulty(problem.difficulty || 'Medium');
        setLcUrl(problem.lc_url || '');
        setYtUrl(problem.yt_url || '');
        setResourceUrl(problem.resource_url || '');
        setNotes(problem.notes || '');
      } else {
        setName('');
        setDifficulty('Medium');
        setLcUrl('');
        setYtUrl('');
        setResourceUrl('');
        setNotes('');
      }
    }
  }, [open, problem]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      onAdd({
        name: name.trim(),
        difficulty,
        lc_url: lcUrl.trim(),
        yt_url: ytUrl.trim(),
        resource_url: resourceUrl.trim(),
        notes: notes.trim(),
      });
    },
    [name, difficulty, lcUrl, ytUrl, resourceUrl, notes, onAdd]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{problem ? 'Edit Problem' : 'Add Problem'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="problem-name">Problem Name *</Label>
            <Input
              id="problem-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Two Sum"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Difficulty</Label>
            <RadioGroup
              value={difficulty}
              onValueChange={setDifficulty}
              className="flex gap-4"
            >
              {['Easy', 'Medium', 'Hard'].map((d) => (
                <div key={d} className="flex items-center gap-2">
                  <RadioGroupItem value={d} id={`diff-${d}`} />
                  <Label
                    htmlFor={`diff-${d}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {d}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lc-url">LeetCode URL</Label>
            <Input
              id="lc-url"
              value={lcUrl}
              onChange={(e) => setLcUrl(e.target.value)}
              placeholder="https://leetcode.com/problems/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="yt-url">YouTube URL</Label>
            <Input
              id="yt-url"
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource-url">Resource URL</Label>
            <Input
              id="resource-url"
              value={resourceUrl}
              onChange={(e) => setResourceUrl(e.target.value)}
              placeholder="GitHub image or Excalidraw URL"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Quick solution hint or approach..."
              rows={2}
            />
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
              {problem ? 'Save Changes' : 'Add Problem'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
