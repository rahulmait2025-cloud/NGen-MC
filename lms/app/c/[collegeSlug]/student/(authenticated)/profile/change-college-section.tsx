"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { changeCollegeFromUnknown } from "@/lib/actions/change-college-from-unknown";
import { Building2, Loader2 } from "lucide-react";

export function ChangeCollegeSection() {
  const [collegeName, setCollegeName] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSubmit = () => {
    const v = collegeName.trim();
    if (!v) {
      toast.error("Enter your college name.");
      return;
    }
    startTransition(async () => {
      const result = await changeCollegeFromUnknown(v);
      if (result?.error) {
        toast.error(result.error);
      }
      /* redirect throws on success */
    });
  };

  return (
    <div
      id="change-college"
      className="rounded-xl border border-primary/10 bg-primary/[0.02] px-6 py-5 scroll-mt-24"
    >
      <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
        <Building2 className="size-4 text-primary" />
        Move to your institution&apos;s portal
      </h2>
      <p className="text-sm text-muted-foreground mt-1.5">
        You are on the legacy <span className="font-medium text-foreground">unknown</span>{' '}
        tenant. Enter your school&apos;s{' '}
        <span className="font-medium text-foreground">full official name</span> as registered
         with NextGen CTO: we&apos;ll try to match an existing partner and move your account to
        that college&apos;s login portal. New direct learner accounts use a different flow on
        the profile page.
      </p>
      <div className="mt-4 space-y-3">
        <div className="space-y-1.5 max-w-lg">
          <Label htmlFor="target-college-name" className="text-xs text-muted-foreground">College name</Label>
          <Input
            id="target-college-name"
            value={collegeName}
            onChange={(e) => setCollegeName(e.target.value)}
            placeholder="e.g. Indian Institute of Technology Delhi"
            className="w-full"
            disabled={pending}
            autoComplete="organization"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
          <p className="text-xs text-muted-foreground">
            If several colleges match, use the exact full name. If nothing
            matches, contact support.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={pending || !collegeName.trim()}
          className="gap-2"
        >
          {pending ? (
            <>
              <div className="animate-spin"><Loader2 className="size-4" /></div>
              Updating...
            </>
          ) : (
            'Match college and switch portal'
          )}
        </Button>
      </div>
    </div>
  );
}
