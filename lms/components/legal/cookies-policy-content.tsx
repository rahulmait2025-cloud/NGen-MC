'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Cookie, 
  MapPin, 
  Mail, 
  HelpCircle, 
  Lock, 
  Eye, 
  Settings, 
  Building2,
  ChevronRight,
  Info,
  ArrowLeft
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CookiesPolicyContentProps {
  collegeSlug?: string;
}

const COOKIES_SECTIONS = [
  { id: 'company-info', title: '1. About NextGen CTO', icon: Building2 },
  { id: 'what-are-cookies', title: '2. What Are Cookies?', icon: Cookie },
  { id: 'how-we-use', title: '3. How We Use Cookies', icon: Eye },
  { id: 'cookie-types', title: '4. Types of Cookies We Use', icon: Settings },
  { id: 'third-party', title: '5. Third-Party Cookies', icon: Info },
  { id: 'managing-cookies', title: '6. Managing Your Preferences', icon: Lock },
  { id: 'questions', title: '7. Questions & Contact', icon: HelpCircle },
];

export function CookiesPolicyContent({ collegeSlug }: CookiesPolicyContentProps) {
  const [activeSection, setActiveSection] = useState<string>('company-info');

  const backHref = collegeSlug ? `/c/${collegeSlug}/student` : '/';

  const sections = COOKIES_SECTIONS;

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
    const sidebarNav = document.getElementById('sidebar-nav-container-cookies');
    const sidebarBtn = document.getElementById(`sidebar-btn-cookies-${activeSection}`);
    
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
          <span className="text-foreground font-semibold">Cookie Policy</span>
        </div>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-card/70 backdrop-blur-xl p-6 sm:p-12 shadow-xs">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4 sm:space-y-6 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Badge variant="outline" className="px-3 py-0.5 text-[11px] sm:text-xs font-semibold rounded-full border-primary/30 bg-primary/10 text-primary flex items-center gap-1.5">
                <Cookie className="w-3.5 h-3.5" /> Cookie Policy
              </Badge>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Effective Date: July 29, 2026</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground font-[family-name:var(--font-sora)] leading-tight">
              Cookie Policy
            </h1>
            
            <p className="text-xs sm:text-base text-muted-foreground leading-relaxed">
              This document explains how NextGen CTO utilizes cookies and browser storage technologies to maintain secure sessions and platform performance.
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
                id="sidebar-nav-container-cookies"
                className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-y-auto max-h-[calc(100vh-15rem)] pr-1 pb-1 lg:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {sections.map((sec) => {
                  const Icon = sec.icon;
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      id={`sidebar-btn-cookies-${sec.id}`}
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
                <HelpCircle className="w-4.5 h-4.5" /> Cookie Questions?
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If you have any questions about how we use cookies, you can ask us anytime.
              </p>
              <Button asChild size="sm" className="w-full rounded-xl gap-2 font-semibold text-xs py-2">
                <a href="mailto:support@nextgen-cto.in">
                  <Mail className="w-4 h-4" /> Ask Us / Contact Support
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
                  This website and learning platform are operated by <strong className="text-foreground font-semibold">NextGen CTO Pvt. Ltd.</strong>, headquartered in <strong className="text-foreground font-semibold">Bengaluru, Karnataka, India</strong>.
                </p>
                <p>
                  We utilize cookies and essential local storage mechanisms strictly to maintain active user sessions, store theme settings, and deliver reliable video performance.
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section id="what-are-cookies" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <Cookie className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">2. What Are Cookies?</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Cookies are small text files stored securely on your browser when visiting websites. They allow our platform to recognize your account session, preserve light/dark mode choices, and optimize content loading speeds.
                </p>
              </div>
            </section>

            {/* Section 3 */}
            <section id="how-we-use" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <Eye className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">3. How We Use Cookies</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>NextGen CTO uses cookies exclusively to:</p>
                <ul className="list-disc pl-4 sm:pl-5 space-y-1.5">
                  <li><strong>Security & Authentication:</strong> Keep you logged in securely while navigating course modules.</li>
                  <li><strong>UI & Preferences:</strong> Remember your active dark/light mode preference and video speed settings.</li>
                  <li><strong>Analytics:</strong> Monitor video playback quality, system latency, and platform uptime metrics.</li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section id="cookie-types" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <Settings className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">4. Types of Cookies We Use</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl border border-border bg-background/40 space-y-1 text-xs">
                    <span className="font-semibold text-foreground block text-xs sm:text-sm">Essential Cookies</span>
                    Strictly required for basic platform navigation, auth state, and session security.
                  </div>
                  <div className="p-3.5 rounded-xl border border-border bg-background/40 space-y-1 text-xs">
                    <span className="font-semibold text-foreground block text-xs sm:text-sm">Preference Cookies</span>
                    Preserve theme settings, video playback speeds, and code editor preferences.
                  </div>
                  <div className="p-3.5 rounded-xl border border-border bg-background/40 space-y-1 text-xs">
                    <span className="font-semibold text-foreground block text-xs sm:text-sm">Performance Cookies</span>
                    Track video buffering performance, error logs, and system response times.
                  </div>
                  <div className="p-3.5 rounded-xl border border-border bg-background/40 space-y-1 text-xs">
                    <span className="font-semibold text-foreground block text-xs sm:text-sm">Zero Ad Tracking</span>
                    We do NOT use invasive advertising trackers or sell cross-site behavioral profiles.
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section id="third-party" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <Info className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">5. Third-Party Service Providers</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Certain embedded services (such as YouTube video embeds for free courses or payment processors Razorpay/Stripe) may place technical cookies required to process payments or render video streams.
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section id="managing-cookies" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <Lock className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">6. Managing Your Preferences</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  You can manage or clear cookies through your browser preferences. Note that disabling essential cookies may impact your ability to log in or access course content.
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section id="questions" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl sm:rounded-3xl border border-primary/30 bg-card/80 p-5 sm:p-10 space-y-4 sm:space-y-6 shadow-xs relative overflow-hidden">
              <div className="flex items-center gap-3 text-primary">
                <HelpCircle className="w-5.5 h-5.5 sm:w-6 sm:h-6 shrink-0" />
                <h2 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">7. Questions & Contact Information</h2>
              </div>
              
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-4">
                <p className="text-xs sm:text-base text-foreground font-medium">
                  We are <strong className="text-primary font-bold">NextGen CTO Pvt. Ltd.</strong>, based in <strong className="text-foreground font-bold">Bengaluru, India</strong>.
                </p>
                <p>
                  If you have any questions or concerns regarding our Cookie Policy, you can ask us anytime!
                </p>

                <div className="pt-2 sm:pt-4 flex flex-wrap gap-3 sm:gap-4 items-center">
                  <Button asChild size="lg" className="w-full sm:w-auto rounded-xl px-5 sm:px-6 font-bold gap-2 text-xs sm:text-sm">
                    <a href="mailto:support@nextgen-cto.in">
                      <Mail className="w-4 h-4" /> Ask Us A Question
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
