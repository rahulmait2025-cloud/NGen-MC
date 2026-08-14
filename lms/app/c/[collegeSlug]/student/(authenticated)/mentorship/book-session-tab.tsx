'use client';

import { useReducer, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Clock, CreditCard, Tag, ArrowLeft, Loader2, Check, ChevronLeft, ChevronRight, CalendarDays, Sparkles, MessageCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  getSlotsAction,
  getDateAvailabilityStatusesAction,
  createOrderAction,
  verifyPaymentAction,
} from './_actions/paid-mentorship';
import type { CustomQuestion, DateAvailabilityStatus, BookingWithDetails } from '@/lib/services/paid-mentorship';
import { BookingDetail } from './booking-detail';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

interface Category {
  id: string;
  title: string;
  description: string | null;
  custom_questions: CustomQuestion[];
}

interface Pricing {
  original_price_minor: number;
  selling_price_minor: number;
  currency: string;
}

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

interface BookSessionTabProps {
  collegeSlug: string;
  userId: string;
  studentId: string;
  collegeId: string;
  categories: Category[];
  pricing: Pricing | null;
  activeBooking: BookingWithDetails | null;
}

type Step = 'select' | 'form' | 'payment' | 'success';

const formatTimeSlot = (t: string) => {
  const [h, m] = t.slice(0, 5).split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

const formatDateShort = (d: string) => {
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

export function BookSessionTab({ collegeSlug, userId, studentId, collegeId, categories, pricing, activeBooking }: BookSessionTabProps) {
  const router = useRouter();
  const isRazorpayLoadedRef = useRef(false);
  const checkoutInProgressRef = useRef(false);

  interface BookingState {
    step: Step;
    selectedDate: Date | undefined;
    selectedSlot: TimeSlot | null;
    slots: TimeSlot[];
    loadingSlots: boolean;
    slotsError: string | null;
    dateStatuses: DateAvailabilityStatus[];
    dateStatusesError: string | null;
    prevSelectedDate: Date | undefined;
    categoryId: string;
    achievementGoal: string;
    skillLevel: string;
    additionalNotes: string;
    whatsappNumber: string;
    customAnswers: Record<string, string>;
    couponCode: string;
    isPending: boolean;
    descExpanded: boolean;
  }

  type BookingAction =
    | { type: 'setStep'; value: Step }
    | { type: 'setSelectedDate'; value: Date | undefined }
    | { type: 'setSelectedSlot'; value: TimeSlot | null }
    | { type: 'setSlots'; value: TimeSlot[] }
    | { type: 'setLoadingSlots'; value: boolean }
    | { type: 'setSlotsError'; value: string | null }
    | { type: 'setDateStatuses'; value: DateAvailabilityStatus[] }
    | { type: 'setDateStatusesError'; value: string | null }
    | { type: 'setPrevSelectedDate'; value: Date | undefined }
    | { type: 'setCategoryId'; value: string }
    | { type: 'setAchievementGoal'; value: string }
    | { type: 'setSkillLevel'; value: string }
    | { type: 'setAdditionalNotes'; value: string }
    | { type: 'setWhatsappNumber'; value: string }
    | { type: 'setCustomAnswers'; value: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>) }
    | { type: 'setCouponCode'; value: string }
    | { type: 'setIsPending'; value: boolean }
    | { type: 'setDescExpanded'; value: boolean };

  function bookingReducer(state: BookingState, action: BookingAction): BookingState {
    switch (action.type) {
      case 'setStep': return { ...state, step: action.value };
      case 'setSelectedDate': return { ...state, selectedDate: action.value };
      case 'setSelectedSlot': return { ...state, selectedSlot: action.value };
      case 'setSlots': return { ...state, slots: action.value };
      case 'setLoadingSlots': return { ...state, loadingSlots: action.value };
      case 'setSlotsError': return { ...state, slotsError: action.value };
      case 'setDateStatuses': return { ...state, dateStatuses: action.value };
      case 'setDateStatusesError': return { ...state, dateStatusesError: action.value };
      case 'setPrevSelectedDate': return { ...state, prevSelectedDate: action.value };
      case 'setCategoryId': return { ...state, categoryId: action.value };
      case 'setAchievementGoal': return { ...state, achievementGoal: action.value };
      case 'setSkillLevel': return { ...state, skillLevel: action.value };
      case 'setAdditionalNotes': return { ...state, additionalNotes: action.value };
      case 'setWhatsappNumber': return { ...state, whatsappNumber: action.value };
      case 'setCustomAnswers': return { ...state, customAnswers: typeof action.value === 'function' ? action.value(state.customAnswers) : action.value };
      case 'setCouponCode': return { ...state, couponCode: action.value };
      case 'setIsPending': return { ...state, isPending: action.value };
      case 'setDescExpanded': return { ...state, descExpanded: action.value };
    }
  }

  const [bookingState, dispatch] = useReducer(bookingReducer, {
    step: 'select' as Step,
    selectedDate: undefined as Date | undefined,
    selectedSlot: null as TimeSlot | null,
    slots: [] as TimeSlot[],
    loadingSlots: false,
    slotsError: null as string | null,
    dateStatuses: [] as DateAvailabilityStatus[],
    dateStatusesError: null as string | null,
    prevSelectedDate: undefined as Date | undefined,
    categoryId: '',
    achievementGoal: '',
    skillLevel: 'intermediate',
    additionalNotes: '',
    whatsappNumber: '',
    customAnswers: {} as Record<string, string>,
    couponCode: '',
    isPending: false,
    descExpanded: false,
  });

  const { step, selectedDate, selectedSlot, slots, loadingSlots, slotsError, dateStatuses, dateStatusesError, prevSelectedDate, categoryId, achievementGoal, skillLevel, additionalNotes, whatsappNumber, customAnswers, couponCode, isPending, descExpanded } = bookingState;

  const setStep = useCallback((value: Step) => dispatch({ type: 'setStep', value }), []);
  const setSelectedDate = useCallback((value: Date | undefined) => dispatch({ type: 'setSelectedDate', value }), []);
  const setSelectedSlot = useCallback((value: TimeSlot | null) => dispatch({ type: 'setSelectedSlot', value }), []);
  const setSlots = useCallback((value: TimeSlot[]) => dispatch({ type: 'setSlots', value }), []);
  const setLoadingSlots = useCallback((value: boolean) => dispatch({ type: 'setLoadingSlots', value }), []);
  const setSlotsError = useCallback((value: string | null) => dispatch({ type: 'setSlotsError', value }), []);
  const setDateStatuses = useCallback((value: DateAvailabilityStatus[]) => dispatch({ type: 'setDateStatuses', value }), []);
  const setDateStatusesError = useCallback((value: string | null) => dispatch({ type: 'setDateStatusesError', value }), []);
  const setPrevSelectedDate = useCallback((value: Date | undefined) => dispatch({ type: 'setPrevSelectedDate', value }), []);
  const setCategoryId = useCallback((value: string) => dispatch({ type: 'setCategoryId', value }), []);
  const setAchievementGoal = useCallback((value: string) => dispatch({ type: 'setAchievementGoal', value }), []);
  const setSkillLevel = useCallback((value: string) => dispatch({ type: 'setSkillLevel', value }), []);
  const setAdditionalNotes = useCallback((value: string) => dispatch({ type: 'setAdditionalNotes', value }), []);
  const setWhatsappNumber = useCallback((value: string) => dispatch({ type: 'setWhatsappNumber', value }), []);
  const setCustomAnswers = useCallback((value: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => dispatch({ type: 'setCustomAnswers', value }), []);
  const setCouponCode = useCallback((value: string) => dispatch({ type: 'setCouponCode', value }), []);
  const setIsPending = useCallback((value: boolean) => dispatch({ type: 'setIsPending', value }), []);
  const setDescExpanded = useCallback((value: boolean) => dispatch({ type: 'setDescExpanded', value }), []);

  const loadRazorpay = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (window.Razorpay) {
      isRazorpayLoadedRef.current = true;
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => { isRazorpayLoadedRef.current = true; };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    loadRazorpay();
  }, [loadRazorpay]);

  const loadAvailableDates = useCallback((yearMonth: string) => {
    setDateStatusesError(null);
    getDateAvailabilityStatusesAction(collegeSlug, yearMonth).then((data) => {
      if (data.ok) setDateStatuses(data.statuses);
      else setDateStatusesError(data.error ?? 'Failed to load availability');
    }).catch(() => {
      setDateStatusesError('Could not load calendar data. Please try again.');
    });
  }, [collegeSlug, setDateStatuses, setDateStatusesError]);

  useEffect(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    loadAvailableDates(ym);
  }, [loadAvailableDates]);

  if (selectedDate !== prevSelectedDate) {
    setPrevSelectedDate(selectedDate);
    setLoadingSlots(true);
  }

  useEffect(() => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setSlotsError(null);
    getSlotsAction(collegeSlug, dateStr).then((data) => {
      if (data.ok) setSlots(data.slots);
      else setSlotsError(data.error ?? 'Failed to load time slots');
      setLoadingSlots(false);
    }).catch(() => {
      setSlotsError('Could not load time slots. Please try a different date.');
      setLoadingSlots(false);
    });
  }, [selectedDate, collegeSlug, setLoadingSlots, setSlots, setSlotsError]);

  const discountAmount = 0;
  const finalAmount = pricing ? pricing.selling_price_minor - discountAmount : 0;

  const handleCheckout = async () => {
    if (!isRazorpayLoadedRef.current || checkoutInProgressRef.current) {
      if (!isRazorpayLoadedRef.current) {
        toast.error('Payment gateway is loading. Please try again.');
      }
      return;
    }

    if (!selectedSlot || !selectedDate || !categoryId) return;

    checkoutInProgressRef.current = true;
    setIsPending(true);

    try {
      const result = await createOrderAction(collegeSlug, {
        userId,
        studentId,
        collegeId,
        categoryId,
        sessionDate: format(selectedDate, 'yyyy-MM-dd'),
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        achievementGoal,
        skillLevel,
        additionalNotes: additionalNotes || undefined,
        whatsappNumber: whatsappNumber || undefined,
        customAnswers: Object.entries(customAnswers).map(([questionId, answer]) => {
          const q = selectedCat?.custom_questions.find((cq) => cq.id === questionId);
          return {
            question_id: questionId,
            question: q?.question ?? questionId,
            answer,
          };
        }),
        couponCode: couponCode || undefined,
      });

      if (!result.ok) {
        toast.error(result.error);
        checkoutInProgressRef.current = false;
        setIsPending(false);
        return;
      }

      const options = {
        key: result.keyId,
        amount: result.amount,
        currency: result.currency,
        name: 'Avesh LMS',
        description: 'Paid Mentorship Session',
        order_id: result.orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          setIsPending(true);
          try {
            const verifyResult = await verifyPaymentAction(collegeSlug, response);

            if (verifyResult.ok) {
              setStep('success');
              toast.success('Booking confirmed!');
              router.refresh();
            } else {
              toast.error(verifyResult.error ?? 'Payment verification failed');
            }
          } catch {
            toast.error('Failed to verify payment');
          } finally {
            checkoutInProgressRef.current = false;
            setIsPending(false);
          }
        },
        theme: { color: '#FF5F36' },
        modal: {
          ondismiss: () => {
            checkoutInProgressRef.current = false;
            setIsPending(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      toast.error('Could not start checkout. Try again.');
      checkoutInProgressRef.current = false;
      setIsPending(false);
    }
  };

  if (activeBooking) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="rounded-xl border border-border bg-muted/40 p-5">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarDays className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground text-base">You have an active mentorship booking</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                You have scheduled a mentorship session. To book a new session, you must first complete or cancel your existing one. You can manage, reschedule, or join your session below.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <div className="border-b border-border/40 px-5 py-4 bg-muted/20">
            <h4 className="font-semibold text-foreground">Active Session Details</h4>
          </div>
          <div className="p-5 sm:p-6">
            <BookingDetail
              collegeSlug={collegeSlug}
              userId={userId}
              booking={activeBooking}
              onClose={() => {
                router.refresh();
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="rounded-xl border border-success/20 bg-success/[0.03] p-8 text-center space-y-4">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/10">
          <Check className="size-8 text-success" />
        </div>
        <h3 className="text-xl font-semibold">Booking Confirmed!</h3>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Your mentorship session has been booked. You&apos;ll receive a confirmation email shortly.
        </p>
        <Button onClick={() => { setStep('select'); router.refresh(); }} variant="outline" className="mt-2">
          Book Another Session
        </Button>
      </div>
    );
  }

  const selectedCat = categories.find((c) => c.id === categoryId);
  const selectedCatDescription = selectedCat?.description ?? '';
  const selectedCatQuestions = selectedCat?.custom_questions ?? [];
  const hasRequiredUnanswered = selectedCatQuestions.some((q) => q.required && !(customAnswers[q.id]?.trim()));

  return (
    <div className="space-y-6">
      {step === 'select' && (
        <>
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold">Select a Date</h3>
                <p className="text-sm text-muted-foreground">
                  Pick a date to see available time slots.
                </p>
              </div>
              <div className="rounded-xl border border-primary/15 bg-primary/[0.02] p-4 max-w-[340px]">
                <CustomCalendar
                  selectedDate={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                  dateStatuses={dateStatuses}
                  onMonthChange={(ym) => loadAvailableDates(ym)}
                />
              </div>
            </div>

            <div className="space-y-3">
              {selectedDate ? (
                <div className="rounded-xl border border-border/60 bg-card">
                  <div className="flex items-center justify-between px-4 pt-4 pb-3 bg-primary/[0.03] border-b border-border/40">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {format(selectedDate, 'EEEE, MMM d')}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {loadingSlots ? 'Loading slots…' : `${slots.filter((s) => s.available).length} available`}
                      </p>
                    </div>
                    <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
                      <CalendarDays className="size-3.5 text-primary" />
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="animate-spin"><Loader2 className="size-5 text-muted-foreground" /></div>
                      </div>
                    ) : slotsError ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="size-10 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                          <Clock className="size-5 text-destructive/60" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Unable to load slots</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">{slotsError}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-3"
                          onClick={() => {
                            if (selectedDate) {
                              setLoadingSlots(true);
                              setSlotsError(null);
                              const dateStr = format(selectedDate, 'yyyy-MM-dd');
                              getSlotsAction(collegeSlug, dateStr).then((data) => {
                                if (data.ok) setSlots(data.slots);
                                else setSlotsError(data.error ?? 'Failed to load time slots');
                                setLoadingSlots(false);
                              }).catch(() => {
                                setSlotsError('Could not load time slots. Please try a different date.');
                                setLoadingSlots(false);
                              });
                            }
                          }}
                        >
                          Try again
                        </Button>
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                          <Clock className="size-5 text-muted-foreground/60" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No slots available</p>
                        <p className="text-xs text-muted-foreground mt-1">Try selecting a different date.</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {slots.map((slot) => (
                          <button
                            key={slot.start}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => setSelectedSlot(slot)}
                            className={cn(
                              'flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm transition duration-150',
                              slot.available
                                ? 'hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
                                : 'opacity-35 cursor-not-allowed border-dashed',
                              selectedSlot?.start === slot.start
                                ? 'border-primary bg-primary/8 text-primary ring-1 ring-primary/20'
                                : 'border-border/60',
                            )}
                          >
                            <span className={cn(
                              'font-medium',
                              selectedSlot?.start === slot.start ? 'text-primary' : 'text-foreground',
                            )}>
                              {formatTimeSlot(slot.start)} – {formatTimeSlot(slot.end)}
                            </span>
                            {selectedSlot?.start === slot.start ? (
                              <Check className="size-3.5 text-primary" />
                            ) : slot.available ? (
                              <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                                30 min
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-muted-foreground">Full</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : dateStatusesError ? (
                <div className="rounded-xl border border-border/60 bg-card p-5">
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="size-10 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                      <CalendarDays className="size-5 text-destructive/60" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Unable to load availability</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">{dateStatusesError}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        const now = new Date();
                        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                        loadAvailableDates(ym);
                      }}
                    >
                      Try again
                    </Button>
                  </div>
                </div>
              ) : (
                <AvailabilitySummary dateStatuses={dateStatuses} />
              )}
            </div>
          </div>

          {selectedSlot && (
            <div className="sticky bottom-4 z-10 mx-auto max-w-3xl">
              <div className="flex items-center justify-between rounded-xl border border-primary/25 bg-card/95 backdrop-blur-sm shadow-lg shadow-primary/5 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                    <Clock className="size-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {formatTimeSlot(selectedSlot.start)} – {formatTimeSlot(selectedSlot.end)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedDate && format(selectedDate, 'EEE, MMM d')} · 30 min
                    </p>
                  </div>
                </div>
                <Button onClick={() => setStep('form')} size="sm">
                  Continue
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {step === 'form' && (
        <>
          <Button variant="ghost" size="sm" onClick={() => setStep('select')} className="mb-1">
            <ArrowLeft className="mr-1 size-4" />
            Back to slots
          </Button>

          <div className="space-y-4">
            {/* ── Session Details Card ── */}
            <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="size-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground" style={{ textWrap: 'balance' }}>Session Details</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Choose a category and describe your goals.</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Category */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="category" className="text-sm font-medium">
                      Session Category <span className="text-destructive" aria-label="required">*</span>
                    </Label>
                    <span className="group relative">
                      <HelpCircle className="size-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg border border-border/60 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-50">
                        Choose the type of mentorship session you&apos;re looking for. Each category is tailored to a specific goal.
                      </span>
                    </span>
                  </div>
                  <Select value={categoryId} onValueChange={(val) => { setCategoryId(val); setCustomAnswers({}); setDescExpanded(false); }}>
                    <SelectTrigger aria-label="Session category" aria-required="true">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {categoryId && selectedCatDescription && (
                    <div className="space-y-1">
                      <p className={`text-sm text-muted-foreground leading-relaxed ${descExpanded ? '' : 'line-clamp-2'}`}>
                        {selectedCatDescription}
                      </p>
                      {selectedCatDescription.length > 120 && (
                        <button
                          type="button"
                          onClick={() => setDescExpanded(!descExpanded)}
                          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                          {descExpanded ? 'Show less' : 'Know more'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Achievement Goal */}
                <div className="space-y-2">
                  <Label htmlFor="achievement" className="text-sm font-medium">
                    What do you want to achieve from this session? <span className="text-destructive" aria-label="required">*</span>
                  </Label>
                  <Textarea
                    id="achievement"
                    value={achievementGoal}
                    onChange={(e) => setAchievementGoal(e.target.value)}
                    placeholder="Describe your goals for this session..."
                    rows={4}
                    maxLength={500}
                    aria-required="true"
                    aria-describedby="achievement-count"
                    className="resize-none"
                  />
                  <p id="achievement-count" className="text-xs text-muted-foreground text-right tabular-nums" aria-live="polite">
                    {achievementGoal.length}/500
                  </p>
                </div>

                {/* Skill Level */}
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium">
                    Current Skill Level <span className="text-destructive" aria-label="required">*</span>
                  </Label>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Skill level">
                    {[
                      { value: 'beginner', label: 'Beginner', desc: 'Just getting started' },
                      { value: 'intermediate', label: 'Intermediate', desc: 'Some experience' },
                      { value: 'advanced', label: 'Advanced', desc: 'Highly skilled' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={skillLevel === opt.value}
                        onClick={() => setSkillLevel(opt.value)}
                        className={cn(
                          'rounded-lg border p-3 text-left transition duration-150 ease-out',
                          skillLevel === opt.value
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border/60 hover:border-primary/40 hover:bg-primary/[0.02]',
                        )}
                      >
                        <span className={cn(
                          'block text-sm font-medium',
                          skillLevel === opt.value ? 'text-primary' : 'text-foreground',
                        )}>
                          {opt.label}
                        </span>
                        <span className="block text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Contact & Notes Card ── */}
            <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6">
              <div className="space-y-5">
                {/* Additional Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium">
                    Additional Notes <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    id="notes"
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Anything else you'd like us to know..."
                    rows={3}
                    maxLength={500}
                    aria-describedby="notes-count"
                    className="resize-none"
                  />
                  <p id="notes-count" className="text-xs text-muted-foreground text-right tabular-nums" aria-live="polite">
                    {additionalNotes.length}/500
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-border/40" />

                {/* WhatsApp Number */}
                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="text-sm font-medium flex items-center gap-1.5">
                    <MessageCircle className="size-3.5 text-success" aria-hidden="true" />
                    WhatsApp Number
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md border border-input bg-muted/50 px-2.5 py-1.5 text-sm text-muted-foreground font-medium select-none" aria-label="Country code">
                      +91
                    </span>
                    <Input
                      id="whatsapp"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={whatsappNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setWhatsappNumber(val);
                      }}
                      placeholder="98765 43210"
                      maxLength={10}
                      aria-describedby="whatsapp-hint"
                      className="flex-1 tabular-nums tracking-wider"
                    />
                  </div>
                  <p id="whatsapp-hint" className="text-xs" aria-live="polite">
                    {whatsappNumber.length > 0 && whatsappNumber.length !== 10 && (
                      <span className="text-destructive">Must be exactly 10 digits.</span>
                    )}
                    {whatsappNumber.length === 10 && (
                      <span className="text-success">Valid number</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {selectedCatQuestions.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                      <Tag className="size-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Additional Information</h3>
                      <p className="text-xs text-muted-foreground">
                        Please answer the following questions for this category.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    {selectedCatQuestions.sort((a, b) => a.sort_order - b.sort_order).map((q) => (
                      <div key={q.id} className="space-y-2">
                        <Label className="text-sm font-medium">
                          {q.question}
                          {q.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {q.type === 'text' && (
                          <Input
                            value={customAnswers[q.id] ?? ''}
                            onChange={(e) => setCustomAnswers({ ...customAnswers, [q.id]: e.target.value })}
                            placeholder="Your answer..."
                            maxLength={500}
                          />
                        )}
                        {q.type === 'textarea' && (
                          <Textarea
                            value={customAnswers[q.id] ?? ''}
                            onChange={(e) => setCustomAnswers({ ...customAnswers, [q.id]: e.target.value })}
                            placeholder="Your answer..."
                            rows={3}
                            maxLength={500}
                            className="resize-none"
                          />
                        )}
                        {q.type === 'select' && (
                          <Select
                            value={customAnswers[q.id] ?? ''}
                            onValueChange={(val) => setCustomAnswers({ ...customAnswers, [q.id]: val })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                              {(q.options ?? []).map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {q.type === 'radio' && (
                          <RadioGroup
                            value={customAnswers[q.id] ?? ''}
                            onValueChange={(val) => setCustomAnswers({ ...customAnswers, [q.id]: val })}
                            className="flex flex-wrap gap-4"
                          >
                            {(q.options ?? []).map((opt) => (
                              <div key={opt} className="flex items-center gap-2">
                                <RadioGroupItem value={opt} id={`${q.id}_${opt}`} />
                                <Label htmlFor={`${q.id}_${opt}`} className="font-normal cursor-pointer text-sm">
                                  {opt}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
            )}
          </div>

          <div className="sticky bottom-4 z-10">
            <Button
              onClick={() => setStep('payment')}
              disabled={!categoryId || !achievementGoal.trim() || (whatsappNumber.length > 0 && whatsappNumber.length !== 10) || hasRequiredUnanswered}
              className="w-full sm:w-auto"
            >
              Continue to Payment
            </Button>
          </div>
        </>
      )}

      {step === 'payment' && pricing && (
        <>
          <Button variant="ghost" size="sm" onClick={() => setStep('form')}>
            <ArrowLeft className="mr-1 size-4" />
            Back to form
          </Button>

          <div className="space-y-5">
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex size-6 items-center justify-center rounded-md bg-primary/10">
                  <CalendarDays className="size-3.5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Booking Summary</h3>
              </div>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium text-foreground">{selectedCat?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium text-foreground">{selectedDate && format(selectedDate, 'EEE, MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium text-foreground">
                    {selectedSlot && `${formatTimeSlot(selectedSlot.start)} – ${formatTimeSlot(selectedSlot.end)}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium text-foreground">30 minutes</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-primary/15 bg-primary/[0.02] p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-6 items-center justify-center rounded-md bg-primary/10">
                  <CreditCard className="size-3.5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Payment</h3>
              </div>

              <div className="flex items-baseline gap-2.5">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  ₹{Math.round(finalAmount / 100).toLocaleString('en-IN')}
                </span>
                {pricing.original_price_minor > pricing.selling_price_minor && (
                  <>
                    <span className="text-sm text-muted-foreground line-through">
                      ₹{Math.round(pricing.original_price_minor / 100).toLocaleString('en-IN')}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                      {Math.round(
                        ((pricing.original_price_minor - pricing.selling_price_minor) /
                          pricing.original_price_minor) *
                          100,
                      )}
                      % OFF
                    </span>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 uppercase tracking-wider text-sm"
                />
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => {
                    if (!couponCode) return;
                    toast.info('Coupon validation will be applied at checkout.');
                  }}
                >
                  <Tag className="mr-1.5 size-3.5" />
                  Apply
                </Button>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={isPending}
                className="w-full"
                size="lg"
              >
                {isPending ? (
                  <div className="animate-spin"><Loader2 className="mr-2 size-4" /></div>
                ) : (
                  <CreditCard className="mr-2 size-4" />
                )}
                Pay ₹{Math.round(finalAmount / 100).toLocaleString('en-IN')}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Monthly Availability Summary ──────────────────────────────────────────

function AvailabilitySummary({
  dateStatuses,
}: {
  dateStatuses: DateAvailabilityStatus[];
}) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const upcoming = dateStatuses
    .filter((s) => s.status === 'available' && s.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalAvailableSlots = upcoming.reduce((sum, s) => sum + (Number(s.availableSlots) || 0), 0);
  const totalDates = upcoming.length;

  const monthLabel = today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="rounded-xl border border-success/15 bg-success/[0.03] p-5 space-y-5">
      <div>
        <h4 className="text-sm font-semibold text-foreground">{monthLabel}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">Availability overview</p>
      </div>

      <div className="flex items-end gap-6">
        <div>
          <p className="text-3xl font-bold tracking-tight text-success">{totalAvailableSlots}</p>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">
            {totalAvailableSlots === 1 ? 'slot' : 'slots'} open
          </p>
        </div>
        {totalDates > 0 && (
          <div>
            <p className="text-3xl font-bold tracking-tight text-muted-foreground/40">{totalDates}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              {totalDates === 1 ? 'date' : 'dates'} available
            </p>
          </div>
        )}
      </div>

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Upcoming available</p>
          <div className="space-y-1">
            {upcoming.slice(0, 5).map((s) => {
              const slotsCount = Number(s.availableSlots) || 0;
              return (
                <div key={s.date} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{formatDateShort(s.date)}</span>
                  <span className="text-xs text-success font-medium">
                    {slotsCount} {slotsCount === 1 ? 'slot' : 'slots'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalAvailableSlots === 0 && (
        <p className="text-xs text-muted-foreground">
          No available slots this month. Try navigating to the next month.
        </p>
      )}
    </div>
  );
}

// ─── Custom Calendar (connected-bar style) ──────────────────────────────────

function CustomCalendar({
  selectedDate,
  onSelect,
  dateStatuses,
  onMonthChange,
}: {
  selectedDate: Date | undefined;
  onSelect: (date: Date) => void;
  dateStatuses: DateAvailabilityStatus[];
  onMonthChange: (yearMonth: string) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const today = new Date();

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const statusMap = new Map(dateStatuses.map((s) => [s.date, s.status]));

  const cells: { day: number | null; status: 'available' | 'full' | null; isToday: boolean; isPast: boolean; isSelected: boolean }[] = [];
  for (let i = 0; i < startDayOfWeek; i++) cells.push({ day: null, status: null, isToday: false, isPast: false, isSelected: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cellDate = new Date(viewYear, viewMonth, d);
    const isToday = d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
    const isPast = cellDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isSelected = selectedDate
      ? d === selectedDate.getDate() && viewMonth === selectedDate.getMonth() && viewYear === selectedDate.getFullYear()
      : false;
    cells.push({ day: d, status: statusMap.get(key) ?? null, isToday, isPast, isSelected });
  }

  const goToPrev = () => {
    const newMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const newYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    setViewMonth(newMonth);
    setViewYear(newYear);
    onMonthChange(`${newYear}-${String(newMonth + 1).padStart(2, '0')}`);
  };

  const goToNext = () => {
    const newMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const newYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    setViewMonth(newMonth);
    setViewYear(newYear);
    onMonthChange(`${newYear}-${String(newMonth + 1).padStart(2, '0')}`);
  };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const hasLeftConnect = (i: number) => {
    const cell = cells[i];
    if (!cell.day || !cell.status || cell.isPast) return false;
    const prev = cells[i - 1];
    return prev?.day !== null && prev?.status === cell.status && !prev?.isPast;
  };

  const hasRightConnect = (i: number) => {
    const cell = cells[i];
    if (!cell.day || !cell.status || cell.isPast) return false;
    const next = cells[i + 1];
    return next?.day !== null && next?.status === cell.status && !next?.isPast;
  };

  const isPrevDisabled = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" className="size-8" onClick={goToPrev} disabled={isPrevDisabled}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
        <Button variant="ghost" size="icon" className="size-8" onClick={goToNext}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-0 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {cells.map((cell, i) => {
          const leftConn = hasLeftConnect(i);
          const rightConn = hasRightConnect(i);
          return (
            <div
              key={`${cell.day ?? 'empty'}-${i}`}
              className={cn(
                'flex items-center justify-center aspect-square p-px',
                leftConn && '-ml-px',
                rightConn && '-mr-px',
              )}
            >
              {cell.day !== null ? (
                <button
                  type="button"
                  onClick={() => {
                    if (cell.status === 'available' && !cell.isPast) {
                      onSelect(new Date(viewYear, viewMonth, cell.day!));
                    }
                  }}
                  disabled={cell.status !== 'available' || cell.isPast}
                  aria-label={`${format(new Date(viewYear, viewMonth, cell.day!), 'EEEE, MMMM d')}${cell.status ? `, ${cell.status}` : ''}`}
                  className={cn(
                    'relative flex items-center justify-center w-full h-full text-[11px] font-semibold transition duration-150',
                    !leftConn && !rightConn && 'rounded-lg',
                    leftConn && !rightConn && 'rounded-r-none rounded-l-lg',
                    !leftConn && rightConn && 'rounded-l-none rounded-r-lg',
                    leftConn && rightConn && 'rounded-none',
                    cell.isSelected && !cell.status && 'ring-1.5 ring-primary ring-offset-0.5 ring-offset-card',
                    cell.isToday && !cell.status && 'ring-1.5 ring-primary/40',
                    cell.status === 'available' && !cell.isPast && 'bg-success text-success-foreground hover:brightness-110 cursor-pointer',
                    cell.status === 'full' && 'bg-destructive/80 text-destructive-foreground cursor-not-allowed',
                    !cell.status && !cell.isPast && 'text-muted-foreground/40 cursor-not-allowed',
                    cell.isPast && 'text-muted-foreground/30 cursor-not-allowed',
                    cell.isSelected && cell.status === 'available' && 'ring-1.5 ring-white ring-offset-1 ring-offset-success',
                  )}
                >
                  {cell.day}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-success" />
          <span className="text-[10px] text-muted-foreground font-medium">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-destructive/80" />
          <span className="text-[10px] text-muted-foreground font-medium">Full</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/35" />
          <span className="text-[10px] text-muted-foreground font-medium">Unavailable</span>
        </div>
      </div>
    </div>
  );
}
