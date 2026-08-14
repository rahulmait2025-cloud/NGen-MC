'use client';

import React, { useReducer, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  UserPlus,
  Building2,
  LogIn,
  Shield,
  BookOpen,
  ClipboardList,
  Briefcase,
  Bell,
  Activity,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/admin/date-picker';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTenantPath } from '@/lib/hooks/use-tenant-path';
import type { ActivityEventWithActor } from '@/lib/activity/queries';
import { ACTIVITY_EVENT_NAMES } from '@/lib/activity/event-types';
import {
  formatAbsoluteTime,
  formatActivityRole,
  formatRelativeTime,
  getActivityEventLabel,
  getActivityEventSummary,
  getActivityMetadataEntries,
  getCategoryStyle,
} from '@/lib/activity/format-activity-event';

const EMPTY_EVENTS: ActivityEventWithActor[] = [];
const EMPTY_CATEGORIES: string[] = [];

type FilterState = {
  userId: string;
  eventName: string;
  eventCategory: string;
  from: string;
  to: string;
};

type FilterAction =
  | { type: 'SET'; field: keyof FilterState; value: string }
  | { type: 'CLEAR' };

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.field]: action.value };
    case 'CLEAR':
      return { userId: '', eventName: '', eventCategory: '', from: '', to: '' };
    default:
      return state;
  }
}

function EventIcon({ eventName, category }: { eventName: string; category: string }) {
  const cls = 'size-4 shrink-0';
  if (eventName.includes('student') || eventName.includes('invite')) {
    return <UserPlus className={cls} />;
  }
  if (eventName.includes('college') || category === 'tenant') {
    return <Building2 className={cls} />;
  }
  if (category === 'auth') {
    return <LogIn className={cls} />;
  }
  if (category === 'security') {
    return <Shield className={cls} />;
  }
  if (category === 'course' || category === 'lecture') {
    return <BookOpen className={cls} />;
  }
  if (category === 'assessment') {
    return <ClipboardList className={cls} />;
  }
  if (category === 'placement') {
    return <Briefcase className={cls} />;
  }
  if (category === 'notification') {
    return <Bell className={cls} />;
  }
  return <Activity className={cls} />;
}

const ActivityEventCard = React.memo(function ActivityEventCard({ row }: { row: ActivityEventWithActor }) {
  const [expanded, setExpanded] = useState(false);
  const summary = getActivityEventSummary(row.event_name, row.metadata);
  const metadataEntries = getActivityMetadataEntries(row.metadata);
  const categoryStyle = getCategoryStyle(row.event_category);
  const actorLabel =
    row.actor_name?.trim() ||
    row.actor_email?.trim() ||
    (row.actor_role === 'superadmin'
      ? 'Platform admin'
      : row.actor_user_id
        ? `User ${row.actor_user_id.slice(0, 8)}`
        : 'System');
  const actorSecondary = row.actor_name && row.actor_email ? row.actor_email : null;

  return (
    <article className="rounded-xl border border-border/60 bg-card p-4 sm:p-5 hover:border-primary/20 transition-colors">
      <div className="flex gap-3 sm:gap-4">
        <div
          className={cn(
            'size-10 rounded-xl flex items-center justify-center shrink-0 text-primary',
            'bg-primary/10',
          )}
        >
          <EventIcon eventName={row.event_name} category={row.event_category} />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground leading-snug">
                {getActivityEventLabel(row.event_name)}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed break-words">
                {summary}
              </p>
            </div>
            <time
              className="text-xs text-muted-foreground whitespace-nowrap shrink-0"
              title={formatAbsoluteTime(row.created_at)}
              suppressHydrationWarning
            >
              {formatRelativeTime(row.created_at)}
            </time>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className={cn('font-medium capitalize', categoryStyle.badge)}>
              {row.event_category}
            </Badge>
            {row.actor_role && (
              <Badge variant="secondary" className="font-normal">
                {formatActivityRole(row.actor_role)}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{actorLabel}</span>
            {actorSecondary && (
              <>
                <span aria-hidden="true">·</span>
                <span className="break-all">{actorSecondary}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span suppressHydrationWarning>{formatAbsoluteTime(row.created_at)}</span>
          </div>

          {metadataEntries.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
              >
                <ChevronDown
                  className={cn('size-3.5 transition-transform', expanded && 'rotate-180')}
                />
                {expanded ? 'Hide details' : 'View all details'}
              </button>
              {expanded && (
                <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3 text-xs">
                  {metadataEntries.map((entry) => (
                    <div key={entry.key} className="min-w-0">
                      <dt className="text-muted-foreground font-medium">{entry.label}</dt>
                      <dd className="text-foreground break-words mt-0.5">{entry.value}</dd>
                    </div>
                  ))}
                  {row.entity_type && (
                    <div className="min-w-0 sm:col-span-2">
                      <dt className="text-muted-foreground font-medium">Related entity</dt>
                      <dd className="text-foreground break-all mt-0.5 font-mono text-[11px]">
                        {row.entity_type}
                        {row.entity_id ? ` · ${row.entity_id}` : ''}
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
});

export function ActivityFeedPage({
  initialEvents = EMPTY_EVENTS,
  tenantName = null,
  eventCategories = EMPTY_CATEGORIES,
}: {
  initialEvents: ActivityEventWithActor[];
  tenantName: string | null;
  eventCategories: string[];
}) {
  const { push } = useRouter();
  const searchParams = useSearchParams();
  const { section } = useTenantPath();
  const activityPath = section('activity');

  const [filters, dispatch] = useReducer(filterReducer, {
    userId: searchParams.get('userId') ?? '',
    eventName: searchParams.get('eventName') ?? '',
    eventCategory: searchParams.get('eventCategory') ?? '',
    from: searchParams.get('from') ?? '',
    to: searchParams.get('to') ?? '',
  });

  const { userId, eventName, eventCategory, from, to } = filters;

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    if (eventName) params.set('eventName', eventName);
    if (eventCategory) params.set('eventCategory', eventCategory);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    push(`${activityPath}?${params.toString()}`);
  };

  const clearFilters = () => {
    dispatch({ type: 'CLEAR' });
    push(activityPath);
  };

  if (tenantName === null && initialEvents.length === 0) {
    return null;
  }

  const isFiltered = Boolean(eventName || eventCategory || userId || from || to);

  return (
    <div className="space-y-6">
      {isFiltered && (
        <p className="text-xs text-muted-foreground">
          Showing filtered results
        </p>
      )}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
        <p className="text-sm font-medium">Filters</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label htmlFor="filter-eventname" className="text-xs text-muted-foreground block mb-1">
              Event type
            </label>
            <Select
              value={eventName || 'all'}
              onValueChange={(v) =>
                dispatch({ type: 'SET', field: 'eventName', value: v === 'all' ? '' : v })
              }
            >
              <SelectTrigger id="filter-eventname" className="h-9 text-sm w-full">
                <SelectValue placeholder="All events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                {ACTIVITY_EVENT_NAMES.map((name) => (
                  <SelectItem key={name} value={name}>
                    {getActivityEventLabel(name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="filter-category" className="text-xs text-muted-foreground block mb-1">
              Category
            </label>
            <Select
              value={eventCategory || 'all'}
              onValueChange={(v) =>
                dispatch({ type: 'SET', field: 'eventCategory', value: v === 'all' ? '' : v })
              }
            >
              <SelectTrigger id="filter-category" className="h-9 text-sm w-full">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {eventCategories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="capitalize">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="filter-userid" className="text-xs text-muted-foreground block mb-1">
              Actor user ID
            </label>
            <Input
              id="filter-userid"
              placeholder="Optional UUID"
              value={userId}
              onChange={(e) =>
                dispatch({ type: 'SET', field: 'userId', value: e.target.value })
              }
              className="h-9 text-sm font-mono"
            />
          </div>
          <div>
            <label htmlFor="af-filter-from" className="text-xs text-muted-foreground block mb-1">
              From
            </label>
            <DatePicker
              id="af-filter-from"
              value={from}
              onChange={(val) => dispatch({ type: 'SET', field: 'from', value: val })}
            />
          </div>
          <div>
            <label htmlFor="af-filter-to" className="text-xs text-muted-foreground block mb-1">
              To
            </label>
            <DatePicker
              id="af-filter-to"
              value={to}
              onChange={(val) => dispatch({ type: 'SET', field: 'to', value: val })}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={applyFilters}>
            Apply filters
          </Button>
          <Button size="sm" variant="outline" onClick={clearFilters}>
            Clear
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        {initialEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
            <Activity className="size-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Events such as student invites, logins, and course updates will appear here.
            </p>
          </div>
        ) : (
          initialEvents.map((row) => <ActivityEventCard key={row.id} row={row} />)
        )}
      </section>
    </div>
  );
}
