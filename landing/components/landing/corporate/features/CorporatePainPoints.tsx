"use client";

import { X } from "lucide-react";
import { Tilt } from '@/components/motion/Tilt';

export function CorporatePainPoints() {
    return (
        <section id="pain" className="relative py-24 sm:py-32 px-6 overflow-hidden bg-foreground/[0.02]">
            <div className="absolute top-0 inset-x-0 h-px bg-border/50" />
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="font-display text-3xl sm:text-5xl font-bold mb-6">
                        If this feels familiar — <span className="text-[#ff7400]">you&apos;re not alone.</span>
                    </h2>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                    {[
                        { title: "3 Years, Same Title", desc: "You've been at the same level while others get promoted to SDE-2 or Senior." },
                        { title: "Seniors Do Architecture", desc: "You only get to build the UI or fix bugs. The real system design is handed to seniors." },
                        { title: "Freezing in Interviews", desc: "You can code, but open-ended 'Design X' questions make your mind go blank." },
                        { title: "Low Visibility", desc: "You do the hard work, but someone else presents it. You lack the leverage to claim ownership." },
                        { title: "Legacy Purgatory", desc: "Maintaining an old monolith instead of building scalable features from scratch." },
                        { title: "Weak Negotiation", desc: "You accept the standard flat hike because you don't have the proof of work to demand 50% jump." }
                    ].map((pain, i) => (
                        <Tilt key={i} intensity={8} scale={1.02} glare>
                        <div className="pain-card rounded-2xl border border-border/50 bg-card p-8 h-full shadow-[0_0_15px_rgba(255,116,0,0.08)] hover:shadow-[0_0_30px_rgba(255,116,0,0.15)] hover:border-[#ff7400]/30 transition-all duration-300">
                            <div className="w-10 h-10 rounded-lg bg-[#ff7400]/10 flex items-center justify-center mb-6 border border-[#ff7400]/20">
                                <X className="h-5 w-5 text-[#ff7400]" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-3">{pain.title}</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">{pain.desc}</p>
                        </div>
                        </Tilt>
                    ))}
                </div>
            </div>
        </section>
    );
}
