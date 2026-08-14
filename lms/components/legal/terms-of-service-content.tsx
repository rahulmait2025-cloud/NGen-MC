'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  MapPin, 
  Mail, 
  HelpCircle, 
  FileText, 
  Lock, 
  AlertCircle, 
  BookOpen, 
  CreditCard, 
  Scale, 
  CheckCircle2, 
  Building2,
  ChevronRight,
  ArrowLeft,
  Video,
  UserX,
  Share2,
  Cpu,
  AlertTriangle,
  Award,
  Terminal,
  Globe,
  Ban,
  FileWarning
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TermsOfServiceContentProps {
  collegeSlug?: string;
}

const TERMS_SECTIONS = [
  { id: 'company-info', title: '1. About NextGen CTO', icon: Building2 },
  { id: 'acceptance', title: '2. Acceptance & Eligibility', icon: ShieldCheck },
  { id: 'services-scope', title: '3. Platform Scope & Services', icon: BookOpen },
  { id: 'account-reg', title: '4. Account Registration', icon: Lock },
  { id: 'no-account-sharing', title: '5. No Account Sharing', icon: UserX },
  { id: 'video-piracy-ban', title: '6. Anti-Piracy & Video Ban', icon: Video },
  { id: 'ip-copyright', title: '7. Intellectual Property & Copyright', icon: FileText },
  { id: 'acceptable-use', title: '8. Code of Conduct & Restrictions', icon: CheckCircle2 },
  { id: 'user-submissions', title: '9. Student Content & Code Submissions', icon: Terminal },
  { id: 'fees-pricing', title: '10. Paid Courses & Pricing', icon: CreditCard },
  { id: 'no-refunds', title: '11. Non-Refundable Policy', icon: Ban },
  { id: 'mentorship-terms', title: '12. Mentorship & Playgrounds', icon: Cpu },
  { id: 'ambassador-program', title: '13. Campus Ambassador Terms', icon: Award },
  { id: 'third-party-links', title: '14. Third-Party Integrations', icon: Globe },
  { id: 'service-availability', title: '15. Service Uptime & Maintenance', icon: AlertCircle },
  { id: 'platform-modifications', title: '16. Service Modifications', icon: Share2 },
  { id: 'account-termination', title: '17. Suspension & Termination', icon: FileWarning },
  { id: 'educational-disclaimer', title: '18. Educational Disclaimer', icon: AlertTriangle },
  { id: 'liability-indemnity', title: '19. Limitation of Liability', icon: Scale },
  { id: 'governing-law', title: '20. Governing Law (Bengaluru)', icon: MapPin },
  { id: 'miscellaneous', title: '21. Contact & Legal Notices', icon: HelpCircle },
];

export function TermsOfServiceContent({ collegeSlug }: TermsOfServiceContentProps) {
  const [activeSection, setActiveSection] = useState<string>('company-info');

  const backHref = collegeSlug ? `/c/${collegeSlug}/student` : '/';

  const sections = TERMS_SECTIONS;

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

  // IntersectionObserver for smooth active section tracking
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

  // Smoothly auto-scroll sidebar list only when active button is out of bounds
  useEffect(() => {
    if (!activeSection) return;
    const sidebarNav = document.getElementById('sidebar-nav-container');
    const sidebarBtn = document.getElementById(`sidebar-btn-${activeSection}`);
    
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
          <span className="text-foreground font-semibold">Terms of Service</span>
        </div>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-card/70 backdrop-blur-xl p-6 sm:p-12 shadow-xs">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4 sm:space-y-6 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Badge variant="outline" className="px-3 py-0.5 text-[11px] sm:text-xs font-semibold rounded-full border-primary/30 bg-primary/10 text-primary flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Legal Agreement (21 Clauses)
              </Badge>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Effective Date: July 29, 2026</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground font-[family-name:var(--font-sora)] leading-tight">
              Terms & Conditions
            </h1>
            
            <p className="text-xs sm:text-base text-muted-foreground leading-relaxed">
              These Terms & Conditions constitute a legally binding agreement governing your access to NextGen CTO platform, video lectures, code repositories, mentorship, and educational services.
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
                  Table of Contents (21 Sections)
                </h2>
                <span className="lg:hidden text-[10px] text-primary font-mono font-semibold">Swipe →</span>
              </div>
              
              <nav 
                id="sidebar-nav-container"
                className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-y-auto max-h-[calc(100vh-15rem)] pr-1 pb-1 lg:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {sections.map((sec) => {
                  const Icon = sec.icon;
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      id={`sidebar-btn-${sec.id}`}
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
                <HelpCircle className="w-4.5 h-4.5" /> Have Questions?
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If you have any questions regarding these Terms or our Services, you can ask us anytime.
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
                  This platform and educational ecosystem are owned and operated by <strong className="text-foreground font-semibold">NextGen CTO Pvt. Ltd.</strong> (NextGen CTO Private Limited), incorporated under the Companies Act of India and based in <strong className="text-foreground font-semibold">Bengaluru, Karnataka, India</strong>.
                </p>
                <p>
                  Our services encompass Learning Management System (LMS) portals, DSA problem solving tracks, curated video courses, live & asynchronous mentorship, code playgrounds, and career-readiness solutions.
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section id="acceptance" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">2. Acceptance of Terms & Eligibility</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  By accessing, browsing, registering an account, or purchasing any course on NextGen CTO, you agree to be bound by these Terms & Conditions and our Privacy Policy.
                </p>
                <p>
                  You represent that you are at least 18 years of age or possess legal parental/guardian consent to use this platform. If acting on behalf of an institution or organization, you represent that you have legal authority to bind that entity.
                </p>
              </div>
            </section>

            {/* Section 3 */}
            <section id="services-scope" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <BookOpen className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">3. Platform Scope & Services</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  NextGen CTO provides access to digital learning tracks, video lectures, code assessments, interactive notes, and mentorship services. Services are provided on a subscription or individual course purchase model.
                </p>
              </div>
            </section>

            {/* Section 4 */}
            <section id="account-reg" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <Lock className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">4. User Account Registration & Security</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  To access course contents, you must register for a unique user account providing accurate information. You are solely responsible for maintaining the confidentiality of your login credentials and for all activities under your account.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section id="no-account-sharing" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-red-500/30 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-red-500/50 transition-colors">
              <div className="flex items-center gap-3 text-red-500">
                <UserX className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">5. Strict Prohibition of Account Sharing & Credential Resale</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <div className="p-3.5 sm:p-4 rounded-xl border border-red-500/20 bg-red-500/5 space-y-1.5 text-xs">
                  <span className="font-bold text-red-500 block text-xs sm:text-sm">One Account = One Individual User</span>
                  <p className="text-foreground leading-relaxed font-medium">
                    Sharing account credentials, pooling access among multiple students, or selling/transferring your account login to any third party is strictly prohibited.
                  </p>
                </div>
                <p>
                  Our security systems monitor concurrent logins, device fingerprints, and location anomalies. Accounts detected sharing credentials will be <strong className="text-foreground">permanently banned without warning or refund</strong>.
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section id="video-piracy-ban" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-red-500/40 bg-card/80 p-5 sm:p-8 space-y-4 shadow-xs relative overflow-hidden">
              <div className="flex items-center gap-3 text-red-500">
                <Video className="w-5.5 h-5.5 sm:w-6 sm:h-6 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">6. Anti-Piracy Policy: Strict Ban on Video Downloading & Redistribution</h2>
              </div>
              
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-4">
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-red-500/30 bg-red-500/10 space-y-1.5">
                  <span className="font-extrabold text-red-500 block text-xs sm:text-base uppercase tracking-wide">
                    ⚠️ Video Piracy & Redistribution Is Illegal
                  </span>
                  <p className="text-foreground font-medium text-xs sm:text-sm leading-relaxed">
                    All course videos, lectures, solution walkthroughs, notes, and code repositories hosted on NextGen CTO are protected by copyright law. <strong className="text-red-500 underline">Downloading, screen-recording, stream-ripping, re-uploading, or redistributing course content on Telegram, YouTube, Drive, Torrent, or any other platform is strictly illegal.</strong>
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-foreground block">Legal Consequences & Actions for Violation:</span>
                  <ul className="list-disc pl-4 sm:pl-5 space-y-1.5 text-xs text-muted-foreground">
                    <li><strong className="text-foreground">Immediate Account Termination:</strong> Permanent ban of your account and cancellation of all enrolled courses without refund.</li>
                    <li><strong className="text-foreground">Revocation of Certificates:</strong> Cancellation of any verified certificates or credentials earned.</li>
                    <li><strong className="text-foreground">Civil & Criminal Legal Prosecution:</strong> Statutory copyright infringement proceedings under the <strong className="text-foreground">Indian Copyright Act, 1957</strong> and <strong className="text-foreground">Information Technology Act, 2000</strong>.</li>
                    <li><strong className="text-foreground">Financial Damages:</strong> Claims for actual and statutory monetary damages caused by content piracy.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 7 */}
            <section id="ip-copyright" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <FileText className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">7. Intellectual Property & Copyright Ownership</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  All curriculum, video recordings, graphics, logos, UI code, design tokens, problem sets, and notes are the exclusive intellectual property of <strong className="text-foreground font-semibold">NextGen CTO Pvt. Ltd.</strong>
                </p>
                <p>
                  Enrolled students receive a limited, personal, non-exclusive, non-transferable license to view content solely for personal learning purposes.
                </p>
              </div>
            </section>

            {/* Section 8 */}
            <section id="acceptable-use" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">8. Code of Conduct & Acceptable Use</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>You agree NOT to engage in scraping, automated API querying, reverse engineering, distributing malware, or harassing instructors/mentors in platform forums.</p>
              </div>
            </section>

            {/* Section 9 */}
            <section id="user-submissions" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <Terminal className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">9. Student Code Submissions & Content</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Code submitted to our interactive playground or assignment portals remains your creation. However, you grant NextGen CTO a non-exclusive license to execute and evaluate your code for grading and streak validation.
                </p>
              </div>
            </section>

            {/* Section 10 */}
            <section id="fees-pricing" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <CreditCard className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">10. Paid Courses & Pricing Terms</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Pricing for paid courses, cohort bootcamps, and subscriptions is specified at checkout. Payments are processed securely via authorized payment gateways (Razorpay/Stripe).
                </p>
              </div>
            </section>

            {/* Section 11 */}
            <section id="no-refunds" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <Ban className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">11. Non-Refundable Policy</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  All purchases are final and non-refundable. Detailed terms regarding course assignment resolutions are set forth in our <Link href="/refund-policy" className="text-primary font-semibold hover:underline">Refund Policy</Link>.
                </p>
              </div>
            </section>

            {/* Section 12 */}
            <section id="mentorship-terms" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <Cpu className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">12. Mentorship Sessions & Code Playgrounds</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Mentorship bookings reserve dedicated mentor time. Playgrounds are provided as best-effort execution sandboxes.
                </p>
              </div>
            </section>

            {/* Section 13 */}
            <section id="ambassador-program" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <Award className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">13. Campus Ambassador Program Terms</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Campus Ambassadors must represent NextGen CTO professionally and abide by program guidelines.
                </p>
              </div>
            </section>

            {/* Section 14 */}
            <section id="third-party-links" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <Globe className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">14. Third-Party Integrations</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Our platform may link to third-party services (e.g. YouTube for public playlists, GitHub, payment gateways). We are not responsible for third-party policies.
                </p>
              </div>
            </section>

            {/* Section 15 */}
            <section id="service-availability" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">15. Service Availability & Maintenance</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  While we strive for 99.9% uptime, services may undergo scheduled maintenance or unannounced temporary outages.
                </p>
              </div>
            </section>

            {/* Section 16 */}
            <section id="platform-modifications" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <Share2 className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">16. Service & Terms Modifications</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  NextGen CTO reserves the right to update curriculum, features, and Terms. Continued use of the platform constitutes acceptance of updated terms.
                </p>
              </div>
            </section>

            {/* Section 17 */}
            <section id="account-termination" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <FileWarning className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">17. Account Suspension & Termination</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  We reserve the right to suspend or terminate accounts that breach copyright, attempt video piracy, or violate our Acceptable Use policy.
                </p>
              </div>
            </section>

            {/* Section 18 */}
            <section id="educational-disclaimer" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">18. Educational Disclaimer</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  Our courses and mentorship are designed for educational and career-readiness purposes. NextGen CTO does not guarantee specific job offers or salary outcomes.
                </p>
              </div>
            </section>

            {/* Section 19 */}
            <section id="liability-indemnity" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <Scale className="w-5 h-5 shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">19. Limitation of Liability & Indemnification</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  To the maximum extent permitted by Indian law, NextGen CTO Pvt. Ltd. shall not be liable for indirect or consequential damages. Maximum total liability is capped at the total amount paid by you in the prior 12 months.
                </p>
              </div>
            </section>

            {/* Section 20 */}
            <section id="governing-law" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-border/80 bg-card/70 p-5 sm:p-8 space-y-3 sm:space-y-4 shadow-2xs hover:border-border transition-colors">
              <div className="flex items-center gap-3 text-primary">
                <MapPin className="w-5 h-5 shrink-0 text-red-500" />
                <h2 className="text-base sm:text-xl font-bold text-foreground tracking-tight">20. Governing Law & Jurisdiction (Bengaluru)</h2>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-3">
                <p>
                  These Terms are governed exclusively by the laws of <strong className="text-foreground font-semibold">India</strong>. Any legal action or proceeding shall be subject to the exclusive jurisdiction of the competent courts in <strong className="text-foreground font-semibold">Bengaluru, Karnataka, India</strong>.
                </p>
              </div>
            </section>

            {/* Section 21 */}
            <section id="miscellaneous" className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl sm:rounded-3xl border border-primary/30 bg-card/80 p-5 sm:p-10 space-y-4 sm:space-y-6 shadow-xs relative overflow-hidden">
              <div className="flex items-center gap-3 text-primary">
                <HelpCircle className="w-5.5 h-5.5 sm:w-6 sm:h-6 shrink-0" />
                <h2 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">21. Questions & Legal Contact Information</h2>
              </div>
              
              <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-4">
                <p className="text-xs sm:text-base text-foreground font-medium">
                  We are <strong className="text-primary font-bold">NextGen CTO Pvt. Ltd.</strong>, based in <strong className="text-foreground font-bold">Bengaluru, India</strong>.
                </p>
                <p>
                  If you have any questions or concerns regarding these Terms & Conditions, you can ask us anytime!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-border bg-background/60 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                      <MapPin className="w-4 h-4 text-red-500" /> Registered Office
                    </div>
                    <div className="text-xs text-foreground font-medium leading-relaxed">
                      NextGen CTO Pvt. Ltd.<br />
                      Bengaluru, Karnataka<br />
                      India
                    </div>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-border bg-background/60 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                      <Mail className="w-4 h-4 text-primary" /> Direct Legal Support
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
                      <Mail className="w-4 h-4" /> Contact Legal Desk
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
