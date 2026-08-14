"use client";

import { Navbar } from "@/components/landing/layout/Navbar";
import { Footer } from "@/components/landing/layout/Footer";
import { MeetFounders2 } from "@/components/landing/sections/MeetFounders2";
import { TestimonialsCareer } from "./social-proof/TestimonialsCareer";
import { CorporateJourney } from "./features/CorporateJourney";

import { CorporateHero } from "./hero/CorporateHero";
import { CorporatePersona } from "./hero/CorporatePersona";
import { TrustMarquee2 } from "../campus/social-proof/TrustMarquee2";
import { CorporatePainPoints } from "./features/CorporatePainPoints";
import { CorporateSolution } from "./features/CorporateSolution";
import { CorporateTimeline } from "./features/CorporateTimeline";
import { CorporateProjects } from "./social-proof/CorporateProjects";
import { CorporateOutcomes } from "./social-proof/CorporateOutcomes";
import { CorporateNetwork } from "./social-proof/CorporateNetwork";
import { CorporateFAQ } from "./info/CorporateFAQ";
import { CorporateFooterCTA } from "./info/CorporateFooterCTA";

export function CorporateLanding() {
    return (
        <div className="min-h-screen bg-transparent font-sans text-foreground selection:bg-[#ff7400] selection:text-white overflow-x-clip">
            <div className="relative w-full overflow-hidden">
                <Navbar />
                <main>
                    <CorporateHero />
                    <TrustMarquee2 />
                    <CorporatePersona />
                    <CorporatePainPoints />
                    <CorporateSolution />

                    <section id="program">
                        <CorporateJourney />
                    </section>

                    <CorporateTimeline />
                    <CorporateProjects />
                    <CorporateOutcomes />
                    <CorporateNetwork />

                    <div id="testimonials">
                        <TestimonialsCareer />
                    </div>

                    <div id="founders">
                        <MeetFounders2 />
                    </div>

                    <CorporateFAQ />
                    <CorporateFooterCTA />
                </main>
                <Footer />
            </div>
        </div>
    );
}
