"use client";

import { ArrowRight, Activity, Target, Presentation } from "lucide-react";
import { TypewriterText } from "@/components/motion/TypewriterText";
import { Reveal } from "@/components/motion/Reveal";
import { Tilt } from '@/components/motion/Tilt';

export function CorporateSolution() {
    return (
        <section id="solution" className="relative py-24 sm:py-32 px-6 overflow-hidden bg-transparent">
            <div className="absolute top-0 inset-x-0 h-px bg-border/50" />
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="font-display text-3xl sm:text-5xl font-bold mb-6">
                        The shift: <TypewriterText text={["coder", "engineer", "leader"]} loop={true} speed={70} delay={1} className="text-[#ff7400]" />
                    </h2>
                </div>

                <div className="lg:col-span-12 lg:grid lg:grid-cols-2 gap-12 items-start">
                    <div className="space-y-4 mb-12 lg:mb-0">
                        {[
                            { left: "Syntax", right: "Systems" },
                            { left: "Shipping features", right: "Making tradeoffs" },
                            { left: "Waiting for tasks", right: "Owning outcomes", special: true },
                            { left: "Random prep", right: "SDE-2 readiness" },
                            { left: "Quiet in meetings", right: "Clear communication" }
                        ].map((item, i) => (
                            <div key={i} className="comparison-item flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
                                <span className="text-muted-foreground font-medium w-1/2">{item.left}</span>
                                <ArrowRight className="w-4 h-4 text-muted-foreground/30" />
                                <span className={item.special ? "text-[#ff7400] font-bold w-1/2 text-right" : "text-foreground font-bold w-1/2 text-right"}>
                                    {item.right}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                        {[
                            { title: "From Syntax to Systems", desc: "Microservices, Kafka, Redis, horizontal scaling, and fault tolerance paradigms.", icon: Activity },
                            { title: "Lateral Hiring Prep", desc: "SDE-2/Senior loops, intense system design rounds, and behavioral bar-raising.", icon: Target },
                            { title: "Corporate Soft Skills", desc: "Managing stakeholders, structuring salary negotiation, and navigating office politics.", icon: Presentation },
                            { title: "High-Impact Delivery", desc: "Production debugging, incident management, and leading complex rollout strategies.", icon: Activity }
                        ].map((feature, i) => (
                            <Reveal key={i} delay={i * 0.1} className="h-full">
                                <Tilt intensity={8} scale={1.02} glare>
                                <div className="rounded-2xl border border-border/50 bg-card p-6 h-full relative overflow-hidden group shadow-[0_0_15px_rgba(255,116,0,0.08)] hover:shadow-[0_0_30px_rgba(255,116,0,0.15)] hover:border-[#ff7400]/30 transition-all duration-300">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#ff7400]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                    <div className="relative z-10 w-10 h-10 rounded-lg bg-[#ff7400]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <feature.icon className="w-5 h-5 text-[#ff7400]" />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                                </div>
                                </Tilt>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
