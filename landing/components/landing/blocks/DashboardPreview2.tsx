"use client";

import { m, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
    BookOpen,
    FileCheck,
    Target,
    LayoutDashboard,
    TrendingUp,
    Briefcase
} from "lucide-react";
import { Tilt } from "@/components/motion/Tilt";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.4 },
    },
};

export function DashboardPreview2() {
    const sectionRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"]
    });
    const yParallax = useTransform(scrollYProgress, [0, 1], [100, -100]);

    return (
        <section ref={sectionRef} id="dashboards" className="py-24 px-6 bg-transparent border-t border-border relative overflow-hidden">
            <m.div
                style={{ y: yParallax, x: "-50%" }}
                className="absolute top-1/4 left-1/2 w-[800px] h-[800px] bg-[#ff7400]/10 rounded-full blur-[120px] pointer-events-none z-0"
            />

            <div className="max-w-5xl mx-auto relative z-10">
                <m.div
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16 space-y-4"
                >
                    <Badge
                        variant="outline"
                        className="text-[#ff7400] border-[#ff7400]/20 bg-[#ff7400]/5 uppercase tracking-widest px-4 py-1 text-xs mx-auto"
                    >
                        <LayoutDashboard className="h-4 w-4 mr-2" /> Personalized OS
                    </Badge>
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                        Track your <span className="text-[#ff7400]">transformation</span>
                    </h2>
                    <p className="text-muted-foreground max-w-lg mx-auto text-lg leading-relaxed">
                        Every metric that matters for your placement, tracked transparently in your custom dashboard. Monitor your tailored study plan and track real-time skills growth.
                    </p>
                </m.div>

                <m.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-80px" }}
                    className="max-w-4xl mx-auto"
                >
                    <Tilt
                        intensity={5}
                        glare
                        scale={1.02}
                        className="w-full"
                    >
                        <div className="rounded-2xl border border-border/50 bg-card shadow-[0_0_15px_rgba(255,116,0,0.08)] overflow-hidden flex flex-col">
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50 shrink-0">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-border" />
                                    <div className="w-3 h-3 rounded-full bg-border" />
                                    <div className="w-3 h-3 rounded-full bg-border" />
                                </div>
                                <div className="flex-1 mx-3 flex justify-center">
                                    <div className="bg-transparent border border-border rounded-md px-6 py-1.5 text-xs font-medium text-muted-foreground truncate w-full max-w-sm text-center">
                                        os.nextgen-cto.in/student
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 md:p-8 bg-background/50 grid md:grid-cols-2 gap-6">

                                {/* Left Column */}
                                <div className="space-y-6">
                                    <m.div variants={itemVariants} className="flex items-center gap-3 pb-6 border-b border-border/50">
                                        <div className="w-12 h-12 rounded-xl bg-[#ff7400] text-white flex items-center justify-center">
                                            <BookOpen className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <span className="font-bold text-xl text-foreground block">
                                                Study Plan
                                            </span>
                                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                                Personalized Path
                                            </span>
                                        </div>
                                    </m.div>

                                    <m.div variants={itemVariants} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                                            System Design Module
                                        </p>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-lg font-bold text-foreground">
                                                Microservices Architecture
                                            </span>
                                            <span className="text-lg font-bold text-foreground">68%</span>
                                        </div>
                                        <Progress value={68} className="h-2" indicatorClassName="bg-[#ff7400]" />
                                        <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm text-muted-foreground font-medium">
                                            <span>4/6 Projects Shipped</span>
                                            <span className="text-[#ff7400]">On Track</span>
                                        </div>
                                    </m.div>

                                    <m.div variants={itemVariants} className="rounded-xl border border-border bg-card p-5 shadow-sm flex items-center gap-4">
                                        <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                                            <Briefcase className="h-6 w-6 text-[#ff7400]" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground">Real-World Projects</h4>
                                            <p className="text-sm text-muted-foreground">No clone apps. Build a distributed ledger directly.</p>
                                        </div>
                                    </m.div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-6">
                                    <m.div variants={itemVariants} className="rounded-xl border border-primary/20 bg-primary/10 p-6 shadow-xl relative overflow-hidden group">
                                        <div className="flex items-center justify-between mb-4 relative z-10">
                                            <div className="flex items-center gap-2">
                                                <Target className="h-5 w-5 text-[#ff7400]/70" />
                                                <h4 className="font-bold text-lg text-[#ff7400]">Readiness Score</h4>
                                            </div>
                                            <span className="text-4xl font-black tracking-tighter text-[#ff7400]">84</span>
                                        </div>
                                        <Progress value={84} className="h-2 mb-2 bg-background/20" indicatorClassName="bg-background" />
                                        <p className="text-xs font-medium opacity-80 mt-2 text-right">Top 12% of cohort</p>
                                    </m.div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <m.div variants={itemVariants} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                                            <div className="flex items-center gap-2 mb-3">
                                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                                    Mocks
                                                </p>
                                            </div>
                                            <p className="text-3xl font-bold text-foreground mb-1">5/6</p>
                                            <p className="text-xs text-muted-foreground font-medium">Ready for finals</p>
                                        </m.div>

                                        <m.div variants={itemVariants} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                                            <div className="flex items-center gap-2 mb-3">
                                                <FileCheck className="h-4 w-4 text-muted-foreground" />
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                                    ATS Score
                                                </p>
                                            </div>
                                            <p className="text-3xl font-bold text-foreground mb-1">92%</p>
                                            <p className="text-xs text-muted-foreground font-medium">Resume reviewed</p>
                                        </m.div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </Tilt>
                </m.div>
            </div>
        </section>
    );
}
