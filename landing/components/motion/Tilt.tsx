"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";

interface TiltProps {
    children: React.ReactNode;
    intensity?: number;
    scale?: number;
    glare?: boolean;
    className?: string;
}

export function Tilt({
    children,
    intensity = 15,
    scale = 1.05,
    glare = true,
    className = ""
}: TiltProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [rotateX, setRotateX] = useState(0);
    const [rotateY, setRotateY] = useState(0);
    const [glarePos, setGlarePos] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const { left, top, width, height } = ref.current.getBoundingClientRect();
        const x = (e.clientX - left) / width;
        const y = (e.clientY - top) / height;

        setRotateX((y - 0.5) * -intensity * 2);
        setRotateY((x - 0.5) * intensity * 2);
        setGlarePos({ x: x * 100, y: y * 100 });
    };

    const handleMouseLeave = () => {
        setRotateX(0);
        setRotateY(0);
        setIsHovered(false);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            animate={{ rotateX, rotateY, scale: isHovered ? scale : 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ transformStyle: "preserve-3d", perspective: 1000 }}
            className={`relative rounded-[inherit] cursor-pointer h-full ${className}`}
        >
            {glare && isHovered && (
                <div
                    className="absolute inset-0 z-50 pointer-events-none rounded-[inherit] overflow-hidden transition-opacity duration-300"
                    style={{
                        background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.15) 0%, transparent 60%)`
                    }}
                />
            )}
            <div className="w-full h-full">
                {children}
            </div>
        </motion.div>
    );
}
