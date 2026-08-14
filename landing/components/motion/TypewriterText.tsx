"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TypewriterTextProps {
    text: string | string[];
    className?: string;
    speed?: number;
    delay?: number;
    loop?: boolean;
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";
}

export function TypewriterText({
    text,
    className,
    speed = 50,
    delay = 0,
    loop = false,
    as = "span",
}: TypewriterTextProps) {
    const Component = as as React.ElementType;
    const [displayText, setDisplayText] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [textArrayIndex, setTextArrayIndex] = useState(0);

    const texts = Array.isArray(text) ? text : [text];
    const currentFullText = texts[textArrayIndex];

    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const startTyping = () => {
            if (!isDeleting && currentIndex < currentFullText.length) {
                // Typing forward
                timeout = setTimeout(() => {
                    setDisplayText((prev) => prev + currentFullText[currentIndex]);
                    setCurrentIndex((prev) => prev + 1);
                }, speed);
            } else if (isDeleting && currentIndex > 0) {
                // Deleting
                timeout = setTimeout(() => {
                    setDisplayText((prev) => prev.slice(0, -1));
                    setCurrentIndex((prev) => prev - 1);
                }, speed / 2);
            } else if (!isDeleting && currentIndex === currentFullText.length) {
                // Pause at end of word
                if (loop || texts.length > 1) {
                    timeout = setTimeout(() => setIsDeleting(true), 1500);
                }
            } else if (isDeleting && currentIndex === 0) {
                // Move to next word
                setIsDeleting(false);
                setTextArrayIndex((prev) => (prev + 1) % texts.length);
            }
        };

        if (delay > 0 && currentIndex === 0 && !isDeleting && textArrayIndex === 0) {
            timeout = setTimeout(startTyping, delay * 1000);
        } else {
            startTyping();
        }

        return () => clearTimeout(timeout);
    }, [currentIndex, isDeleting, textArrayIndex, currentFullText, speed, delay, loop, texts.length]);

    return (
        <Component className={cn("inline-block", className)}>
            {displayText}
            <span className="animate-pulse ml-[2px] inline-block w-[3px] h-[1em] bg-current align-text-bottom opacity-70" />
        </Component>
    );
}
