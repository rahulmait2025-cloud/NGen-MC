"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Terminal, Award, Briefcase, Users, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const JOURNEY_DATA = [
    {
        date: "2010–2016",
        title: "Exploration & Hustle",
        subtitle: "NITK Surathkal",
        bullets: [
            "Joined without coaching or a safety net.",
            "Topped the batch in Year 1, switched to IT.",
            "Graduated with job offers from Adobe and Intuit."
        ],
        icon: Terminal,
        imageSrc: '/assets/journey-nitk.png',
        color: "from-blue-500 to-cyan-400"
    },
    {
        date: "2016–2022",
        title: "Learning Scale & Craft",
        subtitle: "Adobe Engineer to Leader",
        bullets: [
            "Contributed to Adobe XD, Photoshop, and Illustrator.",
            "Mastered Microservices, System Design, and Architecture.",
            "Mentored others and taught DSA & Web Development."
        ],
        icon: Briefcase,
        imageSrc: '/assets/journey-adobe.png',
        color: "from-red-600 to-orange-500"
    },
    {
        date: "2022–2025",
        title: "Startup Leadership",
        subtitle: "CTO Journey",
        bullets: [
            "Promoted to CTO at Monet within a year.",
            "Built the entire loyalty platform from scratch.",
            "Led a cross-functional team of 12+ people."
        ],
        icon: Award,
        imageSrc: '/assets/journey-monet.png',
        color: "from-purple-600 to-pink-500"
    },
    {
        date: "2023–Present",
        title: "Educator & Community",
        subtitle: "CTO Bhaiya",
        bullets: [
            "Built an audience of over {SUBSCRIBERS} students.",
            "Created 700+ long-form DSA & systems videos.",
            "Mission: Demystify tech careers and scaling systems for everyone."
        ],
        icon: Users,
        imageSrc: '/assets/journey-youtube.png',
        color: "from-[#ff6b00] to-orange-400"
    }
];

export function JourneyTimeline() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [subscriberLabel, setSubscriberLabel] = useState('35,000+');

    // Auto-advance tabs
    useEffect(() => {
        if (isHovered) return;
        const timer = setInterval(() => {
            setActiveIndex((current) => (current + 1) % JOURNEY_DATA.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [isHovered]);

    useEffect(() => {
        let cancelled = false;

        async function fetchSubscriberCount() {
            try {
                const res = await fetch('/api/youtube-stats');
                if (!res.ok) return;
                const data = await res.json();
                const subscribers = Number(data?.subscribers);
                if (!cancelled && Number.isFinite(subscribers) && subscribers > 0) {
                    setSubscriberLabel(`${subscribers.toLocaleString('en-IN')}+`);
                }
            } catch {
                // keep fallback label
            }
        }

        fetchSubscriberCount();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <section className="relative py-20 overflow-hidden bg-background">
            {/* Background Decorations */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-[#ff6b00]/10 rounded-full blur-[150px] animate-pulse delay-1000" />
            </div>

            <div className="max-w-6xl mx-auto px-6 relative z-10"
                 onMouseEnter={() => setIsHovered(true)}
                 onMouseLeave={() => setIsHovered(false)}
            >
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest mb-6"
                    >
                        <Sparkles className="w-3 h-3" /> The Narrative
                    </motion.div>
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl md:text-5xl font-bold font-display tracking-tight"
                    >
                        My <span className="text-primary italic">Journey</span>
                    </motion.h2>
                </div>

                {/* Timeline Progress Bar */}
                <div className="relative mb-16 max-w-4xl mx-auto hidden md:block">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-muted rounded-full -translate-y-1/2" />
                    <motion.div 
                        className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-primary to-[#ff6b00] rounded-full -translate-y-1/2 transition-all duration-500 ease-out"
                        style={{ width: `${(activeIndex / (JOURNEY_DATA.length - 1)) * 100}%` }}
                    />
                    
                    <div className="relative flex justify-between">
                        {JOURNEY_DATA.map((item, idx) => {
                            const isActive = idx === activeIndex;
                            const isPast = idx < activeIndex;
                            return (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    key={idx}
                                    onClick={() => setActiveIndex(idx)}
                                    className="relative flex h-auto flex-col items-center group focus:outline-none bg-transparent hover:bg-transparent p-0"
                                >
                                    <div className={`w-12 h-12 rounded-full border-[3px] flex items-center justify-center transition-all duration-300 z-10 
                                        ${isActive ? 'bg-primary border-background scale-110 shadow-[0_0_20px_rgba(255,107,0,0.4)]' : 
                                          isPast ? 'bg-primary border-background' : 'bg-background border-muted group-hover:border-primary/50'}`}
                                    >
                                        <item.icon className={`w-5 h-5 transition-colors ${isActive || isPast ? 'text-white' : 'text-muted-foreground group-hover:text-primary'}`} />
                                    </div>
                                    <div className="absolute top-14 text-center w-32 -ml-10">
                                        <div className={`text-sm font-bold transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                            {item.date}
                                        </div>
                                    </div>
                                </Button>
                            );
                        })}
                    </div>
                </div>

                {/* Mobile Timeline Navigation */}
                <div className="flex md:hidden justify-center gap-2 mb-8 flex-wrap">
                    {JOURNEY_DATA.map((item, idx) => (
                        <Button
                            type="button"
                            variant="ghost"
                            key={idx}
                            onClick={() => setActiveIndex(idx)}
                            className={`h-auto px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                                activeIndex === idx 
                                ? 'bg-primary text-white border-primary shadow-lg' 
                                : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                            }`}
                        >
                            {item.date}
                        </Button>
                    ))}
                </div>

                {/* Animated Content Window */}
                <div className="relative max-w-4xl mx-auto min-h-[350px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeIndex}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 25 }}
                            className="bg-card border border-border rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                            
                            <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                                <div className={`w-20 h-20 shrink-0 rounded-2xl bg-gradient-to-br ${JOURNEY_DATA[activeIndex].color} shadow-xl flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-500`}>
                                    {JOURNEY_DATA[activeIndex].imageSrc ? (
                                        <Image
                                            src={JOURNEY_DATA[activeIndex].imageSrc}
                                            alt={JOURNEY_DATA[activeIndex].subtitle}
                                            width={80}
                                            height={80}
                                            className="h-full w-full rounded-2xl object-cover"
                                        />
                                    ) : (
                                        (() => {
                                            const Icon = JOURNEY_DATA[activeIndex].icon;
                                            return <Icon className="w-10 h-10 text-white" />;
                                        })()
                                    )}
                                </div>
                                
                                <div className="flex-1">
                                    <span className="text-primary font-black uppercase tracking-widest text-xs mb-2 block">
                                        {JOURNEY_DATA[activeIndex].date}
                                    </span>
                                    <h3 className="text-2xl md:text-3xl font-extrabold mb-2 text-foreground">
                                        {JOURNEY_DATA[activeIndex].title}
                                    </h3>
                                    <p className="text-lg md:text-xl text-muted-foreground italic mb-8 font-medium">
                                        {JOURNEY_DATA[activeIndex].subtitle}
                                    </p>
                                    
                                    <ul className="space-y-4">
                                        {JOURNEY_DATA[activeIndex].bullets.map((bullet, idx) => (
                                            <motion.li 
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.2 + (idx * 0.1) }}
                                                key={idx} 
                                                className="flex gap-4 items-start"
                                            >
                                                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-1 drop-shadow-sm" />
                                                <span className="text-foreground/80 leading-relaxed font-medium md:text-lg">
                                                    {bullet.replace('{SUBSCRIBERS}', subscriberLabel)}
                                                </span>
                                            </motion.li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}
