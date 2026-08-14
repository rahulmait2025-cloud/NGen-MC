'use client';

import { useReducer, useTransition, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  listPaidMentorshipBookingsAction,
  getBookingDetailAction,
  markBookingCompletedAction,
  cancelBookingAndRefundAction,
} from './paid-mentorship-actions';
import type { BookingWithDetails } from '@/lib/services/paid-mentorship';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  confirmed: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  completed: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  rescheduled: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  missed: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
};

const SKILL_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

type BookingsListState = {
  bookings: BookingWithDetails[];
  total: number;
  page: number;
  statusFilter: string;
  search: string;
};

type BookingsListAction =
  | { type: 'SET_PAGE'; page: number }
  | { type: 'SET_STATUS_FILTER'; filter: string }
  | { type: 'SET_SEARCH'; search: string }
  | { type: 'LOAD_DONE'; bookings: BookingWithDetails[]; total: number };

const initialBookingsListState: BookingsListState = {
  bookings: [],
  total: 0,
  page: 1,
  statusFilter: 'all',
  search: '',
};

function bookingsListReducer(state: BookingsListState, action: BookingsListAction): BookingsListState {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, page: action.page };
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.filter, page: 1 };
    case 'SET_SEARCH':
      return { ...state, search: action.search };
    case 'LOAD_DONE':
      return { ...state, bookings: action.bookings, total: action.total };
  }
}

type DetailDialogState = {
  detailBooking: BookingWithDetails | null;
  showDetail: boolean;
};

type DetailDialogAction =
  | { type: 'SHOW_DETAIL'; booking: BookingWithDetails }
  | { type: 'HIDE_DETAIL' };

const initialDetailDialogState: DetailDialogState = {
  detailBooking: null,
  showDetail: false,
};

function detailDialogReducer(state: DetailDialogState, action: DetailDialogAction): DetailDialogState {
  switch (action.type) {
    case 'SHOW_DETAIL':
      return { detailBooking: action.booking, showDetail: true };
    case 'HIDE_DETAIL':
      return initialDetailDialogState;
  }
}

type CancelDialogState = {
  cancelTarget: BookingWithDetails | null;
  cancelReason: string;
};

type CancelDialogAction =
  | { type: 'SHOW_CANCEL'; booking: BookingWithDetails }
  | { type: 'SET_CANCEL_REASON'; reason: string }
  | { type: 'HIDE_CANCEL' };

const initialCancelDialogState: CancelDialogState = {
  cancelTarget: null,
  cancelReason: '',
};

function cancelDialogReducer(state: CancelDialogState, action: CancelDialogAction): CancelDialogState {
  switch (action.type) {
    case 'SHOW_CANCEL':
      return { cancelTarget: action.booking, cancelReason: '' };
    case 'SET_CANCEL_REASON':
      return { ...state, cancelReason: action.reason };
    case 'HIDE_CANCEL':
      return initialCancelDialogState;
  }
}

function BookingDetailDialog({
  detailBooking,
  showDetail,
  hideDetail,
  onMarkCompleted,
  onCancelRefund,
  isPending,
  formatDate,
  formatTime,
}: {
  detailBooking: BookingWithDetails | null;
  showDetail: boolean;
  hideDetail: () => void;
  onMarkCompleted: (id: string) => void;
  onCancelRefund: (booking: BookingWithDetails) => void;
  isPending: boolean;
  formatDate: (d: string) => string;
  formatTime: (t: string) => string;
}) {
  return (
    <Dialog open={showDetail} onOpenChange={(open) => { if (!open) hideDetail(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        {detailBooking && (
          <>
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
              <DialogDescription>
                Booked on {new Date(detailBooking.created_at).toLocaleDateString('en-IN')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="size-4 text-muted-foreground" />
                  <span className="font-medium">{detailBooking.profile?.full_name ?? 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="size-4 text-muted-foreground" />
                  <span>{detailBooking.profile?.email}</span>
                </div>
                {detailBooking.whatsapp_number && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="size-4 text-muted-foreground" />
                    <span>+91 {detailBooking.whatsapp_number}</span>
                  </div>
                )}
                {detailBooking.college && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="size-4 text-muted-foreground" />
                    <span>{detailBooking.college.name}</span>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-muted/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <span className="text-sm font-medium">{detailBooking.category?.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <span className="text-sm font-medium">{formatDate(detailBooking.session_date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Time</span>
                  <span className="text-sm font-medium">
                    {formatTime(detailBooking.start_time_ist)} - {formatTime(detailBooking.end_time_ist)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[detailBooking.status] ?? ''}`}>
                    {detailBooking.status.charAt(0).toUpperCase() + detailBooking.status.slice(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Skill Level</span>
                  <span className="text-sm font-medium">
                    {SKILL_LABELS[detailBooking.skill_level] ?? detailBooking.skill_level}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-muted/30 p-4 space-y-3">
                <h4 className="text-sm font-medium">Student Form Answers</h4>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">What do you want to achieve?</p>
                  <p className="text-sm">{detailBooking.achievement_goal}</p>
                </div>
                {detailBooking.additional_notes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Additional notes</p>
                    <p className="text-sm">{detailBooking.additional_notes}</p>
                  </div>
                )}
                {detailBooking.custom_answers && detailBooking.custom_answers.length > 0 && (
                  <div className="pt-2 border-t border-border/40 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category-Specific Answers</p>
                    {detailBooking.custom_answers.map((ca) => (
                      <div key={ca.question_id}>
                        <p className="text-xs text-muted-foreground">{ca.question}</p>
                        <p className="text-sm font-medium mt-0.5">{ca.answer || '—'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-muted/30 p-4 space-y-2">
                <h4 className="text-sm font-medium">Payment</h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">MRP</span>
                  <span className="text-sm line-through text-muted-foreground">
                    ₹{Math.round(detailBooking.original_price_minor / 100).toLocaleString('en-IN')}
                  </span>
                </div>
                {detailBooking.coupon_code && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Coupon</span>
                    <span className="text-sm font-medium text-green-600">
                      {detailBooking.coupon_code} (-₹{Math.round(detailBooking.discount_amount_minor / 100).toLocaleString('en-IN')})
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount Paid</span>
                  <span className="text-sm font-semibold">
                    ₹{Math.round(detailBooking.final_amount_minor / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {detailBooking.meeting_url && (
                <div className="rounded-lg bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground mb-1">Meeting Link</p>
                  <a
                    href={detailBooking.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {detailBooking.meeting_url}
                  </a>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              {detailBooking.status === 'confirmed' && (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onCancelRefund(detailBooking)}
                  >
                    <XCircle className="mr-1 size-3.5" />
                    Cancel & Refund
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onMarkCompleted(detailBooking.id)}
                    disabled={isPending}
                  >
                    <CheckCircle2 className="mr-1 size-3.5" />
                    Mark Complete
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CancelBookingDialog({
  cancelTarget,
  cancelReason,
  setCancelReason,
  hideCancel,
  onConfirm,
  isPending,
}: {
  cancelTarget: BookingWithDetails | null;
  cancelReason: string;
  setCancelReason: (reason: string) => void;
  hideCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={!!cancelTarget} onOpenChange={() => hideCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel & Refund Booking</DialogTitle>
          <DialogDescription>
            This will cancel the booking and initiate a refund via Razorpay for{' '}
            {cancelTarget?.profile?.full_name}. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor="cancel-reason" className="text-sm font-medium">Reason (optional)</label>
          <Input
            id="cancel-reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={hideCancel}>
            Keep Booking
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? 'Cancelling...' : 'Cancel & Refund'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PaidMentorshipBookingsTable() {
  const [isPending, startTransition] = useTransition();
  const [listState, listDispatch] = useReducer(bookingsListReducer, initialBookingsListState);
  const { bookings, total, page, statusFilter, search } = listState;
  const [detailState, detailDispatch] = useReducer(detailDialogReducer, initialDetailDialogState);
  const { detailBooking, showDetail } = detailState;
  const [cancelState, cancelDispatch] = useReducer(cancelDialogReducer, initialCancelDialogState);
  const { cancelTarget, cancelReason } = cancelState;

  const limit = 15;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const loadBookings = useCallback(() => {
    listPaidMentorshipBookingsAction({ page, limit, status: statusFilter, search }).then(
      (result) => {
        if (result.ok) {
          listDispatch({ type: 'LOAD_DONE', bookings: result.bookings, total: result.total });
        }
      },
    );
  }, [page, statusFilter, search]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleSearch = () => {
    listDispatch({ type: 'SET_PAGE', page: 1 });
    loadBookings();
  };

  const handleViewDetail = async (booking: BookingWithDetails) => {
    const result = await getBookingDetailAction(booking.id);
    if (result.ok && result.booking) {
      detailDispatch({ type: 'SHOW_DETAIL', booking: result.booking });
    }
  };

  const handleMarkCompleted = (bookingId: string) => {
    startTransition(async () => {
      const result = await markBookingCompletedAction(bookingId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Session marked as completed.');
      detailDispatch({ type: 'HIDE_DETAIL' });
      loadBookings();
    });
  };

  const handleCancel = () => {
    if (!cancelTarget) return;
    startTransition(async () => {
      const result = await cancelBookingAndRefundAction(cancelTarget.id, cancelReason);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.refundId
          ? `Booking cancelled. Refund initiated: ${result.refundId}`
          : 'Booking cancelled.',
      );
      cancelDispatch({ type: 'HIDE_CANCEL' });
      detailDispatch({ type: 'HIDE_DETAIL' });
      loadBookings();
    });
  };

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const formatTime = (t: string) => {
    const [h, m] = String(t).slice(0, 5).split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">Paid Bookings</h3>
          <p className="text-sm text-muted-foreground">
            Manage and track all paid mentorship bookings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => listDispatch({ type: 'SET_SEARCH', search: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={(val) => listDispatch({ type: 'SET_STATUS_FILTER', filter: val })}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="rescheduled">Rescheduled</SelectItem>
              <SelectItem value="missed">Missed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No bookings found.
                  </td>
                </tr>
              )}
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{b.profile?.full_name ?? 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{b.profile?.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{b.category?.title ?? '—'}</td>
                  <td className="px-4 py-3 text-sm">{formatDate(b.session_date)}</td>
                  <td className="px-4 py-3 text-sm">
                    {formatTime(b.start_time_ist)} - {formatTime(b.end_time_ist)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    ₹{Math.round(b.final_amount_minor / 100).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status] ?? ''}`}>
                      {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => handleViewDetail(b)}
                    >
                      <Eye className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => listDispatch({ type: 'SET_PAGE', page: Math.max(1, page - 1) })}
                disabled={page <= 1}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => listDispatch({ type: 'SET_PAGE', page: Math.min(totalPages, page + 1) })}
                disabled={page >= totalPages}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <BookingDetailDialog
        detailBooking={detailBooking}
        showDetail={showDetail}
        hideDetail={() => detailDispatch({ type: 'HIDE_DETAIL' })}
        onMarkCompleted={handleMarkCompleted}
        onCancelRefund={(booking) => {
          cancelDispatch({ type: 'SHOW_CANCEL', booking });
          detailDispatch({ type: 'HIDE_DETAIL' });
        }}
        isPending={isPending}
        formatDate={formatDate}
        formatTime={formatTime}
      />

      {/* Cancel Dialog */}
      <CancelBookingDialog
        cancelTarget={cancelTarget}
        cancelReason={cancelReason}
        setCancelReason={(reason) => cancelDispatch({ type: 'SET_CANCEL_REASON', reason })}
        hideCancel={() => cancelDispatch({ type: 'HIDE_CANCEL' })}
        onConfirm={handleCancel}
        isPending={isPending}
      />
    </div>
  );
}
