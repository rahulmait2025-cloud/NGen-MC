"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/motion/Reveal";
import { Tilt } from '@/components/motion/Tilt';

export function FAQSection2() {
    const faqs = [
        {
            q: 'How do students access the LMS platform?',
            a: 'Students from partnered colleges receive pre-created login credentials. Direct students can create accounts using Google authentication.'
        },
        {
            q: 'What happens during the first login?',
            a: 'Students log in using the provided credentials and may change their password for security. A welcome email is sent after the first successful login.'
        },
        {
            q: 'What can students see on their dashboard?',
            a: 'The dashboard shows total course progress, progress across the five pillars, project completion status, GitHub project count, LinkedIn completion status, resume submission status, and interview readiness status.'
        },
        {
            q: 'How long is the complete learning program?',
            a: 'The structured bootcamp includes approximately 250 hours of learning content covering technical, behavioral, and career readiness modules.'
        },
        {
            q: 'How is course progress calculated?',
            a: 'Progress is calculated based on completed modules, assignments, projects, and videos that students mark as completed.'
        },
        {
            q: 'What are the five pillars of the program?',
            a: 'The program includes Computer Science Bootcamp, Behavioral Skills Bootcamp, Resume & Interview Readiness, GitHub Profile Optimization, and LinkedIn Profile Optimization.'
        },
        {
            q: 'Can students edit their GitHub or LinkedIn links?',
            a: 'Yes. Students can link or update their GitHub and LinkedIn profiles from their dashboard settings.'
        },
        {
            q: 'How many projects must students complete?',
            a: 'Students are expected to complete at least three verified GitHub projects as part of the technical portfolio requirement.'
        },
        {
            q: 'What is a capstone project?',
            a: 'A capstone project is a final project that integrates multiple technical skills learned during the program and demonstrates practical problem-solving ability.'
        },
        {
            q: 'Can students view their Interview Ready status?',
            a: 'Yes. Students can see their readiness status on the dashboard, including Not Eligible, Under Review, or Interview Ready.'
        },
        {
            q: 'Can students mark themselves as Interview Ready?',
            a: 'No. This status can only be assigned by authorized administrators after verifying readiness requirements.'
        },
        {
            q: 'Will students receive notifications from the platform?',
            a: 'Yes. Students receive email notifications for account creation, password reset requests, project submissions, mentorship reminders, and interview readiness updates.'
        },
        {
            q: 'What happens if a student forgets their password?',
            a: 'Students can request a password reset from the login page. A reset link will be sent to their registered email address.'
        },
        {
            q: 'Are mentorship sessions mandatory?',
            a: 'Mentorship sessions are strongly recommended as they provide guidance, feedback, and industry insights that help students prepare for interviews.'
        },
        {
            q: 'What is the main goal of the program?',
            a: 'The goal is to help students become industry-ready by building strong technical skills, communication abilities, professional profiles, and interview readiness.'
        },
        {
            q: 'Who should students contact if they face platform issues?',
            a: 'Students should contact their college program coordinator or the platform support team if they experience login issues or technical problems.'
        },
    ];

    return (
        <section className="py-24 px-6 bg-transparent border-t border-border" id="faq">
            <div className="max-w-4xl mx-auto">
                <Reveal>
                    <div className="text-center mb-16 space-y-4">
                        <Badge variant="outline" className="text-[#ff7400] border-[#ff7400]/20 bg-[#ff7400]/10 uppercase tracking-widest px-4 py-1 text-xs">
                            FAQ
                        </Badge>
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                            Common Questions
                        </h2>
                        <p className="text-muted-foreground">
                            Everything you need to know about partnering with NextGen CTO.
                        </p>
                    </div>
                </Reveal>
                <Tilt intensity={5} scale={1.01} glare>
                <Accordion type="single" collapsible className="w-full space-y-4">
                    {faqs.map((faq, idx) => (
                        <AccordionItem key={faq.q} value={`item-${idx}`} className="border-b border-border bg-transparent px-2">
                            <AccordionTrigger className="text-lg font-bold hover:text-[#ff7400] hover:no-underline py-6 text-left">
                                {faq.q}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground leading-relaxed pb-8 text-base font-medium">
                                {faq.a}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
                </Tilt>
            </div>
        </section>
    );
}
