"use client";

import { Button } from "@/components/ui/button";
import { CorporateApplyModal } from "../hero/CorporateCTA";

export function CorporateFooterCTA() {
    return (
        <section className="relative py-24 sm:py-32 px-6 overflow-hidden bg-foreground">
            <div className="max-w-4xl mx-auto text-center relative z-10">
                <h2 className="font-display text-3xl sm:text-5xl font-bold mb-8 text-background">
                    Ready to stop being <span className="text-[#ff7400]">&apos;just another dev&apos;</span>?
                </h2>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                    <CorporateApplyModal className="bg-[#ff7400] text-white hover:bg-[#ff7400]/90 border-0" />
                    <Button size="lg" variant="outline" className="h-14 px-10 text-lg font-bold rounded-xl border-border text-foreground hover:bg-muted backdrop-blur-sm" asChild>
                        <a href="/contact">Talk to Us</a>
                    </Button>
                </div>
                <p className="text-sm font-medium text-muted/80 tracking-wide uppercase">
                    Seats are limited to keep feedback high-quality.
                </p>
            </div>

            {/* Background elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] max-w-5xl aspect-[3/1] bg-[#ff7400] opacity-20 blur-[120px] rounded-[100%] pointer-events-none mix-blend-screen" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        </section>
    );
}
