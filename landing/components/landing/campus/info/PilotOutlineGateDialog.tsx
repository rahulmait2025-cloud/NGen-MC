"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2, Download } from "lucide-react";

interface PilotOutlineGateDialogProps {
    children?: React.ReactNode;
}

export function PilotOutlineGateDialog({ children }: PilotOutlineGateDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        college: "",
        email: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Mock API call delay
            await new Promise((resolve) => setTimeout(resolve, 800));

            setIsSuccess(true);
            // Trigger the PDF download immediately on success
            // In a real app this might be a pre-signed S3 url or a file in `/public`
            const link = document.createElement("a");
            // Using a placeholder or the actual pdf name
            link.href = "/pilot-program-outline.pdf";
            link.download = "NextGen_CTO_Pilot_Outline.pdf";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Reset form after a few seconds and close
            setTimeout(() => {
                setOpen(false);
                setTimeout(() => {
                    setIsSuccess(false);
                    setFormData({ name: "", college: "", email: "" });
                }, 500);
            }, 2000);
        } catch (error) {
            console.error("Error submitting lead:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button size="lg" className="w-full sm:w-auto font-bold bg-[#ff7400] text-white hover:bg-[#ff7400]/90">
                        Download Pilot Outline <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl p-6 rounded-2xl">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                        {isSuccess ? "Downloading..." : "Get the Pilot Outline"}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground mt-2">
                        {isSuccess
                            ? "Your download will begin immediately. Check your downloads folder."
                            : "Enter your details to instantly download the complete NextGen CTO campus pilot syllabus and implementation roadmap."}
                    </DialogDescription>
                </DialogHeader>

                {!isSuccess ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-foreground">Full Name</Label>
                            <Input
                                id="name"
                                name="name"
                                required
                                placeholder="Dr. Jane Doe"
                                value={formData.name}
                                onChange={handleChange}
                                className="bg-foreground/[0.02] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-foreground"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="college" className="text-foreground">College / University</Label>
                            <Input
                                id="college"
                                name="college"
                                required
                                placeholder="Engineering Institute of Technology"
                                value={formData.college}
                                onChange={handleChange}
                                className="bg-foreground/[0.02] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-foreground"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-foreground">Work Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                placeholder="jane.doe@college.edu"
                                value={formData.email}
                                onChange={handleChange}
                                className="bg-foreground/[0.02] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-foreground"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full font-bold mt-4 bg-[#ff7400] text-white hover:bg-[#ff7400]/90 transition-colors"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Preparing PDF...
                                </>
                            ) : (
                                <>
                                    Download Outline <Download className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </form>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-[#ff7400]/10 rounded-full flex items-center justify-center mb-2">
                            <Download className="w-8 h-8 text-[#ff7400]" />
                        </div>
                        <p className="text-foreground font-medium">Outline is downloading!</p>
                        <p className="text-sm text-muted-foreground">You can close this window.</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
