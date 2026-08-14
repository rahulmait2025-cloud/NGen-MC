"use client";

import { useState, useEffect } from "react";
import { SlidingNumber } from "@/components/animate-ui/primitives/texts/sliding-number";

export function VideoCount() {
    const [videos, setVideos] = useState<number | null>(null);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
        fetch("/api/youtube-stats")
            .then(res => res.json())
            .then(data => {
                if (data.videos) {
                    setVideos(Number(data.videos));
                }
            })
            .catch(() => setVideos(700));
    }, []);

    if (!hasMounted || !videos) return <span className="opacity-0 animate-pulse inline-block w-[3ch]">700+</span>;

    return (
        <span className="inline-flex items-center whitespace-nowrap">
            <SlidingNumber number={videos} decimalPlaces={0} />
            +
        </span>
    );
}
