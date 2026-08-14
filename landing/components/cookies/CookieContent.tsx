"use client";

import { Reveal } from "@/components/motion/Reveal";
import { 
    Cookie, 
    ShieldCheck, 
    BarChart3, 
    Settings2, 
    ExternalLink, 
    MousePointer2,
    Mail,
    Info,
    Smartphone,
    Monitor
} from "lucide-react";
import { Link as ScrollLink } from "react-scroll";

const COOKE_TYPES = [
    {
        title: "Essential Cookies",
        icon: ShieldCheck,
        description: "Required for the platform to function properly, including secure login and account management.",
        color: "text-blue-500",
        bg: "bg-blue-500/10"
    },
    {
        title: "Performance & Analytics",
        icon: BarChart3,
        description: "Help us understand how visitors interact with our platform by collecting information anonymously.",
        color: "text-emerald-500",
        bg: "bg-emerald-500/10"
    },
    {
        title: "Functionality Cookies",
        icon: Settings2,
        description: "Allow our platform to remember choices you make (such as username) for a personalized experience.",
        color: "text-amber-500",
        bg: "bg-amber-500/10"
    }
];

const SECTIONS = [
    { id: "what", title: "1. What are Cookies?", icon: Info },
    { id: "how", title: "2. How we Use Them", icon: Cookie },
    { id: "third-party", title: "3. Third Parties", icon: ExternalLink },
    { id: "choices", title: "4. Your Choices", icon: MousePointer2 },
    { id: "contact", title: "5. Contact Us", icon: Mail },
];

export function CookieContent() {
    return (
        <div className="relative">
            {/* Premium Background Decorations */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[5%] right-[10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[140px] animate-pulse opacity-50" />
                <div className="absolute top-[40%] left-[5%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] animate-pulse delay-500 opacity-30" />
                <div className="absolute bottom-[5%] right-[15%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] animate-pulse delay-1000 opacity-40" />
            </div>

            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
                    {/* Sticky Sidebar Navigation */}
                    <aside className="hidden lg:block lg:col-span-3">
                        <div className="sticky top-32 space-y-2">
                            <div className="px-4 mb-6">
                                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">
                                    Policy Index
                                </h3>
                                <div className="h-px w-8 bg-primary/30 mt-2" />
                            </div>
                            <div className="space-y-1">
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
                        <section id="what" className="scroll-mt-32">
                            <Reveal>
                                <div className="space-y-8">
                                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-primary/5 border border-primary/10 text-primary text-xs font-black uppercase tracking-widest">
                                        <Info className="h-4 w-4" /> Definition
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-black font-display text-foreground leading-tight">
                                        What are <span className="text-primary italic">Cookies</span>?
                                    </h2>
                                    <div className="p-8 md:p-12 rounded-[2.5rem] bg-primary/5 border border-primary/10 relative overflow-hidden group shadow-2xl shadow-primary/5 transition-all duration-700 hover:shadow-primary/10">
                                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-all duration-1000 rotate-12">
                                            <Monitor className="h-48 w-48" />
                                        </div>
                                        <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed relative z-10 font-medium italic">
                                            &quot;Cookies are small text files that act as a memory for the platform, 
                                            ensuring your preferences and security are preserved across every session.&quot;
                                        </p>
                                    </div>
                                </div>
                            </Reveal>
                        </section>

                        <section id="how" className="scroll-mt-32">
                            <Reveal>
                                <div className="space-y-10">
                                    <h2 className="text-3xl font-bold font-display text-foreground flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <Cookie className="h-6 w-6" />
                                        </div>
                                        How we use Cookies
                                    </h2>
                                    <div className="grid gap-6 md:grid-cols-3">
                                        {COOKE_TYPES.map((type) => (
                                            <div key={type.title} className="group relative p-8 rounded-3xl bg-muted/20 border border-primary/5 hover:border-primary/20 transition-all hover:bg-muted/30 hover:-translate-y-1">
                                                <div className={`h-14 w-14 rounded-2xl ${type.bg} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-lg shadow-black/5`}>
                                                    <type.icon className={`h-7 w-7 ${type.color}`} />
                                                </div>
                                                <h3 className="font-black text-foreground text-xl mb-4 tracking-tighter">{type.title}</h3>
                                                <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                                                    {type.description}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Reveal>
                        </section>

                        <section id="third-party" className="scroll-mt-32">
                            <Reveal>
                                <div className="space-y-8">
                                    <h2 className="text-3xl font-bold font-display text-foreground flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <ExternalLink className="h-6 w-6" />
                                        </div>
                                        Third-Party Partners
                                    </h2>
                                    <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
                                        We collaborate with industry-leading providers to ensure secure payments, 
                                        robust authentication, and precise performance optimization.
                                    </p>
                                    <div className="flex flex-wrap gap-4 pt-4">
                                        {[
                                            { p: "Google Analytics", desc: "Performance tracking" },
                                            { p: "Razorpay", desc: "Secure Indian payments" },
                                            { p: "Stripe", desc: "Global transactions" },
                                            { p: "Clerk", desc: "Elite authentication" }
                                        ].map(partner => (
                                            <div key={partner.p} className="group px-6 py-4 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col gap-1 transition-all hover:bg-primary/10 cursor-default">
                                                <span className="text-foreground font-black tracking-tight">{partner.p}</span>
                                                <span className="text-[10px] font-bold text-primary uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">{partner.desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Reveal>
                        </section>

                        <section id="choices" className="scroll-mt-32">
                            <Reveal>
                                <div className="space-y-10">
                                    <h2 className="text-3xl font-bold font-display text-foreground flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <MousePointer2 className="h-6 w-6" />
                                        </div>
                                        Managing your Choice
                                    </h2>
                                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-12">
                                        <div className="lg:col-span-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-10 rounded-[2.5rem] border border-primary/10 shadow-xl shadow-primary/5">
                                            <h3 className="font-black text-2xl text-foreground mb-6">Browser Control</h3>
                                            <p className="text-muted-foreground font-medium text-lg leading-relaxed mb-10">
                                                You possess the power to configure your browser to reject cookies. 
                                                Please note that blocking essential cookies may restrict access to 
                                                secure areas of the NextGen CTO platform.
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                                {[
                                                    { b: "Chrome", color: "from-blue-500/20" },
                                                    { b: "Safari", color: "from-sky-500/20" },
                                                    { b: "Firefox", color: "from-orange-500/20" }
                                                ].map(link => (
                                                    <div 
                                                        key={link.b} 
                                                        className={`flex flex-col items-center justify-center gap-4 p-6 bg-background/50 rounded-[2rem] border border-primary/10 cursor-default transition-all hover:bg-background/80 hover:scale-105`}
                                                    >
                                                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${link.color} to-transparent flex items-center justify-center`}>
                                                            <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                                                        </div>
                                                        <span className="text-xs font-black uppercase tracking-[0.2em]">{link.b}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="lg:col-span-4 flex flex-col justify-center items-center p-10 rounded-[2.5rem] bg-muted/20 border border-primary/5 text-center group">
                                            <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                                                <Smartphone className="h-10 w-10 text-primary opacity-40" />
                                            </div>
                                            <h3 className="font-black text-xl text-foreground mb-4">Mobile Experience</h3>
                                            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                                                Leverage your device&apos;s OS settings to limit tracking for personalized advertisements.
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
                                        <Cookie className="h-80 w-80" />
                                    </div>
                                    <div className="relative z-10 space-y-12">
                                        <div className="space-y-4 text-center lg:text-left">
                                            <h2 className="text-5xl font-black font-display text-foreground tracking-tighter">Cookie <span className="text-primary italic">Inquiry</span></h2>
                                            <p className="text-muted-foreground text-lg max-w-xl">Our technical team is available for any questions regarding our tracking technologies.</p>
                                        </div>
                                        
                                        <div className="grid gap-8 md:grid-cols-2">
                                            <div className="space-y-2 p-6 rounded-2xl transition-colors hover:bg-background/20 bg-background/10 border border-primary/5">
                                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Direct Email</span>
                                                <a href="mailto:support@nextgen-cto.in" className="block text-2xl font-black text-foreground hover:text-primary transition-colors truncate tracking-tighter">
                                                    support@nextgen-cto.in
                                                </a>
                                            </div>
                                            <div className="space-y-2 p-6 rounded-2xl transition-colors hover:bg-background/20 bg-background/10 border border-primary/5">
                                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Main Domain</span>
                                                <a href="https://www.nextgen-cto.in" className="block text-2xl font-black text-foreground hover:text-primary transition-colors truncate tracking-tighter">
                                                    www.nextgen-cto.in
                                                </a>
                                            </div>
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

