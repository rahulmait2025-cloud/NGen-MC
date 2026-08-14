"use client";

import { useState, useEffect } from "react";
import { SlidingNumber } from "@/components/animate-ui/primitives/texts/sliding-number";

export function SubscriberCount() {
    const [subscribers, setSubscribers] = useState<number | null>(null);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
        fetch("/api/youtube-stats")
            .then(res => res.json())
            .then(data => {
                if (data.subscribers) {
                    setSubscribers(Number(data.subscribers));
                }
            })
            .catch(() => setSubscribers(35000));
    }, []);

    if (!hasMounted || !subscribers) return <span className="opacity-0 animate-pulse inline-block w-[3ch]">40.0K+</span>;

    const inK = subscribers >= 1000;
    const value = inK ? subscribers / 1000 : subscribers;

    return (
        <span className="inline-flex items-center whitespace-nowrap">
            <SlidingNumber number={value} decimalPlaces={inK ? 1 : 0} />
            {inK ? "K+" : "+"}
        </span>
    );
}
