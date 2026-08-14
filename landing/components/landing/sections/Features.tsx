"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Puzzle, Handshake, Rocket } from "lucide-react";
import Image from "next/image";

const PLACED_USERS = [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDgxF2JCzf7fm5FEZbIbDnNTvxOvYsC8HzgNKXa83AVzXGloxUqsPT9bAOUg2hcM3A7gLEX_ZfYs7ku6wlh34uTJ9m4qbMJlFYbALtQ_hsJ6v3bu9aEetCGhuXbO7v3FRxrnnmsV9ACh_HqW5h0WSTTqfrrllOs1b-Q7h0YyRtdlk1eALmxe7Q03mejCCZZInBN7VupC-gswm30_332GfscPku8-dMdvX9_0G7bAIhQKgSX6w5X-l_yPai6SO5zZI7wq7awTSPKFm0S",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBiaZl_Sh4Errfyt5JHecOuMzES9y2VsZv8F43fLHNmAqoMZLjY0JQsaEWRg95OYoh4hLa_v42jPQvAezJHRYAbYPBlhr_-vRiSe18XlWpW_B-oHXlnMDCyEyML3Vfs-prHK46n_K-jtU-QhaDFXFI7WUXkvcod9OYml91Y82TfIsYFrTF42dT5ujFWjM_7SPhSI_SAS9-VV31kamN2Urrnclq7BruIAwzGI1i9Yl1BG85OKPh5f3NR8bz2U5p8XvSpwMh5habg0EkS",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDpFM6np9uvdTQGyWuHR1f0O-el62RhwGDeBrLQVXbREvg4ZiqXMKlQN1UNw6dT-UoiU2HQpp5woByMivLsZ7e8m9Z4wVzRRm8uuaPiigwOTzoMK2e9BiazmhMgUEAPXLQ9hN9qYMBy6DNkXJnHlHBE3o40CEFuGBRhvZ7Uo0RYQ7wVb4ThIvGXQ6ZedevuhTDThCmJg7wg_qHKKF__pn-KEGiPZH0PSEI8iA59Brg29KnotLdXX1Da4DcakaBzr4p9Ca0lBxbdEQvP"
];

export function Features() {
    return (
        <section className="py-20 md:py-24 px-6" id="program">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
                        Everything you need to <span className="text-primary">Crack the Code</span>
                    </h2>
                    <p className="text-muted-foreground">Join a community driven ecosystem designed for your growth.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    {/* Hands-on Projects */}
                    <Card className="group hover:border-primary/50 transition-all duration-300">
                        <CardContent className="p-8">
                            <div className="w-14 h-14 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Puzzle className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Hands-on Projects</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                                Stop memorizing, start building. Real-world capstone projects that verify your skills.
                            </p>
                            <div className="bg-muted h-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full w-[75%] transition-all duration-1000" />
                            </div>
                            <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">
                                75% Practical Work
                            </div>
                        </CardContent>
                    </Card>

                    {/* Mentor 1:1 Access */}
                    <Card className="border-primary/20 bg-primary/5 group relative transition-all duration-300">
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary hover:bg-primary text-[10px] uppercase tracking-widest px-3 py-1">
                            Most Valued
                        </Badge>
                        <CardContent className="p-8">
                            <div className="w-14 h-14 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-primary/20">
                                <Handshake className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Mentor 1:1 Access</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                                Direct access to CTO Bhaiya and industry veterans. No query goes unresolved.
                            </p>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 bg-transparent p-3 rounded-xl shadow-sm border border-border">
                                    <Image
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAMAc6xrp2thfPVKMb8j2ueowEWtqEFxK-Ryi5QRRkQBnVh7TtxcjVDQn5aaZg-TeCAyXWXMUTUEbcMtvdqF3FSmKxztwiz27sSWRBRX0nRpprJxhBtujx297QTODl1uG_VvLDtp3BciG6Dzjul76OrMgOfKqWfaqeG0lnVUpdxIS9cTEaljPFreKvNjoguSsxsFp3hh_3bjArlC7u1KvufEWT7jjQ8KarhgEj4ZY0Hb02f-VRSEecVuTOIz_WHspMymzHOOiHyEJAW"
                                        alt="Student"
                                        width={32}
                                        height={32}
                                        className="rounded-full bg-slate-100"
                                    />
                                    <span className="text-xs text-muted-foreground italic">
                                        &quot;How do I optimize this DB query?&quot;
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 bg-primary/20 p-3 rounded-xl border border-primary/10 ml-6">
                                    <Image
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLPwYgigybyGaGD3yptnvl3vQPU4UlP9JsQ6YJN04pGcY74i6wJff_M5YrwHZik-FoLPVfnF0Hljjhgfp6ukB-Q_Zz7Q6_ebe_w_iEbn1DW7BuurhPBrW7HaGmjSpcpIyikQEUOt0YRk9P9LQ2dksbcEySVlBldqffOaYvRA7n2up-Z2GacdGr1MG1UAEiEPemU0v9fE0kXmKDFnieh70gAdAVTQGghbN39-n3TvtIoYfbN9IU3STFpKlqn0PxgXyaHJSs9bz-UjFC"
                                        alt="Mentor"
                                        width={32}
                                        height={32}
                                        className="rounded-full bg-slate-100"
                                    />
                                    <span className="text-xs font-semibold text-foreground">
                                        &quot;Let&apos;s look at indexing strategies...&quot;
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Placement Support */}
                    <Card className="group hover:border-blue-400/50 transition-all duration-300">
                        <CardContent className="p-8">
                            <div className="w-14 h-14 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Rocket className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Placement Support</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                                Resume reviews, mock interviews, and exclusive referrals to top startups.
                            </p>
                            <div className="flex items-center -space-x-3 mb-4 pl-3">
                                {PLACED_USERS.map((src) => (
                                    <div key={src} className="relative w-10 h-10 rounded-full border-2 border-background overflow-hidden">
                                        <Image src={src} alt="User" fill sizes="40px" className="object-cover" />
                                    </div>
                                ))}
                                <div className="w-10 h-10 rounded-full border-2 border-background bg-primary text-white text-[10px] font-bold flex items-center justify-center relative z-10">
                                    +2k
                                </div>
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Placed recently</div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    );
}
