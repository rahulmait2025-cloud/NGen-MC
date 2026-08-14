"use client";

import Link from 'next/link';
import { m } from 'framer-motion';
import { ArrowRight, Briefcase, Code, Sparkles, Target, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

const SubscriberCount = dynamic(() => import("./SubscriberCount").then(mod => mod.SubscriberCount), { ssr: false });
const ViewCount = dynamic(() => import("./ViewCount").then(mod => mod.ViewCount), { ssr: false });
const VideoCount = dynamic(() => import("./VideoCount").then(mod => mod.VideoCount), { ssr: false });
const STUDENT_PORTAL_URL = 'https://www.youtube.com/@CodingwithCTOBhaiya/courses';

const HERO_VISUAL_ITEMS = [
    {
        title: 'Mentor-Led',
        subtitle: '1:1 guidance',
        icon: Target,
        className: 'top-6 left-6',
        delay: 0.1,
    },
    {
        title: 'Real Projects',
        subtitle: 'industry style builds',
        icon: Code,
        className: 'top-14 right-4',
        delay: 0.2,
    },
    {
        title: 'Interview Ready',
        subtitle: 'mock + feedback loops',
        icon: Briefcase,
        className: 'bottom-12 left-4',
        delay: 0.3,
    },
    {
        title: 'Career Brand',
        subtitle: 'proof that recruiters trust',
        icon: Sparkles,
        className: 'bottom-6 right-8',
        delay: 0.4,
    },
];

export function StudentHero() {
    const handleWatchStudentSuccess = () => {
        document.getElementById('testimonials')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };

    return (
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20 pb-12 sm:pt-32 sm:pb-20">
            {/* Background Gradients */}
            <div className="absolute inset-0 -z-10 bg-transparent">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full opacity-30 blur-[120px] pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/40 rounded-full animate-pulse" />
                    <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-orange-400/30 rounded-full animate-pulse delay-700" />
                </div>
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
                <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-12 lg:gap-8 items-center">
                    <div className="text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6 uppercase tracking-widest animate-in fade-in slide-in-from-bottom-4">
                            <Code className="h-3 w-3" /> For the Next Gen Software Engineers
                        </div>

                        <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6">
                            Stop Surviving. <br />
                            <span className="text-[#D64A00]">
                                Start Thriving.
                            </span>
                        </h1>

                        <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl leading-relaxed">
                            Join an exclusive inner circle of high-performing engineers. Elevate your technical expertise, master complex systems, and engineer an undeniable personal brand. <span className="italic text-primary font-medium underline decoration-primary/30 decoration-2 underline-offset-4">Your legacy starts here.</span>
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <Button asChild size="lg" className="w-full sm:w-auto text-base font-bold h-14 px-8 rounded-2xl shadow-xl shadow-primary/20 group">
                                <Link href={STUDENT_PORTAL_URL}>
                                    Start Your Journey
                                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                                </Link>
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                onClick={handleWatchStudentSuccess}
                                className="w-full sm:w-auto text-base font-bold h-14 px-8 rounded-2xl border-white/[0.08] hover:bg-white/[0.02]"
                            >
                                Watch Student Success
                            </Button>
                        </div>

                        <div className="mt-12 flex flex-wrap items-center gap-8 text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-xl bg-foreground/[0.03] border border-foreground/[0.05] flex items-center justify-center">
                                    <Users className="h-5 w-5 text-primary" />
                                </div>
                                <div className="text-sm">
                                    <p className="text-foreground font-bold"><SubscriberCount /></p>
                                    <p>Active Students</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-xl bg-foreground/[0.03] border border-foreground/[0.05] flex items-center justify-center">
                                    <Sparkles className="h-5 w-5 text-[#D64A00]" />
                                </div>
                                <div className="text-sm">
                                    <p className="text-foreground font-bold"><ViewCount /></p>
                                    <p>Global Views</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-xl bg-foreground/[0.03] border border-foreground/[0.05] flex items-center justify-center">
                                    <Trophy className="h-5 w-5 text-[#D64A00]" />
                                </div>
                                <div className="text-sm">
                                    <p className="text-foreground font-bold"><VideoCount /></p>
                                    <p>Free Tutorials</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='relative hidden lg:block'>
                        <div className='relative h-[560px] flex items-center justify-center p-4'>
                            <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none' />
                            <div className='relative z-10 w-full max-w-[520px] h-[500px]'>
                                <m.div
                                    className='absolute inset-0 rounded-[2.25rem] border border-primary/20 bg-card/65 backdrop-blur-xl shadow-[0_30px_100px_rgba(255,116,0,0.18)]'
                                    animate={{ rotate: [0, 1.2, 0, -1.2, 0] }}
                                    transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
                                />
                                <m.div
                                    className='absolute inset-[10%] rounded-full border border-primary/25'
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
                                />
                                <m.div
                                    className='absolute inset-[18%] rounded-full border border-primary/15'
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
                                />

                                <m.div
                                    className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[230px] h-[230px] rounded-full bg-gradient-to-br from-primary/35 via-[#D64A00]/20 to-transparent blur-2xl'
                                    animate={{ scale: [0.95, 1.08, 0.95], opacity: [0.65, 1, 0.65] }}
                                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                                />

                                <div className='absolute inset-0 p-8'>
                                    {HERO_VISUAL_ITEMS.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <m.div
                                                key={item.title}
                                                className={`absolute ${item.className} rounded-2xl border border-primary/20 bg-background/70 backdrop-blur-md px-4 py-3 shadow-[0_14px_35px_rgba(0,0,0,0.08)]`}
                                                initial={{ opacity: 0, y: 16 }}
                                                animate={{ opacity: 1, y: [0, -6, 0] }}
                                                transition={{
                                                    opacity: { duration: 0.35, delay: item.delay },
                                                    y: { duration: 4.5, delay: item.delay, repeat: Infinity, ease: 'easeInOut' },
                                                }}
                                            >
                                                <div className='flex items-start gap-3'>
                                                    <span className='mt-0.5 h-8 w-8 rounded-lg border border-primary/20 bg-primary/10 flex items-center justify-center'>
                                                        <Icon className='h-4 w-4 text-primary' />
                                                    </span>
                                                    <span>
                                                        <p className='text-sm font-bold text-foreground whitespace-nowrap'>{item.title}</p>
                                                        <p className='text-xs text-muted-foreground whitespace-nowrap'>{item.subtitle}</p>
                                                    </span>
                                                </div>
                                            </m.div>
                                        );
                                    })}

                                    <m.div
                                        className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center'
                                        animate={{ y: [0, -8, 0] }}
                                        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
                                    >
                                        <p className='text-xs font-bold uppercase tracking-[0.16em] text-primary mb-2'>Future CTO Mode</p>
                                        <p className='text-3xl font-display font-black text-foreground leading-tight'>
                                            Build.
                                            <br />
                                            Lead.
                                            <br />
                                            Get Hired.
                                        </p>
                                    </m.div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
