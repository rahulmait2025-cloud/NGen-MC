'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  createTeamMemberAction,
  updateTeamMemberAction,
} from '@/app/(app)/team/actions';
import type { TeamMemberRow } from '@/lib/superadmin/team-members/types';
import { TeamImageUpload } from './team-image-upload';
import { TeamPreviewCard } from './team-preview-card';

interface TeamMemberFormProps {
  mode: 'create' | 'edit';
  initialData?: TeamMemberRow;
}

export function TeamMemberForm({ mode, initialData }: TeamMemberFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialData?.name ?? '');
  const [role, setRole] = useState(initialData?.role ?? '');
  const [shortRole, setShortRole] = useState(initialData?.short_role ?? '');
  const [location, setLocation] = useState(initialData?.location ?? '');
  const [shortBio, setShortBio] = useState(initialData?.short_bio ?? '');
  const [fullBio, setFullBio] = useState(initialData?.full_bio ?? '');
  const [photoAltText, setPhotoAltText] = useState(
    initialData?.photo_alt_text ?? (initialData?.name ? `Portrait of ${initialData.name}` : ''),
  );
  const [email, setEmail] = useState(initialData?.email ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(initialData?.linkedin_url ?? '');
  const [twitterUrl, setTwitterUrl] = useState(initialData?.twitter_url ?? '');
  const [githubUrl, setGithubUrl] = useState(initialData?.github_url ?? '');
  const [instagramUrl, setInstagramUrl] = useState(initialData?.instagram_url ?? '');
  const [youtubeUrl, setYoutubeUrl] = useState(initialData?.youtube_url ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(initialData?.personal_website_url ?? '');
  const [isFounder, setIsFounder] = useState(initialData?.is_founder ?? false);
  const [isFeatured, setIsFeatured] = useState(initialData?.is_featured ?? false);
  const [isPublished, setIsPublished] = useState(initialData?.is_published ?? false);
  const [displayOrder, setDisplayOrder] = useState(
    String(initialData?.display_order ?? 0),
  );

  const previewMember = useMemo(
    () => ({
      name: name || 'Team member',
      role: role || 'Role',
      short_bio: shortBio || null,
      full_bio: fullBio || null,
      photo_path: initialData?.photo_path ?? null,
      photo_alt_text: photoAltText || null,
      location: location || null,
      is_founder: isFounder,
      is_featured: isFeatured,
      email: email || null,
      linkedin_url: linkedinUrl || null,
      twitter_url: twitterUrl || null,
      github_url: githubUrl || null,
      instagram_url: instagramUrl || null,
      youtube_url: youtubeUrl || null,
      personal_website_url: websiteUrl || null,
    }),
    [
      name,
      role,
      shortBio,
      fullBio,
      initialData?.photo_path,
      photoAltText,
      location,
      isFounder,
      isFeatured,
      email,
      linkedinUrl,
      twitterUrl,
      githubUrl,
      instagramUrl,
      youtubeUrl,
      websiteUrl,
    ],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createTeamMemberAction(formData)
          : await updateTeamMemberAction(initialData!.id, formData);

      if (result.success) {
        toast.success(mode === 'create' ? 'Team member created.' : 'Team member updated.');
        if (mode === 'create' && result.data?.id) {
          router.push(`/team/${result.data.id}/edit`);
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.error ?? 'Failed to save team member.');
      }
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!photoAltText || photoAltText.startsWith('Portrait of ')) {
                      setPhotoAltText(e.target.value ? `Portrait of ${e.target.value}` : '');
                    }
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Input
                  id="role"
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="short_role">Short role</Label>
                <Input
                  id="short_role"
                  name="short_role"
                  value={shortRole}
                  onChange={(e) => setShortRole(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile image</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamImageUpload
              memberId={initialData?.id}
              memberName={name}
              photoPath={initialData?.photo_path ?? null}
              altText={photoAltText}
              onAltTextChange={setPhotoAltText}
              disabled={isPending}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Biography</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="short_bio">Short bio</Label>
              <Textarea
                id="short_bio"
                name="short_bio"
                value={shortBio}
                onChange={(e) => setShortBio(e.target.value)}
                rows={3}
                maxLength={240}
              />
              <p className="text-xs text-muted-foreground">
                Used on the team card. Keep it concise. {shortBio.length}/240
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_bio">Full bio</Label>
              <Textarea
                id="full_bio"
                name="full_bio"
                value={fullBio}
                onChange={(e) => setFullBio(e.target.value)}
                rows={8}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">
                Used in expanded founder details. {fullBio.length}/2000
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Social links</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Public email</Label>
              <Input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn</Label>
              <Input id="linkedin_url" name="linkedin_url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitter_url">X / Twitter</Label>
              <Input id="twitter_url" name="twitter_url" value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="github_url">GitHub</Label>
              <Input id="github_url" name="github_url" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram_url">Instagram</Label>
              <Input id="instagram_url" name="instagram_url" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="youtube_url">YouTube</Label>
              <Input id="youtube_url" name="youtube_url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="personal_website_url">Personal website</Label>
              <Input
                id="personal_website_url"
                name="personal_website_url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visibility and order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Unpublished members are saved as drafts and will not appear on the public team page.
            </p>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="is_published">Published</Label>
                <p className="text-xs text-muted-foreground">Visible on public team pages</p>
              </div>
              <Switch id="is_published" checked={isPublished} onCheckedChange={setIsPublished} />
              <input type="hidden" name="is_published" value={isPublished ? 'true' : 'false'} />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="is_featured">Featured</Label>
                <p className="text-xs text-muted-foreground">Adds visual prominence on the public page</p>
              </div>
              <Switch id="is_featured" checked={isFeatured} onCheckedChange={setIsFeatured} />
              <input type="hidden" name="is_featured" value={isFeatured ? 'true' : 'false'} />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="is_founder">Founder</Label>
                <p className="text-xs text-muted-foreground">Shown in the founder feature section</p>
              </div>
              <Switch id="is_founder" checked={isFounder} onCheckedChange={setIsFounder} />
              <input type="hidden" name="is_founder" value={isFounder ? 'true' : 'false'} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_order">Display order</Label>
              <Input
                id="display_order"
                name="display_order"
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : mode === 'create' ? 'Create team member' : 'Save changes'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/team')} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </form>

      <div className="xl:sticky xl:top-6 h-fit">
        <TeamPreviewCard member={previewMember} />
      </div>
    </div>
  );
}
