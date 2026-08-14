"use client";

import { motion } from "framer-motion";

const TRUST_LOGOS = [
    "VIT University",
    "SRM Institute",
    "Manipal Academy",
    "Tier-1 Colleges",
    "Top 100 NIRF",
    "Amity University",
    "BITS Pilani",
    "Thapar Institute",
    "Symbiosis",
    "PES University",
];

export function TrustMarquee2() {
    return (
        <section className="py-12 border-y border-white/[0.05] bg-transparent overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

            <div className="flex">
                <motion.div
                    className="flex lg:gap-24 md:gap-16 gap-8 pr-8"
                    animate={{
                        x: [0, -1035],
                    }}
                    transition={{
                        x: {
                            repeat: Infinity,
                            repeatType: "loop",
                            duration: 40,
                            ease: "linear",
                        },
                    }}
                >
                    {[...TRUST_LOGOS, ...TRUST_LOGOS].map((logo, index) => (
                        <div
                            key={index}
                            className="flex-shrink-0 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity duration-300"
                        >
                            <span className="text-xl md:text-2xl font-display font-bold text-white whitespace-nowrap tracking-tight">
                                {logo}
                            </span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
