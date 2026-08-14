"use client";

import { useRef } from "react";
import {
    m,
    useScroll,
    useSpring,
    useTransform,
    useReducedMotion,
    type MotionValue,
} from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    BookOpen,
    Code2,
    Layers,
    MessageSquare,
    Trophy,
} from "lucide-react";

const STEPS = [
    {
        week: "Week 0",
        title: "Onboarding & Alignment",
        desc: "Timetable integration, student orientation, and LMS setup. Zero friction from day one.",
        icon: BookOpen,
    },
    {
        week: "Weeks 1–8",
        title: "Foundations & Core Skills",
        desc: "Intensive training in your chosen stack (MERN / Java / Python) plus DSA fundamentals.",
        icon: Code2,
    },
    {
        week: "Weeks 9–16",
        title: "Advanced Projects & System Design",
        desc: "Build production-grade clones — Airbnb, Uber — and master microservices architecture.",
        icon: Layers,
    },
    {
        week: "Weeks 17–20",
        title: "Mock Interviews & Resume",
        desc: "1:1 mock drills, ATS-optimised resume parsing, and in-depth behavioural coaching.",
        icon: MessageSquare,
    },
    {
        week: "Weeks 21–25",
        title: "Final Outcomes",
        desc: "Placement drives, offer negotiation support, peer benchmarking, and alumni induction.",
        icon: Trophy,
    },
] as const;

export function ImplementationTimeline() {
    const sectionRef = useRef<HTMLDivElement>(null);
    const stepsRef = useRef<HTMLDivElement>(null);
    const reduced = useReducedMotion();

    // Attach scroll tracking to the steps column so the progress bar fills
    // as the user scrolls through the cards — offset pins between card-top
    // entering viewport and card-bottom leaving it.
    // Framer Motion's useScroll efficiently uses requestAnimationFrame internally.
    const { scrollYProgress } = useScroll({
        target: stepsRef,
        offset: ["start 0.85", "end 0.15"],
    });

    const scaleY = useSpring(scrollYProgress, {
        stiffness: 80,
        damping: 25,
        restDelta: 0.001,
    });

    return (
        <section
            ref={sectionRef}
            id="timeline"
            className="relative bg-transparent py-16 md:py-20 overflow-hidden"
        >
            {/* Subtle decorative blob — pointer-events-none so it never causes overflow */}
            <div
                aria-hidden
                className="pointer-events-none absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]"
            />

            <div className="max-w-6xl mx-auto px-6">
                <div className="grid md:grid-cols-2 gap-12 items-start">

                    {/* ── LEFT: sticky heading ───────────────────────────── */}
                    <div className="md:sticky md:top-24 py-4">
                        <Badge
                            variant="outline"
                            className="mb-5 border-primary/30 bg-primary/5 text-primary tracking-widest text-[10px] uppercase"
                        >
                            Execution Roadmap
                        </Badge>

                        <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-5">
                            From Day&nbsp;0<br />to Offer Letter.
                        </h2>

                        <p className="text-muted-foreground text-lg leading-relaxed max-w-sm">
                            A structured, scientifically designed 25-week timeline that
                            eliminates guesswork and guarantees measurable progress.
                        </p>

                        {/* Mini legend */}
                        <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="inline-block w-8 h-[2px] bg-gradient-to-r from-primary to-orange-400 rounded-full" />
                            Progress fills as you scroll
                        </div>
                    </div>

                    {/* ── RIGHT: scrolling cards ─────────────────────────── */}
                    <div ref={stepsRef} className="relative py-4">

                        {/* Track line — sits inside the padded container, no negative values */}
                        <div className="absolute left-5 top-4 bottom-4 w-[2px] bg-border rounded-full" />

                        {/* Animated fill — grows with scroll progress */}
                        {!reduced && (
                            <m.div
                                className="absolute left-5 top-4 w-[2px] rounded-full bg-gradient-to-b from-primary to-orange-400 origin-top"
                                style={{
                                    scaleY,
                                    // height spans from top-4 to bottom-4 (same as track)
                                    height: "calc(100% - 2rem)",
                                }}
                            />
                        )}

                        <div className="space-y-6 pl-14">
                            {STEPS.map((step, idx) => (
                                <TimelineCard
                                    key={step.title}
                                    step={step}
                                    index={idx}
                                    total={STEPS.length}
                                    scrollYProgress={scrollYProgress}
                                    reduced={!!reduced}
                                />
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}

/* ─── Individual card ──────────────────────────────────────────────────────── */

function TimelineCard({
    step,
    index,
    total,
    scrollYProgress,
    reduced,
}: {
    step: typeof STEPS[number];
    index: number;
    total: number;
    scrollYProgress: MotionValue<number>;
    reduced: boolean;
}) {
    const Icon = step.icon;

    // Each card activates in a window proportional to its position in the list.
    // A small overlap (0.04) ensures adjacent cards cross-fade smoothly.
    const overlap = 0.04;
    const start = Math.max(0, index / total - overlap);
    const end = Math.min(1, (index + 1) / total + overlap);

    const opacity = useTransform(scrollYProgress, [start, start + 0.12, end], [0.3, 1, 1]);
    const y = useTransform(scrollYProgress, [start, start + 0.12], reduced ? [0, 0] : [20, 0]);
    const scale = useTransform(scrollYProgress, [start, start + 0.12], reduced ? [1, 1] : [0.98, 1]);

    return (
        <m.div
            style={{ opacity, y, scale }}
            className="relative"
        >
            {/* Dot — positioned to align with the track line on the left */}
            <div
                className="absolute -left-[2.35rem] top-5 h-3.5 w-3.5 rounded-full bg-primary ring-4 ring-background shadow-sm shadow-primary/20"
            />

            <Card className="border border-border/60 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-300">
                <CardContent className="p-6">
                    {/* Header row */}
                    <div className="flex items-start gap-4 mb-3">
                        <div className="mt-0.5 w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                            <Icon className="h-4.5 w-4.5" size={18} />
                        </div>
                        <div>
                            <span className="block text-[11px] font-bold tracking-widest uppercase text-primary mb-0.5">
                                {step.week}
                            </span>
                            <h3 className="text-base font-bold leading-tight">{step.title}</h3>
                        </div>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed pl-[3.25rem]">
                        {step.desc}
                    </p>
                </CardContent>
            </Card>
        </m.div>
    );
}
