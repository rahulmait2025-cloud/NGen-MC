"use client";

import React from "react";
import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";

interface ActionDrawerProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
}

export function ActionDrawer({ open, onClose, title = "Action Center", description = "Apply tenant-level actions and announcements." }: ActionDrawerProps) {
    const [scope, setScope] = React.useState("All colleges");
    const [placements, setPlacements] = React.useState("Enabled");
    const [assessments, setAssessments] = React.useState("Enabled");
    const [reminder, setReminder] = React.useState("Send Email");
    const handlePublish = () => {
        onClose();
        toast.success("Published (UI-only)", { description: "Module actions queued for backend integration." });
    };

    return (
        <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                    <SheetDescription>{description}</SheetDescription>
                </SheetHeader>

                <Separator className="my-3" />

                <div className="space-y-3">
                    <div>
                        <label htmlFor="ad-scope" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Scope</label>
                        <Select value={scope} onValueChange={setScope}>
                          <SelectTrigger id="ad-scope" className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="All colleges">All colleges</SelectItem>
                            <SelectItem value="ABC College">ABC College</SelectItem>
                            <SelectItem value="XYZ Institute">XYZ Institute</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                            <label htmlFor="ad-placements" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Module: Placements</label>
                            <Select value={placements} onValueChange={setPlacements}>
                              <SelectTrigger id="ad-placements" className="w-full"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Enabled">Enabled</SelectItem>
                                <SelectItem value="Disabled">Disabled</SelectItem>
                              </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label htmlFor="ad-assessments" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Module: Assessments</label>
                            <Select value={assessments} onValueChange={setAssessments}>
                              <SelectTrigger id="ad-assessments" className="w-full"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Enabled">Enabled</SelectItem>
                                <SelectItem value="Disabled">Disabled</SelectItem>
                              </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label htmlFor="ad-seat-limit" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Seat Limit</label>
                            <Input id="ad-seat-limit" placeholder="e.g. 200" />
                        </div>
                        <div>
                            <label htmlFor="ad-reminder" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Renewal Reminder</label>
                            <Select value={reminder} onValueChange={setReminder}>
                              <SelectTrigger id="ad-reminder" className="w-full"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Send Email">Send Email</SelectItem>
                                <SelectItem value="Send WhatsApp">Send WhatsApp</SelectItem>
                                <SelectItem value="In-app Notice">In-app Notice</SelectItem>
                              </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Separator />

                    <Link
                        href="/announcements"
                        onClick={onClose}
                        className="flex items-center gap-3 rounded-lg border border-border/60 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                    >
                        <div className="rounded-lg bg-orange-500/10 p-2">
                            <Megaphone className="size-4 text-orange-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">Manage Announcements</p>
                            <p className="text-xs text-muted-foreground">Create and manage global student banners</p>
                        </div>
                    </Link>
                </div>

                <SheetFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    <Button onClick={handlePublish}>Apply Module Changes</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
