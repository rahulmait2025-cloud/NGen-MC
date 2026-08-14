"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ScrambleTextProps {
    text: string;
    className?: string;
    duration?: number;
    delay?: number;
    characters?: string;
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";
}

export function ScrambleText({
    text,
    className,
    duration = 1000,
    delay = 0,
    characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+",
    as = "span",
}: ScrambleTextProps) {
    const Component = as as React.ElementType;
    const [displayText, setDisplayText] = useState<string>(text.replace(/[^\s]/g, "#"));
    const [isScrambling, setIsScrambling] = useState(false);
    const elementRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isScrambling) {
                    setIsScrambling(true);

                    setTimeout(() => {
                        let iteration = 0;
                        const maxIterations = 20;
                        const intervalTime = duration / maxIterations;

                        const interval = setInterval(() => {
                            setDisplayText(
                                text
                                    .split("")
                                    .map((char, index) => {
                                        if (char === " ") return " ";
                                        if (index < iteration) {
                                            return text[index];
                                        }
                                        return characters[Math.floor(Math.random() * characters.length)];
                                    })
                                    .join("")
                            );

                            if (iteration >= text.length) {
                                clearInterval(interval);
                            }

                            iteration += text.length / maxIterations;
                        }, intervalTime);

                        return () => clearInterval(interval);
                    }, delay * 1000);

                    if (elementRef.current) {
                        observer.unobserve(elementRef.current);
                    }
                }
            },
            { threshold: 0.1 }
        );

        const currentElement = elementRef.current;
        if (currentElement) {
            observer.observe(currentElement);
        }

        return () => {
            if (currentElement) {
                observer.unobserve(currentElement);
            }
        };
    }, [text, duration, delay, characters, isScrambling]);

    return (
        <Component ref={elementRef} className={cn("inline-block", className)}>
            {displayText}
        </Component>
    );
}
