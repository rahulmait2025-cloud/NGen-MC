"use client";

import { useState } from "react";
import { m } from "framer-motion";
import { Youtube, MessageCircle } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

/* ------------------------------------------------------------------ */
/*  Testimonial data from YouTube comments                            */
/* ------------------------------------------------------------------ */
const ROW1_TESTIMONIALS = [
    {
        handle: "@Bishal715",
        timeAgo: "3 days ago",
        initial: "B",
        color: "bg-blue-600",
        comment:
            "I watched all 40 days till now, today was my day 40, honestly speaking watching each video feels like I am gaining some expert level knowledge....the way he teaches with such ease is the usp of this course, feeling bad for those who are still buying dsa courses or following some other videos and giving up....will forever be grateful to Anuj Bhaiya if he completes this course so that i can finally learn DSA completely after roaming here and there for a year and giving up each time",
    },
    {
        handle: "@visitor-i1h",
        timeAgo: "1 day ago",
        initial: "V",
        color: "bg-teal-600",
        comment:
            "Day 42 Done\nBhaiya, your explanation makes even hard question very easy and understandable. The way you explain concepts is really amazing. 🙌",
    },
    {
        handle: "@DevWitIn",
        timeAgo: "8 days ago",
        initial: "D",
        color: "bg-orange-600",
        comment:
            "The way you teach in a soothing and calm manner, building intuition for concepts and problems through structured and easy to understand real life analogies, is far better than any course I have gone through. Your teaching skills are really impressive. You make DSA easy to learn by encouraging consistency and creating eagerness without forcing it, making the entire learning process feel like a piece of cake..!",
    },
    {
        handle: "@NipunKumarSingh1",
        timeAgo: "1 month ago",
        initial: "N",
        color: "bg-indigo-600",
        comment:
            "thank you bhaiya for imagine content on dsa, maine 3 years dsa pada striver, coder army, code help by love babbar, apna college, but i am not able to solve questions which come in random questions on leetcode, full support bhaiya, thank you, apka course one of the best dsa course hai",
    },
    {
        handle: "@gaurav-Babua",
        timeAgo: "2 weeks ago",
        initial: "G",
        color: "bg-cyan-600",
        comment:
            "Great Bhaiya, Appki padhane ke wajh se Aaj hard problem bhi easy lagte hai, Thanks Bhaiya, This is the best series of DSA. Day 36 Done",
    },
];

/*
const ROW2_TESTIMONIALS = [
    {
        handle: "@ArjunDevOps",
        timeAgo: "4 days ago",
        initial: "A",
        color: "bg-amber-600",
        comment:
            "What sets this apart is the depth. Bhaiya doesn't skip the 'why' behind anything. Understanding the reasoning makes solving new problems so much easier. Best free DSA resource on YouTube, period.",
    },
    {
        handle: "@SnehaK_codes",
        timeAgo: "2 days ago",
        initial: "S",
        color: "bg-pink-600",
        comment:
            "Coming from a non-CS background, I was terrified of DSA. But after following CTO Bhaiya's series for 3 weeks, I can now solve medium-level problems on my own. This is genuinely life-changing content. 🙏",
    },
    {
        handle: "@user-qy2sk5zx2i",
        timeAgo: "3 weeks ago",
        initial: "A",
        color: "bg-emerald-600",
        comment:
            "Bhaiya literally explains things like a senior developer sitting next to you. The real-world analogies make complex concepts crystal clear. Shared this with my entire college group — everyone is hooked now!",
    },
];
*/

/* ------------------------------------------------------------------ */
/*  Single testimonial card                                           */
/* ------------------------------------------------------------------ */
function TestimonialCard({
    t,
}: {
    t: (typeof ROW1_TESTIMONIALS)[number];
}) {
    return (
        <div className="w-[340px] sm:w-[400px] shrink-0 rounded-2xl border border-border bg-card p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors">
            {/* Header - avatar + handle */}
            <div className="flex items-center gap-3">
                <div
                    className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}
                >
                    {t.initial}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                        {t.handle}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                        {t.timeAgo}
                    </p>
                </div>
            </div>

            {/* Comment body */}
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4 whitespace-pre-line">
                {t.comment}
            </p>

            {/* YouTube badge */}
            <div className="flex items-center gap-1.5 mt-auto pt-1">
                <Youtube className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    YouTube Comment
                </span>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Testimonials section                                              */
/* ------------------------------------------------------------------ */
export function Testimonials() {
    const [paused, setPaused] = useState(false);

    return (
        <section className="py-12 md:py-16 bg-transparent relative overflow-hidden">
            <div className="max-w-5xl mx-auto px-6 mb-10">
                <Reveal>
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-4 uppercase tracking-widest">
                            <MessageCircle className="h-3 w-3" /> What students
                            say
                        </div>
                        <h2 className="font-display text-4xl sm:text-5xl font-black mb-6 tracking-tight">
                            Don&apos;t Just Take Our{" "}
                            <span className="text-[#D64A00]">
                                Word For It.
                            </span>
                        </h2>
                        <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto font-medium">
                            Real comments from the <span className="text-[#D64A00] font-semibold">CTO Bhaiya</span> YouTube community
                        </p>
                    </div>
                </Reveal>
            </div>

            {/* Row 1 — scrolls left */}
            <div
                className="w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)] mb-6"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
            >
                <m.div
                    className="flex gap-6 w-max"
                    animate={{ x: "-50%" }}
                    transition={{
                        duration: 80,
                        ease: "linear",
                        repeat: Infinity,
                    }}
                    style={paused ? { animationPlayState: "paused" } : undefined}
                >
                    <div className="flex gap-6 shrink-0">
                        {ROW1_TESTIMONIALS.map((t) => (
                            <TestimonialCard key={t.handle} t={t} />
                        ))}
                    </div>
                    <div className="flex gap-6 shrink-0">
                        {ROW1_TESTIMONIALS.map((t) => (
                            <TestimonialCard key={`${t.handle}-dup`} t={t} />
                        ))}
                    </div>
                </m.div>
            </div>
        </section>
    );
}
