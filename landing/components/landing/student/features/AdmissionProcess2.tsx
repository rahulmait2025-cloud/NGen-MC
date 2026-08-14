"use client";

import { DemoDialog } from "@/components/landing/sections/DemoDialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, ClipboardEdit, MonitorPlay, Users } from "lucide-react";
import { Tilt } from '@/components/motion/Tilt';

export function AdmissionProcess2() {

    return (
        <section className="relative py-24 sm:py-32 px-6 overflow-hidden bg-transparent">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="font-display text-3xl sm:text-5xl font-bold mb-4">
                        How to <span className="text-[#ff7400]">Join</span>
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                        Our cohorts are strictly capped at 50 students to guarantee high-quality,
                        1-on-1 mentorship. Admission is competitive.
                    </p>
                </div>

                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                    {/* Step 1 */}
                    <div className="step-item relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-background bg-foreground/[0.02] text-muted-foreground group-hover:bg-[#ff7400]/20 group-hover:text-[#ff7400] transition-colors shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 shadow-[0_0_0_1px_rgba(255,255,255,0.1)]">
                            <ClipboardEdit className="w-5 h-5" />
                        </div>
                        <Tilt intensity={8} scale={1.02} glare className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)]">
                            <div className="p-6 rounded-2xl border border-border/50 bg-card shadow-[0_0_15px_rgba(255,116,0,0.08)] hover:shadow-[0_0_30px_rgba(255,116,0,0.15)] hover:border-[#ff7400]/30 transition-all duration-300 cursor-default">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-lg text-foreground">Submit Application</h3>
                                    <span className="text-[10px] font-bold text-[#ff7400] uppercase tracking-widest">Step 1</span>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Fill out a detailed questionnaire about your current technical stack, college background, and ultimate career goals.
                                </p>
                            </div>
                        </Tilt>
                    </div>

                    {/* Step 2 */}
                    <div className="step-item relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-background bg-foreground/[0.02] text-muted-foreground group-hover:bg-[#ff7400]/20 group-hover:text-[#ff7400] transition-colors shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 shadow-[0_0_0_1px_rgba(255,255,255,0.1)]">
                            <MonitorPlay className="w-5 h-5" />
                        </div>
                        <Tilt intensity={8} scale={1.02} glare className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)]">
                            <div className="p-6 rounded-2xl border border-border/50 bg-card shadow-[0_0_15px_rgba(255,116,0,0.08)] hover:shadow-[0_0_30px_rgba(255,116,0,0.15)] hover:border-[#ff7400]/30 transition-all duration-300 cursor-default">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-lg text-foreground">Technical Assessment</h3>
                                    <span className="text-[10px] font-bold text-[#ff7400] uppercase tracking-widest">Step 2</span>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    A 30-minute screening call with a mentor to verify your baseline coding knowledge and ensure you are a cultural fit for the grind.
                                </p>
                            </div>
                        </Tilt>
                    </div>

                    {/* Step 3 */}
                    <div className="step-item relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-background bg-[#ff7400]/20 text-[#ff7400] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 shadow-[0_0_0_1px_rgba(255,116,0,0.3)]">
                            <Users className="w-5 h-5" />
                        </div>
                        <Tilt intensity={8} scale={1.02} glare className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)]">
                            <div className="p-6 rounded-2xl border border-border/50 bg-card shadow-[0_0_15px_rgba(255,116,0,0.08)] hover:shadow-[0_0_30px_rgba(255,116,0,0.15)] hover:border-[#ff7400]/30 transition-all duration-300 cursor-default">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-lg text-foreground">Cohort Kickoff</h3>
                                    <span className="text-[10px] font-bold text-[#ff7400] uppercase tracking-widest">Step 3</span>
                                </div>
                                <p className="text-sm text-foreground/80 font-medium leading-relaxed">
                                    Once selected, you&apos;ll be onboarded into the residency.
                                    Prepare to spend the next 25 weeks transforming your career trajectory.
                                </p>
                            </div>
                        </Tilt>
                    </div>
                </div>

                <div className="mt-16 flex flex-col items-center justify-center text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold mb-6 uppercase tracking-widest animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-red-500" /> Winter Cohort: 12 Seats Remaining
                    </div>
                    <DemoDialog>
                        <Button
                            size="lg"
                            className="h-14 px-8 text-base font-bold rounded-2xl bg-[#ff7400] hover:bg-[#ff7400]/90 text-white shadow-xl shadow-[#ff7400]/20 group"
                        >
                            Apply for Residency
                            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </DemoDialog>
                </div>
            </div>
        </section>
    );
}
