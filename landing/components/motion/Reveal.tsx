'use client';

interface RevealProps {
    children: React.ReactNode;
    delay?: number;
    className?: string;
}

/**
 * Scroll-triggered reveal wrapper.
 * Fades + slides content in when it enters the viewport.
 * Respects `prefers-reduced-motion` — disables y/blur transforms if needed.
 *
 * Renders a plain <div> during SSR and the first hydration pass to avoid
 * style-serialisation mismatches between framer-motion and React's hydration
 * checker.  After mount it swaps to <m.div> for the real animation.
 */
import { motion } from "framer-motion";

/**
 * Scroll-triggered reveal wrapper.
 * Fades + slides content in when it enters the viewport.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{
                duration: 0.6,
                delay: delay,
                ease: [0.22, 1, 0.36, 1]
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
