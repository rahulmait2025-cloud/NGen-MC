"use client";

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trackCtaClick } from "@/lib/analytics/track";

export function StickyCTA() {
    const [isVisible, setIsVisible] = useState(false);
    const [timeElapsed, setTimeElapsed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const isCollapsed = timeElapsed && !isHovered;

    useEffect(() => {
        const showTimer = setTimeout(() => setIsVisible(true), 500);
        const collapseTimer = setTimeout(() => setTimeElapsed(true), 3500);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(collapseTimer);
        };
    }, []);

    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-6 left-4 sm:left-6 z-50 hidden md:flex pointer-events-auto"
                    >
                        <div
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                        >
                            <div
                                className={`bg-background/95 backdrop-blur-md border border-border rounded-full shadow-xl flex items-center transition-all duration-500 ease-in-out ${isCollapsed ? "py-1.5 px-2 gap-0" : "py-2 px-6 gap-5"}`}
                            >
                                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
                                    <span className="font-medium text-foreground hidden md:inline-block whitespace-nowrap text-sm">
                                        Ready to transform your campus?
                                    </span>
                                </div>

                                <div className={`flex items-center transition-all duration-500 ease-in-out ${isCollapsed ? "gap-0" : "gap-2"}`}>
                                    <Button
                                        asChild
                                        size="sm"
                                        className={`rounded-full transition-all duration-500 ${isCollapsed ? "px-3 text-xs" : "px-6 text-sm"}`}
                                    >
                                        <Link
                                            href="/contact"
                                            onClick={() =>
                                                trackCtaClick({
                                                    cta_name: 'book_demo',
                                                    cta_location: 'sticky_cta',
                                                    current_path: '/',
                                                })
                                            }
                                        >
                                            {isCollapsed ? "Book Demo" : "Book a Demo"}
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
