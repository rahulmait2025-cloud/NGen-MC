'use client';

import { type RefObject, useCallback, useEffect, useState, useMemo } from 'react';
import {
  Award,
  Copy,
  ExternalLink,
  HelpCircle,
  IndianRupee,
  Linkedin,
  MessageCircle,
  Share2,
  TrendingUp,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CampusAmbassadorPageState } from '@/lib/services/campus-ambassador';
import type { CampusAmbassadorReferralDetail } from '@/lib/services/campus-ambassador';
import { getCampusAmbassadorReferralDetailsAction } from '@/app/campus-ambassador/actions';
import {
  MILESTONES,
  getMilestoneFor,
  getNextMilestone,
  type MilestoneView,
} from '@/lib/campus-ambassador/milestones';
import { getCampusAmbassadorDiscountLabel } from '@/lib/campus-ambassador/share';
import { CampusContainer } from './campus-layout';
import { cn } from '@/lib/utils';

interface AmbassadorDashboardStateProps {
  state: CampusAmbassadorPageState;
  onStateChange?: (state: CampusAmbassadorPageState) => void;
  couponSectionRef?: RefObject<HTMLDivElement | null>;
}

function formatInr(minor: number): string {
  return `\u20B9${(minor / 100).toLocaleString('en-IN')}`;
}

function formatJoinedDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => false,
    );
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.cssText = 'position:fixed;opacity:0;';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  return Promise.resolve(ok);
}

export function AmbassadorDashboardState({
  state,
  couponSectionRef,
}: AmbassadorDashboardStateProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [referralDetails, setReferralDetails] = useState<CampusAmbassadorReferralDetail[]>([]);
  const [referralLoading, setReferralLoading] = useState(true);
  const [sortKey, setSortKey] = useState<keyof CampusAmbassadorReferralDetail | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: keyof CampusAmbassadorReferralDetail) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedReferralDetails = useMemo(() => {
    if (!sortKey) return referralDetails;

    return [...referralDetails].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      return 0;
    });
  }, [referralDetails, sortKey, sortOrder]);

  const { application, ambassador, coupon, analytics, share } = state;

  useEffect(() => {
    getCampusAmbassadorReferralDetailsAction().then((result) => {
      if (result.ok && result.data) {
        setReferralDetails(result.data);
      }
      setReferralLoading(false);
    });
  }, []);

  const copyCode = useCallback(async () => {
    if (!coupon?.code) return;
    const ok = await copyToClipboard(coupon.code);
    if (ok) {
      setCopiedCode(true);
      toast.success('Coupon code copied');
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      toast.error('Could not copy code');
    }
  }, [coupon]);

  const copyInviteMessage = useCallback(async () => {
    if (!share?.shareMessage) return;
    const ok = await copyToClipboard(share.shareMessage);
    if (ok) {
      setCopiedInvite(true);
      toast.success('Invite message copied');
      setTimeout(() => setCopiedInvite(false), 2000);
    } else {
      toast.error('Could not copy invite message');
    }
  }, [share]);

  const shareNative = useCallback(async () => {
    if (!share) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join NextGen CTO with my ambassador coupon',
          text: share.shareMessage,
          url: share.shareUrl,
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        await copyInviteMessage();
      }
      return;
    }
    await copyInviteMessage();
  }, [share, copyInviteMessage]);

  const shareWhatsApp = useCallback(() => {
    if (!share?.whatsappUrl) return;
    window.open(share.whatsappUrl, '_blank', 'noopener,noreferrer');
  }, [share]);

  const shareLinkedIn = useCallback(async () => {
    if (!share?.shareMessage || !share?.linkedinUrl) return;
    const ok = await copyToClipboard(share.shareMessage);
    if (ok) {
      toast.success('Caption copied. Paste it into LinkedIn to complete your post.');
    } else {
      toast.error('Could not copy caption');
      return;
    }
    window.open(share.linkedinUrl, '_blank', 'noopener,noreferrer');
  }, [share]);

  if (!application || !ambassador) return null;

  if (!coupon?.code) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-background pb-16">
        <CampusContainer className="py-16">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Ambassador profile ready</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Your ambassador coupon is being prepared. Please refresh the page in a moment or
                contact support if this message persists.
              </p>
            </CardContent>
          </Card>
        </CampusContainer>
      </div>
    );
  }

  const paidReferrals = analytics?.paidReferralCount ?? 0;
  const discountLabel = getCampusAmbassadorDiscountLabel(coupon);
  const currentMilestone = getMilestoneFor(paidReferrals);
  const nextMilestone = getNextMilestone(paidReferrals);
  const progressPercent = analytics?.progressPercent ?? 0;

  const generatedMinor = (ambassador.total_generated_minor as number) ?? 0;
  const paidMinor = (ambassador.total_paid_minor as number) ?? 0;
  const revenueMinor = analytics?.revenueGeneratedMinor ?? 0;
  const discountMinor = analytics?.totalDiscountGivenMinor ?? 0;

  return (
    <div className="relative overflow-x-hidden pb-16">
      <CampusContainer className="space-y-5 pt-6 pb-10">

        {/* Header */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col">
            <h1
              className="text-3xl font-bold text-foreground md:text-4xl leading-tight"
              style={{ textWrap: 'balance' }}
            >
              {application.full_name.split(' ')[0]}&apos;s Ambassador Hub
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
              <span>{application.college_name}</span>
              <span aria-hidden>·</span>
              <span>Joined {formatJoinedDate(ambassador.joined_at)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-border capitalize text-foreground">
              {ambassador.status}
            </Badge>
            <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
              {currentMilestone.label}
            </Badge>
          </div>
        </section>

        {/* Analytics overview — 4 metric cards */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            label="Paid referrals"
            value={String(paidReferrals)}
            icon={<Users className="size-4" />}
            iconBg="bg-primary/10"
            iconColor="text-primary"
          >
            {nextMilestone ? (
              <span className="text-muted-foreground">
                {analytics ? `${analytics.progressTarget - paidReferrals} to ${nextMilestone.label.replace(' Ambassador', '')}` : ''}
              </span>
            ) : (
              <span className="text-primary font-semibold">Max tier reached</span>
            )}
          </MetricCard>

          <MetricCard
            label="Net revenue"
            value={formatInr(revenueMinor)}
            icon={<IndianRupee className="size-4" />}
            iconBg="bg-primary/10"
            iconColor="text-primary"
          >
            {paidReferrals > 0 ? (
              <span className="text-muted-foreground">
                Avg {formatInr(Math.round(revenueMinor / paidReferrals))}/ref
              </span>
            ) : (
              <span className="text-muted-foreground">No referrals yet</span>
            )}
          </MetricCard>

          <MetricCard
            label="Discounts Given"
            value={formatInr(discountMinor)}
            icon={<TrendingUp className="size-4" />}
            iconBg="bg-primary/10"
            iconColor="text-primary"
          >
            <span className="text-muted-foreground">{discountLabel} per referral</span>
          </MetricCard>

          <MetricCard
            label="Commission earned"
            value={formatInr(generatedMinor)}
            icon={<Award className="size-4" />}
            iconBg="bg-primary/10"
            iconColor="text-primary"
          >
            {paidMinor > 0 ? (
              <span className="text-muted-foreground">{formatInr(paidMinor)} paid out</span>
            ) : (
              <span className="text-muted-foreground">Pending payout</span>
            )}
          </MetricCard>
        </section>

        {/* Coupon + Share — two-column layout */}
        <section ref={couponSectionRef} className="scroll-mt-28 grid gap-5 lg:grid-cols-5">
          {/* Coupon code — takes 2 cols */}
          <Card className="border-border bg-card lg:col-span-2">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Your Coupon
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {discountLabel} discount for your friends
                </p>
              </div>
              <div className="mt-6 space-y-4">
                <code className="block rounded-lg bg-primary/5 px-5 py-4 font-mono text-2xl font-bold tracking-[0.15em] text-primary md:text-3xl text-center border border-primary/10">
                  {coupon.code}
                </code>
                <Button
                  variant="outline"
                  onClick={copyCode}
                  className="w-full rounded-lg border-border font-semibold active:scale-[0.98] transition-transform duration-150"
                >
                  <Copy className="mr-2 size-4" />
                  {copiedCode ? 'Copied!' : 'Copy Code'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Share actions — takes 3 cols */}
          <Card className="border-border bg-card lg:col-span-3">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Share with Friends
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Spread the word and earn rewards for every referral
                </p>
              </div>
              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="rounded-lg font-semibold active:scale-[0.98] transition duration-150"
                    onClick={shareNative}
                  >
                    <Share2 className="mr-2 size-4" /> Share
                  </Button>
                  {share ? (
                    <>
                      <Button
                        variant="outline"
                        className="rounded-lg border-border text-foreground hover:bg-muted/50 active:scale-[0.98] transition duration-150"
                        onClick={shareWhatsApp}
                      >
                        <MessageCircle className="mr-2 size-4" /> WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-lg border-border text-foreground hover:bg-muted/50 active:scale-[0.98] transition duration-150"
                        onClick={shareLinkedIn}
                      >
                        <Linkedin className="mr-2 size-4" /> LinkedIn
                      </Button>
                    </>
                  ) : null}
                </div>
                <div className="h-px bg-border" />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyInviteMessage}
                    className="rounded-lg border-border active:scale-[0.98] transition duration-150"
                  >
                    <Copy className="mr-2 size-3.5" />
                    {copiedInvite ? 'Invite copied!' : 'Copy invite message'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Milestone progress */}
        <section>
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Milestone Progress
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Unlock rewards and raise your ambassador tier
                  </p>
                </div>
                {analytics ? (
                  <Badge variant="outline" className="border-primary/20 text-primary self-start sm:self-center">
                    {paidReferrals}/{analytics.progressTarget} referrals to next tier
                  </Badge>
                ) : null}
              </div>
              <div className="space-y-6">
                <Progress
                  value={progressPercent}
                  className="h-2.5"
                  aria-label={`${paidReferrals} of ${analytics?.progressTarget ?? 0} paid referrals toward ${nextMilestone?.label ?? 'maximum tier'}`}
                />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {MILESTONES.map((m) => {
                    const state: MilestoneView['state'] =
                      paidReferrals >= m.target ? 'achieved' : 'locked';
                    return (
                      <div
                        key={m.label}
                        className={cn(
                          'rounded-lg border p-3.5 transition-colors duration-200',
                          state === 'achieved'
                            ? 'border-primary/20 bg-primary/[0.04]'
                            : 'border-border bg-muted/30',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {state === 'achieved' ? (
                            <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Check className="size-3" strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50 text-[10px] font-semibold text-muted-foreground">
                              {m.target}
                            </div>
                          )}
                          <p className="text-sm font-medium text-foreground truncate">{m.label}</p>
                        </div>
                        <p className="mt-1.5 pl-7 text-xs text-muted-foreground">{m.target} referrals</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Referral Details */}
        <section>
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="pb-6">
                <h3 className="text-lg font-semibold text-foreground">
                  Who Used Your Coupon
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Real-time status of your coupon code usages
                </p>
              </div>
              {referralLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-48 hidden sm:block" />
                      <Skeleton className="h-4 w-24 ml-auto" />
                    </div>
                  ))}
                </div>
              ) : referralDetails.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No referrals yet. Share your coupon code to get started.
                </p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="hover:bg-muted/50">
                        <TableHead
                          className="cursor-pointer select-none py-3 text-left font-semibold text-foreground hover:bg-muted/80 transition-colors"
                          onClick={() => handleSort('purchaserName')}
                          aria-label="Sort by name"
                        >
                          <div className="flex items-center gap-1.5">
                            Name
                            {sortKey === 'purchaserName' ? (
                              sortOrder === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
                            ) : (
                              <ArrowUpDown className="size-3.5 text-muted-foreground/40" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none py-3 text-left font-semibold text-foreground hover:bg-muted/80 transition-colors hidden sm:table-cell"
                          onClick={() => handleSort('entityTitle')}
                          aria-label="Sort by course"
                        >
                          <div className="flex items-center gap-1.5">
                            Course
                            {sortKey === 'entityTitle' ? (
                              sortOrder === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
                            ) : (
                              <ArrowUpDown className="size-3.5 text-muted-foreground/40" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none py-3 text-right font-semibold text-foreground hover:bg-muted/80 transition-colors"
                          onClick={() => handleSort('discountAmountMinor')}
                          aria-label="Sort by discount"
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            Discount
                            {sortKey === 'discountAmountMinor' ? (
                              sortOrder === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
                            ) : (
                              <ArrowUpDown className="size-3.5 text-muted-foreground/40" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none py-3 text-right font-semibold text-foreground hover:bg-muted/80 transition-colors"
                          onClick={() => handleSort('orderStatus')}
                          aria-label="Sort by status"
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            Status
                            {sortKey === 'orderStatus' ? (
                              sortOrder === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
                            ) : (
                              <ArrowUpDown className="size-3.5 text-muted-foreground/40" />
                            )}
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedReferralDetails.map((ref) => (
                        <TableRow key={ref.usageId}>
                          <TableCell className="py-3">
                            <p className="font-medium text-foreground truncate max-w-[140px]">
                              {ref.purchaserName || ref.purchaserEmail.split('@')[0]}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[140px] mt-0.5">{ref.purchaserEmail}</p>
                          </TableCell>
                          <TableCell className="py-3 hidden sm:table-cell">
                            <p className="text-foreground truncate max-w-[180px] font-medium">{ref.entityTitle}</p>
                            {ref.planLabel ? (
                              <p className="text-xs text-muted-foreground truncate max-w-[180px] mt-0.5">
                                {ref.planLabel}
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <span className="text-primary font-medium">
                              ₹{(ref.discountAmountMinor / 100).toLocaleString('en-IN')}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <Badge
                              variant="outline"
                              className={cn(
                                'capitalize text-xs',
                                ref.orderStatus === 'paid'
                                  ? 'border-primary/20 text-primary bg-primary/5'
                                  : 'border-border text-muted-foreground',
                              )}
                            >
                              {ref.orderStatus === 'paid' ? 'Paid' : ref.orderStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Help footer */}
        <section>
          <Card className="border-border bg-card">
            <CardContent className="px-8 py-6 md:flex md:items-center md:justify-between md:gap-8 md:px-10">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Questions about the program?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Check the FAQ or reach out to our team for help.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 md:mt-0 md:shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg border-border font-semibold active:scale-[0.98] transition-transform duration-150"
                  asChild
                >
                  <a href="/campus-ambassador#faq">
                    <HelpCircle className="mr-2 size-3.5" /> FAQ
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg border-border font-semibold active:scale-[0.98] transition-transform duration-150"
                  asChild
                >
                  <a href="mailto:support@nextgen-cto.in">
                    <ExternalLink className="mr-2 size-3.5" /> Support
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </CampusContainer>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  children,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-5 flex flex-col justify-between min-h-[140px]">
        <div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              {label}
            </span>
            <div className={cn(
              'flex size-8 items-center justify-center rounded-lg',
              iconBg,
              iconColor,
            )}>
              {icon}
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground tracking-tight">
            {value}
          </p>
        </div>
        <div className="mt-4 flex items-center gap-1.5 text-xs font-medium">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
