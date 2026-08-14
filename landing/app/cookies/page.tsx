import Link from "next/link";
import { Footer } from "@/components/landing/layout/Footer";
import { CookieContent } from "@/components/cookies/CookieContent";
import { Reveal } from "@/components/motion/Reveal";
import { Cookie, ArrowLeft } from "lucide-react";

export const metadata = {
    title: "Cookie Policy | NextGen CTO",
    description: "Cookie Policy for NextGen CTO learning platform.",
};

export default function CookiePolicyPage() {
    return (
        <div className="min-h-screen bg-transparent font-sans text-foreground selection:bg-[#ff7400] selection:text-white overflow-x-clip relative">
            <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-50">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border bg-background/80 backdrop-blur-md rounded-full hover:bg-muted transition-colors shadow-sm"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Home
                </Link>
            </div>
            
            <main>
                {/* Hero Section */}
                <section className="relative pt-40 pb-20 px-6 overflow-hidden border-b border-primary/5">
                    <div className="absolute inset-0 pointer-events-none flex justify-center">
                        <div className="w-[800px] h-[500px] bg-primary/10 rounded-full blur-[100px] -mt-20 opacity-20" />
                    </div>

                    <div className="max-w-7xl mx-auto px-6 relative z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-left">
                            <div className="lg:col-start-4 lg:col-span-9">
                                <Reveal delay={0}>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-6">
                                        <Cookie className="h-3 w-3" /> Updated April 5, 2024
                                    </div>
                                </Reveal>

                                <Reveal delay={0.1}>
                                    <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-extrabold mb-8 leading-[1.1]">
                                        Cookie <span className="text-primary italic">Policy</span>
                                    </h1>
                                </Reveal>

                                <Reveal delay={0.2}>
                                    <p className="text-muted-foreground text-lg md:text-xl max-w-2xl leading-relaxed">
                                        We use cookies to improve your experience and personalize our services.
                                        Learn how we use these small files to better serve you.
                                    </p>
                                </Reveal>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Main Content with Navigation */}
                <CookieContent />
            </main>

            <Footer />
        </div>
    );
}
