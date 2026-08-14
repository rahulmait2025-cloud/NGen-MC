'use client';

import { useState, useEffect, useCallback, useTransition, useReducer, useRef } from 'react';
import { Users, Loader2, CheckCircle2, AlertCircle, Info, ShieldAlert, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { assignPillarToCollegesAction, getPillarDiagnosticInfoAction } from '@/app/(app)/master-courses/actions';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import type { PillarAssignmentResult } from '@/lib/services/pillar-assignments';
import type { PillarDiagnosticInfo } from '@/lib/services/master-course-pillars';

interface College {
  id: string;
  name: string;
  slug: string;
}

interface AssignPillarDialogProps {
  pillarId: string;
  pillarTitle: string;
  trigger?: React.ReactNode;
}

type PillarDialogDataState = {
  colleges: College[];
  diagnostic: PillarDiagnosticInfo | null;
};
type PillarDialogDataAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_END'; colleges: College[]; diagnostic: PillarDiagnosticInfo | null };

function pillarDialogDataReducer(state: PillarDialogDataState, action: PillarDialogDataAction): PillarDialogDataState {
  switch (action.type) {
    case 'LOAD_START': return state;
    case 'LOAD_END': return { colleges: action.colleges, diagnostic: action.diagnostic };
  }
}

interface AssignmentResultViewProps {
  result: PillarAssignmentResult;
  pillarTitle: string;
  onClose: () => void;
}

function AssignmentResultView({ result, pillarTitle, onClose }: AssignmentResultViewProps) {
  return (
    <>
      <DialogHeader className="space-y-3 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <CheckCircle className="size-6" />
          </div>
          <div>
            <DialogTitle className="text-xl font-semibold tracking-tight">Assignment Complete</DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground">
              {pillarTitle}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="py-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
            <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/60 mb-1">Colleges</p>
            <p className="text-xl font-semibold leading-none">{result.collegesProcessed}</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
            <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/60 mb-1">Eligible Courses</p>
            <p className="text-xl font-semibold leading-none">{result.coursesEligible}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 dark:bg-emerald-500/10 dark:border-emerald-500/20">
            <span className="text-muted-foreground font-medium">New Assignments</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">{result.assignmentsCreated}</span>
          </div>
          <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-blue-500/5 border border-blue-500/10 dark:bg-blue-500/10 dark:border-blue-500/20">
            <span className="text-muted-foreground font-medium">Already Existed</span>
            <span className="font-semibold text-blue-700 dark:text-blue-400">{result.alreadyExisting}</span>
          </div>
          {result.skippedCourses.length > 0 && (
            <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 dark:bg-amber-500/10 dark:border-amber-500/20">
              <span className="text-muted-foreground font-medium">Courses Skipped</span>
              <span className="font-semibold text-amber-700 dark:text-amber-400">{result.skippedCourses.length}</span>
            </div>
          )}
        </div>

        {result.failedColleges.length > 0 && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 flex gap-2">
            <ShieldAlert className="size-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-destructive">Failures Detected</p>
              <p className="text-[11px] font-semibold text-destructive/80">
                {result.failedColleges.length} colleges had issues. Check logs for details.
              </p>
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="pt-4 border-t border-border/50">
        <Button onClick={onClose} className="w-full font-semibold">
          Close
        </Button>
      </DialogFooter>
    </>
  );
}

export function AssignPillarDialog({ pillarId, pillarTitle, trigger }: AssignPillarDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [{ colleges, diagnostic }, dispatchData] = useReducer(pillarDialogDataReducer, { colleges: [] as College[], diagnostic: null } as PillarDialogDataState);
  const [selectedCollegeIds, setSelectedCollegeIds] = useState<string[]>([]);
  const [result, setResult] = useState<PillarAssignmentResult | null>(null);

  const prevOpen = useRef(open);
  if (!open && prevOpen.current) {
    setResult(null);
  }
  prevOpen.current = open;

  const [isLoading, dispatchLoading] = useReducer(
    (state: boolean, action: 'LOAD_START' | 'LOAD_END') => action === 'LOAD_START' ? true : false,
    true
  );

  const loadData = useCallback(async () => {
    dispatchLoading('LOAD_START');
    try {
      const supabase = createClient();
      const [collegesRes, diagnosticRes] = await Promise.all([
        supabase.from('colleges').select('id, name, slug').eq('status', 'active').order('name'),
        getPillarDiagnosticInfoAction(pillarId)
      ]);
      
      if (collegesRes.error) throw collegesRes.error;
      dispatchData({
        type: 'LOAD_END',
        colleges: (collegesRes.data || []) as College[],
        diagnostic: diagnosticRes.ok && diagnosticRes.data ? (diagnosticRes.data as PillarDiagnosticInfo) : null,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load required data');
      dispatchData({ type: 'LOAD_END', colleges: [], diagnostic: null });
    } finally {
      dispatchLoading('LOAD_END');
    }
  }, [pillarId]);

  useEffect(() => {
    if (open) {
      void loadData();
    }
  }, [open, pillarId, loadData]);

  const toggleCollege = (id: string) => {
    setSelectedCollegeIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedCollegeIds(colleges.map(c => c.id));
  };

  const deselectAll = () => {
    setSelectedCollegeIds([]);
  };

  function handleSubmit() {
    if (selectedCollegeIds.length === 0) {
      toast.error('Please select at least one college');
      return;
    }

    startTransition(async () => {
      try {
        const response = await assignPillarToCollegesAction(pillarId, selectedCollegeIds);
        if (response.ok && response.data) {
          setResult(response.data);
          toast.success('Pillar assignment process completed');
        } else {
          toast.error(response.error || 'Failed to assign pillar');
        }
      } catch {
        toast.error('An unexpected error occurred');
      }
    });
  }

  const isPillarReady = diagnostic?.publish_status === 'published' && 
                       (diagnostic.visible_to_college_admins || diagnostic.visible_to_college_students);

  const eligibleCourses = diagnostic?.courses.filter(c => c.renderable_in_college_admin && c.renderable_in_student) || [];
  const skippedCourses = diagnostic?.courses.filter(c => !c.renderable_in_college_admin || !c.renderable_in_student) || [];

  if (result) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-card border-2 border-border/50 shadow-2xl rounded-xl">
          <AssignmentResultView result={result} pillarTitle={pillarTitle} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="size-4" />
            Assign Pillar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md bg-card border-2 border-border/50 shadow-2xl rounded-xl">
        <DialogHeader className="space-y-3 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Users className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold tracking-tight">Assign Pillar</DialogTitle>
              <DialogDescription className="text-sm font-medium text-muted-foreground line-clamp-1">
                {pillarTitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
               <Loader2 className="size-8 animate-spin text-primary/40" />
               <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Analyzing Pillar...</p>
            </div>
          ) : !isPillarReady ? (
            <div className="bg-destructive/5 border border-destructive/20 py-6 px-4 rounded-xl flex gap-3">
              <ShieldAlert className="size-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black uppercase tracking-widest mb-2 text-destructive">Pillar Not Ready</p>
                <p className="text-xs font-semibold leading-relaxed text-destructive/80">
                  This pillar must be <strong>Published</strong> and have <strong>Visibility</strong> enabled for College Admins or Students before it can be assigned.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Info className="size-4 text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-tight text-primary/80">Assignment Preview</span>
                   </div>
                   <Badge variant="outline" className="bg-background/50 font-semibold">{eligibleCourses.length} Courses eligible</Badge>
                </div>
                
                <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">
                   Assignments will be created for each eligible course. Entitlements will be automatically granted to all students of the selected colleges.
                </p>

                {skippedCourses.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-primary/10">
                     <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                        {skippedCourses.length} courses will be skipped (unpublished or hidden).
                     </p>
                  </div>
                )}
              </div>

              {eligibleCourses.length === 0 && (
                <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl flex gap-2">
                  <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-amber-800">
                    No eligible courses found in this pillar. Assigning will have no effect.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-sm font-semibold text-foreground/80">Select Target Colleges</Label>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] font-semibold uppercase tracking-tight" onClick={selectAll}>Select All</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] font-semibold uppercase tracking-tight" onClick={deselectAll}>Deselect All</Button>
                  </div>
                </div>

                <ScrollArea className="h-[200px] border-2 border-border/40 rounded-xl p-2 bg-background/50">
                  {colleges.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground italic">
                      No active colleges found.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {colleges.map((college) => (
                        <div 
                          key={college.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer group"
                          onClick={() => toggleCollege(college.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleCollege(college.id); }}
                          role="option"
                          aria-selected={selectedCollegeIds.includes(college.id)}
                          tabIndex={0}
                        >
                          <Checkbox 
                            id={`college-${college.id}`}
                            checked={selectedCollegeIds.includes(college.id)}
                            onCheckedChange={() => toggleCollege(college.id)}
                            className="border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <Label 
                              htmlFor={`college-${college.id}`}
                              className="text-sm font-semibold cursor-pointer group-hover:text-primary transition-colors block truncate"
                            >
                              {college.name}
                            </Label>
                            <p className="text-[10px] font-mono text-muted-foreground/60">{college.slug}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="pt-4 border-t border-border/50">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending} className="font-semibold">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isPending || selectedCollegeIds.length === 0 || !isPillarReady || eligibleCourses.length === 0}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-lg shadow-primary/20"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 size-4" />
                Assign to {selectedCollegeIds.length} Colleges
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
