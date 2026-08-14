"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function TransformCTA() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    // Parallax values for floating rectangles
    const y1 = useTransform(scrollYProgress, [0, 1], [100, -200]);
    const y2 = useTransform(scrollYProgress, [0, 1], [200, -100]);
    const y3 = useTransform(scrollYProgress, [0, 1], [-100, 200]);
    const y4 = useTransform(scrollYProgress, [0, 1], [-50, 150]);
    
    // Slight rotations for floating effect
    const r1 = useTransform(scrollYProgress, [0, 1], [0, 15]);
    const r2 = useTransform(scrollYProgress, [0, 1], [-10, 5]);

    return (
        <section 
            ref={containerRef} 
            className="relative py-32 md:py-48 overflow-hidden bg-background text-foreground flex items-center justify-center min-h-[80vh]"
        >
            {/* Vibrant Background Glows */}
            <div className="absolute inset-x-0 -top-40 h-[600px] w-full bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,rgba(255,107,0,0.15),transparent)] pointer-events-none" />
            <div className="absolute -left-40 top-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08),transparent)] blur-3xl pointer-events-none" />
            <div className="absolute -right-20 bottom-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(255,107,0,0.08),transparent)] blur-3xl pointer-events-none" />
            {/* Premium Parallax Glass Panels */}
            <div className="absolute inset-x-0 inset-y-0 max-w-7xl mx-auto pointer-events-none z-0">
                <motion.div 
                    style={{ y: y1, rotate: r1 }} 
                    className="absolute top-[10%] left-[10%] md:left-[15%] w-32 h-40 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 backdrop-blur-md shadow-[0_8px_32px_rgba(255,107,0,0.1)] flex items-center justify-center"
                >
                    <div className="w-16 h-16 rounded-full bg-primary/20 blur-xl absolute" />
                </motion.div>
                <motion.div 
                    style={{ y: y2, rotate: r2 }} 
                    className="absolute top-[60%] left-[5%] md:left-[8%] w-40 h-48 rounded-2xl bg-gradient-to-tr from-foreground/[0.05] to-transparent border border-foreground/10 backdrop-blur-md shadow-2xl flex items-center justify-center"
                >
                    <div className="w-full h-full bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] rounded-2xl opacity-50" />
                </motion.div>
                <motion.div 
                    style={{ y: y3, rotate: r1 }} 
                    className="absolute top-[20%] right-[5%] md:right-[12%] w-36 h-44 rounded-2xl bg-gradient-to-bl from-blue-500/10 to-transparent border border-blue-500/20 backdrop-blur-md shadow-2xl flex items-center justify-center overflow-hidden"
                >
                    <div className="absolute -right-8 -top-8 w-24 h-24 bg-blue-500/20 blur-2xl rounded-full" />
                </motion.div>
                <motion.div 
                    style={{ y: y4, rotate: r2 }} 
                    className="absolute top-[70%] right-[10%] md:right-[18%] w-28 h-32 rounded-2xl bg-gradient-to-tl from-primary/10 via-foreground/[0.02] to-transparent border border-foreground/10 backdrop-blur-md shadow-xl"
                />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <h2 className="text-4xl md:text-6xl font-light font-display tracking-wide leading-tight sm:leading-[1.1] mb-10">
                        Transform Your Learning Journey <br className="hidden md:block" />
                        Into A <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b00] to-[#ffb076]">Career Breakthrough</span> With Our <br className="hidden md:block" />
                        <span className="font-medium border rounded-xl mx-2 border-primary/30 bg-primary/10 text-primary px-5 py-1.5 inline-block mt-3 md:mt-5 shadow-[0_0_40px_rgba(255,107,0,0.2)] backdrop-blur-sm relative">
                            NextGen CTO Program
                            <span className="absolute inset-0 bg-primary/10 blur-xl -z-10 rounded-xl block" />
                        </span>
                    </h2>

                    <a
                        href="https://www.youtube.com/@CodingwithCTOBhaiya/courses"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-3 h-14 px-10 bg-[#C84B1A] hover:bg-[#ff6b00] text-white font-bold rounded-xl transition-all shadow-[0_4px_20px_rgba(255,107,0,0.4)] hover:shadow-[0_8px_30px_rgba(255,107,0,0.6)] hover:-translate-y-1 text-lg group"
                    >
                        Explore Free Courses <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </a>
                </motion.div>
            </div>
            
            {/* Top and Bottom soft fades to blend with other sections */}
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-background to-transparent pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </section>
    );
}
