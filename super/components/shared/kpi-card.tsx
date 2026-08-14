"use client";

import React, { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { AnimatedCounter } from "@/components/_animations/animated-counter";

interface KpiCardProps {
    title: string;
    subtitle: string;
    value: string;
    delta: string;
    deltaType: "up" | "down" | "neutral";
    description: string;
    className?: string;
    href?: string;
    onClick?: () => void;
}

export const KpiCard = React.memo(function KpiCard({ title, subtitle, value, delta, deltaType, description, className = undefined, href, onClick }: KpiCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const prefersReducedMotion = usePrefersReducedMotion();

    useEffect(() => {
        let ctx: { revert: () => void } | null = null;
        async function initGsap() {
            if (!cardRef.current) return;
            const gsapModule = await import('gsap');
            const gsap = gsapModule.default;
            ctx = gsap.context(() => {
                if (prefersReducedMotion) {
                    gsap.fromTo(cardRef.current, { opacity: 0 }, { opacity: 1, duration: 0 });
                } else {
                    gsap.fromTo(cardRef.current, { opacity: 0, y: 8 }, {
                        opacity: 1,
                        y: 0,
                        duration: 0.3,
                        ease: 'power2.out',
                    });
                }
            }, cardRef);
        }
        initGsap();
        return () => { if (ctx) ctx.revert(); };
    }, [prefersReducedMotion]);

    return (
        <Card
            ref={cardRef}
            className={cn(
                "border border-border bg-card group relative overflow-hidden",
                (href || onClick) && "cursor-pointer hover:border-primary/30 transition-colors duration-200",
                className
            )}
            onClick={() => {
                if (onClick) onClick();
                else if (href) router.push(href);
            }}
        >
            <CardHeader className="flex flex-row items-start justify-between pb-0 px-4 pt-4">
                <div className="space-y-0">
                    <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        {title}
                    </CardTitle>
                    <CardDescription className="text-[10px] text-muted-foreground/60">
                        {subtitle}
                    </CardDescription>
                </div>
                <Badge
                    variant={deltaType === "up" ? "success" : deltaType === "down" ? "destructive" : "default"}
                    className="text-[9px] font-medium py-0 h-4 px-1.5"
                >
                    {delta}
                </Badge>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
                <div className="text-2xl font-bold tracking-tight font-mono leading-none text-foreground">
                    {/^\d+(\.\d+)?$/.test(value) ? (
                        <AnimatedCounter value={parseFloat(value)} />
                    ) : (
                        value
                    )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    {description}
                </p>
            </CardContent>
        </Card>
    );
});
