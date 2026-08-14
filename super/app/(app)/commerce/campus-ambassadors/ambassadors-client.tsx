'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, UserX, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { removeAmbassador, toggleCoupon, grantPayout, updateAmbassadorDiscount } from './actions';
import type { AmbassadorRow } from '@/lib/services/campus-ambassador-admin';

function fmtCurrency(minor: number): string {
  return `\u20B9${(minor / 100).toLocaleString('en-IN')}`;
}

interface AmbassadorsClientProps {
  active: AmbassadorRow[];
  removed: AmbassadorRow[];
  totalActive: number;
  totalRemoved: number;
  currentPage: number;
  pageSize: number;
}

export function AmbassadorsClient({
  active,
  removed,
  totalActive,
  totalRemoved,
  currentPage,
  pageSize,
}: AmbassadorsClientProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<'active' | 'removed'>('active');
  const [removeDialog, setRemoveDialog] = useState<AmbassadorRow | null>(null);
  const [payoutDialog, setPayoutDialog] = useState<AmbassadorRow | null>(null);
  const [discountDialog, setDiscountDialog] = useState<AmbassadorRow | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutVia, setPayoutVia] = useState('');
  const [payoutRef, setPayoutRef] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [loading, setLoading] = useState(false);

  const rows = activeView === 'active' ? active : removed;
  const totalCount = activeView === 'active' ? totalActive : totalRemoved;
  const totalPages = Math.ceil(totalCount / pageSize);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const goToPage = useCallback((page: number) => {
    const params = new URLSearchParams();
    params.set('tab', 'ambassadors');
    params.set('page', String(page));
    router.push(`?${params.toString()}`);
  }, [router]);

  async function handleRemove() {
    if (!removeDialog) return;
    setLoading(true);
    const result = await removeAmbassador(removeDialog.id);
    setLoading(false);
    if (result.ok) {
      toast.success('Ambassador removed. Coupon disabled.');
      setRemoveDialog(null);
      refresh();
    } else {
      toast.error(result.error ?? 'Failed to remove');
    }
  }

  async function handleToggle(amb: AmbassadorRow, enable: boolean) {
    setLoading(true);
    const result = await toggleCoupon(amb.id, enable);
    setLoading(false);
    if (result.ok) {
      toast.success(enable ? 'Ambassador access enabled.' : 'Ambassador access disabled.');
      refresh();
    } else {
      toast.error(result.error ?? 'Failed to toggle');
    }
  }

  async function handleGrantPayout() {
    if (!payoutDialog || !payoutAmount) return;
    const amountPaise = Math.round(parseFloat(payoutAmount) * 100);
    if (isNaN(amountPaise) || amountPaise <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setLoading(true);
    const result = await grantPayout(
      payoutDialog.id,
      amountPaise,
      payoutVia || null,
      payoutRef || null,
    );
    setLoading(false);
    if (result.ok) {
      toast.success(`\u20B9${payoutAmount} payout recorded.`);
      setPayoutDialog(null);
      setPayoutAmount('');
      setPayoutVia('');
      setPayoutRef('');
      refresh();
    } else {
      toast.error(result.error ?? 'Failed to grant payout');
    }
  }

  async function handleDiscountUpdate() {
    if (!discountDialog || !discountValue) return;
    const val = parseInt(discountValue, 10);
    if (isNaN(val) || val <= 0 || val > 100) {
      toast.error('Enter a valid discount % (1-100)');
      return;
    }
    setLoading(true);
    const result = await updateAmbassadorDiscount(discountDialog.id, val);
    setLoading(false);
    if (result.ok) {
      toast.success(`Discount updated to ${val}%`);
      setDiscountDialog(null);
      setDiscountValue('');
      refresh();
    } else {
      toast.error(result.error ?? 'Failed to update discount');
    }
  }

  return (
    <>
      {/* Filter tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          className={`flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
            activeView === 'active'
              ? 'border-emerald-500/40 bg-emerald-500/[0.04] text-foreground'
              : 'border-border/60 bg-card text-muted-foreground hover:bg-muted/30 hover:text-foreground'
          }`}
          onClick={() => setActiveView('active')}
        >
          <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
            <Users className="size-3.5" />
          </div>
          <span>Active</span>
          <span className={`ml-0.5 text-xs font-semibold tabular-nums ${activeView === 'active' ? 'text-foreground' : 'text-muted-foreground/60'}`}>
            {totalActive}
          </span>
        </button>
        <button
          type="button"
          className={`flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
            activeView === 'removed'
              ? 'border-red-500/40 bg-red-500/[0.04] text-foreground'
              : 'border-border/60 bg-card text-muted-foreground hover:bg-muted/30 hover:text-foreground'
          }`}
          onClick={() => setActiveView('removed')}
        >
          <div className="flex size-7 items-center justify-center rounded-md bg-red-500/10 text-red-600">
            <UserX className="size-3.5" />
          </div>
          <span>Removed</span>
          <span className={`ml-0.5 text-xs font-semibold tabular-nums ${activeView === 'removed' ? 'text-foreground' : 'text-muted-foreground/60'}`}>
            {totalRemoved}
          </span>
        </button>
      </div>

      {/* Table */}
      <section className="rounded-xl border border-border bg-background overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/60">
              <TableHead className="text-xs font-medium text-muted-foreground/70 pl-5 py-2.5">Name</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground/70 py-2.5">College</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground/70 py-2.5">Coupon</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground/70 py-2.5">Discount</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground/70 py-2.5 text-right">Commission</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground/70 py-2.5 text-right">Paid out</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground/70 py-2.5 text-right">Remaining</TableHead>
              <TableHead className="text-xs font-medium text-muted-foreground/70 pr-5 py-2.5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="size-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No {activeView} ambassadors</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((amb) => {
                const remaining = (amb.total_generated_minor ?? 0) - (amb.total_paid_minor ?? 0);
                const isAccessDisabled = !amb.access_enabled;
                return (
                  <TableRow key={amb.id} className="border-b border-border/30 last:border-0">
                    <TableCell className="py-3 pl-5">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{amb.application?.full_name ?? 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">{amb.application?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground">{amb.application?.college_name}</TableCell>
                    <TableCell className="py-3">
                      <code className="font-mono text-[10px] font-semibold bg-muted/50 px-2 py-1 rounded-md text-foreground">
                        {amb.coupon?.code ?? 'N/A'}
                      </code>
                    </TableCell>
                    <TableCell className="py-3">
                      <button
                        className="text-sm font-semibold text-primary hover:underline cursor-pointer"
                        onClick={() => {
                          setDiscountDialog(amb);
                          setDiscountValue(String(amb.coupon?.discount_value ?? 20));
                        }}
                      >
                        {amb.coupon?.discount_value ?? 20}%
                      </button>
                    </TableCell>
                    <TableCell className="py-3 text-sm font-semibold font-mono tabular-nums text-right">
                      {fmtCurrency(amb.total_generated_minor ?? 0)}
                    </TableCell>
                    <TableCell className="py-3 text-sm font-mono tabular-nums text-right text-muted-foreground">
                      {fmtCurrency(amb.total_paid_minor ?? 0)}
                    </TableCell>
                    <TableCell className="py-3 text-sm font-semibold font-mono tabular-nums text-right">
                      {fmtCurrency(remaining)}
                    </TableCell>
                    <TableCell className="py-3 pr-5">
                      <div className="flex items-center justify-end gap-1.5">
                        {activeView === 'active' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setPayoutDialog(amb)}
                            >
                              <DollarSign className="mr-1 size-3" /> Pay
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleToggle(amb, isAccessDisabled)}
                            >
                              {isAccessDisabled ? 'Enable' : 'Disable'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              onClick={() => setRemoveDialog(amb)}
                            >
                              Remove
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/60 px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages} ({totalCount} total)
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) goToPage(currentPage - 1);
                    }}
                    className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        isActive={page === currentPage}
                        onClick={(e) => {
                          e.preventDefault();
                          goToPage(page);
                        }}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) goToPage(currentPage + 1);
                    }}
                    className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </section>

      {/* Remove Dialog */}
      <Dialog open={!!removeDialog} onOpenChange={() => setRemoveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Ambassador</DialogTitle>
            <DialogDescription>
              This will disable the coupon and hide the ambassador from the student.
              All data is preserved in the database.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm">
            Remove <strong>{removeDialog?.application?.full_name}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemove} disabled={loading}>
              Remove Ambassador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payout Dialog */}
      <Dialog open={!!payoutDialog} onOpenChange={() => setPayoutDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Payout</DialogTitle>
            <DialogDescription>
              Record a payout to {payoutDialog?.application?.full_name}.
              Cannot exceed remaining balance of {fmtCurrency((payoutDialog?.total_generated_minor ?? 0) - (payoutDialog?.total_paid_minor ?? 0))}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payout-amount">Amount (\u20B9)</Label>
              <input
                id="payout-amount"
                type="number"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="0.00"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payout-via">Paid Via (optional)</Label>
              <input
                id="payout-via"
                type="text"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="UPI / Bank / Cash"
                value={payoutVia}
                onChange={(e) => setPayoutVia(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payout-ref">Reference (optional)</Label>
              <input
                id="payout-ref"
                type="text"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Transaction ID"
                value={payoutRef}
                onChange={(e) => setPayoutRef(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutDialog(null)}>Cancel</Button>
            <Button onClick={handleGrantPayout} disabled={loading}>
              Grant Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount Edit Dialog */}
      <Dialog open={!!discountDialog} onOpenChange={() => setDiscountDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ambassador Discount</DialogTitle>
            <DialogDescription>
              Change the discount for {discountDialog?.application?.full_name}&apos;s coupon.
              Only affects this ambassador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="discount-value">Discount (%)</Label>
            <input
              id="discount-value"
              type="number"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              min={1}
              max={100}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscountDialog(null)}>Cancel</Button>
            <Button onClick={handleDiscountUpdate} disabled={loading}>
              Update Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
