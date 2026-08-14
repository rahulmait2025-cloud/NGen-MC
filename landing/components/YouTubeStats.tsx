"use client";

import { useEffect, useState } from "react";
import { Youtube, Users, Eye, PlayCircle } from "lucide-react";
import { m } from "framer-motion";
import { Reveal } from "@/components/motion/Reveal";
import { SlidingNumber } from "@/components/animate-ui/primitives/texts/sliding-number";

function FormatSlidingNumber({ value }: { value: number | null }) {
    if (value === null || value === undefined) return <>—</>;

    let num = value;
    let suffix = "";
    let decimals = 0;

    if (value >= 1_000_000_000) {
        num = value / 1_000_000_000;
        suffix = "B";
        decimals = 1;
    } else if (value >= 1_000_000) {
        num = value / 1_000_000;
        suffix = "M";
        decimals = 1;
    } else if (value >= 100_000) {
        num = value / 100_000;
        suffix = "L";
        decimals = 1;
    } else if (value >= 1_000) {
        num = value / 1_000;
        suffix = "K";
        decimals = 1;
    }

    return (
        <span className="inline-flex items-center">
            <SlidingNumber number={num} decimalPlaces={decimals} />{suffix}
        </span>
    );
}

interface StatsData {
    subscribers: number | null;
    views: number | null;
    videos: number | null;
    updatedAt: string;
    error?: string;
}

export function YouTubeStats() {
    const [data, setData] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function fetchStats() {
            try {
                const res = await fetch("/api/youtube-stats");
                const json: StatsData = await res.json();
                if (!cancelled) setData(json);
            } catch {
                if (!cancelled)
                    setData({
                        subscribers: null,
                        views: null,
                        videos: null,
                        updatedAt: new Date().toISOString(),
                        error: "Failed to load stats",
                    });
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchStats();

        const interval = setInterval(fetchStats, 5 * 60 * 1000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    const hasError = data?.error || data?.subscribers === null;

    const stats = [
        {
            icon: Users,
            label: "Subscribers",
            value: data?.subscribers,
            color: "text-primary",
            bg: "bg-primary/10",
        },
        {
            icon: Eye,
            label: "Total Views",
            value: data?.views,
            color: "text-orange-400",
            bg: "bg-orange-400/10",
        },
        {
            icon: PlayCircle,
            label: "Videos",
            value: data?.videos,
            color: "text-yellow-500",
            bg: "bg-yellow-500/10",
        },
    ];

    return (
        <section className="py-16 md:py-20 px-6 bg-background relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 blur-3xl rounded-full pointer-events-none" />

            <div className="max-w-5xl mx-auto relative z-10">
                <Reveal>
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-4 uppercase tracking-widest">
                            <Youtube className="h-3 w-3" /> Trusted by the community
                        </div>
                        <h2 className="font-display text-3xl md:text-5xl font-bold mb-3">
                            <span className="text-orange-500">
                                CTO Bhaiya
                            </span>{" "}
                            on YouTube
                        </h2>
                        <p className="text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
                            Join thousands of students learning DSA, System Design & AI
                        </p>
                    </div>
                </Reveal>

                {loading ? (
                    <div className="grid grid-cols-3 gap-4 sm:gap-6 max-w-2xl mx-auto mb-8">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className="rounded-2xl border border-border bg-card p-5 sm:p-6"
                            >
                                <div className="h-4 w-12 mx-auto rounded bg-muted animate-pulse mb-3" />
                                <div className="h-8 w-20 mx-auto rounded bg-muted animate-pulse mb-2" />
                                <div className="h-3 w-16 mx-auto rounded bg-muted animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : hasError ? (
                    <Reveal>
                        <div className="text-center py-8 mb-8">
                            <p className="text-sm text-muted-foreground">
                                Stats temporarily unavailable
                            </p>
                        </div>
                    </Reveal>
                ) : (
                    <div className="grid grid-cols-3 gap-4 sm:gap-6 max-w-2xl mx-auto mb-8">
                        {stats.map((stat, idx) => (
                            <Reveal key={stat.label} delay={idx * 0.1}>
                                <m.div
                                    whileHover={{ y: -4, scale: 1.02 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                    className="rounded-2xl border border-border bg-card p-5 sm:p-6 text-center hover:border-primary/30 transition-colors cursor-default"
                                >
                                    <div
                                        className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${stat.bg} ${stat.color} mb-3`}
                                    >
                                        <stat.icon className="w-4 h-4" />
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-display font-bold tabular-nums mb-1 flex items-center justify-center">
                                        <FormatSlidingNumber value={stat.value ?? null} />{stat.value ? "+" : ""}
                                    </p>
                                    <p className="text-[11px] sm:text-xs text-muted-foreground font-medium uppercase tracking-widest">
                                        {stat.label}
                                    </p>
                                </m.div>
                            </Reveal>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
