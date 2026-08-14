"use client";

import Image from "next/image";
import Link from "next/link";
import { Linkedin, Youtube } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/motion/Reveal";
import { Tilt } from '@/components/motion/Tilt';

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
            "Tech entrepreneur & AI-focused builder — ex-Adobe, ex-CTO at Monet Work.",
            "Created 'Coding with CTO Bhaiya' to simplify architecture for thousands.",
            "Mentors students directly 1:1, turning beginners into production-ready engineers.",
        ],
    },
    {
        id: "sumanta",
        name: "Sumanta Ranjan Das",
        role: "Co-Founder & CPTO, NextGen CTO",
        image: '/assets/sumanta.png',
        linkedin: "https://www.linkedin.com/in/sumantaranjandas/",
        bullets: [
            "25+ years technology leader — former Director of Engineering at Intuit.",
            "Built AI-native enterprise platforms serving millions at global scale.",
            "Reviews student code drops and architectural designs personally.",
        ],
    },
];

export function MeetFounders2() {
    return (
        <section
            className="py-16 md:py-24 px-6 relative overflow-hidden bg-transparent border-t border-border"
            id="founders"
        >
            <div className="absolute top-24 -left-20 w-80 h-80 bg-[#ff7400]/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-24 -right-20 w-80 h-80 bg-[#ff7400]/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-5xl mx-auto relative z-10">
                <Reveal>
                    <div className="text-center mb-16">
                        <Badge
                            variant="outline"
                            className="mb-4 border-[#ff7400]/20 text-[#ff7400] bg-[#ff7400]/10 hover:bg-[#ff7400]/20 px-4 py-1.5 uppercase tracking-widest text-[10px]"
                        >
                            Your Mentors
                        </Badge>
                        <h2 className="font-display text-4xl md:text-5xl font-bold mb-5 tracking-tight">
                            Meet the <span className="text-[#ff7400]">CTOs</span>
                        </h2>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                            No influencers. No junior instructors. You will be trained and reviewed by industry veterans that have built systems serving millions.
                        </p>
                    </div>
                </Reveal>

                <Reveal delay={0.1}>
                    <div className="space-y-16 lg:space-y-32 relative pt-8">
                        {FOUNDERS.map((founder, index) => {
                            const isEven = index % 2 === 0;

                            return (
                                <div
                                    key={founder.id}
                                    className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-10 md:gap-16 group`}
                                >
                                    {/* Image Column */}
                                    <div className="w-full md:w-5/12 mx-auto flex justify-center">
                                        <Tilt intensity={10} scale={1.03} glare>
                                        <div className="relative w-56 h-56 sm:w-72 sm:h-72 lg:w-80 lg:h-80">
                                            <div className={`absolute inset-0 rounded-3xl bg-muted/50 transition-transform duration-500 group-hover:scale-105 ${isEven ? 'rotate-3' : '-rotate-3'} group-hover:rotate-0`} />
                                            <div className="absolute inset-0 rounded-3xl overflow-hidden bg-transparent border border-border flex items-center justify-center p-3 shadow-2xl">
                                                <div className="relative w-full h-full rounded-2xl overflow-hidden bg-muted/20">
                                                    <Image
                                                        src={founder.image}
                                                        alt={founder.name}
                                                        fill
                                                        sizes="(max-width: 768px) 224px, 320px"
                                                        className="object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        </Tilt>
                                    </div>

                                    {/* Text Column */}
                                    <div className={`w-full md:w-7/12 space-y-6 ${isEven ? 'md:pr-12' : 'md:pl-12'} text-center md:text-left`}>
                                        <div>
                                            <h3 className="font-display text-3xl md:text-4xl font-bold mb-2 text-foreground">
                                                {founder.name}
                                            </h3>
                                            <p className="text-[#ff7400]/80 font-semibold text-xs md:text-sm tracking-widest uppercase mb-6">
                                                {founder.role}
                                            </p>
                                        </div>

                                        <ul className="space-y-4 w-full">
                                            {founder.bullets.map((bullet) => (
                                                <li
                                                    key={bullet}
                                                    className="flex items-start gap-4 text-left text-muted-foreground text-sm sm:text-base leading-relaxed"
                                                >
                                                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#ff7400]/30 flex-shrink-0 group-hover:bg-[#ff7400] transition-colors" />
                                                    <span>{bullet}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className={`flex items-center gap-4 pt-6 mt-6 border-t border-border/50 justify-center md:justify-start w-full`}>
                                            <Link
                                                href={founder.linkedin}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center w-10 h-10 rounded-full bg-muted border border-border text-foreground hover:bg-foreground hover:text-background transition-colors shadow-sm"
                                                aria-label={`${founder.name} LinkedIn`}
                                            >
                                                <Linkedin className="w-4 h-4" />
                                            </Link>

                                            {founder.youtube && (
                                                <Link
                                                    href={founder.youtube}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center w-10 h-10 rounded-full bg-muted border border-border text-foreground hover:bg-foreground hover:text-background transition-colors shadow-sm"
                                                    aria-label={`${founder.name} YouTube`}
                                                >
                                                    <Youtube className="w-4 h-4" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
