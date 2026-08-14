"use client";

import { Reveal } from "@/components/motion/Reveal";
import { Mail, Shield, Lock, Eye, BookOpen, UserCheck, Share2, Scale, Globe, RefreshCcw, ExternalLink } from "lucide-react";
import { Link as ScrollLink } from "react-scroll";

const SECTIONS = [
    { id: "introduction", title: "1. Introduction", icon: BookOpen },
    { id: "collection", title: "2. Information We Collect", icon: Eye },
    { id: "usage", title: "3. How We Use Information", icon: UserCheck },
    { id: "sharing", title: "4. Sharing Information", icon: Share2 },
    { id: "security", title: "5. Storage & Security", icon: Lock },
    { id: "rights", title: "6. Your Rights", icon: Shield },
    { id: "cookies", title: "7. Cookies", icon: Globe },
    { id: "age", title: "8. Age Restriction", icon: Scale },
    { id: "thirdparty", title: "9. Third-Party Links", icon: ExternalLink },
    { id: "changes", title: "10. Changes to Policy", icon: RefreshCcw },
    { id: "contact", title: "11. Contact Us", icon: Mail },
];

export function PrivacyContent() {
    return (
        <div className="relative">
            {/* Background Decorations */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute top-[20%] right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] animate-pulse delay-700" />
                <div className="absolute bottom-[20%] left-1/3 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] animate-pulse delay-1000" />
            </div>

            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Sticky Sidebar Navigation */}
                    <aside className="hidden lg:block lg:col-span-3">
                        <div className="sticky top-32 space-y-1">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 px-4">
                                Table of Contents
                            </h3>
                            {SECTIONS.map((section) => (
                                <ScrollLink
                                    key={section.id}
                                    to={section.id}
                                    spy={true}
                                    smooth={true}
                                    offset={-100}
                                    duration={500}
                                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all cursor-pointer group"
                                    activeClass="!text-primary bg-primary/10 !font-bold border-l-2 border-primary rounded-l-none"
                                >
                                    <section.icon className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform" />
                                    {section.title}
                                </ScrollLink>
                            ))}
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <main className="lg:col-span-9 space-y-16">
                        <section id="introduction">
                            <Reveal>
                                <div className="space-y-6">
                                    <h2 className="text-3xl font-bold font-display text-foreground flex items-center gap-3">
                                        <BookOpen className="text-primary h-8 w-8" /> 1. INTRODUCTION
                                    </h2>
                                    <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                                        <p className="text-lg">
                                            NextGen CTO Pvt Ltd (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy.
                                            This Privacy Policy explains how we collect, use, disclose, and safeguard your
                                            information when you use our learning management platform at <a href="https://www.nextgen-cto.in" className="text-primary font-bold hover:underline">www.nextgen-cto.in</a> (collectively, the &quot;Platform&quot;).
                                        </p>
                                        <p>
                                            By accessing or using our Platform, you agree to the collection and use of
                                            information in accordance with this policy. We take your data security seriously 
                                            and implement industry-standard practices to ensure your information remains 
                                            private and secure.
                                        </p>
                                    </div>
                                </div>
                            </Reveal>
                        </section>

                        <section id="collection">
                            <Reveal>
                                <div className="space-y-8">
                                    <h2 className="text-3xl font-bold font-display text-foreground flex items-center gap-3">
                                        <Eye className="text-primary h-8 w-8" /> 2. INFORMATION WE COLLECT
                                    </h2>
                                    
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="bg-muted/30 p-8 rounded-2xl border border-primary/5 hover:border-primary/20 transition-colors group">
                                            <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors">2.1 Personal Information</h3>
                                            <ul className="space-y-3 text-muted-foreground">
                                                {[
                                                    "Full Name", "Email Address", "Phone Number", 
                                                    "Academic Records (College, Grade, etc.)", 
                                                    "Profile Photos/Avatars",
                                                    "Learning Progress Data & Performance",
                                                    "Communication Logs"
                                                ].map((item) => (
                                                    <li key={item} className="flex items-start gap-2">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="bg-muted/30 p-8 rounded-2xl border border-primary/5 hover:border-primary/20 transition-colors group">
                                            <h3 className="text-xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors">2.2 Automatically Collected</h3>
                                            <ul className="space-y-3 text-muted-foreground">
                                                {[
                                                    "IP Address & Browser Type",
                                                    "Device Information & OS",
                                                    "Usage Data & Click Patterns",
                                                    "Time Spent & Referral URLs",
                                                    "Cookies & Tracking Tokens"
                                                ].map((item) => (
                                                    <li key={item} className="flex items-start gap-2">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </Reveal>
                        </section>

                        <section id="usage">
                            <Reveal>
                                <div className="space-y-6">
                                    <h2 className="text-3xl font-bold font-display text-foreground flex items-center gap-3">
                                        <UserCheck className="text-primary h-8 w-8" /> 3. HOW WE USE YOUR INFORMATION
                                    </h2>
                                    <div className="bg-primary/5 p-8 rounded-2xl border border-primary/10">
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {[
                                                { title: "Account Management", desc: "To create and manage your secure user account." },
                                                { title: "Service Delivery", desc: "To provide and improve our educational ecosystem." },
                                                { title: "Learning Experience", desc: "Personalizing your journey with progress tracking." },
                                                { title: "Communication", desc: "Sending updates, notifications, and support responses." },
                                                { title: "Payment Processing", desc: "Securely handling transactions via trusted gateways." },
                                                { title: "Analytics", desc: "Optimizing platform performance and functionality." },
                                                { title: "Security", desc: "Detecting and preventing fraud or technical issues." },
                                                { title: "Legal Compliance", desc: "Adhering to applicable regulatory requirements." }
                                            ].map((item) => (
                                                <div key={item.title} className="p-4 bg-background/50 rounded-xl border border-primary/10">
                                                    <h4 className="font-bold text-foreground text-sm mb-1">{item.title}</h4>
                                                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </Reveal>
                        </section>

                        <section id="sharing">
                            <Reveal>
                                <div className="space-y-6">
                                    <h2 className="text-3xl font-bold font-display text-foreground flex items-center gap-3">
                                        <Share2 className="text-primary h-8 w-8" /> 4. SHARING OF YOUR INFORMATION
                                    </h2>
                                    <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground">
                                        <p className="font-bold text-foreground mb-4">We do NOT sell your personal information.</p>
                                        <div className="grid gap-6 md:grid-cols-2 mt-6">
                                            <div className="bg-muted/20 p-6 rounded-xl border border-primary/5">
                                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Trusted Partners</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {["Razorpay", "Google Analytics", "SendGrid", "AWS", "Vercel", "Google OAuth"].map(tag => (
                                                        <span key={tag} className="px-3 py-1 bg-background border border-primary/10 rounded-full text-xs font-medium text-muted-foreground">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="bg-muted/20 p-6 rounded-xl border border-primary/5">
                                                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Other Cases</h3>
                                                <ul className="text-xs space-y-2">
                                                    <li>• Legal requirements & public authorities</li>
                                                    <li>• Business transfers or mergers</li>
                                                    <li>• Protecting rights & safety</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Reveal>
                        </section>

                        <section id="security">
                            <Reveal>
                                <div className="space-y-6">
                                    <h2 className="text-3xl font-bold font-display text-foreground flex items-center gap-3">
                                        <Lock className="text-primary h-8 w-8" /> 5. DATA STORAGE AND SECURITY
                                    </h2>
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="bg-gradient-to-br from-primary/10 to-transparent p-8 rounded-2xl border border-primary/20">
                                            <h3 className="text-xl font-bold text-foreground mb-4">Security Measures</h3>
                                            <ul className="space-y-3 text-sm text-muted-foreground">
                                                <li>• SSL/TLS encryption for data in transit</li>
                                                <li>• AES-256 encryption for sensitive storage</li>
                                                <li>• Periodic multi-stage security audits</li>
                                                <li>• Granular access control protocols</li>
                                            </ul>
                                        </div>
                                        <div className="bg-muted/30 p-8 rounded-2xl border border-primary/5">
                                            <h3 className="text-xl font-bold text-foreground mb-4">Data Retention</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                We retain your information while your account is active or as needed for service delivery 
                                                and legal compliance. You can request data deletion at any time via support.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Reveal>
                        </section>

                        <section id="rights">
                            <Reveal>
                                <div className="space-y-6">
                                    <h2 className="text-3xl font-bold font-display text-foreground flex items-center gap-3">
                                        <Shield className="text-primary h-8 w-8" /> 6. YOUR RIGHTS AND CHOICES
                                    </h2>
                                    <div className="grid gap-4 md:grid-cols-3">
                                        {[
                                            { title: "Access & Correct", desc: "View and update your personal data anytime." },
                                            { title: "Opt-Out", desc: "Manage communications and cookie preferences." },
                                            { title: "Data Portability", desc: "Request a portable copy of your data records." }
                                        ].map(item => (
                                            <div key={item.title} className="p-6 bg-muted/20 rounded-xl border border-primary/5 text-center transition-transform hover:-translate-y-1">
                                                <h4 className="font-bold text-foreground mb-2">{item.title}</h4>
                                                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-sm text-muted-foreground italic text-center mt-4">
                                        Contact <a href="mailto:support@nextgen-cto.in" className="text-primary font-bold hover:underline">support@nextgen-cto.in</a> for account deletion or data requests.
                                    </p>
                                </div>
                            </Reveal>
                        </section>

                        <section id="cookies">
                            <Reveal>
                                <div className="space-y-6">
                                    <h2 className="text-3xl font-bold font-display text-foreground flex items-center gap-3">
                                        <Globe className="text-primary h-8 w-8" /> 7. COOKIES & TRACKING
                                    </h2>
                                    <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                                        <p>We use cookies and similar technologies to:</p>
                                        <div className="grid gap-4 md:grid-cols-2 mt-4 text-sm">
                                            <div className="flex items-start gap-3 p-4 bg-muted/20 rounded-xl border border-primary/5">
                                                <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center shrink-0">
                                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                                </div>
                                                <p>Remember your preferences and authentication settings.</p>
                                            </div>
                                            <div className="flex items-start gap-3 p-4 bg-muted/20 rounded-xl border border-primary/5">
                                                <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center shrink-0">
                                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                                </div>
                                                <p>Understand how you use our platform for optimization.</p>
                                            </div>
                                            <div className="flex items-start gap-3 p-4 bg-muted/20 rounded-xl border border-primary/5">
                                                <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center shrink-0">
                                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                                </div>
                                                <p>Improve overall performance and loading speeds.</p>
                                            </div>
                                            <div className="flex items-start gap-3 p-4 bg-muted/20 rounded-xl border border-primary/5">
                                                <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center shrink-0">
                                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                                </div>
                                                <p>Deliver personalized educational content and recommendations.</p>
                                            </div>
                                        </div>
                                        <p className="mt-6 italic">
                                            You can control cookies through your browser settings. Disabling cookies may
                                            affect platform functionality.
                                        </p>
                                    </div>
                                </div>
                            </Reveal>
                        </section>

                        <section id="age">
                            <Reveal>
                                <div className="space-y-6">
                                    <h2 className="text-3xl font-bold font-display text-foreground flex items-center gap-3">
                                        <Scale className="text-primary h-8 w-8" /> 8. AGE RESTRICTION
                                    </h2>
                                    <div className="bg-yellow-500/5 border border-yellow-500/20 p-8 rounded-2xl">
                                        <p className="text-muted-foreground leading-relaxed">
                                            Our Platform is intended for users who are <span className="text-foreground font-bold underline">18 years of age or older</span>. 
                                            We do not knowingly collect personal information from children under 18. If we become 
                                            aware that we have inadvertently collected data from a minor, we will take 
                                            immediate steps to delete such information.
                                        </p>
                                    </div>
                                </div>
                            </Reveal>
                        </section>

                        <section id="thirdparty">
                            <Reveal>
                                <div className="space-y-6">
                                    <h2 className="text-3xl font-bold font-display text-foreground flex items-center gap-3">
                                        <ExternalLink className="text-primary h-8 w-8" /> 9. THIRD-PARTY LINKS
                                    </h2>
                                    <p className="text-muted-foreground leading-relaxed">
                                        Our Platform may contain links to third-party websites or services. We are not
                                        responsible for the privacy practices of these external sites. We encourage you
                                        to review their privacy policies before providing any personal information.
                                    </p>
                                </div>
                            </Reveal>
                        </section>

                        <section id="changes">
                            <Reveal>
                                <div className="space-y-6">
                                    <h2 className="text-3xl font-bold font-display text-foreground flex items-center gap-3">
                                        <RefreshCcw className="text-primary h-8 w-8" /> 10. CHANGES TO THIS PRIVACY POLICY
                                    </h2>
                                    <div className="bg-muted/30 p-8 rounded-2xl space-y-4">
                                        <p className="text-muted-foreground leading-relaxed">
                                            We may update this Privacy Policy from time to time. We will notify you of any changes by:
                                        </p>
                                        <ul className="grid gap-4 md:grid-cols-3 text-xs font-bold uppercase tracking-wider text-center">
                                            <li className="p-4 bg-background rounded-lg border border-primary/10">Posting on this page</li>
                                            <li className="p-4 bg-background rounded-lg border border-primary/10">Updating revision date</li>
                                            <li className="p-4 bg-background rounded-lg border border-primary/10">Direct email notice</li>
                                        </ul>
                                    </div>
                                </div>
                            </Reveal>
                        </section>

                        <section id="contact">
                            <Reveal>
                                <div className="bg-primary/10 p-10 rounded-3xl border border-primary/20 backdrop-blur-md relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                        <Mail className="h-32 w-32" />
                                    </div>
                                    <div className="relative z-10 space-y-8">
                                        <div className="space-y-2">
                                            <h2 className="text-3xl font-bold font-display text-foreground">Have Questions?</h2>
                                            <p className="text-muted-foreground">Our team is here to help you with any privacy concerns.</p>
                                        </div>
                                        
                                        <div className="grid gap-6 md:grid-cols-2">
                                            {[
                                                { label: "Company", value: "NextGen CTO Pvt Ltd" },
                                                { label: "Email", value: "support@nextgen-cto.in", href: "mailto:support@nextgen-cto.in" },
                                                { label: "Website", value: "www.nextgen-cto.in", href: "https://www.nextgen-cto.in" },
                                                { label: "LinkedIn", value: "NextGen CTO", href: "https://www.linkedin.com/company/next-gen-cto" }
                                            ].map(item => (
                                                <div key={item.label} className="space-y-1">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">{item.label}</span>
                                                    {item.href ? (
                                                        <a href={item.href} className="block text-lg font-bold text-foreground hover:text-primary transition-colors truncate">
                                                            {item.value}
                                                        </a>
                                                    ) : (
                                                        <p className="text-lg font-bold text-foreground truncate">{item.value}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </Reveal>
                        </section>
                    </main>
                </div>
            </div>
        </div>
    );
}
