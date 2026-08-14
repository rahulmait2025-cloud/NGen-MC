"use client";

import { m } from "framer-motion";
import { cn } from "@/lib/utils";

interface SplitTextProps {
    text: string;
    className?: string;
    wordClassName?: string;
    charClassName?: string;
    stagger?: number;
    delay?: number;
    duration?: number;
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";
}

export function SplitText({
    text,
    className,
    wordClassName,
    charClassName,
    stagger = 0.03,
    delay = 0,
    duration = 0.8,
    as = "span",
}: SplitTextProps) {
    const Component = m[as as keyof typeof m] as React.ElementType;

    const words = text.split(" ");

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: stagger,
                delayChildren: delay,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: duration,
                ease: [0.16, 1, 0.3, 1] as const,
            },
        },
    };

    return (
        <Component
            className={cn("inline-block", className)}
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
        >
            {words.map((word, wordIndex) => (
                <span
                    key={wordIndex}
                    className={cn("inline-block whitespace-nowrap", wordClassName)}
                >
                    {word.split("").map((char, charIndex) => (
                        <m.span
                            key={charIndex}
                            variants={itemVariants}
                            className={cn("inline-block", charClassName)}
                        >
                            {char}
                        </m.span>
                    ))}
                    {/* Add space between words, but not after the last word */}
                    {wordIndex !== words.length - 1 && (
                        <span className="inline-block">&nbsp;</span>
                    )}
                </span>
            ))}
        </Component>
    );
}
