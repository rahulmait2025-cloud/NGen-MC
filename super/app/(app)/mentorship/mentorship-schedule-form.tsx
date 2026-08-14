'use client';

import { useReducer, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { TimePicker } from '@/components/ui/time-picker';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { scheduleMentorshipSessionAction } from './actions';
import { MentorshipAudienceSection } from './mentorship-audience-section';
import type { MentorshipAudienceTargetInput } from '@/lib/services/mentorship-audience-types';

type ScheduleFormState = {
  sessionDay: string;
  selectedDate: Date | undefined;
  dateOpen: boolean;
  startTime: string;
  endTime: string;
  audienceTargets: MentorshipAudienceTargetInput[];
  previewRecipientCount: number | null;
};

type ScheduleFormAction =
  | { type: 'DATE_SELECTED'; date: Date | undefined }
  | { type: 'SET_DATE_OPEN'; open: boolean }
  | { type: 'SET_START_TIME'; time: string }
  | { type: 'SET_END_TIME'; time: string }
  | { type: 'SET_AUDIENCE_TARGETS'; targets: MentorshipAudienceTargetInput[] }
  | { type: 'SET_PREVIEW_COUNT'; count: number | null }
  | { type: 'RESET' };

const initialScheduleFormState: ScheduleFormState = {
  sessionDay: '',
  selectedDate: undefined,
  dateOpen: false,
  startTime: '',
  endTime: '',
  audienceTargets: [],
  previewRecipientCount: null,
};

function scheduleFormReducer(state: ScheduleFormState, action: ScheduleFormAction): ScheduleFormState {
  switch (action.type) {
    case 'DATE_SELECTED': {
      const dayName = action.date
        ? action.date.toLocaleDateString('en-IN', { weekday: 'long' })
        : '';
      return { ...state, selectedDate: action.date, dateOpen: false, sessionDay: dayName };
    }
    case 'SET_DATE_OPEN':
      return { ...state, dateOpen: action.open };
    case 'SET_START_TIME':
      return { ...state, startTime: action.time };
    case 'SET_END_TIME':
      return { ...state, endTime: action.time };
    case 'SET_AUDIENCE_TARGETS':
      return { ...state, audienceTargets: action.targets };
    case 'SET_PREVIEW_COUNT':
      return { ...state, previewRecipientCount: action.count };
    case 'RESET':
      return initialScheduleFormState;
  }
}

export function MentorshipScheduleForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, dispatch] = useReducer(scheduleFormReducer, initialScheduleFormState);
  const { sessionDay, selectedDate, dateOpen, startTime, endTime, audienceTargets, previewRecipientCount } = form;
  const canSchedule = audienceTargets.length > 0 && previewRecipientCount != null && previewRecipientCount > 0;

  const handleDateSelect = (date: Date | undefined) => {
    dispatch({ type: 'DATE_SELECTED', date });
  };

  const formattedDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

  return (
    <form
      className="space-y-4 rounded-2xl border border-border/60 bg-card p-6"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        startTransition(async () => {
          const result = await scheduleMentorshipSessionAction(formData);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          if (result.emailError) {
            toast.warning(`Session scheduled, but email delivery had issues: ${result.emailError}`);
          } else if (result.emailsSent > 0) {
            const suppressedNote =
              result.emailsSuppressed > 0 ? ` (${result.emailsSuppressed} suppressed)` : '';
            toast.success(
              `Session scheduled. Invite emails sent to ${result.emailsSent} of ${result.enrolledCount} enrolled student${result.enrolledCount === 1 ? '' : 's'}${suppressedNote}.`,
            );
          } else {
            const suppressedNote =
              result.emailsSuppressed > 0 ? ` (${result.emailsSuppressed} suppressed)` : '';
            toast.success(
              `Session scheduled. No emails sent${result.enrolledCount === 0 ? ' — no enrolled students' : ''}${suppressedNote}.`,
            );
          }
          form.reset();
          dispatch({ type: 'RESET' });
          router.refresh();
        });
      }}>
      <h2 className="text-lg font-semibold">Schedule mentorship session</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="title">Title</label>
          <Input id="title" name="title" required placeholder="Founder mentorship — project review" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="ms-date">Date</label>
          {/* Hidden input to submit the date value to the server action */}
          <input type="hidden" name="session_date" value={formattedDate} required />
          <Popover open={dateOpen} onOpenChange={(open) => dispatch({ type: 'SET_DATE_OPEN', open })}>
            <PopoverTrigger asChild>
              <Button
                id="ms-date"
                type="button"
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal h-10',
                  !selectedDate && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 size-4" />
                {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="session_day">Day</label>
          <Input id="session_day" name="session_day" required value={sessionDay} readOnly placeholder="Auto from date" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="ms-start-time">Start time (IST)</label>
          <input type="hidden" name="start_time_ist" value={startTime} required />
          <TimePicker value={startTime} onChange={(time) => dispatch({ type: 'SET_START_TIME', time })} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="ms-end-time">End time (IST)</label>
          <input type="hidden" name="end_time_ist" value={endTime} required />
          <TimePicker value={endTime} onChange={(time) => dispatch({ type: 'SET_END_TIME', time })} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="meeting_url">Zoom / Meet link</label>
          <Input id="meeting_url" name="meeting_url" type="url" required placeholder="https://zoom.us/j/..." />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="description">Description (optional)</label>
          <Textarea id="description" name="description" rows={3} placeholder="What students should prepare..." />
        </div>
      </div>

      <MentorshipAudienceSection
        onTargetsChange={(targets) => dispatch({ type: 'SET_AUDIENCE_TARGETS', targets })}
        onPreviewCountChange={(count) => dispatch({ type: 'SET_PREVIEW_COUNT', count })}
        disabled={isPending}
      />

      <Button type="submit" disabled={isPending || !canSchedule}>
        {isPending ? 'Scheduling…' : 'Schedule & notify students'}
      </Button>
      {!canSchedule ? (
        <p className="text-xs text-muted-foreground">
          Select an audience, preview recipients (must be greater than zero), then schedule.
        </p>
      ) : null}
    </form>
  );
}
