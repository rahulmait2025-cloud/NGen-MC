"use client";

import Image from "next/image";
import Link from "next/link";
import { Linkedin, Youtube } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/motion/Reveal";

interface Founder {
    id: string;
    name: string;
    role: string;
    image: string;
    linkedin: string;
    youtube?: string;
    bullets: string[];
}

const FOUNDERS: Founder[] = [
    {
        id: "anuj",
        name: "Anuj Kumar",
        role: "Co-Founder & CEO, NextGen CTO",
        image: '/assets/anuj.png',
        linkedin:
            "https://www.linkedin.com/in/anuj-kumar-a-k-a-cto-bhaiya-on-youtube-9a188968/",
        youtube: "https://www.youtube.com/@CodingwithCTOBhaiya",
        bullets: [
            "Tech entrepreneur & AI-focused builder — ex-Adobe, ex-CTO at Monet Work",
            "Founder of NextGen CTO — bridging the gap between classrooms and careers",
            "Creator of \"Coding with CTO Bhaiya\" — simplifying architecture & modern tech for thousands of developers",
        ],
    },
    {
        id: "sumanta",
        name: "Sumanta Ranjan Das",
        role: "Co-Founder & CPTO, NextGen CTO",
        image: '/assets/sumanta.png',
        linkedin: "https://www.linkedin.com/in/sumantaranjandas/",
        bullets: [
            "25+ years technology leader — former Director of Engineering at Intuit",
            "Built AI-native enterprise platforms serving millions at global scale",
            "Founder of The BeKindDoGood Foundation — strong advocate of tech-driven impact",
        ],
    },
];

export function MeetFounders() {
    return (
        <section
            className="py-16 md:py-20 px-6 relative overflow-hidden bg-transparent"
            id="founders"
        >
            <div className="absolute top-24 -left-20 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-24 -right-20 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-6xl mx-auto relative z-10">
                <Reveal>
                    <div className="text-center mb-16">
                        <Badge
                            variant="outline"
                            className="mb-4 border-primary/20 text-primary bg-primary/5 px-4 py-1.5 uppercase tracking-widest text-[10px]"
                        >
                            Leadership
                        </Badge>
                        <h2 className="font-display text-3xl md:text-5xl font-bold mb-5 tracking-tight">
                            Meet Our{" "}
                            <span className="text-[#D64A00]">
                                Founders
                            </span>
                        </h2>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                            The architects behind NextGen CTO — building the
                            bridge between academic potential and industry
                            excellence.
                        </p>
                    </div>
                </Reveal>

                <Reveal delay={0.1}>
                    <div className="grid md:grid-cols-2 relative lg:divide-x divide-white/5">
                        {FOUNDERS.map((founder) => (
                            <div
                                key={founder.id}
                                className="group flex flex-col items-center text-center px-6 md:px-12 py-10 relative transition-all duration-500 hover:bg-white/[0.02]"
                            >
                                <div className="relative w-28 h-28 mb-6">
                                    <div
                                        className="absolute -inset-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-spin-slow"
                                        style={{
                                            background:
                                                "conic-gradient(from 0deg, transparent, hsl(var(--primary) / 0.4), transparent, hsl(var(--primary) / 0.2), transparent)",
                                        }}
                                    />
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-orange-500/10 group-hover:from-primary/40 group-hover:to-orange-500/20 transition-all duration-500" />
                                    <div className="absolute inset-[3px] rounded-full overflow-hidden bg-muted">
                                        <Image
                                            src={founder.image}
                                            alt={founder.name}
                                            fill
                                            sizes="112px"
                                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    </div>
                                </div>

                                <h3 className="font-display text-2xl font-bold mb-1 group-hover:text-primary transition-colors duration-300">
                                    {founder.name}
                                </h3>
                                <p className="text-primary/70 font-semibold text-xs tracking-widest uppercase mb-5">
                                    {founder.role}
                                </p>

                                <ul className="space-y-2.5 mb-7 max-w-sm">
                                    {founder.bullets.map((bullet) => (
                                        <li
                                            key={bullet}
                                            className="flex items-start gap-2.5 text-left text-muted-foreground text-sm leading-relaxed"
                                        >
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                                            <span>{bullet}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="flex items-center gap-3 mt-auto">
                                    <Link
                                        href={founder.linkedin}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#0A66C2]/10 text-[#0A66C2] border border-[#0A66C2]/20 hover:bg-[#0A66C2] hover:text-white transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-[#0A66C2]/25"
                                        aria-label={`${founder.name} LinkedIn`}
                                    >
                                        <Linkedin className="w-4 h-4" />
                                    </Link>

                                    {founder.youtube && (
                                        <Link
                                            href={founder.youtube}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#FF0000]/10 text-[#FF0000] border border-[#FF0000]/20 hover:bg-[#FF0000] hover:text-white transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-[#FF0000]/25"
                                            aria-label={`${founder.name} YouTube`}
                                        >
                                            <Youtube className="w-4 h-4" />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
