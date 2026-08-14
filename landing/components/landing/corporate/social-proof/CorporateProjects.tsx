"use client";

import { Code2, Check } from "lucide-react";
import { Tilt } from '@/components/motion/Tilt';

export function CorporateProjects() {
    return (
        <section id="projects" className="relative py-24 sm:py-32 px-6 overflow-hidden bg-foreground/[0.02]">
            <div className="absolute top-0 inset-x-0 h-px bg-border/50" />
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="font-display text-3xl sm:text-5xl font-bold mb-6">
                        Not To-Do apps.<br /> <span className="text-[#ff7400]">Real engineering work.</span>
                    </h2>
                </div>

                <div className="grid lg:grid-cols-2 gap-8 mb-12">
                    {[
                        { title: "Monolith → Microservices refactor", desc: "Tear apart a legacy Node monolith and rebuild it with bounded contexts and event-driven communication." },
                        { title: "Optimization Simulator", desc: "Reduce DB latency and handle 100k concurrency under simulated load stress tests using K6." },
                        { title: "Scalability Implementations", desc: "Integrate Redis caching, RabbitMQ queues, rate limiting, and defensive load shedding tactics." },
                        { title: "DevOps & Observability", desc: "CI/CD pipelines, Docker/K8s basics, paired with complete Prometheus metrics and Datadog tracing." }
                    ].map((proj, i) => (
                        <Tilt key={i} intensity={8} scale={1.02} glare>
                        <div className="project-card flex items-start gap-5 p-6 rounded-2xl border border-border/50 bg-card h-full shadow-[0_0_15px_rgba(255,116,0,0.08)] hover:shadow-[0_0_30px_rgba(255,116,0,0.15)] hover:border-[#ff7400]/30 transition-all duration-300">
                            <div className="p-3 bg-[#ff7400]/10 rounded-lg border border-[#ff7400]/20 shrink-0">
                                <Code2 className="w-5 h-5 text-[#ff7400]" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-foreground mb-2">{proj.title}</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">{proj.desc}</p>
                            </div>
                        </div>
                        </Tilt>
                    ))}
                </div>

                <Tilt intensity={8} scale={1.02} glare>
                <div className="p-8 rounded-2xl border border-border/50 bg-card flex flex-col sm:flex-row items-center justify-between gap-6 shadow-[0_0_15px_rgba(255,116,0,0.08)]">
                    <div className="flex-1">
                        <h4 className="text-lg font-bold text-foreground mb-4">Final Interview Deliverables</h4>
                        <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-muted-foreground">
                            <span className="flex items-center gap-2 relative"><Check className="w-4 h-4 text-[#ff7400]" /> 2–3 case study writeups</span>
                            <span className="flex items-center gap-2 relative"><Check className="w-4 h-4 text-[#937869]" /> Architecture diagrams</span>
                            <span className="flex items-center gap-2 relative"><Check className="w-4 h-4 text-[#937869]" /> GitHub repo + README like a real engineer</span>
                        </div>
                    </div>
                </div>
                </Tilt>
            </div>
        </section>
    );
}
