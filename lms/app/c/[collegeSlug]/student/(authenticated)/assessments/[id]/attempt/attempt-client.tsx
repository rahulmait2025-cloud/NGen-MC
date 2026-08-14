"use client";

import { useReducer, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Clock, Save, ChevronRight, ChevronLeft, Send, AlertCircle } from 'lucide-react';
import type { AttemptStateView } from '@/lib/services/assessments';
import type { AssessmentOptionRow } from '@/types/database';

type SectionWithQuestions = AttemptStateView['assessment']['sections'][number];

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

type AttemptState = {
  currentQIndex: number;
  responses: Record<string, string | string[]>;
  timeLeft: number | null;
  isSaving: boolean;
  isSubmitting: boolean;
};

const INITIAL_ATTEMPT_STATE: AttemptState = {
  currentQIndex: 0,
  responses: {},
  timeLeft: null,
  isSaving: false,
  isSubmitting: false,
};

export function AttemptClient({ initialState, collegeSlug }: { initialState: AttemptStateView; collegeSlug: string }) {
    const { push } = useRouter();
    const assessment = initialState.assessment;

    const allQuestions = assessment.sections.flatMap((s: SectionWithQuestions) => s.questions);

    const [state, setState] = useReducer(
      (prev: AttemptState, next: Partial<AttemptState>) => ({ ...prev, ...next }),
      INITIAL_ATTEMPT_STATE,
    );

    const submitFinal = useCallback(async () => {
        setState({ isSubmitting: true });
        setTimeout(() => {
            toast.success('Assessment submitted!');
            push(`/c/${encodeURIComponent(collegeSlug)}/student/assessments/${initialState.assignment_id}/result`);
        }, 1500);
    }, [initialState.assignment_id, collegeSlug, push]);

    const handleAutoSubmit = useCallback(async () => {
        toast.error('Time expired. Auto-submitting assessment.');
        submitFinal();
    }, [submitFinal]);

    useEffect(() => {
        if (!assessment.time_limit_minutes) return;

        const startTime = new Date(initialState.start_time).getTime();
        const endTime = startTime + assessment.time_limit_minutes * 60000;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
            setState({ timeLeft: remaining });

            if (remaining <= 0) {
                clearInterval(interval);
                handleAutoSubmit();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [assessment.time_limit_minutes, initialState.start_time, handleAutoSubmit]);

    const activeQuestion = allQuestions[state.currentQIndex];

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-12">
            {/* Header / Meta */}
            <div className="bg-card/80 backdrop-blur-sm border rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div>
                    <h1 className="font-semibold text-lg">{assessment.title}</h1>
                    <p className="text-xs text-muted-foreground">Question {state.currentQIndex + 1} of {allQuestions.length}</p>
                </div>
                <div className="flex items-center gap-4">
                    {state.isSaving && <span className="text-xs text-muted-foreground flex items-center"><Save className="size-3 mr-1 animate-pulse"/> Saving&hellip;</span>}
                    {state.timeLeft !== null && (
                        <div className={`flex items-center gap-2 font-mono text-lg font-bold px-3 py-1.5 rounded-lg border ${state.timeLeft < 300 ? 'text-destructive border-destructive/30 bg-destructive/10 animate-pulse' : 'bg-muted'}`}>
                            <Clock className="size-4" />
                            {formatTime(state.timeLeft)}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Question Card */}
            {activeQuestion ? (
                <Card className="min-h-[400px] flex flex-col shadow-md border-border/60">
                    <CardHeader className="bg-muted/30 border-b">
                        <div className="flex justify-between items-start">
                            <CardTitle className="leading-relaxed font-semibold text-lg max-w-[75%] sm:max-w-[85%]">{activeQuestion.text}</CardTitle>
                            <span className="text-sm font-medium text-muted-foreground shrink-0">{activeQuestion.points} points</span>
                        </div>
                        <p className="text-xs text-muted-foreground pt-1 uppercase tracking-wider font-semibold">
                            {activeQuestion.type.replace('_', ' ')}
                        </p>
                    </CardHeader>
                    <CardContent className="flex-1 py-8">
                        {activeQuestion.type === 'single_select' && (
                            <RadioGroup className="space-y-3">
                                {(activeQuestion.options ?? []).map((opt: AssessmentOptionRow) => (
                                    <div key={opt.id} className="flex items-center gap-3 border p-4 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                                        <RadioGroupItem value={opt.id} id={opt.id} />
                                        <Label htmlFor={opt.id} className="cursor-pointer flex-1 font-normal text-base">{opt.text}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        )}

                        {activeQuestion.type === 'multi_select' && (
                            <div className="space-y-3">
                                {(activeQuestion.options ?? []).map((opt: AssessmentOptionRow) => (
                                    <div key={opt.id} className="flex items-center gap-3 border p-4 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                                        <Checkbox id={opt.id} />
                                        <Label htmlFor={opt.id} className="cursor-pointer flex-1 font-normal text-base">{opt.text}</Label>
                                    </div>
                                ))}
                            </div>
                        )}

                        {(activeQuestion.type === 'short_answer' || activeQuestion.type === 'subjective' || activeQuestion.type === 'coding_ready') && (
                            <Textarea 
                                placeholder="Type your answer here..." 
                                className="min-h-[200px] text-base resize-y"
                            />
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between border-t bg-muted/10 p-4">
                        <Button 
                            variant="outline" 
                            disabled={state.currentQIndex === 0}
                            onClick={() => setState({ currentQIndex: state.currentQIndex - 1 })}
                        >
                            <ChevronLeft className="size-4 mr-2" /> Previous
                        </Button>

                        {state.currentQIndex === allQuestions.length - 1 ? (
                            <Button onClick={submitFinal} disabled={state.isSubmitting} className="bg-primary text-primary-foreground">
                                {state.isSubmitting ? 'Submitting...' : <><Send className="size-4 mr-2" /> Submit Test</>}
                            </Button>
                        ) : (
                            <Button onClick={() => setState({ currentQIndex: state.currentQIndex + 1 })}>
                                Next <ChevronRight className="size-4 ml-2" />
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            ) : (
                <div className="py-20 text-center">
                    <AlertCircle className="size-10 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold">No questions available</h3>
                    <p className="text-muted-foreground mt-2">This assessment doesn&apos;t have any questions yet. Check back later or contact your instructor.</p>
                </div>
            )}
        </div>
    );
}
