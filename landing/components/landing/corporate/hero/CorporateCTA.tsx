"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CorporateApplyModal({ className = "" }: { className?: string }) {
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleApply = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitted(true);
        setTimeout(() => setIsSubmitted(false), 3000);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button size="lg" className={`w-full sm:w-auto text-base font-semibold h-14 px-8 rounded-lg bg-foreground text-background hover:bg-foreground/90 group ${className}`}>
                    Apply for Cohort
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Apply for Corporate Track</DialogTitle>
                    <DialogDescription>
                        Take the first step towards SDE-2 and Leadership roles.
                    </DialogDescription>
                </DialogHeader>
                {isSubmitted ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                            <Check className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold">Application Submitted ✅</h3>
                        <p className="text-muted-foreground text-sm">We&apos;ll reach out to you within 24 hours.</p>
                    </div>
                ) : (
                    <form onSubmit={handleApply} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" required placeholder="John Doe" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="experience">Years of Experience</Label>
                            <Input id="experience" required type="number" min="0" max="10" placeholder="e.g. 2" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="linkedin">LinkedIn Profile (Optional)</Label>
                            <Input id="linkedin" type="url" placeholder="https://linkedin.com/in/..." />
                        </div>
                        <Button type="submit" className="w-full mt-4 bg-foreground text-background hover:bg-foreground/90 h-11">
                            Submit Application
                        </Button>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
