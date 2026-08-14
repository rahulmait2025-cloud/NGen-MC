"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";

export function Tribe() {
    return (
        <section className="py-20 md:py-24 px-6">
            <div className="max-w-6xl mx-auto">
                <div className="relative bg-[#0F0B08] rounded-[3rem] p-12 md:p-20 overflow-hidden group border border-white/5">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/20 to-transparent pointer-events-none" />
                    <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="font-display text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
                                Don&apos;t learn alone.<br />
                                Join the <span className="text-primary">Tribe.</span>
                            </h2>
                            <p className="text-slate-400 text-lg mb-10 leading-relaxed max-w-md">
                                Connect with 5,000+ ambitious developers, participate in hackathons, and grow your network before you
                                even graduate.
                            </p>
                            <Button
                                variant="secondary"
                                size="lg"
                                className="bg-white hover:bg-slate-100 text-slate-900 px-8 py-6 h-auto rounded-xl font-bold flex items-center gap-3 transition-all transform hover:scale-105"
                            >
                                <Image
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9_SOjBHLmlw4gI0rBBej402APX2Yg1E9fs6caHaTM6WJmG6D1O63gqlMpCioiaINah1Pag38yDPwEoywLFhmW9y9iqCJLGGnsNvAb4b0B1voLZk1nRuZSAGfHkTtgn8LR_6V_9zgivRXo-9iYkH5KV0KBArAQaNguMwlSg42A3WcDQiVoysqs8QI0s4silFMF6E1CAgHKMLKSyxQKuwdQTb1V07EGtPNIKPFvS5WwRSP9oC8a4Zu63YWvkNqyX6KWAbKzPb437uk_"
                                    alt="Discord Icon"
                                    width={24}
                                    height={24}
                                />
                                Join Discord Server
                            </Button>
                        </div>
                        <div className="relative flex justify-center items-center h-80">
                            <div className="absolute w-40 h-40 rounded-full border border-primary/30 flex items-center justify-center animate-pulse">
                                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                                    <span className="text-primary font-bold text-2xl">5k+</span>
                                </div>
                            </div>
                            <div className="absolute -top-10 left-1/4 animate-bounce duration-[3s]">
                                <Image
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8u2Ay3OeNVGjt8y7i2DysBtMPrxLSLeVGUNxWBS-fIf4ikWEImRyO3xEs8R_0arf80wDzzqsmoE0vjd6cl_GVmsxL1d2RAIRLrIqnBWr7olDpUN9fC_3NYERCWx-sTlHS_aH9EWwGsalOSbCPXoMU70icLhSVtJnb4ZdCqNcKZpfe23nB5Fxk44K-OSJJdG4IQJ1aA1REb39E_uztGMU9daB7jUsEqsmwKN9UR2w01VLZgpMSkD1hwsbTONb3_JJ6oViJ2QSLPQsr"
                                    alt="User"
                                    width={48}
                                    height={48}
                                    className="rounded-full border-2 border-primary bg-slate-800"
                                />
                            </div>
                            <div className="absolute top-1/2 -left-10 animate-bounce duration-[4s]">
                                <Image
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJLMDI0Uy_j8gI23LGB-Tk1iKb6emqrvMtNQJoQ-ZunSz8Uy41pF-2GWl0G9gGAS1SQ4Ak-tg_yMCSv0umS-ppBUm2j7wcZjHtdXp0ZliH3ddhALF6U049JvILLeUN-JFOq1f1TtBw_oSSNMzhkDmNU1vcz8hAUYdcU8u9llBA-RnuUxrqS-Wt0CGGUCfr1P21_9QjR_YJP1bZ6hOIPn4CUSByxHdhh_iH3j7weilmu7zcaldpEeGlfqeqw-YVwWCQYuPxE-iHTPD6"
                                    alt="User"
                                    width={48}
                                    height={48}
                                    className="rounded-full border-2 border-primary bg-slate-800"
                                />
                            </div>
                            <div className="absolute bottom-0 right-1/4 animate-bounce duration-[3.5s]">
                                <Image
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDme54BcpHDCkgkpL_A_Jq25y9t934pDGG2jecYdWvBHln8L5H16Aejb8AD3Sjiknr3rtuUgkmBpbwz-4yjHuvDGtVXJ_JnmWG4CQzrVzqaxa2JyEQgcJ3WmYT4T4hdT2LaPuPSryztuMok8dN84Z4Qkz0KKLKksS_7qN4vxAIF15AFdy24A4wrcYtm1BI9Rz-F62HiJ-hYdjmA0Oox6buxkHTUVsV1hK9gZb5mcvsZPAbFK7g4W0J-0pHDINTzIZZl_DLqWS0_m9rH"
                                    alt="User"
                                    width={48}
                                    height={48}
                                    className="rounded-full border-2 border-primary bg-slate-800"
                                />
                            </div>
                            <div className="absolute top-1/3 right-0 animate-bounce duration-[4.5s]">
                                <Image
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBN3Ly3DaGKomo8iomzxjFpJ-budFKM_en7Xvyt-bSHEFSm8btVjg-JNNMD7TcA5jxY9X_ObZC_ANeIbX3e7YeHKH6TucgU4V7ERfjMQLre4s1o1QlOtzhB1Baua6h-G_yjWJduYS49UKjWqYhxEk_kLcMoH6sb4AOYjVah7qezJAuyScve_ez9hqI4Vu9-24y0dI35_M-ELe0z8Y-9f9CLj5kk5OKRCl4sEH1EMhpj6B8TPbPWDeVk0OAwUS5bRpkjeMt-qlnxRo3O"
                                    alt="User"
                                    width={48}
                                    height={48}
                                    className="rounded-full border-2 border-primary bg-slate-800"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
