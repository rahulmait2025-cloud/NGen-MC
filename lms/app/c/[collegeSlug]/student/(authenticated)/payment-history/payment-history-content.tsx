'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PaymentHistoryRow } from '@/lib/services/payment-history';

// ── Formatting helpers ────────────────────────────────────────────────────────

function formatAmount(amountMinor: number, currency: string): string {
  const amount = amountMinor / 100;
  if (currency === 'INR') return `₹${amount.toLocaleString('en-IN')}`;
  return `${currency} ${amount.toLocaleString()}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Badge style maps ──────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  paid: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  failed: 'border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-400',
  pending: 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400',
  cancelled: 'border-border/50 bg-muted text-muted-foreground',
  refunded: 'border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-400',
};

const ENTITY_LABEL: Record<string, string> = {
  master_course: 'Course',
  course_variant: 'Variant',
  course_bundle: 'Bundle',
  paid_mentorship_booking: 'Mentorship',
  note_collection: 'Notes',
};

const STATUS_LABELS: Record<string, string> = {
  paid: 'Paid',
  failed: 'Failed',
  pending: 'Pending',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

const METHOD_LABELS: Record<string, string> = {
  upi: 'UPI',
  card: 'Card',
  netbanking: 'Net Banking',
  wallet: 'Wallet',
};

// ── Column definitions ────────────────────────────────────────────────────────

const columns: ColumnDef<PaymentHistoryRow>[] = [
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Date
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-sm font-medium">{formatDate(row.original.created_at)}</span>
        <span className="text-[11px] text-muted-foreground">
          {formatTime(row.original.created_at)}
        </span>
      </div>
    ),
    sortingFn: 'datetime',
  },
  {
    id: 'item',
    accessorFn: (row) => `${row.entity_type} ${row.entity_title}`,
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Item
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const title = row.original.entity_title;
      const planLabel = row.original.plan_label;
      const fullTitle = planLabel ? `${title} · ${planLabel}` : title;
      return (
        <div className="flex items-center gap-2 min-w-0">
          <Badge
            variant="outline"
            className="shrink-0 border-primary/20 bg-primary/10 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider text-primary"
          >
            {ENTITY_LABEL[row.original.entity_type] ?? row.original.entity_type}
          </Badge>
          <div className="min-w-0 max-w-[220px]">
            <span className="block truncate text-sm font-medium" title={fullTitle}>
              {title}
            </span>
            {planLabel ? (
              <span className="block truncate text-[11px] text-muted-foreground" title={planLabel}>
                {planLabel}
              </span>
            ) : null}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'total_amount_minor',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Amount
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const r = row.original;
      return (
        <div className="flex flex-col">
          <span className="text-sm font-semibold tabular-nums">
            {formatAmount(r.amount_minor, r.currency)}
          </span>
          {r.coupon_code && (
            <span className="text-[10px] text-muted-foreground">Code: {r.coupon_code}</span>
          )}
        </div>
      );
    },
    sortingFn: 'basic',
  },
  {
    accessorKey: 'payment_method',
    header: 'Method',
    cell: ({ row }) => {
      const method = row.original.payment_method;
      if (!method) return <span className="text-muted-foreground text-sm">—</span>;
      return (
        <span className="text-sm capitalize">
          {METHOD_LABELS[method] ?? method.charAt(0).toUpperCase() + method.slice(1)}
        </span>
      );
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Status
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          variant="outline"
          className={cn(
            'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
            STATUS_STYLES[status] ?? 'border-border bg-muted text-muted-foreground',
          )}
        >
          {STATUS_LABELS[status] ?? status}
        </Badge>
      );
    },
    filterFn: 'equals',
  },
  {
    accessorKey: 'gateway_payment_id',
    header: 'Payment ID',
    cell: ({ row }) => {
      const pid = row.original.gateway_payment_id;
      if (!pid) return <span className="text-sm text-muted-foreground">—</span>;
      return (
        <span
          className="block max-w-[140px] truncate font-mono text-xs text-muted-foreground"
          title={pid}
        >
          {pid}
        </span>
      );
    },
    enableSorting: false,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface PaymentHistoryContentProps {
  rows: PaymentHistoryRow[];
}

export function PaymentHistoryContent({ rows }: PaymentHistoryContentProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState('');

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      pagination: { pageSize: 10 },
      sorting: [{ id: 'created_at', desc: true }],
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
  });

  return (
    <div className="w-full space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                Status
                {columnFilters.some((f) => f.id === 'status') && (
                  <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                    1
                  </span>
                )}
                <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuGroup>
                {['paid', 'pending', 'failed', 'cancelled', 'refunded'].map((s) => (
                  <DropdownMenuCheckboxItem
                    key={s}
                    checked={columnFilters.some((f) => f.id === 'status' && f.value === s)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setColumnFilters((prev) => [
                          ...prev.filter((f) => f.id !== 'status'),
                          { id: 'status', value: s },
                        ]);
                      } else {
                        setColumnFilters((prev) => prev.filter((f) => f.id !== 'status'));
                      }
                    }}
                    className="capitalize"
                  >
                    {STATUS_LABELS[s] ?? s}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                Columns
                <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuGroup>
                {table.getAllColumns().reduce((acc, column) => {
                  if (column.getCanHide()) {
                    acc.push(
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id === 'created_at'
                        ? 'Date'
                        : column.id === 'total_amount_minor'
                          ? 'Amount'
                          : column.id === 'gateway_payment_id'
                            ? 'Payment ID'
                            : column.id}
                    </DropdownMenuCheckboxItem>
                    );
                  }
                  return acc;
                }, [] as React.ReactElement[])}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-muted-foreground">No transactions found.</p>
                    {globalFilter && (
                      <p className="text-xs text-muted-foreground">Try adjusting your search or filters.</p>
                    )}
                    {globalFilter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setGlobalFilter('')}
                        className="text-xs"
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} of {rows.length} transaction(s)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
