'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { submitCampusAmbassadorApplicationAction } from '@/app/campus-ambassador/actions';
import type { CampusAmbassadorPageState } from '@/lib/services/campus-ambassador';

const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

const STATES_AND_UTS = [
  // 28 States
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // 8 Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi (National Capital Territory of Delhi)',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

interface CampusAmbassadorApplicationFormProps {
  isAuthenticated: boolean;
  defaultFullName?: string;
  defaultEmail?: string;
  onSuccess: (state: CampusAmbassadorPageState) => void;
  onCancel?: () => void;
}

export function CampusAmbassadorApplicationForm({
  isAuthenticated,
  defaultFullName = '',
  defaultEmail = '',
  onSuccess,
  onCancel,
}: CampusAmbassadorApplicationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [consent, setConsent] = useState(false);
  const [tshirtSize, setTshirtSize] = useState<string>('M');
  const [yearOfStudy, setYearOfStudy] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error('Please sign in to apply.');
      router.push('/login');
      return;
    }

    const form = new FormData(e.currentTarget);

    const phoneVal = String(form.get('phone') ?? '');
    const whatsappVal = String(form.get('whatsappNumber') ?? '');

    if (phoneVal.length !== 10 || !/^\d+$/.test(phoneVal)) {
      toast.error('Phone number must be exactly 10 digits.');
      return;
    }

    if (whatsappVal.length !== 10 || !/^\d+$/.test(whatsappVal)) {
      toast.error('WhatsApp number must be exactly 10 digits.');
      return;
    }

    if (!yearOfStudy) {
      toast.error('Please select your year of study.');
      return;
    }

    if (!selectedState) {
      toast.error('Please select your state.');
      return;
    }

    startTransition(async () => {
      const result = await submitCampusAmbassadorApplicationAction({
        fullName: String(form.get('fullName') ?? ''),
        email: String(form.get('email') ?? ''),
        phone: phoneVal,
        whatsappNumber: whatsappVal,
        collegeName: String(form.get('collegeName') ?? ''),
        degree: String(form.get('degree') ?? ''),
        branch: String(form.get('branch') ?? ''),
        yearOfStudy,
        city: String(form.get('city') ?? ''),
        state: selectedState,
        linkedinUrl: String(form.get('linkedinUrl') ?? ''),
        instagramUrl: String(form.get('instagramUrl') ?? ''),
        githubUrl: String(form.get('githubUrl') ?? '') || undefined,
        currentCommunities: String(form.get('currentCommunities') ?? ''),
        campusReach: String(form.get('campusReach') ?? ''),
        expectedReferrals: form.get('expectedReferrals')
          ? Number(form.get('expectedReferrals'))
          : null,
        whyJoin: String(form.get('whyJoin') ?? ''),
        howWillPromote: String(form.get('howWillPromote') ?? ''),
        tshirtSize,
        consentGiven: consent,
      });

      if (!result.ok || !result.data) {
        toast.error(result.error ?? 'Failed to submit application.');
        return;
      }

      toast.success(
        result.message ??
          'Your Campus Ambassador application has been submitted for review.',
      );
      onSuccess(result.data);
      router.refresh();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="fullName" className="text-sm font-medium">Full name *</Label>
          <Input id="fullName" name="fullName" defaultValue={defaultFullName} required className="h-11" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
          <Input id="email" name="email" type="email" defaultValue={defaultEmail} required className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-sm font-medium">Phone *</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="10-digit number"
            required
            pattern="[0-9]{10}"
            maxLength={10}
            minLength={10}
            onChange={(e) => {
              e.target.value = e.target.value.replace(/[^0-9]/g, '');
            }}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="whatsappNumber" className="text-sm font-medium">WhatsApp *</Label>
          <Input
            id="whatsappNumber"
            name="whatsappNumber"
            type="tel"
            placeholder="10-digit number"
            required
            pattern="[0-9]{10}"
            maxLength={10}
            minLength={10}
            onChange={(e) => {
              e.target.value = e.target.value.replace(/[^0-9]/g, '');
            }}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="collegeName" className="text-sm font-medium">College name *</Label>
          <Input id="collegeName" name="collegeName" required className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="degree" className="text-sm font-medium">Degree / course *</Label>
          <Input id="degree" name="degree" required className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="branch" className="text-sm font-medium">Branch *</Label>
          <Input id="branch" name="branch" required className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Year of study *</Label>
          <Select value={yearOfStudy} onValueChange={setYearOfStudy}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {['1', '2', '3', '4'].map((yr) => (
                <SelectItem key={yr} value={yr}>
                  {yr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city" className="text-sm font-medium">City *</Label>
          <Input id="city" name="city" required className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">State *</Label>
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              className="max-h-[280px]"
              onWheel={(event) => event.stopPropagation()}
            >
              {STATES_AND_UTS.map((st) => (
                <SelectItem key={st} value={st}>
                  {st}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="linkedinUrl" className="text-sm font-medium">LinkedIn URL *</Label>
          <Input id="linkedinUrl" name="linkedinUrl" type="url" placeholder="https://..." required className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="instagramUrl" className="text-sm font-medium">Instagram URL *</Label>
          <Input id="instagramUrl" name="instagramUrl" type="url" placeholder="https://..." required className="h-11" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="githubUrl" className="text-sm font-medium">GitHub URL</Label>
          <Input id="githubUrl" name="githubUrl" type="url" placeholder="https://... (optional)" className="h-11" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="currentCommunities" className="text-sm font-medium">Current communities / clubs *</Label>
          <Textarea id="currentCommunities" name="currentCommunities" rows={2} required className="resize-none" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="campusReach" className="text-sm font-medium">Campus reach *</Label>
          <Textarea id="campusReach" name="campusReach" rows={2} placeholder="Clubs, groups, followers..." required className="resize-none" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expectedReferrals" className="text-sm font-medium">Expected referrals *</Label>
          <Input id="expectedReferrals" name="expectedReferrals" type="number" min={0} required className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">T-shirt size *</Label>
          <Select value={tshirtSize} onValueChange={setTshirtSize}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TSHIRT_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="whyJoin" className="text-sm font-medium">Why do you want to join? *</Label>
          <Textarea id="whyJoin" name="whyJoin" rows={3} required className="resize-none" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="howWillPromote" className="text-sm font-medium">How will you promote NextGen CTO? *</Label>
          <Textarea id="howWillPromote" name="howWillPromote" rows={3} required className="resize-none" />
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-[var(--campus-border)] bg-[var(--landing-surface)] p-3.5">
        <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
        <Label htmlFor="consent" className="text-sm leading-relaxed text-muted-foreground font-normal">
          I agree to represent NextGen CTO responsibly on campus and follow the ambassador program guidelines. *
        </Label>
      </div>

      <div className="flex flex-wrap gap-3 pt-1">
        <Button
          type="submit"
          disabled={isPending}
          className="h-11 px-8 text-sm font-semibold"
        >
          {isPending ? 'Submitting...' : 'Submit application'}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} className="h-11 px-8 text-sm font-semibold">
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
