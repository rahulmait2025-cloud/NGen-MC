"use client";

import { Shield, Code2, TrendingUp, Check } from "lucide-react";
import { Tilt } from "@/components/motion/Tilt";
import { Button } from "@/components/ui/button";
import { CorporateApplyModal } from "./CorporateCTA";
import { SplitText } from "@/components/motion/SplitText";

export function CorporateHero() {

    return (
        <section id="hero" className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-24 pb-12 sm:pt-32 sm:pb-20 bg-transparent">
            <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    <div className="text-left space-y-8">
                        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-foreground pb-4 max-w-full lg:max-w-2xl text-balance">
                            <SplitText text="Stuck in the mid-level trap?" delay={0.1} className="block" />
                            <SplitText text="Master System Design" delay={0.3} className="block text-[#ff7400] mt-2 sm:mt-0" />
                            <SplitText text="and crack elite" delay={0.5} className="block" />
                            <SplitText text="product companies." delay={0.7} className="block" />
                        </h1>

                        <p className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
                            Build scalable architecture, refine your engineering processes, and master strategic negotiation to confidently step into Tech Lead roles.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                            <CorporateApplyModal />
                            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base font-semibold h-14 px-8 rounded-lg border-border text-foreground hover:bg-muted" asChild>
                                <a href="#program">View Advanced Curriculum</a>
                            </Button>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-4 sm:gap-x-6 sm:gap-y-3 pt-6 border-t border-border/50 text-sm font-semibold text-[#ff7400]/80">
                            <span className="flex items-center gap-2 relative">
                                <Shield className="w-4 h-4 text-[#ff7400]" /> Mentor-led reviews
                            </span>
                            <span className="flex items-center gap-2 relative">
                                <Code2 className="w-4 h-4 text-[#ff7400]" /> Real proof-of-work projects
                            </span>
                            <span className="flex items-center gap-2 relative">
                                <TrendingUp className="w-4 h-4 text-[#ff7400]" /> Career + negotiation playbooks
                            </span>
                        </div>
                    </div>

                    <div className="relative hidden lg:block">
                        <div className="relative w-full aspect-square max-w-lg ml-auto">
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ff740008_1px,transparent_1px),linear-gradient(to_bottom,#ff740008_1px,transparent_1px)] bg-[size:24px_24px] rounded-[2rem]" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[130%] bg-[#ff7400]/25 blur-[120px] rounded-full pointer-events-none opacity-80" />

                            <Tilt
                                intensity={15}
                                glare
                                scale={1.05}
                                className="relative w-full z-10"
                            >
                                <div className="relative w-full flex flex-col gap-4">
                                    {[
                                        { label: "System Design Sprint", active: false },
                                        { label: "Architecture Review Pending", active: false },
                                        { label: "Mock Interview Scheduled", active: false },
                                        { label: "Goal: Promotion Ready ✓", active: true },
                                    ].map((item, i) => (
                                        <div key={i} className={`floating-item px-6 py-4 rounded-xl border border-[#ff7400]/20 bg-[#ff7400]/5 shadow-lg shadow-[#ff7400]/5 flex items-center justify-between transition-all hover:bg-[#ff7400]/10 hover:border-[#ff7400]/40 group`}>
                                            <span className={`font-semibold text-foreground group-hover:text-[#ff7400] transition-colors`}>{item.label}</span>
                                            {item.active && <Check className="w-5 h-5 text-[#ff7400]" />}
                                        </div>
                                    ))}
                                </div>
                            </Tilt>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
