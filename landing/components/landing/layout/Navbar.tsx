"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { JoinUsDropdown } from "@/components/landing/layout/JoinUsDropdown";
import { useState, useEffect, useRef } from "react";
import { Menu, X, ArrowUp, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const getNavLinks = (persona: string) => {
    const base = PERSONA_ROUTES[persona] || "/";
    return [
        { label: "Program", href: `${base}#program` },
        { label: "Founders", href: `${base}#founders` },
        { label: "FAQ", href: `${base}#faq` },
    ];
};

const PERSONAS = ["Campus", "Student", "Corporate"];

const PERSONA_ROUTES: Record<string, string> = {
    Campus: "/",
    Student: "/student",
    Corporate: "/corporate",
};

function getPersonaFromPath(pathname: string): string {
    if (pathname.startsWith("/corporate")) return "Corporate";
    if (pathname.startsWith("/student")) return "Student";
    return "Campus";
}

export function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [hidden, setHidden] = useState(false);
    const [showTop, setShowTop] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
    const [isCampusDropdownOpen, setIsCampusDropdownOpen] = useState(false);

    // Determine active persona
    let activePersona = getPersonaFromPath(pathname);
    if (isStudentDropdownOpen) activePersona = "Student";
    if (isCampusDropdownOpen) activePersona = "Campus";
    const navLinks = getNavLinks(activePersona);
    const [activeSection, setActiveSection] = useState("");
    const lastY = useRef(0);
    const { theme, setTheme } = useTheme();

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const onScroll = () => {
            const y = window.scrollY;
            setHidden(y > 80 && y > lastY.current);
            setShowTop(y > 400);
            lastY.current = y;
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Intersection Observer for Section Tracking
    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: "-20% 0px -70% 0px", // Focus on the middle-upper part of the screen
            threshold: 0,
        };

        const handleIntersection = (entries: IntersectionObserverEntry[]) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        };

        const observer = new IntersectionObserver(handleIntersection, observerOptions);

        // Map navLinks to elements
        navLinks.forEach((link) => {
            const id = link.href.split("#")[1];
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        // Also track hero
        const hero = document.getElementById("hero");
        if (hero) observer.observe(hero);

        return () => observer.disconnect();
    }, [navLinks]);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        const basePath = href.split("#")[0] || "/";
        if (pathname !== basePath) return;

        // We are on the target page, use smooth scroll
        e.preventDefault();
        const id = href.split("#")[1];
        const element = document.getElementById(id);
        if (element) {
            const offset = 100; // Account for sticky navbar
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = element.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });

            // For mobile
            if (mobileOpen) setMobileOpen(false);
        }
    };

    // Prefetch persona routes for instant navigation
    useEffect(() => {
        Object.values(PERSONA_ROUTES).forEach(route => {
            router.prefetch(route);
        });
    }, [router]);

    const handlePersonaClick = (persona: string) => {
        setIsStudentDropdownOpen(false);
        setIsCampusDropdownOpen(false);
        const route = PERSONA_ROUTES[persona];
        if (route) router.push(route);
    };

    return (
        <>
            <header
                className={`fixed top-0 left-0 w-full z-50 transition-transform duration-500 ${hidden && !mobileOpen ? "-translate-y-full" : "translate-y-0"
                    }`}
            >
                <div className="max-w-5xl mx-auto px-4 pt-3">
                    <div className="relative">
                        <div
                            className="absolute -inset-[1px] rounded-2xl opacity-60 blur-sm pointer-events-none"
                            style={{
                                background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.4) 20%, hsl(var(--primary) / 0.1) 40%, transparent 50%, hsl(var(--primary) / 0.1) 60%, hsl(var(--primary) / 0.4) 80%, transparent 100%)",
                                backgroundSize: "200% 100%",
                                animation: "shimmer 6s ease-in-out infinite",
                            }}
                        />
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2/3 h-4 bg-primary/15 blur-xl rounded-full pointer-events-none" />

                        <div className="relative flex items-center justify-between px-5 md:px-6 h-16 rounded-2xl border transition-all duration-500 bg-background/85 backdrop-blur-xl border-white/[0.08] shadow-lg shadow-black/10">
                            <Link href="/" className="flex items-center gap-3 group transition-opacity duration-300">
                                <div className="relative p-2 rounded-2xl bg-primary/5 transition-all duration-500 group-hover:bg-primary/10 group-hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)]">
                                    <div className="absolute -inset-2 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <Image 
                                        src='/assets/logo-hd.png' 
                                        alt="NextGen CTO Logo" 
                                        width={40} 
                                        height={40} 
                                        className={cn(
                                            "relative w-8 h-8 md:w-9 md:h-9 object-contain group-hover:rotate-[10deg] transition-all duration-500",
                                            !mounted && "opacity-0 scale-95"
                                        )}
                                        priority
                                    />
                                    {!mounted && (
                                        <div className="absolute inset-0 m-2 rounded-xl bg-muted animate-pulse" />
                                    )}
                                </div>
                                <span className={cn(
                                    "font-display font-black text-xl md:text-2xl tracking-tight hidden sm:block transition-all duration-500",
                                    !mounted && "opacity-0 translate-x-2"
                                )}>
                                    NextGen<span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">CTO</span>
                                </span>
                            </Link>


                            <nav className="hidden lg:flex items-center gap-6">
                                <div className="flex items-center gap-1 bg-foreground/[0.04] rounded-xl px-1 py-1 border border-foreground/[0.08] relative">
                                    {PERSONAS.map((persona) => (
                                        <div
                                            key={persona}
                                            className="relative"
                                            onMouseEnter={() => { }}
                                            onMouseLeave={() => { }}
                                        >
                                            <Link
                                                href={PERSONA_ROUTES[persona]}
                                                onClick={() => handlePersonaClick(persona)}
                                                className={cn(
                                                    "inline-flex items-center justify-center relative px-4 py-1.5 h-auto text-[12px] font-bold transition-colors duration-300 z-10 cursor-pointer",
                                                    activePersona === persona
                                                        ? (activePersona === "Corporate" ? "text-background" : "text-white")
                                                        : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                {persona}
                                                {activePersona === persona && (
                                                    <motion.div
                                                        layoutId="activePersona"
                                                        className={cn(
                                                            "absolute inset-0 rounded-lg -z-10 shadow-lg",
                                                            activePersona === "Corporate"
                                                                ? "bg-foreground shadow-foreground/20"
                                                                : "bg-primary shadow-primary/20"
                                                        )}
                                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                    />
                                                )}
                                            </Link>




                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center gap-1 bg-foreground/[0.04] rounded-xl px-1.5 py-1 border border-foreground/[0.08]">
                                    {navLinks.map((link) => {
                                        const isActive = activeSection === link.href.split("#")[1];
                                        return (
                                            <Link
                                                key={link.href}
                                                href={link.href}
                                                onClick={(e) => handleLinkClick(e, link.href)}
                                                className={cn(
                                                    "relative px-4 py-2 text-[13px] font-bold transition-all duration-300 rounded-lg",
                                                    isActive ? "text-white" : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.08]"
                                                )}
                                            >
                                                <span className="relative z-10">{link.label}</span>
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeNavLink"
                                                        className="absolute inset-0 bg-primary/90 rounded-lg shadow-lg shadow-primary/20"
                                                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                                    />
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </nav>

                            {/* Theme toggle + CTA + Mobile toggle */}
                            <div className="flex items-center gap-2">
                                {/* Theme toggle */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                    className="rounded-xl hover:bg-foreground/[0.06] text-muted-foreground hover:text-foreground transition-all duration-300"
                                    aria-label="Toggle theme"
                                >
                                    {mounted && theme === 'dark' ? (
                                        <Sun className="w-[18px] h-[18px]" />
                                    ) : (
                                        <Moon className="w-[18px] h-[18px]" />
                                    )}
                                </Button>

                                <div className="hidden sm:block">
                                    <JoinUsDropdown activePersona={activePersona} />
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        const nextState = !mobileOpen;
                                        setMobileOpen(nextState);
                                        if (nextState) {
                                            if (activePersona === "Student") setIsStudentDropdownOpen(true);
                                            if (activePersona === "Campus") setIsCampusDropdownOpen(true);
                                        }
                                    }}
                                    className="md:hidden rounded-lg hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-colors"
                                    aria-label="Toggle menu"
                                >
                                    {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile overlay menu */}
            <div
                className={`fixed inset-0 z-40 md:hidden transition-all duration-500 ${mobileOpen
                    ? "opacity-100 pointer-events-auto"
                    : "opacity-0 pointer-events-none"
                    }`}
            >
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-background/90 backdrop-blur-xl"
                    onClick={() => setMobileOpen(false)}
                />

                {/* Links */}
                <nav className="relative flex flex-col items-center justify-center min-h-screen gap-2 px-8 py-20">
                    {/* Brand Logo in Mobile Menu */}
                    <div className="flex flex-col items-center gap-4 mb-10">
                        <div className="relative p-3 rounded-3xl bg-primary/5 border border-primary/10">
                            <Image 
                                src='/assets/logo-hd.png' 
                                alt="NextGen CTO" 
                                width={60} 
                                height={60} 
                                className="w-14 h-14 object-contain"
                            />
                        </div>
                        <span className="font-display font-black text-3xl tracking-tight">
                            NextGen<span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">CTO</span>
                        </span>
                    </div>

                    {/* Mobile Persona Switcher */}
                    <div className="flex flex-col items-center w-full max-w-[280px] mb-8 gap-4">
                        <div className="flex items-center gap-1 bg-foreground/[0.04] rounded-2xl px-1.5 py-1.5 border border-foreground/[0.08] relative w-full">
                            {PERSONAS.map((persona) => (
                                <Link
                                    key={persona}
                                    href={PERSONA_ROUTES[persona]}
                                    onClick={() => {
                                        handlePersonaClick(persona);
                                        if (mobileOpen) setMobileOpen(false);
                                    }}
                                    className={`flex-1 inline-flex items-center justify-center relative py-2.5 h-auto text-sm font-bold transition-colors duration-300 z-10 cursor-pointer ${activePersona === persona ? 'text-white' : 'text-muted-foreground'
                                        }`}
                                >
                                    {persona}
                                    {activePersona === persona && (
                                        <motion.div
                                            layoutId="activePersonaMobile"
                                            className="absolute inset-0 bg-primary rounded-xl -z-10 shadow-lg shadow-primary/20"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                </Link>
                            ))}
                        </div>




                    </div>

                    {navLinks.map((link, i) => {
                        const isActive = activeSection === link.href.split("#")[1];
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={(e) => handleLinkClick(e, link.href)}
                                className={cn(
                                    "relative w-full max-w-xs text-center py-4 text-lg font-display font-bold transition-all duration-300",
                                    isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
                                )}
                                style={{
                                    transitionDelay: mobileOpen ? `${i * 50}ms` : "0ms",
                                    transform: mobileOpen ? "translateY(0)" : "translateY(16px)",
                                    opacity: mobileOpen ? 1 : 0,
                                }}
                            >
                                {link.label}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNavLinkMobile"
                                        className="absolute inset-x-0 bottom-2 h-1 bg-primary rounded-full mx-auto w-12"
                                    />
                                )}
                            </Link>
                        );
                    })}

                    <div
                        className="mt-6"
                        style={{
                            transitionDelay: mobileOpen ? `${navLinks.length * 50}ms` : "0ms",
                            transition: "all 300ms ease",
                            transform: mobileOpen ? "translateY(0)" : "translateY(16px)",
                            opacity: mobileOpen ? 1 : 0,
                        }}
                    >
                        <JoinUsDropdown
                            variant="mobile"
                            activePersona={activePersona}
                            onMobileClose={() => setMobileOpen(false)}
                        />
                    </div>
                </nav>
            </div>

            {/* Go to top button */}
            <Button
                variant="default"
                onClick={scrollToTop}
                aria-label="Scroll to top"
                className={`fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-primary/90 hover:bg-primary text-white shadow-xl shadow-primary/30 hover:shadow-primary/50 hidden md:flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer ${showTop
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4 pointer-events-none"
                    }`}
            >
                <ArrowUp className="w-5 h-5" />
            </Button>
        </>
    );
}

