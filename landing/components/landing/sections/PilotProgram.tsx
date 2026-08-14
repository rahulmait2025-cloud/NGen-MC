"use client";

import React, { useEffect, useRef, useState } from "react";
import { m, AnimatePresence, useScroll, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Code, BookOpen, UserCheck, Github, Linkedin } from "lucide-react";

const STEPS = [
    {
        week: "Week 0",
        title: "Program Introduction",
        duration: "2–3 days",
        desc: "Tools setup, expectations, baseline assessments.",
        bullets: [
            { icon: Code, text: "Environment & tooling" },
            { icon: BookOpen, text: "Syllabus & assessment" },
            { icon: UserCheck, text: "Onboarding checklist" },
        ],
        deliverables: ["Setup Guide", "Assessment Report"],
    },
    {
        week: "Weeks 1–14",
        title: "Computer Science Bootcamp",
        duration: "Weeks 1–14",
        desc: "Foundations, programming, web, databases, dev practices and projects.",
        bullets: [
            { icon: Code, text: "Data Structures & Algorithms" },
            { icon: BookOpen, text: "Full-stack modules" },
            { icon: Check, text: "Capstone projects" },
        ],
        deliverables: ["Project Repo", "Module Badges"],
    },
    {
        week: "Weeks 15–18",
        title: "AI & Modern Development",
        duration: "Weeks 15–18",
        desc: "Hands-on AI-powered development practices integrated with modern web development workflows for real-world productivity.",
        bullets: [
            { icon: Code, text: "AI-assisted coding tools (Vibe Coding)" },
            { icon: BookOpen, text: "Prompt engineering basics" },
            { icon: Check, text: "Introduction to Generative & Agentic AI" },
            { icon: UserCheck, text: "AI for modern web development workflows" },
            { icon: Github, text: "Hands-on AI projects" },
        ],
        deliverables: ["AI Workflow Playbook", "Hands-on AI Project Portfolio"],
    },
    {
        week: "Weeks 19–21",
        title: "Behavioral Skills Bootcamp",
        duration: "Weeks 19–21",
        desc: "Communication, STAR stories, mock interview practice.",
        bullets: [
            { icon: UserCheck, text: "Interview simulations" },
            { icon: BookOpen, text: "Communication workshops" },
            { icon: Check, text: "Competency mapping" },
        ],
        deliverables: ["Mock Interview Scores", "STAR Workbook"],
    },
    {
        week: "Weeks 22–23",
        title: "Resume + Interview Readiness",
        duration: "Weeks 22–23",
        desc: "ATS-friendly resume, tailoring & mock interviews.",
        bullets: [
            { icon: BookOpen, text: "ATS keyword strategy" },
            { icon: Check, text: "Resume templates & reviews" },
            { icon: UserCheck, text: "Interview prep" },
        ],
        deliverables: ["ATS-ready Resume", "Interview Checklist"],
    },
    {
        week: "Week 24",
        title: "GitHub Project Showcase",
        duration: "Week 24",
        desc: "Polish repos, README, project structure and best practices.",
        bullets: [
            { icon: Github, text: "Repo health & CI" },
            { icon: Code, text: "Readable code & docs" },
            { icon: Check, text: "Showcase projects" },
        ],
        deliverables: ["Project Portfolio", "README Templates"],
    },
    {
        week: "Week 25",
        title: "LinkedIn Personal Brand",
        duration: "Week 25",
        desc: "Headline, summary, AI profile review and outreach basics.",
        bullets: [
            { icon: Linkedin, text: "Headline & summary" },
            { icon: Check, text: "Profile audit" },
            { icon: UserCheck, text: "Outreach templates" },
        ],
        deliverables: ["Optimized Profile", "Outreach Pack"],
    },
];

export function PilotProgram() {
    const sectionRef = useRef<HTMLElement | null>(null);
    const cardRef = useRef<HTMLDivElement | null>(null);
    const stepEls = useRef<Array<HTMLElement | null>>([]);
    const reduced = useReducedMotion();
    const [active, setActive] = useState(0);
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        const m = window.matchMedia("(min-width: 1024px)");
        const update = () => setIsDesktop(m.matches);
        update();
        m.addEventListener("change", update);
        return () => m.removeEventListener("change", update);
    }, []);

    useScroll({ target: sectionRef, offset: ["start start", "end end"] });

    // Use an IntersectionObserver on invisible anchors to update the active card reliably
    useEffect(() => {
        if (!isDesktop) return;
        const observer = new IntersectionObserver(
            (entries) => {
                // Find the entry that's mostly in view
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
                if (visible) {
                    const idx = stepEls.current.findIndex((el) => el === visible.target);
                    if (idx >= 0) setActive(idx);
                }
            },
            { root: null, rootMargin: "-30% 0% -30% 0%", threshold: [0.25, 0.5, 0.75] }
        );

        stepEls.current.forEach((el) => el && observer.observe(el));

        return () => observer.disconnect();
    }, [isDesktop]);

    const variants = {
        enter: { opacity: 0, y: 16, filter: "blur(8px)" },
        center: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -12, filter: "blur(8px)" },
    } as const;

    return (
        <section ref={sectionRef} id="program" className="relative py-20 md:py-24">
            <div className="max-w-7xl mx-auto px-6 min-h-[180vh]">
                <div className="grid lg:grid-cols-2 gap-10 items-start">
                    {/* Left: Intro (sticky on desktop) */}
                    <div className="lg:sticky lg:top-24 self-start">
                        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Program Outline</Badge>
                        <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">Program Outline</h2>
                        <p className="text-muted-foreground mb-6 max-w-lg">
                            A focused, outcome-driven curriculum that converts learners into hireable engineers — combining technical
                            depth, soft-skills coaching, and portfolio readiness.
                        </p>

                        <ul className="space-y-3 mb-6">
                            <li className="flex items-start gap-3">
                                <span className="text-primary mt-1"><Check className="h-4 w-4" /></span>
                                <span>Industry-aligned modules with hands-on projects.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-primary mt-1"><Check className="h-4 w-4" /></span>
                                <span>Resume & interview readiness for real placements.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="text-primary mt-1"><Check className="h-4 w-4" /></span>
                                <span>Portfolio & LinkedIn optimization for discoverability.</span>
                            </li>
                        </ul>

                        <div className="flex gap-3">
                            <Button className="rounded-lg bg-primary text-white hover:brightness-95">Partner With Us</Button>
                        </div>
                    </div>

                    {/* Right: single animated card (sticky on desktop) */}
                    <div className="lg:sticky lg:top-24 self-start lg:mt-20">
                        {isDesktop ? (
                            <div ref={cardRef} className="w-full">
                                <AnimatePresence mode="wait">
                                    <m.div
                                        key={active}
                                        initial={reduced ? { opacity: 0 } : variants.enter}
                                        animate={reduced ? { opacity: 1 } : variants.center}
                                        exit={reduced ? { opacity: 0 } : variants.exit}
                                        transition={{ duration: 0.45, ease: "easeOut" }}
                                    >
                                        <Card className="bg-card border border-border p-6">
                                            <CardHeader>
                                                <div className="flex items-center justify-between gap-4">
                                                    <Badge className="bg-primary/10 text-primary">{STEPS[active].week}</Badge>
                                                    <div className="text-right text-xs text-muted-foreground">{STEPS[active].duration}</div>
                                                </div>
                                                <CardTitle className="mt-4 text-2xl font-bold">{STEPS[active].title}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-muted-foreground mb-4">{STEPS[active].desc}</p>
                                                <ul className="space-y-3">
                                                    {STEPS[active].bullets.map((b) => (
                                                        <li key={b.text} className="flex items-start gap-3">
                                                            <div className="text-primary mt-1"><b.icon className="h-5 w-5" /></div>
                                                            <div className="leading-tight">{b.text}</div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                            <CardFooter className="flex flex-col gap-3 pt-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {STEPS[active].deliverables.map((d) => (
                                                        <Badge key={d} className="bg-muted/10 text-muted-foreground">{d}</Badge>
                                                    ))}
                                                </div>

                                                <div className="flex items-center justify-between w-full">
                                                    <div className="text-xs text-muted-foreground">Step {active + 1} of {STEPS.length}</div>
                                                    <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
                                                        <div className="h-full bg-primary" style={{ width: `${((active + 1) / STEPS.length) * 100}%` }} />
                                                    </div>
                                                </div>
                                            </CardFooter>
                                        </Card>
                                    </m.div>
                                </AnimatePresence>
                            </div>
                        ) : (
                            // Mobile: stacked cards with whileInView reveal
                            <div className="space-y-6">
                                {STEPS.map((s) => (
                                    <m.div
                                        key={s.title}
                                        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
                                        whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                                        viewport={{ once: true, amount: 0.2 }}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                    >
                                        <Card className="bg-card border border-border p-4">
                                            <CardHeader>
                                                <div className="flex items-center justify-between">
                                                    <Badge className="bg-primary/10 text-primary">{s.week}</Badge>
                                                    <div className="text-xs text-muted-foreground">{s.duration}</div>
                                                </div>
                                                <CardTitle className="mt-2 text-lg font-semibold">{s.title}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-muted-foreground mb-3">{s.desc}</p>
                                                <ul className="space-y-2">
                                                    {s.bullets.map((b) => (
                                                        <li key={b.text} className="flex items-start gap-3">
                                                            <div className="text-primary mt-1"><b.icon className="h-4 w-4" /></div>
                                                            <div className="text-sm">{b.text}</div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                    </m.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                {/* Invisible scroll anchors (desktop only) */}
                <div aria-hidden className="hidden lg:block">
                    {STEPS.map((step, idx) => (
                        <div
                            key={step.title}
                            ref={(el) => { stepEls.current[idx] = el; }}
                            className="h-[60vh]"
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
