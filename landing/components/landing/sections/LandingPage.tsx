"use client";

import dynamic from "next/dynamic";
import { Navbar } from "@/components/landing/layout/Navbar";
import { Hero } from "@/components/landing/Hero";
import { CollegeHeroStrip } from "@/components/landing/student/hero/CollegeHeroStrip";
import { SectionTracker } from "@/components/analytics/SectionTracker";

const ProgramJourney = dynamic(() => import("@/components/landing/student/features/ProgramJourney").then(mod => mod.ProgramJourney), { ssr: false });
const DashboardPreview = dynamic(() => import("@/components/landing/blocks/DashboardPreview").then(mod => mod.DashboardPreview), { ssr: false });
// const ROICalculator = dynamic(() => import("@/components/landing/blocks/ROICalculator").then(mod => mod.ROICalculator), { ssr: false });
const MeetFounders = dynamic(() => import("@/components/landing/sections/MeetFounders").then(mod => mod.MeetFounders), { ssr: false });
const FAQSection = dynamic(() => import("@/components/landing/sections/FAQSection").then(mod => mod.FAQSection), { ssr: false });
const Testimonials = dynamic(() => import("@/components/landing/blocks/Testimonials").then(mod => mod.Testimonials), { ssr: false });
const TransformCTA = dynamic(() => import("@/components/landing/sections/TransformCTA").then(mod => mod.TransformCTA), { ssr: false });
const StickyCTA = dynamic(() => import("@/components/landing/sections/StickyCTA").then(mod => mod.StickyCTA), { ssr: false });
const Footer = dynamic(() => import("@/components/landing/layout/Footer").then(mod => mod.Footer), { ssr: false });


export function LandingPage() {
    return (
        <div className="min-h-screen bg-transparent font-sans text-foreground selection:bg-primary selection:text-white overflow-x-clip">
            <Navbar />
            <main>
                <SectionTracker sectionName="hero" pageName="home">
                    <Hero />
                </SectionTracker>
                <SectionTracker sectionName="college_strip" pageName="home">
                    <CollegeHeroStrip />
                </SectionTracker>

                <SectionTracker sectionName="program" pageName="home">
                    <ProgramJourney />
                </SectionTracker>

                <SectionTracker sectionName="dashboard_preview" pageName="home">
                    <DashboardPreview />
                </SectionTracker>

                <SectionTracker sectionName="founders" pageName="home">
                    <MeetFounders />
                </SectionTracker>
                <SectionTracker sectionName="testimonials" pageName="home">
                    <Testimonials />
                </SectionTracker>
                <SectionTracker sectionName="faq" pageName="home">
                    <FAQSection />
                </SectionTracker>
                <SectionTracker sectionName="transform_cta" pageName="home">
                    <TransformCTA />
                </SectionTracker>
            </main>
            <SectionTracker sectionName="footer" pageName="home">
                <Footer />
            </SectionTracker>
            <SectionTracker sectionName="sticky_cta" pageName="home">
                <StickyCTA />
            </SectionTracker>
        </div>
    );
}
