"use client";

import { Navbar } from "@/components/landing/layout/Navbar";
import { Footer } from "@/components/landing/layout/Footer";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Kalam } from "next/font/google";
import { SubscriberCount } from "@/components/landing/student/hero/SubscriberCount";
import dynamic from "next/dynamic";

const kalam = Kalam({ subsets: ["latin"], weight: ["400", "700"] });

const JourneyTimeline = dynamic(
    () => import("@/components/about/JourneyTimeline").then((mod) => mod.JourneyTimeline),
    { ssr: false }
);

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-transparent font-sans text-foreground overflow-x-clip">
            <Navbar />
            <main className="pt-32 pb-20">
                {/* Hero Section - Inspired by the reference */}
                <section className="px-6 max-w-6xl mx-auto mb-32">
                    <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
                        <div className="order-2 md:order-1 relative z-10">
                            <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-primary/10 text-primary mb-6">
                                The Mastermind Behind NextGen CTO
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 font-display leading-[1.15] tracking-tight">
                                Building systems. <span className="text-primary">Building people.</span><br />
                                Building from zero.
                            </h1>

                            <div className={`${kalam.className} text-xl md:text-[22px] leading-relaxed text-muted-foreground/90 space-y-6 mb-10 tracking-wide`}>
                                <p>
                                    Hi, I&apos;m Anuj Kumar—Engineering Leader, CTO, and Educator. Many of you know me as CTO Bhaiya.
                                </p>
                                
                                <p>
                                    I started my journey at <span className="underline decoration-primary decoration-4 underline-offset-4 font-semibold text-foreground">NITK Surathkal</span> without coaching or a safety net. After entering in Mining Engineering, I hustled to top my batch, switched to IT, and eventually spent six years building large-scale systems at <span className="underline decoration-primary decoration-4 underline-offset-4 font-semibold text-foreground">Adobe</span>.
                                </p>

                                <p>
                                    Later, I took the leap to become the <span className="underline decoration-primary decoration-4 underline-offset-4 font-semibold text-foreground">CTO</span> of a Dubai-based Web3 startup, building entire platforms from scratch. But my true passion has always been teaching. Today, I&apos;ve had the privilege of guiding over <strong className="text-foreground"><SubscriberCount /> students</strong> across my channels.
                                </p>

                                <div className="py-2">
                                    <p className="font-semibold text-foreground text-2xl group relative inline-block">
                                        My mission is simple:
                                    </p>
                                    <p className="mt-2 font-semibold text-foreground text-2xl">
                                        To demystify tech careers, systems, and growth for students who don&apos;t have access to the right guidance.
                                    </p>
                                </div>
                            </div>

                            <div className="flex">
                                <a 
                                    href="https://www.youtube.com/@CodingwithCTOBhaiya/courses" 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-14 px-8 bg-[#ff6b00] text-white font-semibold rounded-full flex items-center justify-center hover:bg-[#e66000] transition-all shadow-[0_8px_30px_rgb(255,107,0,0.3)] hover:shadow-[0_8px_40px_rgb(255,107,0,0.4)] hover:-translate-y-1 text-lg gap-3"
                                >
                                    Get Started Now <ArrowRight className="w-5 h-5" />
                                </a>
                            </div>
                        </div>

                        {/* Image Side with fading/gradient effect and floating badges */}
                        <div className="order-1 md:order-2 relative mt-4 md:mt-0 flex justify-center">
                            <div className="relative w-full max-w-[500px]">
                                <div className="relative rounded-2xl overflow-hidden aspect-square md:aspect-[4/5]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src='/assets/founder.jpeg'
                                        alt="Anuj Kumar"
                                        className="object-cover w-full h-full object-center"
                                    />
                                </div>

                                </div>
                            </div>
                        </div>
                </section>

                {/* The Journey */}
                <JourneyTimeline />
                
                {/* Final CTA */}
                <section className="px-6 py-24 mb-20">
                    <div className="max-w-4xl mx-auto text-center bg-[#ff6b00] rounded-[3rem] p-12 md:p-20 relative overflow-hidden shadow-[0_24px_80px_-12px_rgba(255,107,0,0.3)] group hover:scale-[1.01] transition-transform duration-500">
                        {/* Decorative background circle */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 transition-transform duration-700 group-hover:scale-110"></div>
                        
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 font-display leading-tight">
                                The journey is just beginning.<br />
                                Let&apos;s build your future together.
                            </h2>
                            <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto">
                                Skip the safety nets. Forget the mediocre tutorials. 
                                Master the depth, build the hunger, and become the leader you were meant to be.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <a 
                                    href="https://www.youtube.com/@CodingwithCTOBhaiya/courses"
                                    target="_blank"
                                    rel="noopener noreferrer" 
                                    className="h-16 px-10 bg-white text-[#ff6b00] font-bold rounded-full flex items-center justify-center hover:bg-white/90 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 text-lg gap-3"
                                >
                                    Explore Free Courses <ArrowRight className="w-5 h-5" />
                                </a>
                                <Link 
                                    href="/" 
                                    className="h-16 px-10 bg-transparent text-white border-2 border-white/30 font-bold rounded-full flex items-center justify-center hover:bg-white/10 transition-all text-lg"
                                >
                                    Back to Home
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
