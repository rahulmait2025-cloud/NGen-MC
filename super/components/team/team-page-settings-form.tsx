'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { updateTeamPageSettingsAction } from '@/app/(app)/team/settings/actions';
import { getTeamMemberPhotoPublicUrl } from '@/lib/superadmin/team-members/photo-url';
import type { TeamPageSettingsRow } from '@/lib/superadmin/team-page-settings/types';
import { TeamHeroImageUpload } from './team-hero-image-upload';

const HERO_EYEBROW = 'THE HUMANS BEHIND NEXTGEN CTO';

interface TeamPageSettingsFormProps {
  settings: TeamPageSettingsRow | null;
}

export function TeamPageSettingsForm({ settings }: TeamPageSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [heroTitle, setHeroTitle] = useState(
    settings?.hero_title ?? 'Meet the humans behind the tabs.',
  );
  const [heroDescription, setHeroDescription] = useState(
    settings?.hero_description ??
      'We build careers, fix bugs, reply to students, and pretend that 47 open tabs is completely normal.',
  );
  const [heroAnnotation, setHeroAnnotation] = useState(
    settings?.hero_annotation ?? 'Someone is probably deploying right now.',
  );
  const [heroImageAltText, setHeroImageAltText] = useState(
    settings?.hero_image_alt_text ?? 'The NextGen CTO team',
  );
  const [heroImagePath, setHeroImagePath] = useState<string | null>(
    settings?.hero_image_path ?? null,
  );

  const heroImageUrl = getTeamMemberPhotoPublicUrl(heroImagePath);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (heroImagePath && heroImageAltText.trim().length === 0) {
      toast.error('Alt text is required when a hero photo is set.');
      return;
    }

    const formData = new FormData();
    formData.set('hero_title', heroTitle);
    formData.set('hero_description', heroDescription);
    formData.set('hero_annotation', heroAnnotation);
    formData.set('hero_image_alt_text', heroImageAltText);
    formData.set('has_hero_image', heroImagePath ? 'true' : 'false');

    startTransition(async () => {
      const result = await updateTeamPageSettingsAction(formData);
      if (result.success) {
        toast.success('Team page settings saved.');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Failed to save settings.');
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Hero content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hero_title">Hero title</Label>
              <Input
                id="hero_title"
                name="hero_title"
                value={heroTitle}
                maxLength={100}
                onChange={(e) => setHeroTitle(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                {heroTitle.length}/100 characters.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero_description">Description</Label>
              <Textarea
                id="hero_description"
                name="hero_description"
                value={heroDescription}
                maxLength={300}
                rows={3}
                onChange={(e) => setHeroDescription(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                {heroDescription.length}/300 characters.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero_annotation">Orange annotation</Label>
              <Input
                id="hero_annotation"
                name="hero_annotation"
                value={heroAnnotation}
                maxLength={120}
                onChange={(e) => setHeroAnnotation(e.target.value)}
                placeholder="Someone is probably deploying right now."
              />
              <p className="text-xs text-muted-foreground">
                Optional. {heroAnnotation.length}/120 characters.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hero group photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TeamHeroImageUpload
              heroImagePath={heroImagePath}
              onHeroImagePathChange={setHeroImagePath}
              altText={heroImageAltText}
              disabled={isPending}
            />
            <div className="space-y-2">
              <Label htmlFor="hero_image_alt_text">
                Alt text {heroImagePath ? '(required)' : '(optional)'}
              </Label>
              <Input
                id="hero_image_alt_text"
                name="hero_image_alt_text"
                value={heroImageAltText}
                maxLength={160}
                onChange={(e) => setHeroImageAltText(e.target.value)}
                placeholder="The NextGen CTO team"
              />
              <p className="text-xs text-muted-foreground">
                Describe the photo for screen readers. {heroImageAltText.length}/160
                characters.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save settings'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Text changes save on this button. Photo upload and removal apply
            immediately.
          </p>
        </div>
      </form>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Live hero preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-[#111111]">
              <div className="grid gap-6 bg-[#f7f6f2] p-6 md:grid-cols-2 md:items-center">
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#737373]">
                    {HERO_EYEBROW}
                  </p>
                  <h2 className="text-2xl font-bold leading-[1.02] tracking-[-0.03em] text-[#111111]">
                    {heroTitle || 'Meet the humans behind the tabs.'}
                  </h2>
                  <p className="text-sm text-[#555555]">
                    {heroDescription ||
                      'We build careers, fix bugs, reply to students, and pretend that 47 open tabs is completely normal.'}
                  </p>
                  {heroAnnotation ? (
                    <p className="text-xs font-medium text-[#ff5f36]">
                      {heroAnnotation}
                    </p>
                  ) : null}
                </div>

                <div className="relative aspect-[5/4] overflow-hidden border border-[#111111] bg-[#ebe9e3]">
                  {heroImageUrl ? (
                    <>
                      <Image
                        src={heroImageUrl}
                        alt={heroImageAltText || 'Team hero photo'}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 320px"
                      />
                      <span className="absolute left-2 top-2 bg-[#111111] px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-white">
                        Team status: online-ish
                      </span>
                      <span className="absolute bottom-2 right-2 bg-[#ff5f36] px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-white">
                        Chai status: critical
                      </span>
                    </>
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-1 text-center">
                      <span className="text-sm font-bold uppercase tracking-widest text-[#111111]">
                        NEXTGEN CTO
                      </span>
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-[#737373]">
                        Falls back to member collage
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
