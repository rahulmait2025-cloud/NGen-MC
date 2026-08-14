'use client';

import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Megaphone,
  Network,
  Rocket,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import { CampusAmbassadorApplicationForm } from './campus-ambassador-application-form';
import { CampusCampaignVisual, RewardSilhouette } from './campus-campaign-visual';
import { CampusContainer, CampusSection } from './campus-layout';
import type { CampusAmbassadorPageState } from '@/lib/services/campus-ambassador';
import { cn } from '@/lib/utils';

const STRIP_ITEMS = [
  'Represent NextGen CTO',
  'Build Leadership Proof',
  'Exclusive Goodies',
  'Internship Opportunities',
  'Student-Led Movement',
  'Career-Ready Campus',
] as const;

const PROOF_CARDS = [
  { title: 'Personal Brand', desc: 'Become the go-to student voice for tech learning on campus.' },
  { title: 'Leadership Experience', desc: 'Build real influence through outreach, events, and peer support.' },
  { title: 'Career Credibility', desc: 'Add ambassador proof that recruiters and mentors recognize.' },
] as const;

const BENEFITS = [
  {
    icon: Sparkles,
    title: 'Build Personal Brand',
    desc: 'Grow visibility as a campus tech leader students trust.',
    span: 'lg:col-span-5',
    tall: true,
  },
  {
    icon: Megaphone,
    title: 'Leadership Experience',
    desc: 'Lead conversations, events, and peer outreach with confidence.',
    span: 'lg:col-span-7',
    tall: false,
  },
  {
    icon: Briefcase,
    title: 'Resume + LinkedIn Value',
    desc: 'Add credible ambassador proof to your professional profile.',
    span: 'lg:col-span-4',
    tall: false,
  },
  {
    icon: Network,
    title: 'Network with Ambitious Students',
    desc: 'Connect with leaders across colleges nationwide.',
    span: 'lg:col-span-4',
    tall: false,
  },
  {
    icon: Users,
    title: 'Help Friends Become Career-Ready',
    desc: 'Guide peers toward coding, AI, DSA, and placement paths.',
    span: 'lg:col-span-4',
    tall: false,
  },
  {
    icon: Rocket,
    title: 'Represent a Tech Education Brand',
    desc: 'Stand for practical, career-focused learning with NextGen CTO.',
    span: 'lg:col-span-12',
    tall: false,
  },
] as const;

const REWARDS = [
  { title: 'Certificate of Recognition', desc: 'Official proof of ambassador impact.', type: 'certificate' as const, span: 'md:col-span-4' },
  { title: 'Letter of Recommendation', desc: 'Top performers earn personalized LORs.', type: 'certificate' as const, span: 'md:col-span-4' },
  { title: 'NextGen CTO T-shirt', desc: 'Premium branded tee for campus leaders.', type: 'shirt' as const, span: 'md:col-span-4' },
  { title: 'Premium Hoodie', desc: 'Comfortable ambassador hoodie.', type: 'hoodie' as const, span: 'md:col-span-3' },
  { title: 'Mug', desc: 'Desk-ready NextGen CTO mug.', type: 'mug' as const, span: 'md:col-span-3' },
  { title: 'Swag Kit', desc: 'Stickers, merch, and ambassador bundle.', type: 'gift' as const, span: 'md:col-span-3' },
  { title: 'LinkedIn Shoutout', desc: 'Public recognition for standout impact.', type: 'badge' as const, span: 'md:col-span-3' },
  { title: 'Mentorship Access', desc: 'Connect with mentors and leaders.', type: 'mentorship' as const, span: 'md:col-span-6' },
  { title: 'Internship Opportunity', desc: 'Top performers unlock real team experience.', type: 'badge' as const, span: 'md:col-span-6', featured: true },
] as const;

const ACTIVITIES = [
  'Share NextGen CTO programs with peers',
  'Promote coding, AI, DSA, and career resources',
  'Help students discover learning opportunities',
  'Build engagement in your college network',
  'Represent your campus in the NextGen CTO community',
  'Collect feedback and help students grow',
] as const;

const STEPS = [
  { n: 1, title: 'Apply', desc: 'Tell us about yourself and your campus.' },
  { n: 2, title: 'Get Selected', desc: 'Join the ambassador cohort instantly.' },
  { n: 3, title: 'Start Representing', desc: 'Share resources and build impact.' },
  { n: 4, title: 'Earn & Grow', desc: 'Unlock rewards, recognition, and internships.' },
] as const;

const WHO_CHECKLIST = [
  'You are a college student',
  'You enjoy talking to people',
  'You are active in clubs or communities',
  'You care about coding, AI, placements, or career growth',
  'You want leadership experience',
  'You want to strengthen your resume and LinkedIn',
] as const;

const FAQ = [
  { q: 'Who can apply?', a: 'Any college student passionate about tech, career growth, and helping peers can apply. First-year students are welcome.' },
  { q: 'Is there any fee to join?', a: 'No. The NextGen CTO Campus Ambassador program is completely free.' },
  { q: 'What does a Campus Ambassador do?', a: 'You represent NextGen CTO on campus, share learning resources, help peers discover programs, and grow your personal brand.' },
  { q: 'What benefits will I get?', a: 'Certificates, recognition, resume value, community access, performance rewards, and internship opportunities for top performers.' },
  { q: 'Will I get NextGen CTO goodies?', a: 'Yes. Ambassadors can unlock T-shirts, hoodies, mugs, swag kits, and more as they hit milestones.' },
  { q: 'Can I get an internship opportunity?', a: 'Top-performing ambassadors may receive direct internship opportunities at NextGen CTO.' },
  { q: 'Do I need prior experience?', a: 'No prior ambassador experience is required. Passion and consistency matter more.' },
  { q: 'How much time does it take?', a: 'Roughly 2–3 hours per week. The role is flexible around your college schedule.' },
] as const;

interface PreJoinLandingStateProps {
  state: CampusAmbassadorPageState;
  userEmail: string | null;
  applyOpen: boolean;
  onApplyOpenChange: (open: boolean) => void;
  onApplicationSuccess: (state: CampusAmbassadorPageState) => void;
}

export function PreJoinLandingState({
  state,
  userEmail,
  applyOpen,
  onApplyOpenChange,
  onApplicationSuccess,
}: PreJoinLandingStateProps) {
  const router = useRouter();

  function openApply() {
    if (!state.isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check if application is pending review
    if (state.application?.status === 'submitted') {
      toast.info('Your application is pending review. You will be notified when approved.');
      return;
    }

    // Weekly cooldown for rejected resubmissions only.
    // Approved-but-removed ambassadors must be able to reapply immediately.
    if (
      state.application?.status === 'rejected' &&
      state.application.created_at &&
      process.env.NODE_ENV !== 'development'
    ) {
      const appDate = new Date(state.application.created_at);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (appDate > sevenDaysAgo) {
        toast.info('You have already applied this week. Please try again after 7 days.');
        return;
      }
    }

    onApplyOpenChange(true);
  }

  const defaultName = state.application?.full_name ?? '';

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      {/* Full-width hero */}
      <section className="relative w-full">
        <CampusContainer className="relative flex min-h-0 flex-col justify-center gap-10 py-14 lg:flex-row lg:items-center lg:gap-12 lg:py-20">
          <div className="z-10 w-full space-y-8 lg:w-[44%] lg:shrink-0 lg:py-2">
            <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Campus Ambassador Program
            </span>
            {state.application?.status === 'submitted' && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-amber-600 dark:text-amber-400 backdrop-blur-md flex items-start gap-3">
                <Sparkles className="size-5 shrink-0 mt-0.5 text-amber-500" />
                <div className="text-sm text-left">
                  <span className="font-bold">Application Under Review!</span>
                  <p className="mt-1 text-xs text-amber-600/80 dark:text-amber-400/80">
                    We have received your application. Once our team approves it, your ambassador dashboard and unique coupon will be unlocked.
                  </p>
                </div>
              </div>
            )}
            <h1 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] font-bold leading-[1.02] tracking-tight text-foreground">
              Lead Your Campus.
              <br />
              <span className="text-primary">Build Your Brand.</span>
              <br />
              Become the NextGen CTO Ambassador.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl md:leading-8">
              Represent NextGen CTO in your college, help students discover coding, AI, DSA, projects,
              and career-building opportunities, and unlock rewards, recognition, goodies, and
              internship opportunities.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Button
                size="lg"
                onClick={openApply}
                disabled={state.application?.status === 'submitted'}
                className={cn(
                  "h-14 rounded-full px-10 text-base font-bold transition duration-200",
                  state.application?.status === 'submitted'
                    ? "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-100"
                    : ""
                )}
              >
                {state.application?.status === 'submitted' ? (
                  <>Application Pending Review</>
                ) : (
                  <>Apply Now <ArrowRight className="ml-2 size-5" /></>
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 rounded-full border-border bg-card px-10 text-base text-foreground hover:bg-primary/5"
                asChild
              >
                <a href="#perks">Explore Perks</a>
              </Button>
            </div>
          </div>
          <div className="z-10 w-full lg:w-[56%] lg:min-w-0 lg:-translate-y-6 xl:-translate-y-10">
            <CampusCampaignVisual variant="hero" />
          </div>
        </CampusContainer>
      </section>

      {/* Campaign strip */}
      <div className="w-full overflow-hidden border-y border-border/60 bg-muted/40 py-5">
        <div className="flex gap-14 px-6 overflow-hidden">
          {[...STRIP_ITEMS, ...STRIP_ITEMS].map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="flex shrink-0 items-center gap-4 text-sm font-bold uppercase tracking-[0.16em] text-foreground md:text-base"
            >
              <span className="h-px w-8 bg-primary/30" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <CampusContainer>
        {/* Editorial why + proof */}
        <CampusSection id="why-join">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
            <h2 className="font-display text-4xl font-bold leading-[1.06] tracking-tight text-foreground md:text-5xl lg:text-6xl">
              More than referrals.
              <br />
              <span className="text-primary">This is your leadership proof.</span>
            </h2>
            <div className="space-y-8">
              <p className="text-lg leading-relaxed text-muted-foreground md:text-xl md:leading-8">
                Campus ambassadors don&apos;t just share links. They build trust, create awareness,
                help peers discover better learning paths, and develop real leadership experience.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                {PROOF_CARDS.map((card) => (
                  <article
                    key={card.title}
                    className="campus-surface-panel campus-card-hover rounded-2xl p-6 md:p-7"
                  >
                    <h3 className="font-display text-lg font-bold text-foreground">{card.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
                      {card.desc}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </CampusSection>

        {/* Benefits bento */}
        <CampusSection id="benefits">
          <div className="mb-12 max-w-3xl">
            <h2 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Why ambassadors win
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Built for students who want influence, impact, and career momentum — not passive
              referrals.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {BENEFITS.map(({ icon: Icon, title, desc, span, tall }) => (
              <article
                key={title}
                className={cn(
                  'campus-surface-panel campus-card-hover flex flex-col justify-between rounded-2xl p-7 md:p-9',
                  span,
                  tall ? 'min-h-[260px] lg:min-h-[300px]' : 'min-h-[190px]',
                )}
              >
                <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="size-6" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold text-foreground">{title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              </article>
            ))}
          </div>
        </CampusSection>

        {/* Rewards bento */}
        <CampusSection id="perks">
          <div className="mb-14 text-center">
            <h2 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Perks that make your impact{' '}
              <span className="text-primary">worth it.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Unlock recognition, goodies, mentorship, and internship opportunities as your campus
              impact grows.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
            {REWARDS.map((reward) => (
              <article
                key={reward.title}
                className={cn(
                  'campus-surface-panel campus-card-hover flex flex-col items-center rounded-2xl p-7 text-center md:p-8',
                  reward.span,
                  'featured' in reward && reward.featured
                    ? 'border-primary/30 min-h-[260px] md:min-h-[280px]'
                    : 'min-h-[220px]',
                )}
              >
                <RewardSilhouette type={reward.type} />
                <h3
                  className={cn(
                    'mt-5 font-display font-bold text-foreground',
                    'featured' in reward && reward.featured ? 'text-xl md:text-2xl' : 'text-lg',
                  )}
                >
                  {reward.title}
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground md:text-base">
                  {reward.desc}
                </p>
              </article>
            ))}
          </div>
        </CampusSection>

        {/* Internship spotlight — full width feel */}
        <CampusSection id="internship">
          <div className="grid items-center gap-12 overflow-hidden rounded-[2rem] border border-border bg-card p-8 md:p-14 lg:grid-cols-2 lg:p-16">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                Prestige opportunity
              </span>
              <h2 className="mt-5 font-display text-3xl font-bold leading-tight text-foreground md:text-4xl lg:text-5xl">
                Top performers can unlock internship opportunities at NextGen CTO.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground md:text-xl">
                Your ambassador work can open doors to real experience, deeper involvement with our
                team, and future growth opportunities.
              </p>
              <Button
                size="lg"
                disabled={state.application?.status === 'submitted'}
                className={cn(
                  "mt-10 h-14 rounded-full px-12 text-base font-bold transition duration-200",
                  state.application?.status === 'submitted'
                    ? "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-100"
                    : ""
                )}
                onClick={openApply}
              >
                {state.application?.status === 'submitted' ? 'Application Under Review' : 'Apply and Start Building'}
              </Button>
            </div>
            <CampusCampaignVisual variant="internship" />
          </div>
        </CampusSection>

        {/* What you'll do */}
        <CampusSection>
          <h2 className="mb-12 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            What will you <span className="text-primary">actually do?</span>
          </h2>
          <div className="relative space-y-5">
            {ACTIVITIES.map((item, i) => (
              <article
                key={item}
                className={cn(
                  'campus-surface-panel campus-card-hover max-w-3xl rounded-2xl p-6 md:p-8',
                  i % 2 === 1 ? 'ml-auto' : 'mr-auto',
                  i === 2 && 'lg:ml-12',
                  i === 4 && 'lg:mr-12',
                )}
              >
                <div className="flex items-start gap-5">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-display text-2xl font-bold text-primary">
                    {i + 1}
                  </span>
                  <p className="pt-2 font-display text-xl font-semibold leading-snug text-foreground md:text-2xl">
                    {item}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </CampusSection>

        {/* Journey */}
        <CampusSection id="how-it-works">
          <div className="mb-14 text-center">
            <h2 className="font-display text-4xl font-bold text-foreground md:text-5xl">
              Your ambassador journey
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">Four steps from application to impact.</p>
          </div>
          <div className="relative hidden md:block">
            <div className="campus-timeline-line" aria-hidden />
            <div className="relative grid grid-cols-4 gap-8">
              {STEPS.map((step) => (
                <div key={step.n} className="text-center">
                  <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full border-2 border-primary bg-card font-display text-2xl font-bold text-primary">
                    {step.n}
                  </div>
                  <h4 className="font-display text-xl font-bold text-foreground">{step.title}</h4>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-0 md:hidden">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative flex gap-5 pb-10">
                {i < STEPS.length - 1 ? (
                  <div className="absolute left-10 top-20 h-[calc(100%-2rem)] w-0.5 bg-gradient-to-b from-primary to-transparent opacity-30" />
                ) : null}
                <div className="flex size-20 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-card font-display text-xl font-bold text-primary">
                  {step.n}
                </div>
                <div className="pt-4">
                  <h4 className="font-display text-xl font-bold text-foreground">{step.title}</h4>
                  <p className="mt-2 text-base text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CampusSection>

        {/* Who should apply */}
        <CampusSection>
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-display text-4xl font-bold text-foreground md:text-5xl">
                Who should apply?
              </h2>
              <ul className="mt-10 space-y-5">
                {WHO_CHECKLIST.map((item) => (
                  <li key={item} className="flex items-start gap-4 text-lg">
                    <BadgeCheck className="mt-1 size-6 shrink-0 text-primary" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <CampusCampaignVisual variant="who-should-apply" />
          </div>
        </CampusSection>

        {/* Campus movement */}
        <CampusSection id="movement" className="text-center">
          <h2 className="font-display text-4xl font-bold text-foreground md:text-5xl lg:text-6xl">
            Be part of a{' '}
            <span className="text-primary">student-led movement.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            Join ambitious students helping their campuses become more career-ready with coding, AI,
            projects, and placement-focused learning.
          </p>
          <div className="relative mt-12 w-full">
            <div className="mx-auto w-full max-w-6xl rounded-[2rem] bg-card p-2 shadow-xl">
              <CampusCampaignVisual variant="movement" />
            </div>
          </div>
        </CampusSection>

        {/* FAQ */}
        <CampusSection id="faq">
          <h2 className="mb-10 text-center font-display text-4xl font-bold text-foreground md:text-5xl">
            FAQ
          </h2>
          <Accordion type="single" collapsible className="mx-auto max-w-4xl space-y-3">
            {FAQ.map((item, i) => (
              <AccordionItem
                key={item.q}
                value={`faq-${i}`}
                className="rounded-2xl border border-border bg-card px-5"
              >
                <AccordionTrigger className="py-5 text-left text-lg font-semibold text-foreground hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-base leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CampusSection>

        {/* Final CTA */}
        <CampusSection className="pb-36 md:pb-32">
          <div className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-card px-8 py-14 text-center md:px-16 md:py-20">
            <div className="relative z-10">
              <h2 className="font-display text-4xl font-bold text-foreground md:text-5xl lg:text-6xl">
                Ready to represent NextGen CTO on your campus?
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                Apply today and start building leadership, recognition, career value, and real impact.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  size="lg"
                  onClick={openApply}
                  disabled={state.application?.status === 'submitted'}
                  className={cn(
                    "h-14 w-full rounded-full px-12 text-base font-bold sm:w-auto transition duration-200",
                    state.application?.status === 'submitted'
                      ? "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-100"
                      : ""
                  )}
                >
                  {state.application?.status === 'submitted' ? 'Application Under Review' : 'Apply Now'}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 w-full rounded-full border-border px-12 text-base sm:w-auto"
                  asChild
                >
                  <a href="mailto:support@nextgen-cto.in">Talk to Team</a>
                </Button>
              </div>
            </div>
          </div>
        </CampusSection>
      </CampusContainer>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 p-4 md:hidden">
        <Button
          disabled={state.application?.status === 'submitted'}
          className={cn(
            "h-14 w-full rounded-full text-base font-bold transition duration-200",
            state.application?.status === 'submitted'
              ? "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-100"
              : ""
          )}
          onClick={openApply}
        >
          {state.application?.status === 'submitted' ? (
            'Application Pending Review'
          ) : (
            <>
              <Zap className="mr-2 size-4" /> Apply Now
            </>
          )}
        </Button>
      </div>

      <Dialog open={applyOpen} onOpenChange={onApplyOpenChange}>
        <DialogContent
          className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden border-border p-0 sm:max-w-3xl"
          onWheel={(event) => event.stopPropagation()}
        >
          <div className="shrink-0 border-b border-border px-6 pb-4 pt-6 pr-12">
            <DialogHeader>
              <DialogTitle className="font-display text-xl font-bold text-foreground">
                Campus Ambassador Application
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Tell us about yourself. Your application will be reviewed by our team before you receive
                ambassador access.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div
            data-lenis-prevent
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4"
          >
            <CampusAmbassadorApplicationForm
              isAuthenticated={state.isAuthenticated}
              defaultFullName={defaultName}
              defaultEmail={userEmail ?? state.application?.email ?? ''}
              onSuccess={onApplicationSuccess}
              onCancel={() => onApplyOpenChange(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
