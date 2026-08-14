"use client";

import { useState, useEffect } from "react";
import { SlidingNumber } from "@/components/animate-ui/primitives/texts/sliding-number";

export function ViewCount() {
    const [views, setViews] = useState<number | null>(null);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
        fetch("/api/youtube-stats")
            .then(res => res.json())
            .then(data => {
                if (data.views) {
                    setViews(Number(data.views));
                }
            })
            .catch(() => setViews(850000));
    }, []);

    if (!hasMounted || !views) return <span className="opacity-0 animate-pulse inline-block w-[3ch]">800K+</span>;

    const inM = views >= 1000000;
    const inK = views >= 1000 && !inM;
    
    let value = views;
    let suffix = "+";
    let decimals = 0;
    
    if (inM) {
        value = views / 1000000;
        suffix = "M+";
        decimals = 1;
    } else if (inK) {
        value = views / 1000;
        suffix = "K+";
        decimals = 1;
    }

    return (
        <span className="inline-flex items-center whitespace-nowrap">
            <SlidingNumber number={value} decimalPlaces={decimals} />
            {suffix}
        </span>
    );
}
