"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tilt } from '@/components/motion/Tilt';

const TESTIMONIALS = [
    {
        name: "Rahul S.",
        prevCompany: "Service Based MNC",
        prevCtc: "CTC: 6 LPA",
        currentRole: "SDE-2 at Unicorn Fintech",
        currentCtc: "CTC: 21 LPA",
        hike: "+250%",
        note: "Cracked SDE-2 with system design + mock loops.",
    },
    {
        name: "Priya M.",
        prevCompany: "Mid-size Agency",
        prevCtc: "CTC: 8 LPA",
        currentRole: "Senior Engineer at SaaS Startup",
        currentCtc: "CTC: 26 LPA",
        hike: "+225%",
        note: "Finally broke the 20L barrier.",
    },
    {
        name: "Aditya V.",
        prevCompany: "Legacy Bank",
        prevCtc: "CTC: 12 LPA",
        currentRole: "Backend Lead",
        currentCtc: "CTC: 35 LPA",
        hike: "+190%",
        note: "System design masterclasses changed everything.",
    },
    {
        name: "Sneha K.",
        prevCompany: "B2B Enterprise",
        prevCtc: "CTC: 9 LPA",
        currentRole: "SDE-2 at Top Product Org",
        currentCtc: "CTC: 24 LPA",
        hike: "+166%",
        note: "The mock interviews were brutal but necessary.",
    },
    {
        name: "Karan D.",
        prevCompany: "Freelance / Agency",
        prevCtc: "CTC: 5 LPA",
        currentRole: "Platform Engineer",
        currentCtc: "CTC: 18 LPA",
        hike: "+260%",
        note: "Learned how to design for millions of users.",
    }
];

export function TestimonialsCareer() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    useEffect(() => {
        if (!isAutoPlaying) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [isAutoPlaying]);

    const handleNext = () => {
        setIsAutoPlaying(false);
        setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    };

    const handlePrev = () => {
        setIsAutoPlaying(false);
        setCurrentIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
    };

    return (
        <section className="relative py-24 sm:py-32 px-6 overflow-hidden bg-transparent">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16">
                    <Badge variant="outline" className="mb-6 border-foreground/30 bg-foreground/5 text-foreground tracking-widest text-[10px] uppercase">
                        Proof of Concept
                    </Badge>
                    <h2 className="font-display text-3xl sm:text-5xl font-bold mb-6">
                        Real outcomes. <span className="text-[#ff7400]">Real jumps.</span>
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                        Career growth backed by proof-of-work and interview readiness.
                    </p>
                </div>

                {/* Carousel Container */}
                <div className="relative max-w-2xl mx-auto">
                    <div className="relative min-h-[300px] flex items-center justify-center">
                        <div className="w-full">
                            <Tilt intensity={10} scale={1.03} glare>
                                <div className="rounded-2xl border border-border/50 bg-card p-8 md:p-10 shadow-[0_0_15px_rgba(255,116,0,0.08)] hover:shadow-[0_0_30px_rgba(255,116,0,0.15)] hover:border-[#ff7400]/30 transition-all duration-300 flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-8 border-b border-border/50 pb-6">
                                        <div>
                                            <h3 className="text-2xl font-bold text-foreground">{TESTIMONIALS[currentIndex].name}</h3>
                                            <p className="text-sm font-medium text-muted-foreground mt-1">
                                                {TESTIMONIALS[currentIndex].prevCompany} → <span className="text-foreground">{TESTIMONIALS[currentIndex].currentRole}</span>
                                            </p>
                                        </div>
                                        <Badge className="bg-[#ff7400]/10 text-[#ff7400] border-[#ff7400]/30 font-bold px-3 py-1 flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" />
                                            {TESTIMONIALS[currentIndex].hike}
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Before</p>
                                            <p className="font-mono text-sm text-foreground/70">{TESTIMONIALS[currentIndex].prevCtc}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] uppercase tracking-widest text-[#ff7400] font-bold">After</p>
                                            <p className="font-mono text-xl font-bold text-foreground">{TESTIMONIALS[currentIndex].currentCtc}</p>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-6 border-t border-border/50">
                                        <p className="text-foreground font-medium text-lg leading-relaxed italic">
                                            &quot;{TESTIMONIALS[currentIndex].note}&quot;
                                        </p>
                                    </div>
                                </div>
                            </Tilt>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between mt-8 p-1">
                        <Button variant="outline" size="icon" onClick={handlePrev} className="rounded-full border-border hover:bg-muted">
                            <ChevronLeft className="h-5 w-5" />
                            <span className="sr-only">Previous slide</span>
                        </Button>

                        <div className="flex gap-2">
                            {TESTIMONIALS.map((_, i) => (
                                <div
                                    key={i}
                                    onClick={() => { setIsAutoPlaying(false); setCurrentIndex(i); }}
                                    className={`cursor-pointer w-2 h-2 rounded-full transition-all duration-300 ${i === currentIndex ? "w-6 bg-foreground" : "bg-border hover:bg-foreground/50"
                                        }`}
                                    role="button"
                                    aria-label={`Go to slide ${i + 1}`}
                                >
                                    <span className="sr-only">Go to slide {i + 1}</span>
                                </div>
                            ))}
                        </div>

                        <Button variant="outline" size="icon" onClick={handleNext} className="rounded-full border-border hover:bg-muted">
                            <ChevronRight className="h-5 w-5" />
                            <span className="sr-only">Next slide</span>
                        </Button>
                    </div>
                </div>

                <div className="cohort-btn mt-16 text-center">
                    <Button size="lg" className="h-14 px-8 text-base font-bold rounded-lg bg-[#ff7400] text-white hover:bg-[#ff7400]/90 group w-full sm:w-auto">
                        Apply for Cohort
                        <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                </div>
            </div>
        </section>
    );
}
