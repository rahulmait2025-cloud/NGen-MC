"use client";

import { Network, Building2, Check, Presentation } from "lucide-react";

export function CorporateNetwork() {
    return (
        <section id="network" className="relative py-24 px-6 overflow-hidden bg-foreground/[0.02]">
            <div className="absolute top-0 inset-x-0 h-px bg-border/50" />
            <div className="max-w-4xl mx-auto text-center">
                <h2 className="font-display text-3xl sm:text-5xl font-bold mb-8">
                    You&apos;re joining a <span className="text-[#ff7400]">network</span> —<br /> not buying a course.
                </h2>
                <div className="grid sm:grid-cols-2 gap-6 text-left">
                    <div className="network-item flex items-start gap-3 p-4">
                        <Network className="w-5 h-5 text-[#ff7400] mt-0.5 shrink-0" />
                        <span className="text-foreground font-medium">Peer community of serious engineers</span>
                    </div>
                    <div className="network-item flex items-start gap-3 p-4">
                        <Building2 className="w-5 h-5 text-foreground/80 mt-0.5 shrink-0" />
                        <span className="text-foreground font-medium">Mentor-led groups</span>
                    </div>
                    <div className="network-item flex items-start gap-3 p-4">
                        <Check className="w-5 h-5 text-foreground/80 mt-0.5 shrink-0" />
                        <span className="text-foreground font-medium">Referral readiness guidance (NO fake guarantees)</span>
                    </div>
                    <div className="network-item flex items-start gap-3 p-4">
                        <Presentation className="w-5 h-5 text-foreground/80 mt-0.5 shrink-0" />
                        <span className="text-foreground font-medium">Hiring process playbooks + negotiation roleplay</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
