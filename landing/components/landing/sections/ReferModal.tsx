"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Loader2 } from "lucide-react";

export function ReferModal({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsLoading(false);
        setSubmitted(true);
    };

    const handleOpenChange = (val: boolean) => {
        setOpen(val);
        if (!val) {
            setTimeout(() => setSubmitted(false), 300);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[540px] bg-card border-border">
                {submitted ? (
                    <div className="py-12 flex flex-col items-center text-center">
                        <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 animate-in zoom-in duration-300">
                            <Check className="h-8 w-8 text-green-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-2">
                            Awesome 🎉 Once your college partners with us, you&apos;ll be rewarded!
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            Rewards are unlocked after successful college partnership confirmation.
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
                            <DialogTitle>Refer Your College</DialogTitle>
                            <DialogDescription>
                                Know a college that could benefit? Refer them and earn rewards.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="refer-name">Student Name</Label>
                                    <Input id="refer-name" required placeholder="Your full name" className="bg-muted/50 border-border" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="refer-email">Student Email</Label>
                                    <Input id="refer-email" type="email" required placeholder="you@email.com" className="bg-muted/50 border-border" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="refer-phone">Phone</Label>
                                    <Input id="refer-phone" type="tel" placeholder="+91 98765..." className="bg-muted/50 border-border" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="refer-college">College Name</Label>
                                    <Input id="refer-college" required placeholder="e.g. IIT Bombay" className="bg-muted/50 border-border" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="refer-location">College Location</Label>
                                    <Input id="refer-location" placeholder="City, State" className="bg-muted/50 border-border" />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Department / Stream</Label>
                                    <Select>
                                        <SelectTrigger className="bg-muted/50 border-border">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cs">Computer Science</SelectItem>
                                            <SelectItem value="it">Information Technology</SelectItem>
                                            <SelectItem value="ece">Electronics</SelectItem>
                                            <SelectItem value="mech">Mechanical</SelectItem>
                                            <SelectItem value="mba">Business/MBA</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Current Year</Label>
                                    <Select>
                                        <SelectTrigger className="bg-muted/50 border-border">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1st Year</SelectItem>
                                            <SelectItem value="2">2nd Year</SelectItem>
                                            <SelectItem value="3">3rd Year</SelectItem>
                                            <SelectItem value="4">4th Year</SelectItem>
                                            <SelectItem value="grad">Graduate</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="refer-placement">Placement Cell Contact</Label>
                                    <Input id="refer-placement" placeholder="Name or email" className="bg-muted/50 border-border" />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="refer-notes">Notes</Label>
                                <Textarea id="refer-notes" placeholder="Anything else we should know?" className="bg-muted/50 border-border resize-none" rows={3} />
                            </div>

                            <Button type="submit" className="w-full mt-4" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isLoading ? "Submitting..." : "Submit Referral"}
                            </Button>
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
