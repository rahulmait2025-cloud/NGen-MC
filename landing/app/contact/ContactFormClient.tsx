'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { trackFormOpen, trackFormSubmit, trackFormSuccess, trackFormFailure } from '@/lib/analytics/track';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';

const INDIAN_STATES_AND_UTS = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

const COLLEGE_TYPES = [
  { value: 'bca', label: 'BCA College' },
  { value: 'btech', label: 'B.Tech / Engineering' },
  { value: 'engineering', label: 'Polytechnic / Diploma' },
  { value: 'university', label: 'University / Autonomous' },
  { value: 'other', label: 'Other' },
];

const INTEREST_TYPES = [
  { value: 'demo', label: 'Schedule a Demo' },
  { value: 'partnership', label: 'Full Partnership' },
  { value: 'pilot_program', label: 'Pilot Program (1 Batch)' },
  { value: 'placement_bootcamp', label: 'Placement Bootcamp' },
  { value: 'custom_lms', label: 'Custom LMS Solution' },
];

const STUDENT_COUNTS = [
  { value: '50-100', label: '50 - 100 Students' },
  { value: '100-300', label: '100 - 300 Students' },
  { value: '300-500', label: '300 - 500 Students' },
  { value: '500-1000', label: '500 - 1,000 Students' },
  { value: '1000+', label: '1,000+ Students' },
];

const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 +91', country: 'India' },
  { code: '+1', label: '🇺🇸 +1', country: 'US' },
  { code: '+44', label: '🇬🇧 +44', country: 'UK' },
  { code: '+971', label: '🇦🇪 +971', country: 'UAE' },
  { code: '+65', label: '🇸🇬 +65', country: 'SG' },
];

function generateCaptcha() {
  return { a: Math.floor(Math.random() * 9) + 1, b: Math.floor(Math.random() * 9) + 1 };
}

export type ContactUtmParams = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
};

const EMPTY_UTM: ContactUtmParams = {
  utm_source: '',
  utm_medium: '',
  utm_campaign: '',
  utm_term: '',
  utm_content: '',
};

type ContactFormClientProps = {
  initialUtm?: ContactUtmParams;
};

export default function ContactFormClient({ initialUtm = EMPTY_UTM }: ContactFormClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [captcha, setCaptcha] = useState({ a: 0, b: 0 });
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState(false);

  useEffect(() => {
    setCaptcha(generateCaptcha());
  }, []);

  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [studentCountLabel, setStudentCountLabel] = useState('38,500+');

  const [utmParams] = useState(initialUtm);

  useEffect(() => {
    trackFormOpen('contact_form', '/contact');
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchStudentCount() {
      try {
        const res = await fetch('/api/youtube-stats');
        if (!res.ok) return;
        const data = await res.json();
        const subscribers = Number(data?.subscribers);
        if (!cancelled && Number.isFinite(subscribers) && subscribers > 0) {
          setStudentCountLabel(`${subscribers.toLocaleString('en-IN')}+`);
        }
      } catch {
        // keep fallback
      }
    }

    fetchStudentCount();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (parseInt(captchaInput) !== captcha.a + captcha.b) {
      setCaptchaError(true);
      setCaptcha(generateCaptcha());
      setCaptchaInput('');
      return;
    }

    setCaptchaError(false);
    setIsLoading(true);
    trackFormSubmit('contact_form', '/contact');

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      full_name: formData.get('full_name'),
      work_email: formData.get('work_email'),
      phone_number: `${countryCode}${phone}`,
      college_name: formData.get('college_name'),
      designation: formData.get('designation'),
      city: formData.get('city'),
      state: formData.get('state'),
      college_type: formData.get('college_type'),
      student_count: formData.get('student_count'),
      website_url: formData.get('website_url'),
      interest_type: formData.get('interest_type'),
      message: formData.get('message'),
      consent_given: consent,
      source_page: '/contact',
      website: formData.get('website'),
      ...utmParams,
    };

    try {
      const res = await fetch('/api/college-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        const errMsg = data.error || 'Something went wrong. Please try again.';
        setError(errMsg);
        trackFormFailure('contact_form', '/contact', errMsg);
        setIsLoading(false);
        return;
      }

      trackFormSuccess('contact_form', '/contact');
      setSubmitted(true);
    } catch {
      setError('Network error. Please check your connection and try again.');
      trackFormFailure('contact_form', '/contact', 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Request Received!</h1>
          <p className="text-muted-foreground text-lg">
            Thank you for your interest in partnering with NextGen CTO.
            Our team will reach out within <strong>24-48 hours</strong> to schedule a personalized demo.
          </p>
          <div className="pt-4">
            <Button asChild size="lg" className="rounded-xl">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div className="grid lg:grid-cols-5 gap-12 items-start">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-4 uppercase tracking-widest">
                <Sparkles className="h-3 w-3" /> Campus Partnership
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-4">
                Bring Industry-Ready Learning to Your Campus
              </h1>
              <p className="text-muted-foreground text-lg">
                {
                  'Partner with NextGen CTO to transform your placement outcomes. Our Silicon Valley-grade campus residency combines shipped product work, mentor-led reviews, and interview-caliber depth so students earn outcomes they can explain under pressure, not slide-deck answers.'
                }
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{studentCountLabel} Students Trained</h3>
                  <p className="text-sm text-muted-foreground">
                    Our curriculum is battle-tested across BCA, B.Tech, and CS departments.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Institution Partnerships</h3>
                  <p className="text-sm text-muted-foreground">
                    Currently partnering with 1+ colleges and in talks with several others. From tier-1 to emerging institutions — we scale with your needs.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Interview-ready depth</h3>
                  <p className="text-sm text-muted-foreground">
                    Problem-solving, systems thinking, and clear communication—practiced until students sound credible in technical interviews.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">Request a Demo</h2>
                <p className="text-sm text-muted-foreground">
                  Fill in your details and we&apos;ll get back to you within 24-48 hours.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <Input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      Full Name *
                    </Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      required
                      placeholder="Dr. Rajesh Kumar"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="designation">Role / Designation</Label>
                    <Input
                      id="designation"
                      name="designation"
                      placeholder="HOD / TPO / Principal"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="work_email" className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      Work Email *
                    </Label>
                    <Input
                      id="work_email"
                      name="work_email"
                      type="email"
                      required
                      placeholder="rajesh@college.edu"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      Phone Number *
                    </Label>
                    <div className="flex gap-1.5">
                      <Select value={countryCode} onValueChange={setCountryCode}>
                        <SelectTrigger className="w-[100px] h-11 shrink-0">
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
                        maxLength={10}
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => {
                          let val = e.target.value.replace(/[^\d]/g, '');
                          if (val.length > 10 && val.startsWith(countryCode.replace('+', ''))) {
                            val = val.slice(countryCode.replace('+', '').length);
                          }
                          setPhone(val.slice(0, 10));
                        }}
                        className="h-11 flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="college_name" className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    College / Institution Name *
                  </Label>
                  <Input
                    id="college_name"
                    name="college_name"
                    required
                    placeholder="ABC Institute of Technology"
                    className="h-11"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      City
                    </Label>
                    <Input id="city" name="city" placeholder="Mumbai" className="h-11" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Select name="state">
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72 overscroll-contain">
                        {INDIAN_STATES_AND_UTS.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="college_type">College Type</Label>
                    <Select name="college_type">
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {COLLEGE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="student_count">Expected Batch Size</Label>
                    <Select name="student_count">
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select batch size" />
                      </SelectTrigger>
                      <SelectContent>
                        {STUDENT_COUNTS.map((count) => (
                          <SelectItem key={count.value} value={count.value}>
                            {count.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="interest_type">Interested In</Label>
                    <Select name="interest_type">
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select interest" />
                      </SelectTrigger>
                      <SelectContent>
                        {INTEREST_TYPES.map((interest) => (
                          <SelectItem key={interest.value} value={interest.value}>
                            {interest.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website_url">College Website (Optional)</Label>
                    <Input
                      id="website_url"
                      name="website_url"
                      type="url"
                      placeholder="https://college.edu"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message / Requirements (Optional)</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Tell us about your placement challenges, batch schedule, or any specific requirements..."
                    className="min-h-[100px] resize-none"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="flex items-center gap-1.5 text-sm">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Security Check: What is {captcha.a} + {captcha.b}?
                  </Label>
                  <Input
                    type="number"
                    required
                    placeholder="Your answer"
                    value={captchaInput}
                    onChange={(e) => {
                      setCaptchaInput(e.target.value);
                      setCaptchaError(false);
                    }}
                    className={`h-11 ${captchaError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {captchaError && (
                    <p className="text-sm text-red-500">Incorrect answer. Please try again!</p>
                  )}
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <Checkbox
                    id="consent"
                    checked={consent}
                    onCheckedChange={(checked) => setConsent(checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="consent" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                    I agree to be contacted by NextGen CTO regarding this enquiry. I understand my information will be handled according to the{' '}
                    <a href="https://nextgen-cto.in/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Privacy Policy
                    </a>.
                  </Label>
                </div>

                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 text-base font-semibold rounded-xl"
                  disabled={isLoading || !consent || !captchaInput}
                >
                  {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {isLoading ? 'Submitting...' : 'Request a Demo'}
                </Button>

                <p className="text-xs text-center text-muted-foreground pt-2">
                  No spam. No sales calls without your permission. Just genuine partnership discussions.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
