"use client";

import { useRef } from "react";
import { Clock, BookOpen, Building2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tilt } from '@/components/motion/Tilt';
import { motion, useScroll, useTransform } from "framer-motion";

export function CorporateTimeline() {
    const sectionRef = useRef<HTMLElement>(null);

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start center", "end center"]
    });
    const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

    return (
        <section ref={sectionRef} id="timeline" className="relative py-24 sm:py-32 px-6 overflow-hidden bg-transparent">
            <div className="absolute top-0 inset-x-0 h-px bg-border/50" />
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <Badge variant="outline" className="mb-6 border-[#ff7400]/30 bg-[#ff7400]/10 text-[#ff7400] tracking-widest text-[10px] uppercase">
                        Flexibility
                    </Badge>
                    <h2 className="font-display text-3xl sm:text-5xl font-bold mb-6">
                        Designed for{" "}<span className="text-muted-foreground">9–5 schedules</span>.
                    </h2>
                    <Tilt intensity={8} scale={1.02} glare className="max-w-2xl mx-auto">
                    <p className="text-foreground font-semibold text-lg p-4 border border-[#ff7400]/30 rounded-xl bg-[#ff7400]/5 shadow-inner">
                        6–8 hrs/week is enough to finish, even with a full-time job.
                    </p>
                    </Tilt>
                </div>

                <Tilt intensity={10} scale={1.03} glare>
                <div className="relative rounded-3xl border border-border/50 bg-card shadow-[0_0_15px_rgba(255,116,0,0.08)] hover:shadow-[0_0_30px_rgba(255,116,0,0.15)] hover:border-[#ff7400]/30 transition-all duration-300 overflow-hidden p-8 sm:p-12">
                    <motion.div
                        style={{ scaleY }}
                        className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ff7400] origin-top"
                    />
                    <div className="grid sm:grid-cols-2 gap-8">
                        <div className="timeline-item flex items-start gap-4">
                            <div className="mt-1 w-10 h-10 rounded-full bg-[#ff7400]/10 flex items-center justify-center border border-[#ff7400]/20 shrink-0">
                                <Clock className="w-5 h-5 text-[#ff7400]" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold">Weekend masterclasses</h4>
                                <p className="text-sm text-muted-foreground mt-1">Intensive live architecture breakdowns designed for high-signal learning.</p>
                            </div>
                        </div>
                        <div className="timeline-item flex items-start gap-4">
                            <div className="mt-1 w-10 h-10 rounded-full bg-neutral-500/10 flex items-center justify-center border border-neutral-500/20 shrink-0">
                                <BookOpen className="w-5 h-5 text-foreground/80" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold">Async deep-dives</h4>
                                <p className="text-sm text-muted-foreground mt-1">Study materials and assignments you consume around your office hours.</p>
                            </div>
                        </div>
                        <div className="timeline-item flex items-start gap-4">
                            <div className="mt-1 w-10 h-10 rounded-full bg-neutral-500/10 flex items-center justify-center border border-neutral-500/20 shrink-0">
                                <Building2 className="w-5 h-5 text-foreground/80" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold">Weekly mentor office hours</h4>
                                <p className="text-sm text-muted-foreground mt-1">Ask questions, unblock issues, and validate your system designs.</p>
                            </div>
                        </div>
                        <div className="timeline-item flex items-start gap-4">
                            <div className="mt-1 w-10 h-10 rounded-full bg-neutral-500/10 flex items-center justify-center border border-neutral-500/20 shrink-0">
                                <ShieldCheck className="w-5 h-5 text-foreground/80" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold">Mock System Design Loops</h4>
                                <p className="text-sm text-muted-foreground mt-1">Practice high-pressure interviews with senior engineers and get brutal, constructive feedback.</p>
                            </div>
                        </div>
                    </div>
                </div>
                </Tilt>
            </div>
        </section>
    );
}
