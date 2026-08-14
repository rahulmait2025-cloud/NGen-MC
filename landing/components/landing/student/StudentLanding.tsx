"use client";

import dynamic from "next/dynamic";
import { Navbar } from "@/components/landing/layout/Navbar";
import { StudentHero } from "@/components/landing/student/hero/StudentHero";

const ProgramJourney = dynamic(() => import("./features/ProgramJourney").then(mod => mod.ProgramJourney), { ssr: false });
const DashboardPreview2 = dynamic(() => import("@/components/landing/blocks/DashboardPreview2").then(mod => mod.DashboardPreview2), { ssr: false });
const MeetFounders = dynamic(() => import("@/components/landing/sections/MeetFounders").then(mod => mod.MeetFounders), { ssr: false });
const StudentFAQSection = dynamic(() => import("@/components/landing/sections/FAQSection2").then(mod => mod.FAQSection2), { ssr: false });
const Testimonials = dynamic(() => import("@/components/landing/blocks/Testimonials").then(mod => mod.Testimonials), { ssr: false });
const YouTubeStats = dynamic(() => import("@/components/YouTubeStats").then(mod => mod.YouTubeStats), { ssr: false });
const TransformCTA = dynamic(() => import("@/components/landing/sections/TransformCTA").then(mod => mod.TransformCTA), { ssr: false });

const Footer = dynamic(() => import("@/components/landing/layout/Footer").then(mod => mod.Footer), { ssr: false });


export function StudentLanding() {
    return (
        <div className="min-h-screen bg-transparent font-sans text-foreground selection:bg-[#ff7400] selection:text-white overflow-x-clip">
            <Navbar />
            <main>
                <div id="hero"><StudentHero /></div>



                <section id="program">
                    <ProgramJourney />
                </section>

                <DashboardPreview2 />

                <div id="founders">
                    <MeetFounders />
                </div>
                <YouTubeStats />
                <section id="testimonials">
                    <Testimonials />
                </section>
                <div id="faq">
                    <StudentFAQSection />
                </div>
                <section id="transform-cta">
                    <TransformCTA />
                </section>
                <section className='px-6 pb-14 md:pb-20'>
                    <div className='max-w-7xl mx-auto text-center overflow-hidden'>
                        <span className='future-cto-word group text-[clamp(2.8rem,10vw,8rem)] font-display font-black uppercase leading-[0.88] tracking-tight' aria-label='Future CTO'>
                            <span className='future-cto-base'>Future CTO</span>
                            <span className='future-cto-fill'>Future CTO</span>
                        </span>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
