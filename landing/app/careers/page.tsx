import { Metadata } from "next";
import { Navbar } from "@/components/landing/layout/Navbar";
import { Footer } from "@/components/landing/layout/Footer";
import {
    Briefcase,
    MapPin,
    Clock,
    IndianRupee,
    ChevronRight,
    Users,
    Rocket,
    Heart,
    Zap,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Careers | NextGen CTO",
    description:
        "Join our mission to transform campus placements across India. Explore open roles at NextGen CTO.",
};

const PERKS = [
    {
        icon: Rocket,
        title: "High-Impact Work",
        desc: "Shape the career trajectory of thousands of students across India.",
    },
    {
        icon: Users,
        title: "Lean & Fast Team",
        desc: "Work directly with founders in a fast-paced, zero-bureaucracy environment.",
    },
    {
        icon: Heart,
        title: "Growth-First Culture",
        desc: "We invest in your growth — upskilling budgets, mentorship, and ownership from day one.",
    },
    {
        icon: Zap,
        title: "Remote Flexibility",
        desc: "Work from anywhere with flexible timings. Results matter, not hours.",
    },
];

const JOBS = [
    {
        id: "social-media-manager",
        title: "Social Media Manager",
        department: "Marketing",
        location: "Remote / Hybrid",
        type: "Full-Time",
        salary: "As per industry standards",
        posted: "Feb 2024",
        description:
            "We're looking for a creative and data-driven Social Media Manager to own our brand presence across LinkedIn, Instagram, X (Twitter), and YouTube. You'll craft content strategies that resonate with college students, campus leaders, and corporate partners.",
        responsibilities: [
            "Plan, create, and schedule engaging content across all social platforms",
            "Grow community engagement and follower base organically",
            "Collaborate with founders and design team on campaign strategies",
            "Track analytics and optimize content performance weekly",
            "Stay on top of EdTech and student community trends",
            "Manage influencer and creator collaborations",
        ],
        requirements: [
            "1-3 years of experience managing social media for a brand or startup",
            "Strong copywriting skills with a flair for short-form content",
            "Proficiency with tools like Canva, Buffer/Hootsuite, and analytics dashboards",
            "Understanding of the Indian higher education and EdTech landscape is a plus",
            "Portfolio of past campaigns or content work",
        ],
    },
];

export default function CareersPage() {
    return (
        <div className="relative flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow pt-28 pb-20">
                {/* Hero */}
                <section className="px-6 mb-20">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest mb-6">
                            <Briefcase className="w-3.5 h-3.5" />
                            We&apos;re Hiring
                        </div>
                        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                            Build the future of{" "}
                            <span className="text-primary">campus placements</span>
                        </h1>
                        <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
                            Join a mission-driven team transforming how India&apos;s colleges
                            prepare students for the tech industry. Small team, big impact.
                        </p>
                    </div>
                </section>

                {/* Why Join Us */}
                <section className="px-6 mb-24">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-12">
                            Why join NextGen{" "}
                            <span className="text-primary">CTO</span>?
                        </h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {PERKS.map((perk) => (
                                <div
                                    key={perk.title}
                                    className="group rounded-2xl border border-border/50 bg-card p-6 hover:border-primary/30 hover:shadow-[0_0_20px_rgba(255,116,0,0.08)] transition-all duration-300"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                        <perk.icon className="w-5 h-5 text-primary" />
                                    </div>
                                    <h3 className="font-bold text-base mb-2">{perk.title}</h3>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        {perk.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Open Positions */}
                <section className="px-6 mb-24">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-4">
                            Open Positions
                        </h2>
                        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
                            Find your next role. We value talent, hustle, and a passion for
                            making education better.
                        </p>

                        <div className="space-y-6">
                            {JOBS.map((job) => (
                                <div
                                    key={job.id}
                                    className="rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-primary/30 hover:shadow-[0_0_20px_rgba(255,116,0,0.08)] transition-all duration-300"
                                >
                                    {/* Job Header */}
                                    <div className="p-6 sm:p-8">
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2 block">
                                                    {job.department}
                                                </span>
                                                <h3 className="font-display text-xl sm:text-2xl font-bold">
                                                    {job.title}
                                                </h3>
                                            </div>
                                            <Link
                                                href={`mailto:common@nextgen-cto.in?subject=Application: ${job.title}&body=Hi, I'd like to apply for the ${job.title} role. Please find my details below:%0A%0AName:%0AExperience:%0APortfolio/LinkedIn:%0A%0AThank you!`}
                                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-primary/20 shrink-0"
                                            >
                                                Apply Now
                                                <ChevronRight className="w-4 h-4" />
                                            </Link>
                                        </div>

                                        <div className="flex flex-wrap gap-3 mb-6">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted/50 text-xs font-medium text-muted-foreground">
                                                <MapPin className="w-3.5 h-3.5" />
                                                {job.location}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted/50 text-xs font-medium text-muted-foreground">
                                                <Clock className="w-3.5 h-3.5" />
                                                {job.type}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted/50 text-xs font-medium text-muted-foreground">
                                                <IndianRupee className="w-3.5 h-3.5" />
                                                {job.salary}
                                            </span>
                                        </div>

                                        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                                            {job.description}
                                        </p>

                                        <div className="grid md:grid-cols-2 gap-8">
                                            <div>
                                                <h4 className="font-bold text-sm mb-3 uppercase tracking-wider text-foreground/80">
                                                    What you&apos;ll do
                                                </h4>
                                                <ul className="space-y-2.5">
                                                    {job.responsibilities.map((item, i) => (
                                                        <li
                                                            key={i}
                                                            className="flex items-start gap-2 text-sm text-muted-foreground"
                                                        >
                                                            <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                            {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm mb-3 uppercase tracking-wider text-foreground/80">
                                                    What you&apos;ll need
                                                </h4>
                                                <ul className="space-y-2.5">
                                                    {job.requirements.map((item, i) => (
                                                        <li
                                                            key={i}
                                                            className="flex items-start gap-2 text-sm text-muted-foreground"
                                                        >
                                                            <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                            {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="px-6">
                    <div className="max-w-3xl mx-auto text-center rounded-2xl border border-border/50 bg-card p-10 sm:p-14">
                        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">
                            Don&apos;t see your role?
                        </h2>
                        <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                            We&apos;re always looking for exceptional people. Drop us a line and
                            tell us how you&apos;d contribute.
                        </p>
                        <Link
                            href="mailto:common@nextgen-cto.in?subject=Open Application – NextGen CTO"
                            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
                        >
                            Send us your resume
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
