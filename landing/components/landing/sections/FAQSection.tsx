"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/motion/Reveal";

export function FAQSection() {
    const faqs = [
        {
            q: 'What information is available on the College Dashboard?',
            a: 'The College Dashboard provides an overview of student enrollment, activation rate, overall completion percentage, progress across the five learning pillars, mentorship hours delivered, and the number of students marked as interview ready.'
        },
        {
            q: 'Can colleges track student progress across technical modules?',
            a: 'Yes. The system allows administrators to monitor progress in Programming Fundamentals, Data Structures basics, Web Development, Databases, and Software Development Practices.'
        },
        {
            q: 'Can colleges monitor assignment and project submissions?',
            a: 'Yes. The platform tracks all assignments and project submissions. Administrators can see whether students have submitted their work and whether it has been approved or requires revision.'
        },
        {
            q: 'What types of projects are included in the program?',
            a: 'The program includes a portfolio website, an interactive web application, a full-stack application, and a capstone project that demonstrates the student\'s ability to integrate multiple technical skills.'
        },
        {
            q: 'Can colleges identify students who are falling behind?',
            a: 'Yes. The dashboard highlights students with incomplete modules, missing project submissions, or low progress so administrators can intervene early.'
        },
        {
            q: 'Does the system monitor GitHub project requirements?',
            a: 'Yes. The system checks whether students have linked their GitHub profiles and tracks the number of verified technical projects uploaded to their repositories.'
        },
        {
            q: 'What is the minimum GitHub requirement for students?',
            a: 'Each student is expected to complete at least three verified GitHub projects as part of the program\'s technical portfolio.'
        },
        {
            q: 'How does the platform track LinkedIn profile optimization?',
            a: 'The system checks for key LinkedIn profile sections such as headline, summary, and skills to ensure students have completed their professional profile.'
        },
        {
            q: 'How are resumes submitted and evaluated?',
            a: 'Students upload their resumes through the platform. The system checks for essential sections such as contact information, summary, skills, projects, and education before administrative review.'
        },
        {
            q: 'Does the platform check resumes for ATS compatibility?',
            a: 'Yes. The system performs a basic ATS compatibility check to ensure that resumes follow a structure that can be parsed by Applicant Tracking Systems.'
        },
        {
            q: 'What conditions must be met for a student to be marked as Interview Ready?',
            a: 'A student must have an approved resume, at least three verified GitHub projects, an optimized LinkedIn profile, and must complete a mock interview.'
        },
        {
            q: 'Who has the authority to mark a student as Interview Ready?',
            a: 'Only authorized roles such as Super Admin or College Admin can mark or revoke the Interview Ready status.'
        },
        {
            q: 'How does the platform support mentorship tracking?',
            a: 'The system records mentorship session schedules, participant attendance, and total mentorship hours delivered each month.'
        },
        {
            q: 'Can colleges export student performance reports?',
            a: 'Yes. Administrators can generate reports showing KPI performance, module completion, project submission rates, and interview readiness statistics.'
        },
        {
            q: 'Is student data restricted to the respective college?',
            a: 'Yes. The platform uses a multi-tenant architecture that ensures colleges can only access data for their own students.'
        },
    ];

    return (
        <section className="py-14 md:py-16 px-6 bg-transparent" id="faq">
            <div className="max-w-6xl mx-auto">
                <Reveal>
                    <div className="text-center mb-12">
                        <Badge variant="outline" className="mb-4 text-primary border-primary/20 bg-primary/10">
                            FAQ
                        </Badge>
                        <h2 className="font-display text-3xl font-bold mb-4">Common Questions</h2>
                        <p className="text-muted-foreground">Everything you need to know about partnering with NextGen CTO.</p>
                    </div>
                </Reveal>
                <Accordion type="single" collapsible className="w-full space-y-4">
                    {faqs.map((faq, idx) => (
                        <AccordionItem key={faq.q} value={`item-${idx}`} className="border border-border bg-muted/50 rounded-xl px-4">
                            <AccordionTrigger className="text-base sm:text-lg font-medium hover:text-primary hover:no-underline py-4 sm:py-6 text-left">
                                {faq.q}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground leading-relaxed pb-6 text-base">
                                {faq.a}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    );
}
