'use client';

import { useReducer, useState } from 'react';
import { toast } from 'sonner';
import { Calendar, RefreshCw, Loader2, Video, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getAvailableDatesAction, getSlotsAction, rescheduleAction } from './_actions/paid-mentorship';
import type { CustomAnswer } from '@/lib/services/paid-mentorship';

interface BookingDetailProps {
  collegeSlug: string;
  userId: string;
  booking: {
    id: string;
    session_date: string;
    start_time_ist: string;
    end_time_ist: string;
    status: string;
    achievement_goal: string;
    skill_level: string;
    additional_notes: string | null;
    whatsapp_number: string | null;
    custom_answers: CustomAnswer[];
    meeting_url: string | null;
    reschedule_count: number;
    category?: { title: string; description: string | null };
    original_price_minor: number;
    selling_price_minor: number;
    final_amount_minor: number;
    coupon_code: string | null;
    discount_amount_minor: number;
  };
  onClose: () => void;
}

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

const formatDateFull = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const formatTimeSlot = (t: string) => {
  const [h, m] = String(t).slice(0, 5).split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

// Reducer for reschedule-related state to reduce re-renders
type RescheduleStep = 'pick' | 'confirm' | 'success';

type RescheduleAction =
  | { type: 'SET_SHOW_RESCHEDULE'; show: boolean }
  | { type: 'SET_STEP'; step: RescheduleStep }
  | { type: 'SET_DATE'; date: Date | undefined }
  | { type: 'SET_SLOTS'; slots: TimeSlot[] }
  | { type: 'SET_SELECTED_SLOT'; slot: TimeSlot | null }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_PENDING'; pending: boolean }
  | { type: 'SET_DATE_OPEN'; open: boolean }
  | { type: 'SET_AVAILABLE_DATES'; dates: string[] }
  | { type: 'RESET' };

interface RescheduleState {
  showReschedule: boolean;
  step: RescheduleStep;
  rescheduleDate: Date | undefined;
  rescheduleSlots: TimeSlot[];
  selectedNewSlot: TimeSlot | null;
  loadingSlots: boolean;
  isPending: boolean;
  dateOpen: boolean;
  availableDates: string[];
}

function rescheduleReducer(state: RescheduleState, action: RescheduleAction): RescheduleState {
  switch (action.type) {
    case 'SET_SHOW_RESCHEDULE':
      return { ...state, showReschedule: action.show };
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_DATE':
      return { ...state, rescheduleDate: action.date };
    case 'SET_SLOTS':
      return { ...state, rescheduleSlots: action.slots };
    case 'SET_SELECTED_SLOT':
      return { ...state, selectedNewSlot: action.slot };
    case 'SET_LOADING':
      return { ...state, loadingSlots: action.loading };
    case 'SET_PENDING':
      return { ...state, isPending: action.pending };
    case 'SET_DATE_OPEN':
      return { ...state, dateOpen: action.open };
    case 'SET_AVAILABLE_DATES':
      return { ...state, availableDates: action.dates };
    case 'RESET':
      return {
        ...state,
        showReschedule: false,
        step: 'pick',
        rescheduleDate: undefined,
        rescheduleSlots: [],
        selectedNewSlot: null,
        loadingSlots: false,
        isPending: false,
        dateOpen: false,
      };
    default:
      return state;
  }
}

const SKILL_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export function BookingDetail({ collegeSlug, userId, booking, onClose }: BookingDetailProps) {
  const [state, dispatch] = useReducer(rescheduleReducer, {
    showReschedule: false,
    step: 'pick',
    rescheduleDate: undefined,
    rescheduleSlots: [],
    selectedNewSlot: null,
    loadingSlots: false,
    isPending: false,
    dateOpen: false,
    availableDates: [],
  });

  const [nowMs] = useState(() => Date.now());
  const minRescheduleTime = nowMs + 24 * 60 * 60 * 1000;
  const canReschedule =
    booking.status === 'confirmed' &&
    booking.reschedule_count < 1 &&
    new Date(`${booking.session_date}T${booking.start_time_ist}`).getTime() > minRescheduleTime;

  const handleRescheduleOpen = async () => {
    dispatch({ type: 'SET_SHOW_RESCHEDULE', show: true });
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    try {
      const result = await getAvailableDatesAction(collegeSlug, ym);
      if (result.ok) dispatch({ type: 'SET_AVAILABLE_DATES', dates: result.dates });
    } catch {
      // ignore
    }
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    dispatch({ type: 'SET_DATE', date });
    dispatch({ type: 'SET_SELECTED_SLOT', slot: null });
    dispatch({ type: 'SET_DATE_OPEN', open: false });
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const result = await getSlotsAction(collegeSlug, dateStr);
      if (result.ok) {
        dispatch({ type: 'SET_SLOTS', slots: result.slots.filter((s: TimeSlot) => s.available) });
      }
    } catch {
      // ignore
    }
    dispatch({ type: 'SET_LOADING', loading: false });
  };

  const handleReschedule = async () => {
    if (!state.rescheduleDate || !state.selectedNewSlot) return;
    dispatch({ type: 'SET_PENDING', pending: true });
    try {
      const result = await rescheduleAction(collegeSlug, {
        bookingId: booking.id,
        userId,
        newDate: format(state.rescheduleDate, 'yyyy-MM-dd'),
        newStart: state.selectedNewSlot.start,
        newEnd: state.selectedNewSlot.end,
      });
      if (result.ok) {
        dispatch({ type: 'SET_STEP', step: 'success' });
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error('Failed to reschedule');
    }
    dispatch({ type: 'SET_PENDING', pending: false });
  };

  const isDateAvailable = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return state.availableDates.includes(dateStr) && date.getTime() > nowMs;
  };

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-muted/10 p-5 space-y-4">
            <h4 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              Session Information
            </h4>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-1 border-b border-border/20">
                <span className="text-muted-foreground">Category</span>
                <span className="font-semibold text-foreground">{booking.category?.title}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/20">
                <span className="text-muted-foreground">Date</span>
                <span className="text-foreground">{formatDateFull(booking.session_date)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/20">
                <span className="text-muted-foreground">Time</span>
                <span className="text-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground" />
                  {formatTimeSlot(booking.start_time_ist)} - {formatTimeSlot(booking.end_time_ist)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Skill Level</span>
                <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  {SKILL_LABELS[booking.skill_level] ?? booking.skill_level}
                </span>
              </div>
            </div>
          </div>

          {booking.meeting_url && (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.02] p-5 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Video className="size-5" />
                <span className="text-sm font-semibold">Join Mentorship Call</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your video call is ready. Click the button below to join the session with your mentor.
              </p>
              <Button asChild className="w-full rounded-xl" size="default">
                <a href={booking.meeting_url} target="_blank" rel="noopener noreferrer">
                  <Video className="mr-2 size-4" />
                  Join Session
                </a>
              </Button>
            </div>
          )}

          {booking.status === 'confirmed' && (
            <div className="space-y-2">
              {canReschedule ? (
                <Button onClick={handleRescheduleOpen} variant="outline" className="w-full rounded-xl gap-2">
                  <RefreshCw className="size-4" />
                  Reschedule Session
                </Button>
              ) : booking.reschedule_count >= 1 ? (
                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  <RefreshCw className="size-4 shrink-0" />
                  Reschedule used (1/1)
                </div>
              ) : null}
              <p className="text-xs text-destructive/80 text-center font-medium">
                {booking.reschedule_count < 1
                  ? 'You can reschedule once, at least 24 hours before the session.'
                  : 'You have used your one allowed reschedule.'}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-muted/10 p-5 space-y-4">
            <h4 className="text-sm font-semibold text-foreground tracking-tight">
              Goals & Notes
            </h4>
            <div className="space-y-4 text-sm">
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground">Session Goals</span>
                <p className="text-foreground leading-relaxed bg-background/50 rounded-lg p-3 border border-border/30 text-xs sm:text-sm">
                  {booking.achievement_goal}
                </p>
              </div>
              {booking.additional_notes && (
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Additional Notes</span>
                  <p className="text-foreground leading-relaxed bg-background/50 rounded-lg p-3 border border-border/30 text-xs sm:text-sm">
                    {booking.additional_notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {booking.custom_answers && booking.custom_answers.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-muted/10 p-5 space-y-4">
              <h4 className="text-sm font-semibold text-foreground tracking-tight">
                Additional Information
              </h4>
              <div className="space-y-3.5 text-sm">
                {booking.custom_answers.map((ca) => (
                  <div key={ca.question_id} className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">{ca.question}</span>
                    <p className="text-foreground font-medium bg-background/50 rounded-lg p-2.5 border border-border/30 text-xs sm:text-sm">{ca.answer || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={state.showReschedule} onOpenChange={(open) => dispatch({ type: 'SET_SHOW_RESCHEDULE', show: open })}>
        <DialogContent className="max-w-md">
          {state.step === 'pick' && (
            <>
              <DialogHeader>
                <DialogTitle>Reschedule Session</DialogTitle>
                <DialogDescription>
                  Pick a new date and time. You have 1 reschedule opportunity remaining.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <Popover open={state.dateOpen} onOpenChange={(open) => dispatch({ type: 'SET_DATE_OPEN', open })}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !state.rescheduleDate && 'text-muted-foreground',
                      )}
                    >
                      <Calendar className="mr-2 size-4" />
                      {state.rescheduleDate
                        ? format(state.rescheduleDate, 'EEEE, MMMM d, yyyy')
                        : 'Pick a new date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={state.rescheduleDate}
                      onSelect={handleDateSelect}
                      disabled={(date) => !isDateAvailable(date)}
                    />
                  </PopoverContent>
                </Popover>

                {state.rescheduleDate && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {format(state.rescheduleDate, 'EEEE, MMM d')}
                    </p>
                    {state.loadingSlots ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin"><Loader2 className="size-5 text-muted-foreground" /></div>
                      </div>
                    ) : state.rescheduleSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No slots available on this date.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {state.rescheduleSlots.map((slot) => (
                          <button
                            type="button"
                            key={slot.start}
                            onClick={() => dispatch({ type: 'SET_SELECTED_SLOT', slot })}
                            className={cn(
                              'rounded-lg border p-2.5 text-sm font-medium transition',
                              'hover:border-primary hover:bg-primary/5 cursor-pointer',
                              state.selectedNewSlot?.start === slot.start &&
                                'border-primary bg-primary/10 text-primary',
                            )}
                          >
                            {formatTimeSlot(slot.start)} - {formatTimeSlot(slot.end)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => dispatch({ type: 'RESET' })}>
                  Cancel
                </Button>
                <Button
                  onClick={() => dispatch({ type: 'SET_STEP', step: 'confirm' })}
                  disabled={!state.selectedNewSlot}
                >
                  Continue
                </Button>
              </DialogFooter>
            </>
          )}

          {state.step === 'confirm' && (
            <>
              <DialogHeader>
                <DialogTitle>Confirm Reschedule</DialogTitle>
                <DialogDescription>
                  Review the change before confirming. This cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Current Session</p>
                  <p className="text-sm font-medium">
                    {formatDateFull(booking.session_date)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatTimeSlot(booking.start_time_ist)} - {formatTimeSlot(booking.end_time_ist)}
                  </p>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">New Session</p>
                  <p className="text-sm font-medium text-primary">
                    {state.rescheduleDate ? formatDateFull(format(state.rescheduleDate, 'yyyy-MM-dd')) : ''}
                  </p>
                  <p className="text-sm text-primary">
                    {state.selectedNewSlot
                      ? `${formatTimeSlot(state.selectedNewSlot.start)} - ${formatTimeSlot(state.selectedNewSlot.end)}`
                      : ''}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => dispatch({ type: 'SET_STEP', step: 'pick' })}>
                  Back
                </Button>
                <Button onClick={handleReschedule} disabled={state.isPending}>
                  {state.isPending ? <div className="animate-spin"><Loader2 className="mr-1 size-4" /></div> : null}
                  Confirm Reschedule
                </Button>
              </DialogFooter>
            </>
          )}

          {state.step === 'success' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-green-600" />
                  Session Rescheduled
                </DialogTitle>
                <DialogDescription>
                  Your session has been moved to the new date and time.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-1">
                <p className="text-sm font-medium text-green-800">
                  {state.rescheduleDate ? formatDateFull(format(state.rescheduleDate, 'yyyy-MM-dd')) : ''}
                </p>
                <p className="text-sm text-green-700">
                  {state.selectedNewSlot
                    ? `${formatTimeSlot(state.selectedNewSlot.start)} - ${formatTimeSlot(state.selectedNewSlot.end)}`
                    : ''}
                </p>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => {
                    dispatch({ type: 'RESET' });
                    onClose();
                    window.location.reload();
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
