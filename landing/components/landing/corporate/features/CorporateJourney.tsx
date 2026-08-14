"use client";

import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Brackets, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tilt } from '@/components/motion/Tilt';
import { motion, useScroll, useTransform } from "framer-motion";

const PHASES = [
    {
        id: "Phase 1",
        title: "High-Level System Design",
        duration: "Weeks 1–4",
        topics: ["Component Architecture", "Databases & Tradeoffs", "Microservices vs Monoliths", "Message Queues (Kafka)"],
        deliverable: "Design Uber/Discord Architecture",
    },
    {
        id: "Phase 2",
        title: "Scalability & Infrastructure",
        duration: "Weeks 5–8",
        topics: ["Caching Strategies (Redis)", "Horizontal Scaling", "Sharding & Replication", "Fault Tolerance"],
        deliverable: "Optimized 100k TPS System",
    },
    {
        id: "Phase 3",
        title: "SDE-2 Interview Prep",
        duration: "Weeks 9–12",
        topics: ["Mock Architecture Loops", "Machine Coding Rounds", "System Design Patterns", "Resolving Ambiguity"],
        deliverable: "Cleared System Design Mock",
    },
    {
        id: "Phase 4",
        title: "Corporate Leadership",
        duration: "Weeks 13–16",
        topics: ["Managing Stakeholders", "PR Review Standards", "Salary Negotiation Scripts", "Navigating Office Politics"],
        deliverable: "Promotion Packet + Behavioral Stories",
    },
];

export function CorporateJourney() {
    const [activeIndex, setActiveIndex] = useState(0);
    const sectionRef = useRef<HTMLElement>(null);

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start center", "end center"]
    });
    const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

    return (
        <section
            ref={sectionRef}
            id="program"
            className="relative bg-transparent overflow-hidden py-24 sm:py-32"
        >
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="flex flex-col items-center text-center space-y-4 mb-16 max-w-5xl mx-auto">
                    <Badge variant="outline" className="text-foreground border-border uppercase tracking-widest px-4 py-1 text-[10px] font-bold">
                        The Curriculum
                    </Badge>
                    <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
                        Structured pathway to <span className="text-[#ff7400]">Tech Lead.</span>
                    </h2>
                    <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mx-auto">
                        We skip the fluff. 16 weeks of intense, highly structured engineering designed to take you from writing scripts to architecting scalable systems.
                    </p>
                </div>

                <div className="grid lg:grid-cols-[1fr_2fr] gap-12 lg:gap-16">
                    {/* Left side timeline navigation */}
                    <div className="space-y-4 relative">
                        {/* Vertical Progress Track */}
                        <div className="absolute left-[36px] top-[36px] bottom-[36px] w-px hidden lg:block pointer-events-none">
                            {/* Background track line */}
                            <div className="absolute inset-0 w-full bg-border/30" />

                            {/* Animated progress line */}
                            <motion.div
                                style={{ height: lineHeight }}
                                className="absolute top-0 left-0 w-full bg-[#ff7400] origin-top rounded-full z-10 transition-colors duration-500"
                            />
                        </div>

                        {PHASES.map((phase, idx) => (
                            <Button
                                key={phase.id}
                                variant="ghost"
                                onClick={() => setActiveIndex(idx)}
                                className={cn(
                                    "phase-btn w-full h-auto text-left flex items-start gap-4 p-4 rounded-xl transition-all relative z-20",
                                    idx === activeIndex
                                        ? "bg-muted border border-border hover:bg-muted shadow-sm"
                                        : "hover:bg-muted/50 border border-transparent"
                                )}
                            >
                                <div className="relative">
                                    {/* Horizontal line connector */}
                                    <div className={cn(
                                        "absolute left-5 top-1/2 w-0 h-px bg-[#ff7400]/20 transition-all duration-500",
                                        idx <= activeIndex ? "w-10" : "w-0"
                                    )} />

                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-500 relative z-10",
                                        idx <= activeIndex
                                            ? "bg-[#ff7400] border-[#ff7400] text-white"
                                            : "bg-background border-border text-foreground/50"
                                    )}>
                                        {idx < activeIndex ? (
                                            <Check className="w-5 h-5 stroke-[3px]" />
                                        ) : (
                                            <span className="font-bold text-sm tracking-tighter">{idx + 1}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                        {phase.duration}
                                    </div>
                                    <div className={cn(
                                        "font-bold text-base transition-colors",
                                        idx === activeIndex ? "text-foreground" : "text-foreground/70"
                                    )}>
                                        {phase.title}
                                    </div>
                                </div>
                            </Button>
                        ))}
                    </div>

                    {/* Right side detailed view */}
                    <div className="relative">
                        <Tilt intensity={10} scale={1.03} glare>
                        <div className="journey-content border border-border bg-card rounded-2xl p-8 sm:p-12 shadow-sm relative overflow-hidden h-full flex flex-col justify-center">
                            <div className="floating-bracket absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                                <Brackets className="w-48 h-48 rotate-12" />
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <Badge variant="secondary" className="bg-[#ff7400] text-white border-none px-3 py-1 font-bold">
                                        {PHASES[activeIndex].id}
                                    </Badge>
                                    <span className="text-muted-foreground font-semibold text-sm">
                                        {PHASES[activeIndex].duration}
                                    </span>
                                </div>

                                <h3 className="text-3xl font-bold tracking-tight text-foreground mb-8">
                                    {PHASES[activeIndex].title}
                                </h3>

                                <div className="grid sm:grid-cols-2 gap-y-6 gap-x-12 mb-12">
                                    {PHASES[activeIndex].topics.map((topic, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="mt-1 flex-shrink-0">
                                                <CheckCircle2 className="w-5 h-5 text-[#ff7400]" />
                                            </div>
                                            <span className="text-foreground/90 font-medium">{topic}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-8 border-t border-border">
                                    <div className="flex items-center gap-3 text-sm flex-wrap">
                                        <span className="font-bold uppercase tracking-widest text-muted-foreground shrink-0">Key Outcome</span>
                                        <span className="bg-muted px-4 py-2 rounded-md font-bold text-foreground inline-flex items-center gap-2 border border-border">
                                            <Check className="w-4 h-4 text-[#ff7400]" /> {PHASES[activeIndex].deliverable}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        </Tilt>
                    </div>

                </div>
            </div>
        </section>
    );
}
