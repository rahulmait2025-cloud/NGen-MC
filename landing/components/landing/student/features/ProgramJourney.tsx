"use client";

import { useRef, useState, useEffect } from "react";
import {
    motion,
    AnimatePresence,
} from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Check,
    Code,
    BookOpen,
    UserCheck,
    Github,
    Linkedin,
    ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const LATEST_COURSES_URL = 'https://www.youtube.com/@CodingwithCTOBhaiya/courses';

const CARDS = [
    {
        id: "01",
        week: "Week 0",
        duration: "2–3 days",
        title: "Program Introduction",
        desc: "Tools setup, expectations, baseline assessments.",
        bullets: [
            { icon: Code, text: "Environment & tooling" },
            { icon: BookOpen, text: "Syllabus & assessment" },
            { icon: UserCheck, text: "Onboarding checklist" },
        ],
        deliverables: ["Setup Guide", "Assessment Report"],
    },
    {
        id: "02",
        week: "Weeks 1–14",
        duration: "Weeks 1–14",
        title: "CS Bootcamp",
        desc: "Foundations, programming, web, databases, dev practices and projects.",
        bullets: [
            { icon: Code, text: "Data Structures & Algorithms" },
            { icon: BookOpen, text: "Full-stack modules" },
            { icon: Check, text: "Capstone projects" },
        ],
        deliverables: ["Project Repo", "Module Badges"],
    },
    {
        id: "03",
        week: "Weeks 15–18",
        duration: "Weeks 15–18",
        title: "AI & Modern Development",
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
        id: "04",
        week: "Weeks 19–21",
        duration: "Weeks 19–21",
        title: "Behavioral Skills Bootcamp",
        desc: "Communication, STAR stories, mock interview practice.",
        bullets: [
            { icon: UserCheck, text: "Interview simulations" },
            { icon: BookOpen, text: "Communication workshops" },
            { icon: Check, text: "Competency mapping" },
        ],
        deliverables: ["Mock Interview Scores", "STAR Workbook"],
    },
    {
        id: "05",
        week: "Weeks 22–23",
        duration: "Weeks 22–23",
        title: "Resume + Interview Readiness",
        desc: "ATS-friendly resume, tailoring & mock interviews.",
        bullets: [
            { icon: BookOpen, text: "ATS keyword strategy" },
            { icon: Check, text: "Resume templates & reviews" },
            { icon: UserCheck, text: "Interview prep" },
        ],
        deliverables: ["ATS-ready Resume", "Interview Checklist"],
    },
    {
        id: "06",
        week: "Week 24",
        duration: "Week 24",
        title: "GitHub Project Showcase",
        desc: "Polish repos, README, project structure and best practices.",
        bullets: [
            { icon: Github, text: "Repo health & CI" },
            { icon: Code, text: "Readable code & docs" },
            { icon: Check, text: "Showcase projects" },
        ],
        deliverables: ["Project Portfolio", "README Templates"],
    },
    {
        id: "07",
        week: "Week 25",
        duration: "Week 25",
        title: "LinkedIn Personal Brand",
        desc: "Headline, summary, AI profile review and outreach basics.",
        bullets: [
            { icon: Linkedin, text: "Headline & summary" },
            { icon: Check, text: "Profile audit" },
            { icon: UserCheck, text: "Outreach templates" },
        ],
        deliverables: ["Optimized Profile", "Outreach Pack"],
    },
];

const AUTO_PLAY_DURATION = 5000; // 5 seconds per card

export function ProgramJourney() {
    const [activeIndex, setActiveIndex] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const nextCard = () => {
        setActiveIndex((prev) => (prev + 1) % CARDS.length);
    };

    const goToCard = (index: number) => {
        setActiveIndex(index);
    };

    const handleExploreSyllabus = () => {
        window.open(LATEST_COURSES_URL, '_blank', 'noopener,noreferrer');
    };

    useEffect(() => {
        timerRef.current = setInterval(() => {
            nextCard();
        }, AUTO_PLAY_DURATION);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [activeIndex]);

    return (
        <section
            id="program"
            className="relative bg-transparent overflow-hidden py-20 lg:py-32"
        >
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] -z-10" />

            <div className="container mx-auto px-4 md:px-6">
                <div className="grid lg:grid-cols-[1fr_1.5fr] gap-12 lg:gap-24 items-center">

                    <div className="space-y-8">
                        <div>
                            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-3 py-1">
                                The Roadmap
                            </Badge>
                            <h2 className="text-4xl md:text-6xl font-black mb-6 leading-[1.05] tracking-tight">
                                Your Path to <span className="text-primary italic">Success</span>
                            </h2>
                            <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
                                A high-octane 6-stage transformation designed to build production-ready engineers.
                            </p>
                        </div>

                        <div className="space-y-3 pl-2">
                            {CARDS.map((card, idx) => (
                                <Button
                                    key={card.id}
                                    variant="ghost"
                                    onClick={() => goToCard(idx)}
                                    className={cn(
                                        "group w-full flex items-center gap-6 p-4 rounded-2xl transition-all duration-300 text-left h-auto",
                                        idx === activeIndex
                                            ? "bg-primary/5 border border-primary/10"
                                            : "hover:bg-muted/50 grayscale opacity-40 hover:grayscale-0 hover:opacity-100"
                                    )}
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl border flex items-center justify-center font-black text-sm transition-all duration-500",
                                            idx === activeIndex
                                                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-110"
                                                : "border-border bg-card group-hover:border-primary/50 group-hover:text-primary"
                                        )}>
                                            {card.id}
                                        </div>
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">{card.week}</span>
                                        </div>
                                        <h4 className={cn(
                                            "font-bold text-base transition-colors truncate",
                                            idx === activeIndex ? "text-foreground" : "text-muted-foreground"
                                        )}>
                                            {card.title}
                                        </h4>
                                    </div>
                                </Button>
                            ))}
                        </div>

                        <div className="flex items-center gap-4 pt-4">
                            <Button
                                type="button"
                                size="lg"
                                onClick={handleExploreSyllabus}
                                className="rounded-2xl h-14 px-8 bg-primary text-white shadow-xl shadow-primary/30 hover:scale-105 transition-transform"
                            >
                                Explore Syllabus <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="relative perspective-[2000px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeIndex}
                                initial={{ opacity: 0, x: 100, rotateY: -15, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, rotateY: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -100, rotateY: 15, scale: 0.9 }}
                                transition={{ type: "spring", damping: 25, stiffness: 120 }}
                                className="w-full"
                            >
                                <div className="liquid-glass rounded-[2rem] border border-border/50 p-8 md:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] relative overflow-hidden group">
                                    <div className="absolute -top-10 -right-10 text-[180px] font-black text-primary/5 select-none rotate-12">
                                        {CARDS[activeIndex].id}
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary">
                                                {(() => {
                                                    const Icon = CARDS[activeIndex].bullets[0].icon;
                                                    return <Icon className="w-8 h-8" />;
                                                })()}
                                            </div>
                                            <div>
                                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 mb-1">
                                                    {CARDS[activeIndex].week}
                                                </Badge>
                                                <div className="text-sm font-medium text-muted-foreground">{CARDS[activeIndex].duration}</div>
                                            </div>
                                        </div>

                                        <h3 className="text-3xl md:text-4xl font-black mb-6 tracking-tight">
                                            {CARDS[activeIndex].title}
                                        </h3>
                                        <p className="text-muted-foreground text-lg leading-relaxed mb-10 max-w-lg">
                                            {CARDS[activeIndex].desc}
                                        </p>

                                        <div className="grid sm:grid-cols-2 gap-6 mb-12">
                                            {CARDS[activeIndex].bullets.map((bullet, i) => (
                                                <div key={i} className="flex items-start gap-4">
                                                    <div className="mt-1 w-6 h-6 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                                                        <bullet.icon className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-sm font-semibold">{bullet.text}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-8 border-t border-border/50">
                                            <div className="flex flex-wrap gap-2 items-center">
                                                <span className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mr-2">Deliverables</span>
                                                {CARDS[activeIndex].deliverables.map((d) => (
                                                    <span
                                                        key={d}
                                                        className="text-[11px] px-3 py-1.5 rounded-xl bg-muted/50 border border-border/50 font-bold hover:border-primary/30 transition-colors"
                                                    >
                                                        {d}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="absolute bottom-6 right-8 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                                        <span>Auto-Playing</span>
                                        <div className="flex gap-0.5">
                                            {[...Array(3)].map((_, i) => (
                                                <motion.div
                                                    key={i}
                                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                                                    className="w-1 h-1 rounded-full bg-primary"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        <div className="absolute -bottom-12 right-0 hidden md:flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => goToCard((activeIndex - 1 + CARDS.length) % CARDS.length)}
                                className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors opacity-50 hover:opacity-100"
                            >
                                <ArrowRight className="h-4 w-4 rotate-180" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={nextCard}
                                className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors opacity-50 hover:opacity-100"
                            >
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
