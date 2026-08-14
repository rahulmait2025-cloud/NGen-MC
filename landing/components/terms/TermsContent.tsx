"use client";

import { Reveal } from "@/components/motion/Reveal";
import { 
    ScrollText, 
    ShieldCheck, 
    UserPlus, 
    CreditCard, 
    RotateCcw, 
    FileSignature, 
    Handshake, 
    AlertCircle, 
    Gavel, 
    Mail, 
    Scale,
    LifeBuoy,
    Lock,
    Globe,
    BookOpen,
    Info
} from "lucide-react";
import { Link as ScrollLink } from "react-scroll";

const SECTIONS = [
    { id: "acceptance", title: "1. Acceptance", icon: Handshake },
    { id: "definitions", title: "2. Definitions", icon: BookOpen },
    { id: "eligibility", title: "3. Eligibility", icon: UserPlus },
    { id: "registration", title: "4. Registration", icon: Info },
    { id: "services", title: "5. Services", icon: LifeBuoy },
    { id: "payment", title: "6. Payment", icon: CreditCard },
    { id: "refund", title: "7. Refunds", icon: RotateCcw },
    { id: "ip", title: "8. Property", icon: ShieldCheck },
    { id: "use", title: "9. Usage Policy", icon: ScrollText },
    { id: "conduct", title: "10. Conduct", icon: Scale },
    { id: "certificates", title: "11. Certificates", icon: FileSignature },
    { id: "disclaimer", title: "12. Disclaimer", icon: AlertCircle },
    { id: "liability", title: "13. Liability", icon: Gavel },
    { id: "indemnity", title: "14. Indemnity", icon: ShieldCheck },
    { id: "termination", title: "15. Termination", icon: Lock },
    { id: "governing", title: "16. Legal", icon: Globe },
    { id: "contact", title: "20. Contact", icon: Mail },
];

export function TermsContent() {
    return (
        <div className="relative">
            {/* Premium Background Decorations */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] animate-pulse opacity-60" />
                <div className="absolute top-[30%] right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-pulse delay-700 opacity-40" />
                <div className="absolute bottom-[10%] left-1/3 w-[700px] h-[700px] bg-primary/10 rounded-full blur-[160px] animate-pulse delay-1000 opacity-50" />
            </div>

            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
                    {/* Sticky Sidebar Navigation */}
                    <aside className="hidden lg:block lg:col-span-3">
                        <div className="sticky top-32 space-y-2">
                            <div className="px-4 mb-6">
                                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">
                                    Navigation
                                </h3>
                                <div className="h-px w-8 bg-primary/30 mt-2" />
                            </div>
                            <div className="max-h-[70vh] overflow-y-auto scrollbar-hide pr-2 py-2">
                                {SECTIONS.map((section) => (
                                    <ScrollLink
                                        key={section.id}
                                        to={section.id}
                                        spy={true}
                                        smooth={true}
                                        offset={-100}
                                        duration={500}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-muted-foreground/70 hover:text-foreground hover:bg-primary/5 transition-all cursor-pointer group"
                                        activeClass="!text-primary bg-primary/10 !font-black border-r-2 border-primary rounded-r-none translate-x-1"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-background border border-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                            <section.icon className="h-4 w-4 shrink-0 transition-colors" />
                                        </div>
                                        {section.title}
                                    </ScrollLink>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <main className="lg:col-span-9 space-y-24">
                        <section id="acceptance" className="scroll-mt-32">
                            <Reveal>
                                <div className="space-y-8">
                                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-primary/5 border border-primary/10 text-primary text-xs font-black uppercase tracking-widest">
                                        <Handshake className="h-4 w-4" /> Section 01
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black font-display text-foreground leading-tight">
                                        Acceptance of <span className="text-primary italic">Terms</span>
                                    </h2>
                                    <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                                        <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform">
                                                <Gavel className="h-32 w-32" />
                                            </div>
                                            <p className="text-xl font-bold text-foreground relative z-10 mb-4">
                                                PLEASE READ THESE TERMS CAREFULLY.
                                            </p>
                                            <p className="text-lg relative z-10">
                                                By accessing or using the NextGen CTO learning management platform operated by
                                                NextGen CTO Pvt Ltd (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;), you agree to be bound by these Terms
                                                and Conditions. If you do not agree to these Terms, you may not access
                                                or use the Platform.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Reveal>
                        </section>

                        <section id="definitions" className="scroll-mt-32">
                            <Reveal>
                                <div className="space-y-10">
                                    <h2 className="text-3xl font-bold font-display text-foreground flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <BookOpen className="h-6 w-6" />
                                        </div>
                                        2. DEFINITIONS
                                    </h2>
                                    <div className="grid gap-6 sm:grid-cols-2">
                                        {[
                                            { t: "Platform", d: "The NextGen CTO website, mobile apps, and associated services at www.nextgen-cto.in.", color: "from-[#ff6b00]" },
                                            { t: "User", d: "Any individual who accesses or uses the Platform.", color: "from-[#ff8c00]" },
                                            { t: "Student", d: "A User enrolled in any educational program.", color: "from-[#ffa500]" },
                                            { t: "Content", d: "All course materials, videos, quizzes, and resources provided.", color: "from-[#ffb400]" },
                                            { t: "Account", d: "Your registered user profile on the Platform.", color: "from-[#ffc300]" }
                                        ].map(item => (
                                            <div key={item.t} className="group relative p-8 rounded-3xl bg-muted/20 border border-primary/5 hover:border-primary/20 transition-all hover:bg-muted/30">
                                                <div className={`absolute top-0 left-0 w-1 h-12 bg-gradient-to-b ${item.color} to-transparent rounded-full mt-8 opacity-40 group-hover:h-20 transition-all`} />
                                                <h4 className="font-black text-foreground text-xl mb-3 tracking-tight group-hover:text-primary transition-colors">{item.t}</h4>
                                                <p className="text-sm text-muted-foreground leading-relaxed">{item.d}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Reveal>
                        </section>

                        <section id="eligibility" className="scroll-mt-32">
                            <Reveal>
                                <div className="space-y-8">
                                    <h2 className="text-3xl font-bold font-display text-foreground flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <UserPlus className="h-6 w-6" />
                                        </div>
                                        3. ELIGIBILITY
                                    </h2>
                                    <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-10 rounded-[2.5rem] border border-primary/10 shadow-2xl shadow-primary/5">
                                        <ul className="space-y-6">
                                            {[
                                                "You must be at least 18 years of age to use this Platform.",
                                                "By using the Platform, you represent and warrant that you meet this requirement.",
                                                "Organizations must have the authority to bind themselves to these terms."
                                            ].map((text, i) => (
                                                <li key={i} className="flex items-start gap-4 group">
                                                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1 transition-transform group-hover:scale-110">
                                                        <ShieldCheck className="h-3 w-3 text-primary" />
                                                    </div>
                                                    <span className="text-lg text-muted-foreground font-medium group-hover:text-foreground transition-colors">{text}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </Reveal>
                        </section>

                        {/* ... rest of the sections will be updated in a similar style ... */}
                        
                        <section id="payment" className="scroll-mt-32">
                            <Reveal>
                                <div className="space-y-8">
                                    <h2 className="text-3xl font-bold font-display text-foreground flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <CreditCard className="h-6 w-6" />
                                        </div>
                                        6. PAYMENT AND FEES
                                    </h2>
                                    <div className="grid gap-6 md:grid-cols-3">
                                        {[
                                            { l: "Pricing", v: "All prices are in INR, inclusive of taxes, and subject to change." },
                                            { l: "Methods", v: "Secure processing via Razorpay/Stripe (UPI, Cards, Net Banking)." },
                                            { l: "Billing", v: "Confirmations sent via email. Invoices available on request." }
                                        ].map(item => (
                                            <div key={item.l} className="p-8 rounded-3xl liquid-glass border border-primary/10 hover:border-primary/20 transition-all text-center">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">{item.l}</h4>
                                                <p className="text-sm font-bold text-foreground leading-relaxed">{item.v}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Reveal>
                        </section>

                        <section id="refund" className="scroll-mt-32">
                            <Reveal>
                                <div className="space-y-8">
                                    <h2 className="text-3xl font-bold font-display text-foreground flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <RotateCcw className="h-6 w-6" />
                                        </div>
                                        7. REFUND POLICY
                                    </h2>
                                    <div className="bg-destructive/5 border border-destructive/20 p-10 rounded-[2.5rem] relative overflow-hidden group">
                                        <div className="absolute -top-10 -right-10 p-10 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000">
                                            <RotateCcw className="h-64 w-64 text-destructive rotate-[-20deg]" />
                                        </div>
                                        <div className="relative z-10">
                                            <h3 className="text-4xl font-black text-foreground mb-6 mb-8 tracking-tighter">ALL SALES ARE <span className="text-destructive">FINAL</span></h3>
                                            <p className="text-xl font-medium text-muted-foreground leading-relaxed max-w-2xl">
                                                To maintain the integrity of our digital ecosystem, all purchases are non-refundable. 
                                                Please ensure you have reviewed the program details thoroughly before committing.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Reveal>
                        </section>

                        <section id="contact" className="scroll-mt-32">
                            <Reveal>
                                <div className="bg-primary/10 p-12 rounded-[3rem] border border-primary/20 backdrop-blur-xl relative overflow-hidden group">
                                    <div className="absolute -top-20 -right-20 p-4 opacity-[0.05] group-hover:scale-110 transition-all duration-1000">
                                        <Mail className="h-80 w-80" />
                                    </div>
                                    <div className="relative z-10 space-y-12">
                                        <div className="space-y-4 text-center lg:text-left">
                                            <h2 className="text-5xl font-black font-display text-foreground tracking-tighter">Legal <span className="text-primary italic">Inquiries</span></h2>
                                            <p className="text-muted-foreground text-lg max-w-xl">Our legal team is available for any clarifications regarding our platform rules and agreements.</p>
                                        </div>
                                        
                                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                                            {[
                                                { label: "Company", value: "NextGen CTO Pvt Ltd" },
                                                { label: "Legal Email", value: "support@nextgen-cto.in", href: "mailto:support@nextgen-cto.in" },
                                                { label: "Domain", value: "nextgen-cto.in", href: "https://www.nextgen-cto.in" },
                                                { label: "LinkedIn", value: "NextGen CTO", href: "https://www.linkedin.com/company/next-gen-cto" }
                                            ].map(item => (
                                                <div key={item.label} className="space-y-2 p-4 rounded-2xl transition-colors hover:bg-background/20">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">{item.label}</span>
                                                    {item.href ? (
                                                        <a href={item.href} className="block text-lg font-black text-foreground hover:text-primary transition-colors truncate tracking-tight">
                                                            {item.value}
                                                        </a>
                                                    ) : (
                                                        <p className="text-lg font-black text-foreground truncate tracking-tight">{item.value}</p>
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

