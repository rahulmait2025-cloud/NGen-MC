"use client";

import { Zap, TrendingUp, Handshake } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Tilt } from '@/components/motion/Tilt';

export function CollegeHeroStrip() {
    const items = [
        {
            icon: Zap,
            title: "What We Deliver",
            desc: "Industry-aligned curriculum & expert mentorship.",
            color: "text-yellow-500",
            bg: "bg-yellow-500/10",
            border: "border-yellow-500/20"
        },
        {
            icon: TrendingUp,
            title: "What College Gets",
            desc: "Higher placement rates & prestigious alumni network.",
            color: "text-green-500",
            bg: "bg-green-500/10",
            border: "border-green-500/20"
        },
        {
            icon: Handshake,
            title: "You Provide",
            desc: "Infrastructure & committed student cohort.",
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20"
        }
    ];

    return (
        <section className="bg-transparent py-8 relative">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="grid md:grid-cols-3 gap-8">
                    {items.map((item, i) => (
                        <Reveal key={item.title} delay={i * 0.1} className="strip-item h-full">
                            <Tilt intensity={8} scale={1.02} glare>
                            <div className={`p-6 rounded-2xl border ${item.border} ${item.bg} backdrop-blur-sm flex items-start gap-4 h-full`}>
                                <div className={`p-3 rounded-xl bg-transparent border border-border ${item.color}`}>
                                    <item.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                            </Tilt>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
