"use client";

import { useCallback, useEffect, useState } from "react";
import NextImage from "next/image";
import QRCode from "qrcode";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Share2, Check, Loader2, Megaphone } from "lucide-react";

const SITE_URL = "https://nextgen-cto.in/";
const FALLBACK_COLLEGE_COUNT = "55+";

async function fetchCollegeLeadsCount(): Promise<string> {
    try {
        const res = await fetch("/api/college-leads");
        if (!res.ok) return FALLBACK_COLLEGE_COUNT;
        const data = await res.json();
        if (data.count !== undefined) {
            return `${data.count}+`;
        }
        return FALLBACK_COLLEGE_COUNT;
    } catch {
        return FALLBACK_COLLEGE_COUNT;
    }
}

function rrp(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
}

function loadImg(src: string): Promise<HTMLImageElement> {
    return new Promise((res, rej) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
    });
}

async function createCardPng(name: string, college: string, collegeCountStr: string = FALLBACK_COLLEGE_COUNT): Promise<{ blob: Blob; dataUrl: string }> {
    const DPR = 2;
    const W = 1000;
    const H = 600;
    const F = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

    const qrUrl = await QRCode.toDataURL(SITE_URL, {
        errorCorrectionLevel: "H",
        margin: 1,
        width: 300 * DPR,
        color: { dark: "#ea580c", light: "#ffffff" },
    });
    const qrImg = await loadImg(qrUrl);

    const c = document.createElement("canvas");
    c.width = W * DPR;
    c.height = H * DPR;
    const ctx = c.getContext("2d")!;
    ctx.scale(DPR, DPR);

    // 1. Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // 2. Thick Top Orange Bar
    ctx.fillStyle = "#ea580c";
    ctx.fillRect(0, 0, W, 12);

    // 3. Header Branding
    ctx.fillStyle = "#ea580c";
    ctx.font = `bold 32px ${F}`;
    ctx.fillText("NextGen CTO", 50, 75);
    
    ctx.fillStyle = "#64748b";
    ctx.font = `700 13px ${F}`;
    ctx.letterSpacing = "2.5px";
    ctx.fillText("CAMPUS PARTNERSHIP", 50, 105);
    ctx.letterSpacing = "0px";

    // 4. Hero Title
    ctx.fillStyle = "#0f172a";
    ctx.font = `850 52px ${F}`;
    ctx.fillText("Join the Placement", 50, 175);
    ctx.fillText("Revolution.", 50, 235);

    ctx.fillStyle = "#64748b";
    ctx.font = `500 20px ${F}`;
    ctx.fillText("Your campus deserves world-class placements.", 50, 275);

    // 5. Bullet Points
    const bullets = [
        "350% avg. ROI for partner colleges",
        "94% student engagement rate",
        "Real-time placement dashboards"
    ];
    bullets.forEach((text, i) => {
        const y = 330 + i * 42;
        ctx.fillStyle = "#ea580c";
        ctx.font = `bold 22px ${F}`;
        ctx.fillText("✓", 55, y);
        ctx.fillStyle = "#475569";
        ctx.font = `600 20px ${F}`;
        ctx.fillText(text, 90, y);
    });

    // 6. Stats Row
    const stats = [
        { v: "35K+", l: "Students" },
        { v: collegeCountStr, l: "Colleges" },
        { v: "94%", l: "Engagement" }
    ];
    const statW = 136;
    const statH = 92;
    const statGap = 16;
    
    stats.forEach((s, i) => {
        const x = 50 + i * (statW + statGap);
        const y = 470;
        ctx.strokeStyle = "#fed7aa";
        ctx.lineWidth = 2;
        rrp(ctx, x, y, statW, statH, 16);
        ctx.stroke();
        ctx.fillStyle = "#fff7ed";
        ctx.fill();
        ctx.fillStyle = "#ea580c";
        ctx.font = `bold 30px ${F}`;
        ctx.textAlign = "center";
        ctx.fillText(s.v, x + statW / 2, y + 42);
        ctx.fillStyle = "#64748b";
        ctx.font = `700 13px ${F}`;
        ctx.fillText(s.l, x + statW / 2, y + 68);
        ctx.textAlign = "start";
    });

    // 7. Right Side (QR & Button)
    const qrBoxS = 270;
    const qrX = W - qrBoxS - 50;
    const qrY = 90;
    ctx.strokeStyle = "#eff6ff";
    ctx.lineWidth = 1;
    rrp(ctx, qrX, qrY, qrBoxS, qrBoxS + 70, 32);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.drawImage(qrImg, qrX + 20, qrY + 15, qrBoxS - 40, qrBoxS - 40);
    ctx.fillStyle = "#64748b";
    ctx.font = `bold 13px ${F}`;
    ctx.letterSpacing = "2px";
    ctx.textAlign = "center";
    ctx.fillText("SCAN TO VISIT", qrX + qrBoxS / 2, qrY + qrBoxS + 15);
    ctx.letterSpacing = "0px";

    const btnW = 270;
    const btnH = 64;
    const btnX = W - btnW - 50;
    const btnY = 460;
    ctx.fillStyle = "#ea580c";
    rrp(ctx, btnX, btnY, btnW, btnH, 14);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 22px ${F}`;
    ctx.fillText("BOOK A DEMO", btnX + btnW / 2, btnY + 38);

    // 8. Footer
    ctx.textAlign = "start";
    ctx.fillStyle = "#94a3b8";
    ctx.font = `bold 15px ${F}`;
    ctx.fillText("nextgen-cto.in", 50, H - 35);
    ctx.textAlign = "end";
    ctx.fillText("Nursery se Naukri Tak", W - 50, H - 35);

    const blob = await new Promise<Blob>((res) =>
        c.toBlob((b) => res(b ?? new Blob()), "image/png")
    );
    return { blob, dataUrl: c.toDataURL("image/png") };
}

export function ShareCard({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<"form" | "card" | "done">("form");
    const [isLoading, setIsLoading] = useState(false);
    const [pngUrl, setPngUrl] = useState<string | null>(null);
    const [pngBlob, setPngBlob] = useState<Blob | null>(null);
    const [formData, setFormData] = useState({ name: "", email: "", phone: "", college: "", location: "", dept: "", year: "" });
    const [collegeCount, setCollegeCount] = useState(FALLBACK_COLLEGE_COUNT);

    useEffect(() => {
        fetchCollegeLeadsCount().then(setCollegeCount);
    }, []);

    const handleOpenChange = (val: boolean) => {
        setOpen(val);
        if (!val) setTimeout(() => { setStep("form"); setPngUrl(null); setPngBlob(null); }, 300);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const { dataUrl, blob } = await createCardPng(formData.name, formData.college, collegeCount);
            setPngUrl(dataUrl);
            setPngBlob(blob);
            setStep("card");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = useCallback(() => {
        if (!pngUrl) return;
        const link = document.createElement("a");
        link.download = "nextgencto-referral-card.png";
        link.href = pngUrl;
        link.click();
    }, [pngUrl]);

    const handleShare = useCallback(async () => {
        if (!pngBlob) return;
        const file = new File([pngBlob], "nextgencto-referral-card.png", { type: "image/png" });
        if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
            await navigator.share({
                title: "NextGen CTO - Join the Placement Revolution",
                text: `Transform your campus placements with NextGen CTO — ${collegeCount} colleges already on board!`,
                url: SITE_URL,
                files: [file],
            });
            return;
        }
        await navigator.clipboard.writeText(`Transform your campus placements with NextGen CTO — ${collegeCount} colleges already on board! ${SITE_URL}`);
    }, [pngBlob, collegeCount]);

    const handleFinish = () => {
        setStep("done");
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className={`bg-white border-none p-0 overflow-hidden shadow-2xl ${step === "card" ? "sm:max-w-xl" : "sm:max-w-[500px]"}`}>
                {step === "form" && (
                    <div className="p-0">
                        <div className="bg-orange-600 p-10 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                            <div className="relative">
                                <h2 className="text-3xl font-black tracking-tight mb-2 flex items-center gap-3">
                                    <Megaphone className="w-8 h-8" />
                                    Join the Revolution
                                </h2>
                                <p className="text-white/80 font-medium">Get your personalized premium partnership card instantly.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="sc-name" className="text-xs font-black uppercase tracking-widest text-slate-400">Your Full Name</Label>
                                    <Input
                                        id="sc-name"
                                        required
                                        placeholder="Full name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sc-email" className="text-xs font-black uppercase tracking-widest text-slate-400">Email Address</Label>
                                    <Input
                                        id="sc-email"
                                        type="email"
                                        required
                                        placeholder="you@email.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="sc-college" className="text-xs font-black uppercase tracking-widest text-slate-400">College Name</Label>
                                    <Input
                                        id="sc-college"
                                        required
                                        placeholder="e.g. IIT Bombay"
                                        value={formData.college}
                                        onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                                        className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sc-location" className="text-xs font-black uppercase tracking-widest text-slate-400">City / State</Label>
                                    <Input
                                        id="sc-location"
                                        placeholder="Mumbai, MH"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                            <Button type="submit" size="lg" className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white font-black h-14 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-[0.98] transition-all" disabled={isLoading}>
                                {isLoading ? <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Crafting Card...</> : "Generate My Free Card"}
                            </Button>
                        </form>
                    </div>
                )}

                {step === "card" && pngUrl && (
                    <div className="p-8 flex flex-col items-center">
                        <DialogTitle className="text-2xl font-black mb-1 text-slate-900">Your Official Card</DialogTitle>
                        <p className="text-slate-500 text-sm mb-8 font-medium italic">Ready to transform your campus placements?</p>
                        
                        <div className="w-full max-w-lg space-y-8">
                            <div className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-200 shadow-2xl bg-white">
                                <NextImage 
                                    src={pngUrl} 
                                    alt="Your Referral Card" 
                                    width={1000} 
                                    height={600} 
                                    className="w-full h-auto"
                                    unoptimized
                                />
                            </div>
                            
                            <div className="flex gap-4">
                                <Button onClick={handleDownload} className="flex-1 rounded-2xl h-14 font-black bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-500/20">
                                    <Download className="mr-2 h-5 w-5" />
                                    Download Card
                                </Button>
                                <Button variant="outline" onClick={handleShare} className="flex-1 rounded-2xl h-14 font-black border-slate-200 text-slate-700 hover:bg-slate-50">
                                    <Share2 className="mr-2 h-5 w-5" />
                                    Share Instantly
                                </Button>
                            </div>
                            <Button variant="ghost" onClick={handleFinish} className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors pt-4">
                                I&apos;ve shared it with my college
                            </Button>
                        </div>
                    </div>
                )}

                {step === "done" && (
                    <div className="py-20 flex flex-col items-center text-center px-8">
                        <DialogTitle className="sr-only">Success</DialogTitle>
                        <div className="h-20 w-20 rounded-full bg-orange-100 flex items-center justify-center mb-6">
                            <Check className="h-10 w-10 text-orange-600" />
                        </div>
                        <h3 className="text-3xl font-black mb-3 text-slate-900">Great Job, {formData.name.split(" ")[0]}!</h3>
                        <p className="text-slate-500 max-w-xs text-lg font-medium">
                            Your share card is ready. We&apos;ll be reaching out to your college soon.
                        </p>
                        <Button className="mt-10 bg-orange-600 hover:bg-orange-700 text-white px-12 rounded-2xl h-12 font-bold" onClick={() => setOpen(false)}>
                            Return to Home
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export function ShareCardDirect({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [pngUrl, setPngUrl] = useState<string | null>(null);
    const [pngBlob, setPngBlob] = useState<Blob | null>(null);
    const [collegeCount, setCollegeCount] = useState(FALLBACK_COLLEGE_COUNT);

    useEffect(() => {
        fetchCollegeLeadsCount().then(setCollegeCount);
    }, []);

    const handleOpenChange = (val: boolean) => {
        setOpen(val);
        if (val && !pngUrl) {
            createCardPng("", "", collegeCount).then(({ dataUrl, blob }) => {
                setPngUrl(dataUrl);
                setPngBlob(blob);
            });
        }
    };

    const handleDownload = useCallback(() => {
        if (!pngUrl) return;
        const link = document.createElement("a");
        link.download = "nextgencto-share-card.png";
        link.href = pngUrl;
        link.click();
    }, [pngUrl]);

    const handleShare = useCallback(async () => {
        if (!pngBlob) return;
        const file = new File([pngBlob], "nextgencto-share-card.png", { type: "image/png" });
        if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
            await navigator.share({
                title: "NextGen CTO - Join the Placement Revolution",
                text: `Transform your campus placements with NextGen CTO — ${collegeCount} colleges already on board!`,
                url: SITE_URL,
                files: [file],
            });
            return;
        }
        await navigator.clipboard.writeText(`Transform your campus placements with NextGen CTO — ${collegeCount} colleges already on board! ${SITE_URL}`);
    }, [pngBlob, collegeCount]);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-white border-none shadow-2xl">
                <div className="p-8">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-900 text-2xl font-black">
                            <Share2 className="h-6 w-6 text-orange-600" />
                            Share Card
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            Download or share this official partnership card.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-8 mt-8">
                        <div className="rounded-2xl border border-slate-100 bg-white p-1 shadow-xl">
                            {pngUrl ? (
                                <NextImage
                                    src={pngUrl}
                                    alt="NextGen CTO share card"
                                    width={1000}
                                    height={600}
                                    className="w-full h-auto rounded-xl"
                                    unoptimized
                                />
                            ) : (
                                <div className="aspect-[5/3] w-full animate-pulse bg-slate-50 rounded-xl" />
                            )}
                        </div>
                        <div className="flex gap-4">
                            <Button onClick={handleDownload} className="flex-1 rounded-2xl h-14 font-black bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-500/20" disabled={!pngUrl}>
                                <Download className="mr-2 h-5 w-5" />
                                Download Card
                            </Button>
                            <Button variant="outline" onClick={handleShare} className="flex-1 rounded-2xl h-14 font-black border-slate-200 text-slate-700 hover:bg-slate-50" disabled={!pngBlob}>
                                <Share2 className="mr-2 h-5 w-5" />
                                Share Now
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
