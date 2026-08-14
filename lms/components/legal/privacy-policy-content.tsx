'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  MapPin, 
  Mail, 
  HelpCircle, 
  Lock, 
  Database, 
  UserCheck, 
  Building2,
  ChevronRight,
  ArrowLeft,
  Ban,
  TrendingUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PrivacyPolicyContentProps {
  collegeSlug?: string;
}

const PRIVACY_SECTIONS = [
  { id: 'company-info', title: '1. Data Controller', icon: Building2 },
  { id: 'overview', title: '2. Overview & Commitment', icon: ShieldCheck },
  { id: 'no-data-sale', title: '3. No Data Sale Guarantee', icon: Ban },
  { id: 'data-collection', title: '4. Data We Collect', icon: Database },
  { id: 'data-usage', title: '5. Data Usage & Service Improvement', icon: TrendingUp },
  { id: 'data-protection', title: '6. Protection & Security', icon: Lock },
  { id: 'user-rights', title: '7. Your Rights & Choice', icon: UserCheck },
  { id: 'questions', title: '8. Questions & Contact', icon: HelpCircle },
];

export function PrivacyPolicyContent({ collegeSlug }: PrivacyPolicyContentProps) {
  const [activeSection, setActiveSection] = useState<string>('company-info');

  const backHref = collegeSlug ? `/c/${collegeSlug}/student` : '/';

  const sections = PRIVACY_SECTIONS;

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
    const sidebarNav = document.getElementById('sidebar-nav-container-privacy');
    const sidebarBtn = document.getElementById(`sidebar-btn-privacy-${activeSection}`);
    
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
          <span className="text-foreground font-semibold">Privacy Policy</span>
        </div>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-card/70 backdrop-blur-xl p-6 sm:p-12 shadow-xs">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4 sm:space-y-6 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Badge variant="outline" className="px-3 py-0.5 text-[11px] sm:text-xs font-semibold rounded-full border-primary/30 bg-primary/10 text-primary flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Privacy & Data Protection
              </Badge>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium font-mono">Zero Data Sale • Service Improvement Only</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground font-[family-name:var(--font-sora)] leading-tight">
              Privacy Policy
            </h1>
            
            <p className="text-xs sm:text-base text-muted-foreground leading-relaxed">
              At NextGen CTO, we respect your privacy. We do not sell your personal data. We use collected data strictly to deliver, personalize, and improve our services.
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
                id="sidebar-nav-container-privacy"
                className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-y-auto max-h-[calc(100vh-15rem)] pr-1 pb-1 lg:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {sections.map((sec) => {
                  const Icon = sec.icon;
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      id={`sidebar-btn-privacy-${sec.id}`}
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
                <HelpCircle className="w-4.5 h-4.5" /> Privacy Questions?
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If you have any questions about how your data is handled, you can ask us anytime.
              </p>
              <Button asChild size="sm" className="w-full rounded-xl gap-2 font-semibold text-xs py-2">
                <a href="mailto:support@nextgen-cto.in">
                  <Mail className="w-4 h-4" /> Ask Us / Contact Privacy Team
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
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">1. Data Controller Information</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  This platform is operated by <strong className="text-foreground font-semibold">NextGen CTO Pvt. Ltd.</strong>, headquartered in <strong className="text-foreground font-semibold">Bengaluru, Karnataka, India</strong>.
                </p>
                <p>
                  NextGen CTO Pvt. Ltd. acts as the data controller responsible for processing your personal data lawfully and transparently under Indian privacy regulations.
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section id="overview" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">2. Overview & Commitment</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  We collect only the data necessary to deliver personalized course modules, track problem-solving streaks, arrange mentorship bookings, and issue completion certificates.
                </p>
              </div>
            </section>

            {/* Section 3: NO DATA SALE */}
            <section id="no-data-sale" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-primary/30 bg-card/80 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-xs hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <Ban className="w-5.5 h-5.5 sm:w-6 sm:h-6 shrink-0 text-primary" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">3. We Do Not Sell Your Data (Strict Guarantee)</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <div className="p-3.5 sm:p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-1.5">
                  <span className="font-bold text-foreground block text-xs sm:text-base">Zero Data Monetization</span>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    <strong className="text-foreground font-bold">NextGen CTO Pvt. Ltd. does NOT sell, rent, trade, lease, or monetize your personal data, profile information, or learning activity to any third parties, advertisers, or data brokers under any circumstances.</strong>
                  </p>
                </div>
                <p>
                  Your information is kept confidential and is accessed only by authorized platform infrastructure to fulfill your learning needs.
                </p>
              </div>
            </section>

            {/* Section 4 */}
            <section id="data-collection" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <Database className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">4. Information We Collect</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <ul className="list-disc pl-4 sm:pl-5 space-y-2">
                  <li><strong>Profile & Account:</strong> Name, email address, password hash, college or university affiliation.</li>
                  <li><strong>Learning Progress:</strong> Course completions, video watch time, quiz scores, code submissions, and DSA streaks.</li>
                  <li><strong>Mentorship Data:</strong> Slot bookings, session notes, and career goal preferences.</li>
                  <li><strong>Technical Logs:</strong> IP address, device type, and browser logs to ensure video streaming quality and account security.</li>
                </ul>
              </div>
            </section>

            {/* Section 5: Data Usage & Service Improvement */}
            <section id="data-usage" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <TrendingUp className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">5. Data Usage & Service Improvement</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p className="text-foreground font-medium">
                  We use collected information solely to operate, maintain, personalize, and improve our services:
                </p>
                <ul className="list-disc pl-4 sm:pl-5 space-y-2 text-xs sm:text-sm">
                  <li><strong>Platform Optimization:</strong> Analyzing video playback metrics, buffering speeds, and server latency to deliver seamless lecture streaming.</li>
                  <li><strong>Curriculum Enhancement:</strong> Assessing problem completion rates and student learning patterns to refine DSA problem sets and course tracks.</li>
                  <li><strong>Streak & Analytics Tracking:</strong> Calculating your daily coding streaks, readiness scores, and certificate verifications.</li>
                  <li><strong>Support & Communication:</strong> Sending essential transaction receipts, password reset links, and course assignment confirmations.</li>
                </ul>
              </div>
            </section>

            {/* Section 6 */}
            <section id="data-protection" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <Lock className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">6. Protection & Security</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  We utilize enterprise-grade encryption (HTTPS/TLS) and secure database access controls to safeguard your data at rest and in transit.
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section id="user-rights" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <UserCheck className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">7. Your Rights & Choice</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>You have full control over your data, including rights to:</p>
                <ul className="list-disc pl-4 sm:pl-5 space-y-1.5">
                  <li>Update your name, profile photo, and password in settings.</li>
                  <li>Request export of your course completion certificates and streak data.</li>
                  <li>Request account deactivation by contacting privacy support.</li>
                </ul>
              </div>
            </section>

            {/* Section 8 */}
            <section id="questions" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl sm:rounded-3xl border border-primary/30 bg-card/80 p-5 sm:p-10 space-y-4 sm:space-y-6 shadow-xs relative overflow-hidden">
              <div className="flex items-center gap-3 text-primary">
                <HelpCircle className="w-5.5 h-5.5 sm:w-6 sm:h-6 shrink-0" />
                <h2 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">8. Questions & Contact Information</h2>
              </div>
              
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-4">
                <p className="text-xs sm:text-base text-foreground font-medium">
                  We are <strong className="text-primary font-bold">NextGen CTO Pvt. Ltd.</strong>, based in <strong className="text-foreground font-bold">Bengaluru, India</strong>.
                </p>
                <p>
                  If you have any questions or concerns regarding this Privacy Policy, you can ask us anytime!
                </p>

                <div className="pt-2 sm:pt-4 flex flex-wrap gap-3 sm:gap-4 items-center">
                  <Button asChild size="lg" className="w-full sm:w-auto rounded-xl px-5 sm:px-6 font-bold gap-2 text-xs sm:text-sm">
                    <a href="mailto:support@nextgen-cto.in">
                      <Mail className="w-4 h-4" /> Ask Privacy Team
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
