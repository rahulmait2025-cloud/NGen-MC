"use client";

import Link from "next/link";
import Image from "next/image";
import { Linkedin, Instagram, Youtube } from "lucide-react";
import { motion } from "framer-motion";

const MARKETING_SITE_URL = "https://nextgen-cto.in";

const FOOTER_LINKS = {
    company: [
        { label: "About Us", href: `${MARKETING_SITE_URL}/about` },
        { label: "Our Team", href: "/our-team" },
        { label: "Programs", href: "/#program" },
        { label: "Contact", href: "/contact" },
    ],
    legal: [
        { label: "Privacy Policy", href: `${MARKETING_SITE_URL}/privacy` },
        { label: "Terms of Service", href: `${MARKETING_SITE_URL}/terms` },
        { label: "Cookie Policy", href: `${MARKETING_SITE_URL}/cookies` },
    ],
    connect: [
        { label: "YouTube", href: "https://www.youtube.com/@CodingwithCTOBhaiya", icon: Youtube, color: "hover:text-[#ff0000]" },
        { label: "Instagram", href: "https://www.instagram.com/code.with.ctobhaiya/", icon: Instagram, color: "hover:text-[#e1306c]" },
        { label: "LinkedIn", href: "https://www.linkedin.com/company/next-gen-cto/posts/?feedView=all", icon: Linkedin, color: "hover:text-[#0077b5]" },
    ]
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.3
        }
    }
};

export function Footer() {
    const currentYear = new Date().getFullYear();
    const displayEndYear = Math.max(currentYear, 2026);

    return (
        <footer className="relative bg-background border-t border-primary/10 pt-24 pb-12 px-6 lg:px-12 overflow-hidden">
            {/* Premium Background Elements */}
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom_right,var(--primary)_0%,transparent_30%)] opacity-[0.03]" />
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,var(--primary)_0%,transparent_20%)] opacity-[0.02]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

            <motion.div 
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="max-w-7xl mx-auto"
            >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-24 mb-24">
                    
                    {/* Brand Section */}
                    <div className="md:col-span-6 lg:col-span-5 space-y-8">
                        <Link href="/" className="flex items-center gap-4 group w-fit">
                            <div className="relative p-2 rounded-2xl bg-primary/5 transition-all duration-500 group-hover:bg-primary/10 group-hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)]">
                                <Image 
                                    src='/assets/logo-hd.png' 
                                    alt="NextGen CTO" 
                                    width={48} 
                                    height={48} 
                                    className="w-10 h-10 object-contain group-hover:rotate-[10deg] transition-transform duration-500"
                                />
                            </div>
                            <span className="font-display font-black text-3xl tracking-tight">
                                NextGen<span className="text-primary-gradient bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">CTO</span>
                            </span>
                        </Link>
                        
                        <p className="text-muted-foreground/80 text-base leading-relaxed max-w-sm font-medium">
                            Where ambition meets rigor: elite mentorship, shipped projects, and interview-grade depth for builders who want to lead — not follow — in modern product engineering.
                        </p>

                        <div className="flex gap-4">
                            {FOOTER_LINKS.connect.map((item) => (
                                <motion.a
                                    key={item.label}
                                    href={item.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    whileHover={{ y: -5, scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`w-12 h-12 rounded-2xl liquid-glass flex items-center justify-center text-muted-foreground transition-all duration-300 shadow-lg shadow-black/5 ${item.color}`}
                                    aria-label={item.label}
                                >
                                    <item.icon className="h-5 w-5" />
                                </motion.a>
                            ))}
                        </div>
                    </div>

                    {/* Navigation Section */}
                    <div className="md:col-span-6 lg:col-span-7 grid grid-cols-2 gap-8 md:gap-12">
                        <div className="space-y-8">
                            <h4 className="font-display font-bold text-xs uppercase tracking-[0.25em] text-primary/80">Company</h4>
                            <ul className="space-y-4">
                                {FOOTER_LINKS.company.map((link) => (
                                    <li key={link.label}>
                                        <Link 
                                            href={link.href}
                                            {...(link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                                            className="text-[15px] font-semibold text-muted-foreground hover:text-foreground transition-all duration-300 flex items-center group"
                                        >
                                            <span className="h-px w-0 bg-primary group-hover:w-4 transition-all duration-500 mr-0 group-hover:mr-3" />
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="space-y-8">
                            <h4 className="font-display font-bold text-xs uppercase tracking-[0.25em] text-primary/80">Legal</h4>
                            <ul className="space-y-4">
                                {FOOTER_LINKS.legal.map((link) => (
                                    <li key={link.label}>
                                        <Link 
                                            href={link.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[15px] font-semibold text-muted-foreground hover:text-foreground transition-all duration-300 flex items-center group"
                                        >
                                            <span className="h-px w-0 bg-primary group-hover:w-4 transition-all duration-500 mr-0 group-hover:mr-3" />
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="pt-12 border-t border-primary/10 flex flex-col items-center justify-center gap-4">
                    <p className="text-[13px] font-bold text-muted-foreground/60 tracking-wider text-center">
                        &copy; {`2025-${displayEndYear}`} NEXTGEN CTO PVT LTD
                    </p>
                </div>
            </motion.div>

            {/* Subtle Gradient Line at the very bottom */}
            <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-50" />
        </footer>
    );
}


