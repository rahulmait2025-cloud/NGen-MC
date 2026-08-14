"use client";

import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { trackFormOpen, trackFormSubmit, trackFormSuccess, trackCtaClick } from "@/lib/analytics/track";

const COUNTRY_CODES = [
    { code: "+91", label: "🇮🇳 +91", country: "India" },
    { code: "+1", label: "🇺🇸 +1", country: "US" },
    { code: "+44", label: "🇬🇧 +44", country: "UK" },
    { code: "+971", label: "🇦🇪 +971", country: "UAE" },
    { code: "+65", label: "🇸🇬 +65", country: "SG" },
    { code: "+61", label: "🇦🇺 +61", country: "AU" },
    { code: "+49", label: "🇩🇪 +49", country: "DE" },
    { code: "+81", label: "🇯🇵 +81", country: "JP" },
    { code: "+86", label: "🇨🇳 +86", country: "CN" },
    { code: "+880", label: "🇧🇩 +880", country: "BD" },
    { code: "+977", label: "🇳🇵 +977", country: "NP" },
];

function generateCaptcha() {
    return { a: Math.floor(Math.random() * 9) + 1, b: Math.floor(Math.random() * 9) + 1 };
}

export function DemoDialog({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [captcha, setCaptcha] = useState({ a: 0, b: 0 });
    const [captchaInput, setCaptchaInput] = useState("");
    const [captchaError, setCaptchaError] = useState(false);

    useEffect(() => {
        setCaptcha(generateCaptcha());
    }, []);
    const [countryCode, setCountryCode] = useState("+91");
    const [phone, setPhone] = useState("");

    const resetCaptcha = useCallback(() => {
        setCaptcha(generateCaptcha());
        setCaptchaInput("");
        setCaptchaError(false);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate CAPTCHA
        if (parseInt(captchaInput) !== captcha.a + captcha.b) {
            setCaptchaError(true);
            setCaptcha(generateCaptcha());
            setCaptchaInput("");
            return;
        }

        setCaptchaError(false);
        setIsLoading(true);
        trackFormSubmit('demo_dialog', 'sticky_cta');

        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsLoading(false);
        setSubmitted(true);
        trackFormSuccess('demo_dialog', 'sticky_cta');
    };

    const handleOpenChange = (val: boolean) => {
        setOpen(val);
        if (!val) {
            setTimeout(() => {
                setSubmitted(false);
                resetCaptcha();
            }, 300);
        } else {
            resetCaptcha();
            trackCtaClick({ cta_name: 'book_demo', cta_location: 'sticky_cta' });
            trackFormOpen('demo_dialog', 'sticky_cta');
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-card border-border">
                {submitted ? (
                    <div className="py-12 flex flex-col items-center text-center">
                        <DialogTitle className="sr-only">Request Received</DialogTitle>
                        <CheckCircle2 className="h-16 w-16 text-primary mb-4 animate-in zoom-in duration-300" />
                        <h3 className="text-2xl font-bold mb-2">Request Received!</h3>
                        <p className="text-muted-foreground">
                            Thanks! We&apos;ll reach out within 24 hours to schedule your demo.
                        </p>
                        <Button
                            variant="outline"
                            className="mt-8 border-border"
                            onClick={() => setOpen(false)}
                        >
                            Close
                        </Button>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Book a 20-min Demo</DialogTitle>
                            <DialogDescription>
                                See how we can transform your campus placements.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="college">College Name</Label>
                                <Input id="college" required placeholder="e.g. IIT Bombay" className="bg-muted/50 border-border" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Your Name</Label>
                                    <Input id="name" required placeholder="John Doe" className="bg-muted/50 border-border" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Select required>
                                        <SelectTrigger className="bg-muted/50 border-border">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="tpo">TPO / Placement Head</SelectItem>
                                            <SelectItem value="principal">Principal / Director</SelectItem>
                                            <SelectItem value="faculty">Faculty / HOD</SelectItem>
                                            <SelectItem value="student">Student Rep</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Work Email</Label>
                                    <Input id="email" type="email" required placeholder="john@college.edu" className="bg-muted/50 border-border" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <div className="flex gap-1.5">
                                        <Select value={countryCode} onValueChange={setCountryCode}>
                                            <SelectTrigger className="w-[90px] bg-muted/50 border-border shrink-0 text-xs px-2">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {COUNTRY_CODES.map((cc) => (
                                                    <SelectItem key={cc.code} value={cc.code}>
                                                        {cc.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            required
                                            placeholder="9876543210"
                                            value={phone}
                                            onChange={(e) => {
                                                // Strip any pasted country code / + prefix
                                                let val = e.target.value.replace(/[^\d]/g, "");
                                                // If pasted with country code (e.g. 919876...), strip it
                                                if (val.length > 10 && val.startsWith(countryCode.replace("+", ""))) {
                                                    val = val.slice(countryCode.replace("+", "").length);
                                                }
                                                setPhone(val.slice(0, 15));
                                            }}
                                            className="bg-muted/50 border-border flex-1"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Expected Batch Size</Label>
                                <Select>
                                    <SelectTrigger className="bg-muted/50 border-border">
                                        <SelectValue placeholder="Select batch size" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="50-100">50 - 100 Students</SelectItem>
                                        <SelectItem value="100-300">100 - 300 Students</SelectItem>
                                        <SelectItem value="300+">300+ Students</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* CAPTCHA */}
                            <div className="grid gap-2 mt-2">
                                <Label className="flex items-center gap-1.5 text-sm">
                                    <ShieldCheck className="h-4 w-4 text-primary" />
                                    What is {captcha.a} + {captcha.b}?
                                </Label>
                                <Input
                                    type="number"
                                    required
                                    placeholder="Your answer"
                                    value={captchaInput}
                                    onChange={(e) => { setCaptchaInput(e.target.value); setCaptchaError(false); }}
                                    className={`bg-muted/50 border-border ${captchaError ? "border-red-500 focus-visible:ring-red-500" : ""
                                        }`}
                                />
                                {captchaError && (
                                    <p className="text-sm text-red-500">Incorrect answer. Try again!</p>
                                )}
                            </div>

                            <Button type="submit" className="w-full mt-4" disabled={isLoading || !captchaInput}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isLoading ? "Submitting..." : "Schedule Demo"}
                            </Button>
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
