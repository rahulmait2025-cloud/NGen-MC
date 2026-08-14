"use client";

import { Rocket } from "lucide-react";
import { Tilt } from '@/components/motion/Tilt';

export function CorporateOutcomes() {
    return (
        <section id="outcomes" className="relative py-24 px-6 overflow-hidden bg-transparent">
            <div className="absolute top-0 inset-x-0 h-px bg-border/50" />
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="font-display text-3xl sm:text-5xl font-bold mb-6">
                        The goal isn&apos;t learning. <span className="text-[#ff7400]">It&apos;s outcomes.</span>
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                        Your portfolio + communication + system thinking becomes the proof.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                    {[
                        "Promotion readiness: ownership + visibility",
                        "System design confidence under interview pressure",
                        "SDE-2 / Senior loop readiness",
                        "Better hikes via impact proof + negotiation"
                    ].map((outcome, i) => (
                        <Tilt key={i} intensity={8} scale={1.02} glare>
                        <div className="outcome-item flex items-center gap-4 p-6 rounded-2xl border border-border/50 bg-card h-full shadow-[0_0_15px_rgba(255,116,0,0.08)] hover:shadow-[0_0_30px_rgba(255,116,0,0.15)] hover:border-[#ff7400]/30 transition-all duration-300">
                            <div className="w-10 h-10 rounded-full bg-[#ff7400]/10 border border-[#ff7400]/20 flex items-center justify-center shrink-0">
                                <Rocket className="w-5 h-5 text-[#ff7400]" />
                            </div>
                            <span className="text-lg font-bold text-foreground">{outcome}</span>
                        </div>
                        </Tilt>
                    ))}
                </div>
            </div>
        </section>
    );
}
