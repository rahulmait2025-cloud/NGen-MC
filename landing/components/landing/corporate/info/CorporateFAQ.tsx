"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Tilt } from '@/components/motion/Tilt';

export function CorporateFAQ() {
    return (
        <section id="faq" className="relative py-24 sm:py-32 px-6 overflow-hidden bg-transparent">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="font-display text-3xl sm:text-5xl font-bold mb-6">
                        Frequently Asked <span className="text-[#ff7400]">Questions</span>
                    </h2>
                </div>

                <div>
                    <Tilt intensity={5} scale={1.01} glare>
                    <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
                        <AccordionItem value="item-1" className="border-border">
                            <AccordionTrigger className="text-left text-lg font-bold hover:text-[#ff7400] [&[data-state=open]]:text-foreground">
                                Is this for freshers working in service companies?
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                                Yes. If you are stuck doing legacy maintenance, QA, or basic bug fixes and want to break into product companies or SDE-2 level architectures, this track is exactly built for you to rapidly elevate your profile.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2" className="border-border">
                            <AccordionTrigger className="text-left text-lg font-bold hover:text-muted-foreground [&[data-state=open]]:text-foreground">
                                How much time per week?
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                                Expect to dedicate roughly 6-8 hours a week. It is heavily streamlined for working professionals, balancing weekend masterclasses with async deep-dives that you can consume on your own time.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3" className="border-border">
                            <AccordionTrigger className="text-left text-lg font-bold hover:text-muted-foreground [&[data-state=open]]:text-foreground">
                                Do I need DSA?
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                                Basic structural programming logic is expected, but our focus is strictly on System Design, Backend Architectures, and Leadership/Behavioral interviews. We do not do blind Leetcode grinding.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4" className="border-border">
                            <AccordionTrigger className="text-left text-lg font-bold hover:text-muted-foreground [&[data-state=open]]:text-foreground">
                                Is it live or recorded?
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                                It is a hybrid format. Foundational theory and core concepts are delivered async. System architecture deep-dives, mock interviews, and code reviews are strictly Live.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-5" className="border-border">
                            <AccordionTrigger className="text-left text-lg font-bold hover:text-muted-foreground [&[data-state=open]]:text-foreground">
                                Do you guarantee placement?
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                                No fake guarantees. We guarantee structured support, brutal interview readiness, and referral guidance across our network, but you must clear the interview yourself.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-6" className="border-border">
                            <AccordionTrigger className="text-left text-lg font-bold hover:text-muted-foreground [&[data-state=open]]:text-foreground">
                                What if I miss sessions?
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                                All live sessions are recorded and made available immediately. You can review the VOD async around your 9-to-5 schedule.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                    </Tilt>
                </div>
            </div>
        </section>
    );
}
