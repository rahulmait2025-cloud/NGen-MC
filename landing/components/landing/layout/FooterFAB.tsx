"use client";

import Link from "next/link";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { m } from "framer-motion";

export function FooterFAB() {
    return (
        <div className="fixed bottom-8 right-8 z-40 hidden sm:block">
            <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                    asChild
                    className="h-auto py-4 px-6 rounded-2xl shadow-2xl shadow-primary/40 group transition-all transform hover:-translate-y-1 font-bold text-lg cursor-pointer"
                >
                    <Link href="/contact">
                        <Megaphone className="mr-3 h-6 w-6 group-hover:rotate-12 transition-transform" />
                        Refer Your College
                        <span className="ml-2 bg-white/20 text-[10px] px-2 py-0.5 rounded-md">EARN</span>
                    </Link>
                </Button>
            </m.div>
        </div>
    );
}
