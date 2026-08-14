"use client";

import { useCallback, useEffect, useState } from "react";
import NextImage from "next/image";
import QRCode from "qrcode";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

const SITE_URL = "https://nextgen-cto.in/";



function loadImg(src: string): Promise<HTMLImageElement> {
    return new Promise((res, rej) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
    });
}

async function drawCardToCanvas(collegeCount: string = "55+"): Promise<HTMLCanvasElement> {
    const DPR = 2;
    const W = 800;
    const H = 1000;
    const F = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    
    const canvas = document.createElement("canvas");
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(DPR, DPR);

    const qrUrl = await QRCode.toDataURL(SITE_URL, {
        errorCorrectionLevel: "H",
        margin: 1,
        width: 320,
        color: { dark: "#ea580c", light: "#ffffff" },
    });
    const qrImg = await loadImg(qrUrl);

    // 1. Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // 2. Thick Top Orange Bar
    ctx.fillStyle = "#ea580c";
    ctx.fillRect(0, 0, W, 12);

    // 3. Header Branding
    ctx.fillStyle = "#ea580c";
    ctx.font = `bold 32px ${F}`;
    ctx.textAlign = "center";
    ctx.fillText("NextGen CTO", W / 2, 80);
    
    ctx.fillStyle = "#64748b";
    ctx.font = `700 13px ${F}`;
    ctx.letterSpacing = "3px";
    ctx.fillText("CAMPUS PARTNERSHIP", W / 2, 110);
    ctx.letterSpacing = "0px";

    // 4. Hero Content
    ctx.fillStyle = "#0f172a";
    ctx.font = `850 48px ${F}`;
    ctx.fillText("Join the Placement", W / 2, 185);
    ctx.fillText("Revolution.", W / 2, 245);

    ctx.fillStyle = "#64748b";
    ctx.font = `500 20px ${F}`;
    ctx.fillText("Your campus deserves world-class placements.", W / 2, 285);

    // 5. Bullet Points
    const bullets = [
        "350% avg. ROI for partner colleges",
        "94% student engagement rate",
        "Real-time placement dashboards"
    ];
    ctx.textAlign = "start";
    bullets.forEach((text, i) => {
        const y = 350 + i * 45;
        ctx.fillStyle = "#ea580c";
        ctx.font = `bold 24px ${F}`;
        ctx.fillText("✓", 160, y);
        ctx.fillStyle = "#475569";
        ctx.font = `600 22px ${F}`;
        ctx.fillText(text, 200, y);
    });

    // 6. Stats Row
    const stats = [
        { v: "35K+", l: "Students" },
        { v: collegeCount, l: "Colleges" },
        { v: "94%", l: "Engagement" }
    ];
    const statW = 160;
    const statH = 100;
    const statGap = 20;
    const totalStatW = (3 * statW) + (2 * statGap);
    const startX = (W - totalStatW) / 2;
    
    ctx.textAlign = "center";
    stats.forEach((s, i) => {
        const x = startX + i * (statW + statGap);
        const y = 500;
        ctx.strokeStyle = "#fed7aa";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, statW, statH, 20);
        ctx.stroke();
        ctx.fillStyle = "#fff7ed";
        ctx.fill();
        ctx.fillStyle = "#ea580c";
        ctx.font = `bold 32px ${F}`;
        ctx.fillText(s.v, x + statW / 2, y + 45);
        ctx.fillStyle = "#64748b";
        ctx.font = `700 14px ${F}`;
        ctx.fillText(s.l, x + statW / 2, y + 75);
    });

    // 7. QR Section
    const qrS = 220;
    const qrX = (W - qrS) / 2;
    const qrY = 640;
    ctx.strokeStyle = "#eff6ff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(qrX - 20, qrY - 20, qrS + 40, qrS + 80, 40);
    ctx.stroke();
    ctx.drawImage(qrImg, qrX, qrY, qrS, qrS);
    ctx.fillStyle = "#64748b";
    ctx.font = `bold 14px ${F}`;
    ctx.letterSpacing = "2px";
    ctx.fillText("SCAN TO VISIT", W / 2, qrY + qrS + 35);
    ctx.letterSpacing = "0px";

    // 8. Book A Demo Button
    const btnW = 320;
    const btnH = 70;
    const btnX = (W - btnW) / 2;
    const btnY = 820;
    ctx.fillStyle = "#ea580c";
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 16);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 24px ${F}`;
    ctx.fillText("BOOK A DEMO", W / 2, btnY + 45);

    // 9. Footer
    ctx.fillStyle = "#94a3b8";
    ctx.font = `bold 16px ${F}`;
    ctx.textAlign = "start";
    ctx.fillText("nextgen-cto.in", 60, H - 40);
    ctx.textAlign = "end";
    ctx.fillText("Nursery se Naukri Tak", W - 60, H - 40);

    return canvas;
}

export function ShareSection() {
    const [collegeCount, setCollegeCount] = useState("55+");

    useEffect(() => {
        fetch("/api/college-leads")
            .then(res => res.json())
            .then(data => {
                if (data.count !== undefined) setCollegeCount(`${data.count}+`);
            })
            .catch(() => {});
    }, []);



    const handleDownload = useCallback(async () => {
        const canvas = await drawCardToCanvas(collegeCount);
        const link = document.createElement("a");
        link.download = "nextgencto-campus-card.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    }, [collegeCount]);

    const handleShare = useCallback(async () => {
        if (navigator.share) {
            try {
                const canvas = await drawCardToCanvas(collegeCount);
                const blob = await new Promise<Blob>((resolve) =>
                    canvas.toBlob((b) => resolve(b!), "image/png")
                );
                const file = new File([blob], "nextgencto-campus-card.png", { type: "image/png" });
                await navigator.share({
                    title: "NextGen CTO - Join the Placement Revolution",
                    text: `Transform your campus placements with NextGen CTO — ${collegeCount} colleges already on board!`,
                    url: SITE_URL,
                    files: [file],
                });
            } catch {
                await navigator.clipboard.writeText(`Transform your campus placements with NextGen CTO — ${collegeCount} colleges already on board! ${SITE_URL}`);
            }
        } else {
            await navigator.clipboard.writeText(`Transform your campus placements with NextGen CTO — ${collegeCount} colleges already on board! ${SITE_URL}`);
        }
    }, [collegeCount]);

    return (
        <section className="py-14 md:py-16 px-6 bg-transparent" id="share">
            <div className="max-w-6xl mx-auto">
                <Reveal>
                    <div className="text-center mb-10">
                        <Badge variant="outline" className="mb-4 text-primary border-primary/20 bg-primary/10">
                            <Share2 className="h-3 w-3 mr-1" /> Spread the Word
                        </Badge>
                        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                            Be the One Who Starts the Revolution
                        </h2>
                        <p className="text-muted-foreground max-w-lg mx-auto">
                            Share this card with your HOD, placement cell, or college WhatsApp group. One share can transform your entire campus.
                        </p>
                    </div>
                </Reveal>

                <Reveal delay={0.1}>
                    <div className="flex flex-col lg:flex-row items-center gap-10">
                        <div className="w-full max-w-md mx-auto lg:mx-0 shrink-0">
                            <div className="rounded-[2.5rem] bg-white p-8 border border-slate-200 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-3 bg-orange-600" />
                                
                                <div className="relative flex flex-col items-center mb-8">
                                    <h3 className="font-display text-2xl font-black text-orange-600 tracking-tight">
                                        NextGen CTO
                                    </h3>
                                    <p className="text-[10px] font-bold tracking-[0.3em] text-slate-400 uppercase mt-1">
                                        Campus Partnership
                                    </p>
                                </div>

                                <div className="text-center mb-8">
                                    <h4 className="font-display text-2xl font-black text-slate-900 leading-tight mb-2">
                                        Join the Placement Revolution.
                                    </h4>
                                    <p className="text-slate-500 font-medium text-sm">
                                        Your campus deserves world-class placements.
                                    </p>
                                </div>

                                <div className="space-y-3 mb-10">
                                    {[
                                        "350% avg. ROI for partner colleges",
                                        "94% student engagement rate",
                                        "Real-time placement dashboards"
                                    ].map((text) => (
                                        <div key={text} className="flex items-center gap-3 text-slate-600 font-medium text-sm">
                                            <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">✓</div>
                                            {text}
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-10">
                                    {[
                                        { v: "35K+", l: "Students" },
                                        { v: collegeCount, l: "Colleges" },
                                        { v: "94%", l: "Engagement" }
                                    ].map((s) => (
                                        <div key={s.l} className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-center">
                                            <p className="text-orange-600 font-bold text-xl font-display">{s.v}</p>
                                            <p className="text-slate-500 text-[9px] font-bold tracking-wider uppercase mt-1">{s.l}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col items-center gap-6 mb-8">
                                    <div className="p-4 rounded-[2rem] border border-slate-100 bg-white shadow-sm ring-1 ring-slate-100">
                                        <NextImage
                                            src='/assets/nextgencto-qr.svg'
                                            alt="QR Code"
                                            width={140}
                                            height={140}
                                            className="w-32 h-32"
                                        />
                                    </div>
                                    <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">Scan to Visit</p>
                                    
                                    <Button className="w-full h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-orange-500/20">
                                        BOOK A DEMO
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between text-slate-300 text-[10px] font-bold tracking-widest uppercase border-t pt-6">
                                    <span>nextgen-cto.in</span>
                                    <span>Nursery se Naukri Tak</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 text-center lg:text-left">
                            <h3 className="font-display text-2xl font-bold mb-4">
                                Your campus is one share away from a placement upgrade
                            </h3>
                            <p className="text-muted-foreground mb-6 leading-relaxed">
                                Download this card and share it with your HOD, placement officer, or college WhatsApp group. {collegeCount} colleges have already joined — help yours be next.
                            </p>

                            <ul className="space-y-3 mb-8 text-left">
                                {[
                                    "QR code links directly to nextgen-cto.in",
                                    "Download as a high-quality PNG image",
                                    "Share via WhatsApp, Telegram, or any app",
                                    "Help your college get industry-ready training",
                                ].map((item) => (
                                    <li key={item} className="flex items-start gap-3">
                                        <span className="text-primary mt-0.5">
                                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                        </span>
                                        <span className="text-sm">{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button onClick={handleDownload} size="lg" className="rounded-xl">
                                    <Download className="mr-2 h-4 w-4" />
                                    Download Card
                                </Button>
                                <Button onClick={handleShare} variant="outline" size="lg" className="rounded-xl border-primary/20 text-primary hover:bg-primary/5">
                                    <Share2 className="mr-2 h-4 w-4" />
                                    Share Instantly
                                </Button>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
