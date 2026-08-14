'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  RotateCcw, 
  MapPin, 
  Mail, 
  HelpCircle, 
  Lock, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2, 
  Building2,
  ChevronRight,
  ArrowLeft,
  FileCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface RefundPolicyContentProps {
  collegeSlug?: string;
}

const REFUND_SECTIONS = [
  { id: 'company-info', title: '1. About NextGen CTO', icon: Building2 },
  { id: 'no-refund-policy', title: '2. Strict No-Refund Policy', icon: RotateCcw },
  { id: 'unassigned-course', title: '3. Paid But Course Not Assigned?', icon: FileCheck },
  { id: 'subscriptions', title: '4. Subscriptions & Renewal', icon: CreditCard },
  { id: 'cancellations', title: '5. Order & Mentorship Cancellations', icon: AlertCircle },
  { id: 'chargebacks', title: '6. Payment Fraud & Dispute Policy', icon: Lock },
  { id: 'questions', title: '7. Questions & Contact Support', icon: HelpCircle },
];

export function RefundPolicyContent({ collegeSlug }: RefundPolicyContentProps) {
  const [activeSection, setActiveSection] = useState<string>('company-info');

  const backHref = collegeSlug ? `/c/${collegeSlug}/student` : '/';

  const sections = REFUND_SECTIONS;

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-80px 0px -40% 0px',
      threshold: [0.1, 0.5],
    };

    const observer = new IntersectionObserver((entries) => {
      const intersecting = entries.filter((e) => e.isIntersecting);
      if (intersecting.length > 0) {
        const topMost = intersecting.reduce((prev, curr) => {
          return curr.boundingClientRect.top < prev.boundingClientRect.top ? curr : prev;
        });
        setActiveSection(topMost.target.id);
      }
    }, observerOptions);

    sections.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });

    const handleScroll = () => {
      const isAtBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100;
      if (isAtBottom && sections.length > 0) {
        setActiveSection(sections[sections.length - 1].id);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [sections]);

  useEffect(() => {
    if (!activeSection) return;
    const sidebarNav = document.getElementById('sidebar-nav-container-refund');
    const sidebarBtn = document.getElementById(`sidebar-btn-refund-${activeSection}`);
    
    if (sidebarNav && sidebarBtn) {
      const navRect = sidebarNav.getBoundingClientRect();
      const btnRect = sidebarBtn.getBoundingClientRect();

      if (btnRect.top < navRect.top + 10 || btnRect.bottom > navRect.bottom - 10 || btnRect.left < navRect.left || btnRect.right > navRect.right) {
        sidebarBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [activeSection]);

  return (
    <div className="min-h-screen bg-background text-foreground py-6 sm:py-10 px-3 sm:px-6 lg:px-8 font-[family-name:var(--font-sora)] selection:bg-primary/20 selection:text-primary">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-10">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground font-medium">
          <Link href={backHref} className="hover:text-foreground transition-colors flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <span className="text-foreground font-semibold">Refund & Subscription Policy</span>
        </div>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-card/70 backdrop-blur-xl p-6 sm:p-12 shadow-xs">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4 sm:space-y-6 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Badge variant="outline" className="px-3 py-0.5 text-[11px] sm:text-xs font-semibold rounded-full border-primary/30 bg-primary/10 text-primary flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Refund & Cancellation Policy
              </Badge>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Effective Date: July 29, 2026</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground font-[family-name:var(--font-sora)] leading-tight">
              Refund & Subscription Policy
            </h1>
            
            <p className="text-xs sm:text-base text-muted-foreground leading-relaxed">
              Please read our payment, subscription, and non-refundable terms before purchasing courses, mentorship slots, or cohort programs on NextGen CTO.
            </p>

            {/* Entity Badge Box */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-border/70 bg-background/60 backdrop-blur-sm">
              <div className="p-2.5 sm:p-3 rounded-xl bg-primary/10 text-primary shrink-0 w-fit">
                <Building2 className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              </div>
              <div className="space-y-0.5 text-xs sm:text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-foreground">NextGen CTO Pvt. Ltd.</span>
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-semibold flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-red-500" /> Bengaluru, Karnataka, India
                  </Badge>
                </div>
                <p className="text-muted-foreground text-[11px] sm:text-xs">
                  We are NextGen CTO Private Limited based in Bengaluru, Karnataka, India.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Responsive Sticky Sidebar / Horizontal Ribbon on Mobile */}
          <aside className="lg:col-span-4 sticky top-16 sm:top-24 z-20 space-y-4">
            <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md p-3.5 sm:p-5 space-y-2.5 sm:space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  Table of Contents
                </h2>
                <span className="lg:hidden text-[10px] text-primary font-mono font-semibold">Swipe →</span>
              </div>
              
              <nav 
                id="sidebar-nav-container-refund"
                className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-y-auto max-h-[calc(100vh-15rem)] pr-1 pb-1 lg:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {sections.map((sec) => {
                  const Icon = sec.icon;
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      id={`sidebar-btn-refund-${sec.id}`}
                      onClick={() => scrollToSection(sec.id)}
                      className={`shrink-0 lg:shrink-1 w-auto lg:w-full flex items-center gap-2.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ease-out text-left cursor-pointer whitespace-nowrap lg:whitespace-normal ${
                        isActive
                          ? 'bg-primary/12 text-primary font-extrabold border border-primary/25 shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? 'text-primary' : 'opacity-70'}`} />
                      <span className="truncate max-w-[190px] sm:max-w-none">{sec.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Questions Card */}
            <div className="hidden sm:block rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <HelpCircle className="w-4.5 h-4.5" /> Payment Assistance?
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If you made a payment and your course is not assigned, email our support team with your payment proof.
              </p>
              <Button asChild size="sm" className="w-full rounded-xl gap-2 font-semibold text-xs py-2">
                <a href="mailto:support@nextgen-cto.in">
                  <Mail className="w-4 h-4" /> Email Payment Support
                </a>
              </Button>
            </div>
          </aside>

          {/* Document Content */}
          <main className="lg:col-span-8 space-y-6 sm:space-y-8">
            
            {/* Section 1 */}
            <section id="company-info" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <Building2 className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">1. About NextGen CTO</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  This platform and all educational content are operated by <strong className="text-foreground font-semibold">NextGen CTO Pvt. Ltd.</strong> (NextGen CTO Private Limited), based in <strong className="text-foreground font-semibold">Bengaluru, Karnataka, India</strong>.
                </p>
                <p>
                  By enrolling in any course, subscribing to a learning track, or booking a mentorship slot, you acknowledge and agree to our payment terms and non-refundable policy below.
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section id="no-refund-policy" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <RotateCcw className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">2. Strict No-Refund Policy</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <div className="p-3.5 sm:p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-1.5">
                  <span className="font-bold text-foreground block text-xs sm:text-base">All Sales Are Final</span>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Once a payment is completed for any course, bootcamp cohort, subscription plan, notes bundle, or mentorship session, <strong className="text-foreground">NextGen CTO Pvt. Ltd. does not offer any refunds or money-back guarantees</strong> under any circumstances.
                  </p>
                </div>
                <p>
                  Because our digital learning platform grants immediate access to proprietary curriculum, video lectures, code repositories, and downloadable materials, all transactions are deemed non-refundable upon payment completion.
                </p>
              </div>
            </section>

            {/* Section 3 */}
            <section id="unassigned-course" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-primary/30 bg-card/80 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-xs hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <FileCheck className="w-5.5 h-5.5 sm:w-6 sm:h-6 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">3. Paid But Course Not Assigned? (Resolution Procedure)</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-4">
                <p className="text-foreground font-medium">
                  If you have successfully completed a payment via Razorpay, Stripe, or authorized gateway, but the purchased course or cohort is <strong className="text-primary">not assigned / unlocked in your account</strong> due to a network delay or technical issue, please follow these steps:
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border border-border bg-background/50 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground block">Step 1: Gather Payment Proof</strong>
                      Locate your Payment Receipt, Transaction ID, order number, and the email address used during payment.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border border-border bg-background/50 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground block">Step 2: Email Our Support Team</strong>
                      Send an email to <a href="mailto:support@nextgen-cto.in" className="text-primary font-bold hover:underline">support@nextgen-cto.in</a> with the subject line: <em>&quot;Payment Done - Course Not Assigned - [Your Email]&quot;</em>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border border-border bg-background/50 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground block">Step 3: Verification & Manual Assignment</strong>
                      Our support team in Bengaluru will verify your gateway transaction ID and assign the course to your account within <strong className="text-foreground">24 to 48 hours</strong>.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section id="subscriptions" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <CreditCard className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">4. Subscriptions & Renewal Terms</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  For subscription-based plans (e.g. monthly or annual access passes):
                </p>
                <ul className="list-disc pl-4 sm:pl-5 space-y-1.5">
                  <li><strong>Non-Refundable Periods:</strong> Paid subscription periods are non-refundable. Canceling a subscription stops future automatic renewals but does not grant a refund for the current active period.</li>
                  <li><strong>Cancellation before Renewal:</strong> You can cancel your subscription renewal at any time via your account settings prior to the next billing cycle.</li>
                </ul>
              </div>
            </section>

            {/* Section 5 */}
            <section id="cancellations" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">5. Mentorship & Booking Cancellations</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Mentorship slots are booked specifically for designated mentor time. Once a slot is confirmed, payments are non-refundable. If you cannot attend, you may request a slot reschedule at least 24 hours prior to the session, subject to mentor availability.
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section id="chargebacks" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <Lock className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">6. Payment Fraud & Dispute Policy</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Filing an unauthorized chargeback or payment dispute without contacting our support team first will result in immediate suspension of your NextGen CTO account, revocation of certificates, and potential legal action under Indian jurisdiction.
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section id="questions" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl sm:rounded-3xl border border-primary/30 bg-card/80 p-5 sm:p-10 space-y-4 sm:space-y-6 shadow-xs relative overflow-hidden">
              <div className="flex items-center gap-3 text-primary">
                <HelpCircle className="w-5.5 h-5.5 sm:w-6 sm:h-6 shrink-0" />
                <h2 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">7. Questions & Support Contact</h2>
              </div>
              
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-4">
                <p className="text-xs sm:text-base text-foreground font-medium">
                  We are <strong className="text-primary font-bold">NextGen CTO Pvt. Ltd.</strong>, based in <strong className="text-foreground font-bold">Bengaluru, India</strong>.
                </p>
                <p>
                  If you have any questions regarding your payment, subscription status, or course assignment, you can ask us anytime!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-border bg-background/60 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                      <MapPin className="w-4 h-4 text-red-500" /> Office Address
                    </div>
                    <div className="text-xs text-foreground font-medium leading-relaxed">
                      NextGen CTO Pvt. Ltd.<br />
                      Bengaluru, Karnataka<br />
                      India
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-border bg-background/60 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                      <Mail className="w-4 h-4 text-primary" /> Support Desk
                    </div>
                    <div className="text-xs text-foreground font-medium">
                      Email us at:<br />
                      <a href="mailto:support@nextgen-cto.in" className="text-primary hover:underline font-bold text-xs sm:text-sm">
                        support@nextgen-cto.in
                      </a>
                    </div>
                  </div>
                </div>

                <div className="pt-2 sm:pt-4 flex flex-wrap gap-3 sm:gap-4 items-center">
                  <Button asChild size="lg" className="w-full sm:w-auto rounded-xl px-5 sm:px-6 font-bold gap-2 text-xs sm:text-sm">
                    <a href="mailto:support@nextgen-cto.in">
                      <Mail className="w-4 h-4" /> Email Payment Support
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="w-full sm:w-auto rounded-xl px-5 sm:px-6 font-semibold text-xs sm:text-sm">
                    <Link href={backHref}>
                      Return to Platform
                    </Link>
                  </Button>
                </div>
              </div>
            </section>

          </main>
        </div>
      </div>
    </div>
  );
}
