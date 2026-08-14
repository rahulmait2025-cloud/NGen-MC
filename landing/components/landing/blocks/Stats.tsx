"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import Image from "next/image";

export function Stats() {
    return (
        <section className="py-20 md:py-24 px-6 bg-muted/30">
            <div className="max-w-6xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6 uppercase tracking-widest">
                            🔥 Trending among colleges
                        </div>
                        <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
                            More than a platform.<br />
                            <span className="text-primary">It&apos;s a Mentorship.</span>
                        </h2>
                        <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
                            CTO Bhaiya isn&apos;t just an instructor; he&apos;s the senior you wish you had. We bridge the gap
                            between abstract theory and the code that actually runs in production.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: "YouTube Views", value: "8.6 Lakh+" },
                                { label: "YouTube Subscribers", value: "38.5k+" },
                            ].map((stat) => (
                                <Card key={stat.label} className="transition-transform hover:-translate-y-1">
                                    <CardContent className="p-6">
                                        <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
                                        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            {stat.label}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                    <div className="relative group">
                        <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/5">
                            <div className="aspect-video relative bg-slate-900">
                                <Image
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4GWQy7Ktef8SWmRYkb3oMoOXz7SbMME24ikX8M5y4618J6-eIu0w3Awr3mg3P75ednzCuGsRPut-nMTC0aParWWTJT5VhnZS-OK8ZDygvbB2fyyzYec0AwKfzGW8jXD5uqia377bxw1jtm_77Df2YfzNC4K8HJlLzzOzocB5ehlfmnpWWaX1lO5B4aFw9b3EJNmqFlAL9k5gDl7ZXHs-l28rWu_r6mv9-KJh8gRYNWR6cVxRY922SQriiYRmObouMd28cfaOXM8QF"
                                    alt="Students learning together"
                                    fill
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    className="object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Button
                                        variant="default"
                                        size="icon"
                                        className="w-20 h-20 rounded-full shadow-2xl transition-transform transform group-hover:scale-110"
                                    >
                                        <Play className="h-8 w-8 ml-1" />
                                    </Button>
                                </div>
                                <div className="absolute bottom-6 left-6 right-6 p-4 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl">
                                    <div className="text-white font-bold mb-1">Why Data Structures Matter?</div>
                                    <div className="text-white/70 text-sm">CTO Bhaiya • 2 days ago • 12:45</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
