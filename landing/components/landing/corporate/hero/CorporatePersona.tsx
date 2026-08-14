"use client";

import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function CorporatePersona() {
    return (
        <section className="relative py-24 px-6 overflow-hidden bg-transparent">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <Badge variant="outline" className="mb-6 border-foreground/30 bg-foreground/5 text-foreground tracking-widest text-[10px] uppercase">
                        Persona Fit
                    </Badge>
                    <h2 className="font-display text-3xl sm:text-4xl font-bold mb-6">
                        Built for early-career <span className="text-[#ff7400]">working professionals</span> <span className="text-muted-foreground font-medium whitespace-nowrap">(0 - 10 years)</span>
                    </h2>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                    {[
                        "You're employed, but growth is slow.",
                        "You're stuck in tickets, bugs, and legacy maintenance.",
                        "You want SDE-2 / Senior interviews, not just more tutorials.",
                        "You freeze in architecture discussions.",
                        "You want ownership, visibility, and faster promotions."
                    ].map((bullet, i) => (
                        <div key={i} className="persona-item flex items-start gap-4 p-5 rounded-2xl border border-white/[0.04] bg-foreground/[0.01]">
                            <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center border border-foreground/10">
                                <Target className="w-4 h-4 text-foreground/70" />
                            </div>
                            <p className="text-foreground/80 leading-relaxed font-medium">{bullet}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
