'use client';

import React, { useState, useEffect, useMemo, useRef, useReducer, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  createCampaignDraftAction,
  updateCampaignDraftAction,
  getCollegeNamesForEmailPreviewAction,
  getEmailPreviewUnsubscribeUrlAction,
} from '@/app/(app)/email-center/actions';
import { createClient } from '@/lib/supabase/client';
import { deriveFirstNameFromAuthUser, deriveFirstNameFromRecipient } from '@/lib/email-center/recipient-name';
import {
  buildCareerEmailShellMerge,
  usesCareerEmailShellMerge,
  usesCareerLaunchBranchMerge,
} from '@/lib/email-center/career-launch-merge';
import type { EmailTemplate, EmailCampaign } from '@/lib/email-center/types';
import { Save, Send, FileCode, FileText, Eye as EyeIcon, Loader2, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  EMAIL_CENTER_LANE_OPTIONS,
  getCampaignEmailCategory,
  laneToLegacyCampaignType,
  templateCategoryToDefaultLane,
  type EmailCenterLane,
} from '@/lib/email-center/email-category';
import { EmailPreview } from './email-preview';
import { TestSendDialog } from './test-send-dialog';
import { EmailBodyEditor } from './email-body-editor';
import { CtaManager } from './cta-manager';
import { renderCampaignContent } from '@/lib/email-center/template-renderer';
import {
  DEFAULT_SAMPLE_VALUES,
  DEFAULT_SYSTEM_VARIABLES,
  buildTemplateSampleValues,
  getSystemValuesForEmailMerge,
  inferInputType,
  inferVariableSource,
  mergePreviewVariables,
  normalizeTemplateVariables,
} from '@/lib/email-center/template-variables';
import {
  CUSTOM_EMAIL_INSERTABLE_VARIABLES,
  compileCustomEmail,
  createEmptyComposerState,
  findUnsupportedVariables,
  htmlToPlainText,
  looksLikeFullEmailDocument,
  parseComposerState,
  resolveContentMode,
  validateComposerState,
  type CampaignContentMode,
  type CustomEmailComposerState,
} from '@/lib/email-center/custom-composer';
import {
  mapCampaignDraftError,
  resolveSaveAndContinueHref,
} from '@/lib/email-center/campaign-draft-save';
import { buildEmailHeaderDisplay } from '@/lib/email-center/email-header-branding';
import {
  DEFAULT_EMAIL_SENDER_PROFILE_ID,
  EMAIL_SENDER_PROFILES,
  extractSenderProfileIdFromComposerState,
  formatEmailFromHeader,
  formatSenderOptionLabel,
  listEnabledSenderProfiles,
  type EmailSenderProfileId,
} from '@/lib/email-center/sender-profiles';

const NO_TEMPLATE_VALUE = '__no_template__';
const CUSTOM_EMAIL_DESCRIPTION = 'Write a one-time branded email using your own content.';
const TRANSACTIONAL_WARNING =
  'Transactional emails bypass normal marketing preferences. Use this only for essential account, payment, access, security, or service-related communication.';
const SENDER_PROFILES = listEnabledSenderProfiles();

const PREVIEW_ONLY_SYSTEM_KEYS = new Set(['unsubscribe_url', 'email_logo_url', 'email_website_url']);

const URL_REGEX = /^https?:\/\//i;

function extractSingleCollegeIdFromAudience(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const ids = (raw as { college_ids?: unknown }).college_ids;
  if (!Array.isArray(ids) || ids.length !== 1) return null;
  const id = String(ids[0]);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

function getPreviewDefaultValue(key: string): string {
  return DEFAULT_SAMPLE_VALUES[key] ?? `Sample ${key.replace(/_/g, ' ')}`;
}

function getTemplateContent(template?: EmailTemplate | null) {
  if (!template) {
    return {
      subject: '',
      preview_text: '',
      html_body: '',
      text_body: '',
    };
  }

  return {
    subject: template.subject_template || '',
    preview_text: template.preview_text_template || '',
    html_body: template.html_template || '',
    text_body: template.text_template || '',
  };
}

function areEmailFieldsEqual(
  left: { subject: string; preview_text: string; html_body: string; text_body: string },
  right: { subject: string; preview_text: string; html_body: string; text_body: string }
) {
  return (
    left.subject === right.subject &&
    left.preview_text === right.preview_text &&
    left.html_body === right.html_body &&
    left.text_body === right.text_body
  );
}

interface ComposeFormProps {
  templates: EmailTemplate[];
  existingCampaign?: EmailCampaign | null;
  mode: 'create' | 'edit';
  preselectedTemplateId?: string;
}

interface FormState {
  name: string;
  email_category: EmailCenterLane;
  template_id: string;
  subject: string;
  preview_text: string;
  html_body: string;
  text_body: string;
}

interface SubmissionState {
  isSubmitting: boolean;
  fieldErrors: Record<string, string>;
  feedback: { type: 'success' | 'error'; message: string } | null;
}

type SubmissionAction =
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_END' }
  | { type: 'SET_FEEDBACK'; payload: { type: 'success' | 'error'; message: string } | null }
  | { type: 'SET_FIELD_ERRORS'; payload: Record<string, string> };

function submissionReducer(state: SubmissionState, action: SubmissionAction): SubmissionState {
  switch (action.type) {
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true, feedback: null };
    case 'SUBMIT_END':
      return { ...state, isSubmitting: false };
    case 'SET_FEEDBACK':
      return { ...state, feedback: action.payload };
    case 'SET_FIELD_ERRORS':
      return { ...state, fieldErrors: action.payload };
    default:
      return state;
  }
}

interface TemplateOverwriteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function TemplateOverwriteDialog({ open, onOpenChange, onConfirm, onCancel }: TemplateOverwriteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replace template content?</DialogTitle>
          <DialogDescription>
            Changing template will replace your current email content.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm}>Replace content</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ConvertLegacyDialogProps {
  open: boolean;
  nestedDocumentRisk: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConvertLegacyDialog({
  open,
  nestedDocumentRisk,
  onOpenChange,
  onConfirm,
  onCancel,
}: ConvertLegacyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert to Custom Composer?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Conversion starts a fresh Custom Email draft. Legacy HTML is not imported into the
                branded shell (that would nest headers/footers).
              </p>
              {nestedDocumentRisk ? (
                <p>
                  This campaign looks like a full email document. Stay in legacy mode unless you
                  explicitly confirm starting over in Custom Composer.
                </p>
              ) : (
                <p>Preview: empty Custom Email body inside the shared branded shell after convert.</p>
              )}
              <p>Nothing is overwritten until you save.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Keep legacy HTML</Button>
          <Button onClick={onConfirm}>Start Custom Composer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ComposeFormEditorProps {
  formData: FormState;
  setFormData: React.Dispatch<React.SetStateAction<FormState>>;
  templates: EmailTemplate[];
  handleTemplateChange: (templateId: string) => void;
  isCustomComposer: boolean;
  isLegacyHtml: boolean;
  composerState: CustomEmailComposerState;
  setComposerState: React.Dispatch<React.SetStateAction<CustomEmailComposerState>>;
  senderProfileId: EmailSenderProfileId;
  setSenderProfileId: React.Dispatch<React.SetStateAction<EmailSenderProfileId>>;
  onConvertToComposer: () => void;
  insertVariableRef: React.MutableRefObject<((text: string) => void) | null>;
  composerWarnings: string[];
  campaignVariables: Array<{ key: string; label?: string; required?: boolean; inputType?: string; placeholder?: string; helpText?: string }>;
  campaignVariableValues: Record<string, string>;
  fieldErrors: Record<string, string>;
  updateCampaignValue: (key: string, value: string) => void;
  templateSampleValues: Record<string, string>;
  displayPreviewRecipientVariables: Array<{ key: string; label?: string; inputType?: string; placeholder?: string; helpText?: string }>;
  displayPreviewSystemVariables: Array<{ key: string; label?: string; inputType?: string; placeholder?: string; helpText?: string }>;
  previewSampleValues: Record<string, string>;
  updatePreviewValue: (key: string, value: string) => void;
  systemOverrideVariables: Array<{ key: string; label?: string; inputType?: string; placeholder?: string; helpText?: string }>;
  feedback: SubmissionState['feedback'];
  isSubmitting: boolean;
  handleSaveDraftOnly: (e: React.FormEvent) => void;
  handleSubmit: (e: React.FormEvent, saveAndContinue?: boolean) => void;
  onSaveForTest: () => Promise<void>;
  validateCampaignValues: () => { errors: Record<string, string>; missingRequired: string[] };
  submissionDispatch: React.Dispatch<SubmissionAction>;
  savedCampaignId: string | null;
  setShowTestDialog: (show: boolean) => void;
  lastSavedAt: string | null;
  isDirty: boolean;
}

const ComposeFormEditor = React.memo(function ComposeFormEditor({
  formData, setFormData, templates, handleTemplateChange,
  isCustomComposer, isLegacyHtml, composerState, setComposerState,
  senderProfileId, setSenderProfileId,
  onConvertToComposer,
  insertVariableRef, composerWarnings,
  campaignVariables, campaignVariableValues, fieldErrors, updateCampaignValue,
  templateSampleValues, displayPreviewRecipientVariables, displayPreviewSystemVariables,
  previewSampleValues, updatePreviewValue, systemOverrideVariables,
  feedback, isSubmitting, handleSaveDraftOnly, handleSubmit, onSaveForTest,
  validateCampaignValues, submissionDispatch, savedCampaignId, setShowTestDialog,
  lastSavedAt, isDirty,
}: ComposeFormEditorProps) {
  const selectedSender = EMAIL_SENDER_PROFILES[senderProfileId];
  return (
    <div className="space-y-6 min-w-0">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <CardDescription>Basic metadata for your campaign.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">
                Internal campaign name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Fall Semester Announcement"
                required
              />
              <p className="text-xs text-muted-foreground">
                Not visible to recipients — for SuperAdmin organisation only.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email_category">Email Category <span className="text-red-500">*</span></Label>
              <Select
                value={formData.email_category}
                onValueChange={(v) => setFormData((p) => ({ ...p, email_category: v as EmailCenterLane }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMAIL_CENTER_LANE_OPTIONS.map((lane) => (
                    <SelectItem key={lane.value} value={lane.value}>{lane.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Controls preference opt-outs and outbox category for this send.
              </p>
              {formData.email_category === 'transactional_essential' ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
                  {TRANSACTIONAL_WARNING}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template_id">Template</Label>
            <Select value={formData.template_id} onValueChange={handleTemplateChange}>
              <SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TEMPLATE_VALUE}>Custom Email</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.template_id === NO_TEMPLATE_VALUE ? (
              <p className="text-xs text-muted-foreground">{CUSTOM_EMAIL_DESCRIPTION}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject Line <span className="text-red-500">*</span></Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
              placeholder="e.g., Important Update for Students"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preview_text">Preview Text</Label>
            <Input
              id="preview_text"
              value={formData.preview_text}
              onChange={(e) => setFormData((p) => ({ ...p, preview_text: e.target.value }))}
              placeholder="Brief text shown in email preview"
            />
          </div>

          {isCustomComposer ? (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="space-y-2">
                <Label htmlFor="sender_address">Sender address</Label>
                <Select
                  value={senderProfileId}
                  onValueChange={(v) => setSenderProfileId(v as EmailSenderProfileId)}
                >
                  <SelectTrigger id="sender_address" aria-label="Sender address">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SENDER_PROFILES.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {formatSenderOptionLabel(profile)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <dl className="grid gap-1 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-muted-foreground">From name</dt>
                  <dd className="font-medium">{selectedSender.fromName}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-muted-foreground">From email</dt>
                  <dd className="font-medium">{selectedSender.fromEmail}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-muted-foreground">Reply-To address</dt>
                  <dd className="font-medium">{selectedSender.replyTo}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="size-5" />
            {isCustomComposer ? 'Custom Email Content' : isLegacyHtml ? 'Legacy Custom HTML' : 'Email Content'}
          </CardTitle>
          <CardDescription>
            {isCustomComposer
              ? 'Edit body content inside the branded NextGen email shell. Header and footer cannot be changed.'
              : isLegacyHtml
                ? 'This campaign uses older compiled HTML without structured composer state.'
                : 'Use templates for professional layouts, or choose Custom Email to write branded content.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLegacyHtml ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Existing compiled HTML is shown safely below. Converting starts a fresh Custom Email composer and does not silently overwrite until you save.
              </p>
              <Button type="button" variant="secondary" onClick={onConvertToComposer}>
                Convert to Custom Composer
              </Button>
              <Textarea
                id="html_body"
                value={formData.html_body}
                readOnly
                className="min-h-[240px] max-h-[420px] font-mono text-sm"
              />
            </div>
          ) : isCustomComposer ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email_heading">Email heading (optional)</Label>
                <Input
                  id="email_heading"
                  value={composerState.heading}
                  onChange={(e) =>
                    setComposerState((prev) => ({ ...prev, heading: e.target.value }))
                  }
                  placeholder="Optional heading inside the email body"
                />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>Rich email body <span className="text-red-500">*</span></Label>
                  <div className="flex flex-wrap gap-1">
                    {CUSTOM_EMAIL_INSERTABLE_VARIABLES.map((variable) => (
                      <Button
                        key={variable.key}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => insertVariableRef.current?.(`{{${variable.key}}}`)}
                      >
                        {`{{${variable.key}}}`}
                      </Button>
                    ))}
                  </div>
                </div>
                <EmailBodyEditor
                  value={composerState.body_html}
                  onChange={(html, text) =>
                    setComposerState((prev) => ({
                      ...prev,
                      body_html: html,
                      body_text: text,
                    }))
                  }
                  onInsertRequest={(insert) => {
                    insertVariableRef.current = insert;
                  }}
                />
              </div>

              <CtaManager
                ctas={composerState.ctas}
                onChange={(ctas) => setComposerState((prev) => ({ ...prev, ctas }))}
                warnings={composerWarnings}
              />
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="html_body">Email Body (HTML) <span className="text-red-500">*</span></Label>
                <Textarea
                  id="html_body"
                  value={formData.html_body}
                  onChange={(e) => setFormData((p) => ({ ...p, html_body: e.target.value }))}
                  placeholder="Enter HTML email content..."
                  className="min-h-[320px] max-h-[520px] font-mono text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="text_body">Plain Text Fallback</Label>
                <p className="text-xs text-muted-foreground">
                  Optional plain text version for email clients that don&apos;t support HTML.
                </p>
                <Textarea
                  id="text_body"
                  value={formData.text_body}
                  onChange={(e) => setFormData((p) => ({ ...p, text_body: e.target.value }))}
                  placeholder="Plain text fallback content..."
                  className="min-h-[150px]"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {campaignVariables.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Template Fields</CardTitle>
            <CardDescription>Values required to render the selected template.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {campaignVariables.map((variable) => {
                const inputType = variable.inputType ?? inferInputType(variable.key);
                const value = campaignVariableValues[variable.key] ?? '';
                const error = fieldErrors[variable.key];
                const placeholder = variable.placeholder
                  ?? templateSampleValues[variable.key]
                  ?? getPreviewDefaultValue(variable.key);

                return (
                  <div key={variable.key} className="space-y-1">
                    <Label htmlFor={`campaign-${variable.key}`} className="text-xs">
                      {variable.label || variable.key.replace(/_/g, ' ')}
                      {variable.required && <span className="text-red-500 ml-0.5">*</span>}
                    </Label>
                    {inputType === 'textarea' ? (
                      <Textarea
                        id={`campaign-${variable.key}`}
                        value={value}
                        onChange={(e) => updateCampaignValue(variable.key, e.target.value)}
                        placeholder={placeholder}
                        className="text-sm"
                      />
                    ) : (
                      <Input
                        id={`campaign-${variable.key}`}
                        type={inputType === 'url' || inputType === 'date' || inputType === 'time' ? inputType : inputType === 'number' || inputType === 'percent' ? 'number' : 'text'}
                        value={value}
                        onChange={(e) => updateCampaignValue(variable.key, e.target.value)}
                        placeholder={placeholder}
                        className="text-sm"
                      />
                    )}
                    {error && (
                      <p className="text-xs text-destructive">{error}</p>
                    )}
                    {variable.helpText && (
                      <p className="text-xs text-muted-foreground">{variable.helpText}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {(displayPreviewRecipientVariables.length > 0 || displayPreviewSystemVariables.length > 0) ? (
        <Collapsible defaultOpen={false} className="rounded-2xl border border-border/60 bg-card shadow-sm">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" type="button" className="flex w-full justify-between px-6 py-4 hover:bg-muted/50 rounded-t-2xl">
              <span className="font-semibold text-sm">Preview Sample Values ({displayPreviewRecipientVariables.length + displayPreviewSystemVariables.length})</span>
              <ChevronDown className="size-4 text-muted-foreground transition-transform" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-6 pb-6 pt-2">
            <p className="text-xs text-muted-foreground mb-4">
              Sample values used only for preview and test sends.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[...displayPreviewRecipientVariables, ...displayPreviewSystemVariables].map((variable) => {
                const inputType = variable.inputType ?? inferInputType(variable.key);
                const value = previewSampleValues[variable.key] ?? '';
                const placeholder = variable.placeholder
                  ?? templateSampleValues[variable.key]
                  ?? getPreviewDefaultValue(variable.key);
                const helpText = variable.key === 'unsubscribe_url'
                  ? 'Preview-only value. Real sends use system-generated links.'
                  : variable.helpText;

                return (
                  <div key={variable.key} className="space-y-1">
                    <Label htmlFor={`preview-${variable.key}`} className="text-xs">
                      {variable.label || variable.key.replace(/_/g, ' ')}
                    </Label>
                    <Input
                      id={`preview-${variable.key}`}
                      type={inputType === 'url' || inputType === 'date' || inputType === 'time' ? inputType : inputType === 'number' || inputType === 'percent' ? 'number' : 'text'}
                      value={value}
                      onChange={(e) => updatePreviewValue(variable.key, e.target.value)}
                      placeholder={placeholder}
                      className="text-sm"
                    />
                    {helpText && (
                      <p className="text-xs text-muted-foreground">{helpText}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {systemOverrideVariables.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>System Links / Defaults</CardTitle>
            <CardDescription>Override default system links if needed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {systemOverrideVariables.map((variable) => {
                const inputType = variable.inputType ?? inferInputType(variable.key);
                const value = campaignVariableValues[variable.key] ?? '';
                const error = fieldErrors[variable.key];
                const placeholder = variable.placeholder
                  ?? getSystemValuesForEmailMerge()[variable.key]
                  ?? templateSampleValues[variable.key]
                  ?? getPreviewDefaultValue(variable.key);

                return (
                  <div key={variable.key} className="space-y-1">
                    <Label htmlFor={`system-${variable.key}`} className="text-xs">
                      {variable.label || variable.key.replace(/_/g, ' ')}
                    </Label>
                    <Input
                      id={`system-${variable.key}`}
                      type={inputType === 'url' || inputType === 'date' || inputType === 'time' ? inputType : inputType === 'number' || inputType === 'percent' ? 'number' : 'text'}
                      value={value}
                      onChange={(e) => updateCampaignValue(variable.key, e.target.value)}
                      placeholder={placeholder}
                      className="text-sm"
                    />
                    {error && (
                      <p className="text-xs text-destructive">{error}</p>
                    )}
                    {variable.helpText && (
                      <p className="text-xs text-muted-foreground">{variable.helpText}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedback && (
            <div className={`rounded-lg border p-3 text-sm ${
              feedback.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300'
            }`}>
              {feedback.message}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {isDirty ? <span className="text-amber-700 dark:text-amber-300">Unsaved changes</span> : <span>All changes saved</span>}
            {lastSavedAt ? <span>Last saved {new Date(lastSavedAt).toLocaleString()}</span> : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={handleSaveDraftOnly}
              className="gap-2"
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save Draft
            </Button>

            <Button
              type="button"
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e, true)}
              className="gap-2"
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save &amp; Continue
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={async (e) => {
                e.preventDefault();
                const { errors, missingRequired } = validateCampaignValues();
                if (missingRequired.length > 0 || Object.keys(errors).length > 0) {
                  submissionDispatch({ type: 'SET_FIELD_ERRORS', payload: errors });
                  toast.error('Please complete the required template fields before sending a test.');
                  return;
                }

                if (!savedCampaignId) {
                  await onSaveForTest();
                } else {
                  setShowTestDialog(true);
                }
              }}
              className="gap-2"
            >
              <Send className="size-4" />
              Send Test
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

interface ComposeFormPreviewProps {
  previewTab: 'rendered' | 'html' | 'text';
  setPreviewTab: (tab: 'rendered' | 'html' | 'text') => void;
  renderedPreview: { subject: string; previewText: string; html: string; text: string };
  renderedTextPreview: string;
  textBody: string;
  mergedPreviewVariables: Record<string, string>;
  unresolvedVariables?: string[];
  ctaWarnings?: string[];
  senderFromHeader?: string | null;
  senderReplyTo?: string | null;
}

function ComposeFormPreview({
  previewTab, setPreviewTab, renderedPreview, renderedTextPreview, textBody, mergedPreviewVariables,
  unresolvedVariables = [],
  ctaWarnings = [],
  senderFromHeader = null,
  senderReplyTo = null,
}: ComposeFormPreviewProps) {
  return (
    <div className="min-size-0">
      <div className="lg:sticky lg:top-4 space-y-3">
        {(unresolvedVariables.length > 0 || ctaWarnings.length > 0) ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100 space-y-1">
            {unresolvedVariables.length > 0 ? (
              <p>Unresolved variables: {unresolvedVariables.map((k) => `{{${k}}}`).join(', ')}</p>
            ) : null}
            {ctaWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}
        {senderFromHeader ? (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs space-y-1">
            <p><span className="text-muted-foreground">From:</span> {senderFromHeader}</p>
            {senderReplyTo ? (
              <p><span className="text-muted-foreground">Reply-To:</span> {senderReplyTo}</p>
            ) : null}
          </div>
        ) : null}
        <Card className="flex min-size-0 max-w-full flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
          <CardHeader className="pb-3 border-b border-border shrink-0">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <CardTitle>Preview</CardTitle>
              <div className="flex flex-wrap gap-1">
                <Button type="button" variant={previewTab === 'rendered' ? 'default' : 'ghost'} size="sm" onClick={() => setPreviewTab('rendered')}>
                  <EyeIcon className="mr-1 size-4" />Rendered
                </Button>
                <Button type="button" variant={previewTab === 'html' ? 'default' : 'ghost'} size="sm" onClick={() => setPreviewTab('html')}>
                  <FileCode className="mr-1 size-4" />HTML
                </Button>
                <Button type="button" variant={previewTab === 'text' ? 'default' : 'ghost'} size="sm" onClick={() => setPreviewTab('text')}>
                  <FileText className="mr-1 size-4" />Text
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0" style={{ maxHeight: 'calc(100vh - 10rem)' }}>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              {previewTab === 'rendered' && (
                <EmailPreview
                  subject={renderedPreview.subject}
                  previewText={renderedPreview.previewText}
                  htmlContent={renderedPreview.html}
                  textContent={textBody}
                  variables={mergedPreviewVariables}
                />
              )}
              {previewTab === 'html' && (
                <div className="p-4 overflow-y-auto bg-muted">
                  <pre className="text-xs whitespace-pre-wrap">
                    {renderedPreview.html || 'Start writing or choose a template to preview your email.'}
                  </pre>
                </div>
              )}
              {previewTab === 'text' && (
                <div className="p-4 overflow-y-auto">
                  {renderedTextPreview ? (
                    <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{renderedTextPreview}</pre>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
                      No plain text fallback yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ComposeForm({ templates: templatesProp, existingCampaign, mode, preselectedTemplateId }: ComposeFormProps) {
  const router = useRouter();
  const templates = useMemo(() => templatesProp, [templatesProp]);
  const [previewTab, setPreviewTab] = useState<'rendered' | 'html' | 'text'>('rendered');
  const [showTemplateOverwriteDialog, setShowTemplateOverwriteDialog] = useState(false);
  const [showConvertLegacyDialog, setShowConvertLegacyDialog] = useState(false);
  const pendingTemplateIdRef = useRef<string | null>(null);
  const [campaignVariableValues, setCampaignVariableValues] = useState<Record<string, string>>(
    (existingCampaign?.template_variable_values as Record<string, string>) ?? {}
  );
  const [previewSampleValues, setPreviewSampleValues] = useState<Record<string, string>>({});
  const [career, careerDispatch] = useReducer(
    (state: { authFirstName: string; viewerEmail: string; collegeSlug: string }, action: { type: string; payload?: string }) => {
      switch (action.type) {
        case 'SET_AUTH_FIRST_NAME': return { ...state, authFirstName: action.payload ?? '' };
        case 'SET_VIEWER_EMAIL': return { ...state, viewerEmail: action.payload ?? '' };
        case 'SET_COLLEGE_SLUG': return { ...state, collegeSlug: action.payload ?? '' };
        default: return state;
      }
    },
    { authFirstName: '', viewerEmail: '', collegeSlug: '' }
  );
  const careerAuthFirstName = career.authFirstName;
  const careerViewerEmail = career.viewerEmail;
  const careerPreviewCollegeSlug = career.collegeSlug;
  const [{ isSubmitting, fieldErrors, feedback }, submissionDispatch] = useReducer(submissionReducer, {
    isSubmitting: false,
    fieldErrors: {},
    feedback: null,
  });
  const [formData, setFormData] = useState<FormState>({
    name: existingCampaign?.name || '',
    email_category: existingCampaign
      ? getCampaignEmailCategory(existingCampaign)
      : 'growth_marketing',
    template_id: existingCampaign?.template_id || NO_TEMPLATE_VALUE,
    subject: existingCampaign?.subject || '',
    preview_text: existingCampaign?.preview_text || '',
    html_body: existingCampaign?.html_body || '',
    text_body: existingCampaign?.text_body || '',
  });

  const initialContentMode = resolveContentMode({
    content_mode: existingCampaign?.content_mode,
    template_id: existingCampaign?.template_id ?? (existingCampaign ? null : null),
    composer_state: existingCampaign?.composer_state,
    html_body: existingCampaign?.html_body,
  });
  const [contentMode, setContentMode] = useState<CampaignContentMode>(() => {
    if (mode === 'create' && !preselectedTemplateId) return 'custom_composer';
    if (existingCampaign?.template_id) return 'template';
    return initialContentMode === 'template' && !existingCampaign?.template_id
      ? 'custom_composer'
      : initialContentMode;
  });
  const [composerState, setComposerState] = useState<CustomEmailComposerState>(() => {
    return parseComposerState(existingCampaign?.composer_state) ?? createEmptyComposerState();
  });
  const [senderProfileId, setSenderProfileId] = useState<EmailSenderProfileId>(() => {
    return (
      extractSenderProfileIdFromComposerState(existingCampaign?.composer_state)
      ?? DEFAULT_EMAIL_SENDER_PROFILE_ID
    );
  });
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    existingCampaign?.updated_at ?? null
  );
  const [baselineSnapshot, setBaselineSnapshot] = useState(() =>
    JSON.stringify({
      form: {
        name: existingCampaign?.name || '',
        email_category: existingCampaign
          ? getCampaignEmailCategory(existingCampaign)
          : 'growth_marketing',
        template_id: existingCampaign?.template_id || NO_TEMPLATE_VALUE,
        subject: existingCampaign?.subject || '',
        preview_text: existingCampaign?.preview_text || '',
        html_body: existingCampaign?.html_body || '',
        text_body: existingCampaign?.text_body || '',
      },
      composer: parseComposerState(existingCampaign?.composer_state) ?? createEmptyComposerState(),
      senderProfileId:
        extractSenderProfileIdFromComposerState(existingCampaign?.composer_state)
        ?? DEFAULT_EMAIL_SENDER_PROFILE_ID,
      contentMode:
        mode === 'create' && !preselectedTemplateId
          ? 'custom_composer'
          : existingCampaign?.template_id
            ? 'template'
            : initialContentMode === 'template' && !existingCampaign?.template_id
              ? 'custom_composer'
              : initialContentMode,
    })
  );
  const insertVariableRef = useRef<((text: string) => void) | null>(null);

  const isCustomComposer = contentMode === 'custom_composer';
  const isLegacyHtml = contentMode === 'legacy_html';
  const isDirty = useMemo(
    () =>
      JSON.stringify({ form: formData, composer: composerState, senderProfileId, contentMode }) !== baselineSnapshot,
    [formData, composerState, senderProfileId, contentMode, baselineSnapshot]
  );

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const selectedTemplate = formData.template_id && formData.template_id !== NO_TEMPLATE_VALUE
    ? templates.find((t) => t.id === formData.template_id)
    : null;

  useEffect(() => {
    if (existingCampaign?.template_id) {
      const template = templates.find((t) => t.id === existingCampaign.template_id);
      if (template && !formData.subject) {
        setFormData((prev) => ({
          ...prev,
          template_id: template.id,
          subject: template.subject_template,
          preview_text: template.preview_text_template || '',
          html_body: template.html_template,
          text_body: template.text_template,
        }));
      }
    }
  }, [existingCampaign?.template_id, templates, formData.subject]);

  useEffect(() => {
    if (mode === 'create' && preselectedTemplateId) {
      const template = templates.find((t) => t.id === preselectedTemplateId);
      if (template) {
        setContentMode('template');
        setFormData((prev) => ({
          ...prev,
          template_id: preselectedTemplateId,
          subject: template.subject_template,
          preview_text: template.preview_text_template || '',
          html_body: template.html_template,
          text_body: template.text_template,
        }));
      }
    }
  }, [preselectedTemplateId, templates, mode]);

  const templateVariableMetadata = useMemo(() => {
    if (selectedTemplate?.variables && selectedTemplate.variables.length > 0) {
      return normalizeTemplateVariables(selectedTemplate.variables);
    }

    const content = `${formData.subject} ${formData.preview_text} ${formData.html_body} ${formData.text_body}`;
    const matches = content.match(/\{\{(\w+)\}\}/g);
    const keys = matches
      ? [...new Set(matches.map((match) => match.replace(/\{\{|\}\}/g, '')))]
      : [];

    return normalizeTemplateVariables(
      keys.map((key) => ({
        key,
        label: key.replace(/_/g, ' '),
        required: false,
        source: inferVariableSource(key),
        inputType: inferInputType(key),
      }))
    );
  }, [selectedTemplate, formData.subject, formData.preview_text, formData.html_body, formData.text_body]);

  const templateSampleValues = useMemo(
    () => buildTemplateSampleValues(templateVariableMetadata),
    [templateVariableMetadata]
  );

  const campaignVariables = useMemo(
    () => templateVariableMetadata.filter((variable) => variable.source === 'campaign'),
    [templateVariableMetadata]
  );

  const systemVariables = useMemo(
    () => templateVariableMetadata.filter((variable) => variable.source === 'system'),
    [templateVariableMetadata]
  );

  const previewSystemVariables = useMemo(
    () => systemVariables.filter((variable) => PREVIEW_ONLY_SYSTEM_KEYS.has(variable.key)),
    [systemVariables]
  );

  const systemOverrideVariables = useMemo(
    () => systemVariables.filter((variable) => !PREVIEW_ONLY_SYSTEM_KEYS.has(variable.key)),
    [systemVariables]
  );

  const recipientVariables = useMemo(
    () => templateVariableMetadata.filter((variable) => variable.source === 'recipient'),
    [templateVariableMetadata]
  );

  const usesCareerBranchPreview = usesCareerLaunchBranchMerge(selectedTemplate?.slug);
  const usesCareerShellPreview = usesCareerEmailShellMerge(selectedTemplate?.slug);

  const hiddenCareerPreviewKeys = useMemo(
    () =>
      usesCareerBranchPreview
        ? new Set(['first_name', 'full_name', 'unsubscribe_url', 'email_logo_url', 'email_website_url'])
        : new Set<string>(),
    [usesCareerBranchPreview],
  );

  const displayPreviewRecipientVariables = useMemo(
    () => recipientVariables.filter((v) => !hiddenCareerPreviewKeys.has(v.key)),
    [recipientVariables, hiddenCareerPreviewKeys],
  );

  const displayPreviewSystemVariables = useMemo(
    () => previewSystemVariables.filter((v) => !hiddenCareerPreviewKeys.has(v.key)),
    [previewSystemVariables, hiddenCareerPreviewKeys],
  );

  const campaignInputVariables = useMemo(
    () => [...campaignVariables, ...systemOverrideVariables],
    [campaignVariables, systemOverrideVariables]
  );

  const validateCampaignValues = useCallback(() => {
    const errors: Record<string, string> = {};
    const missingRequired: string[] = [];

    for (const variable of campaignInputVariables) {
      const value = (campaignVariableValues[variable.key] ?? '').trim();
      const inputType = variable.inputType ?? inferInputType(variable.key);

      if (variable.required && !value) {
        errors[variable.key] = 'Required field';
        missingRequired.push(variable.label || variable.key);
      }

      if (value && inputType === 'url' && !URL_REGEX.test(value)) {
        errors[variable.key] = 'Enter a valid URL starting with http:// or https://';
      }
    }

    return { errors, missingRequired };
  }, [campaignInputVariables, campaignVariableValues]);

  useEffect(() => {
    const nextKeys = [...campaignVariables, ...systemOverrideVariables].map((variable) => variable.key);

    setCampaignVariableValues((current) => {
      const next: Record<string, string> = {};
      const sys = getSystemValuesForEmailMerge();
      for (const key of nextKeys) {
        const fallback =
          sys[key] ?? DEFAULT_SAMPLE_VALUES[key] ?? DEFAULT_SYSTEM_VARIABLES[key] ?? '';
        next[key] = current[key]
          ?? (existingCampaign?.template_variable_values as Record<string, string> | undefined)?.[key]
          ?? fallback;
      }

      const currentKeys = Object.keys(current);
      if (currentKeys.length === Object.keys(next).length && currentKeys.every((key) => next[key] === current[key])) {
        return current;
      }

      return next;
    });
  }, [campaignVariables, systemOverrideVariables, existingCampaign?.template_variable_values]);

  useEffect(() => {
    const nextKeys = [...recipientVariables, ...previewSystemVariables].map((variable) => variable.key);

    setPreviewSampleValues((current) => {
      const next: Record<string, string> = {};
      for (const key of nextKeys) {
        if (usesCareerBranchPreview && key === 'college_name') {
          next[key] = current[key] ?? '';
        } else {
          next[key] = current[key] ?? templateSampleValues[key] ?? getPreviewDefaultValue(key);
        }
      }

      const currentKeys = Object.keys(current);
      if (currentKeys.length === Object.keys(next).length && currentKeys.every((key) => next[key] === current[key])) {
        return current;
      }

      return next;
    });
  }, [recipientVariables, previewSystemVariables, templateSampleValues, usesCareerBranchPreview]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      careerDispatch({ type: 'SET_VIEWER_EMAIL', payload: user.email ?? '' });
      careerDispatch({ type: 'SET_AUTH_FIRST_NAME', payload: deriveFirstNameFromAuthUser(user) });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!usesCareerShellPreview || !existingCampaign?.audience_config) {
      careerDispatch({ type: 'SET_COLLEGE_SLUG', payload: '' });
      return;
    }
    const collegeId = extractSingleCollegeIdFromAudience(existingCampaign.audience_config);
    if (!collegeId) {
      careerDispatch({ type: 'SET_COLLEGE_SLUG', payload: '' });
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await getCollegeNamesForEmailPreviewAction([collegeId]);
      if (cancelled || !res.ok || !res.names) return;
      const name = res.names[collegeId];
      if (name) {
        setPreviewSampleValues((prev) => {
          if ((prev.college_name ?? '').trim() !== '') return prev;
          return { ...prev, college_name: name };
        });
      }
      careerDispatch({ type: 'SET_COLLEGE_SLUG', payload: res.slugs?.[collegeId] ?? '' });
    })();
    return () => {
      cancelled = true;
    };
  }, [usesCareerShellPreview, existingCampaign?.id, existingCampaign?.audience_config]);

  useEffect(() => {
    const email = careerViewerEmail.trim();
    if (!email) return;

    let cancelled = false;
    (async () => {
      const res = await getEmailPreviewUnsubscribeUrlAction(email, existingCampaign?.id);
      if (cancelled || !res.ok || !res.url) return;
      setPreviewSampleValues((prev) => {
        if (prev.unsubscribe_url === res.url) return prev;
        return { ...prev, unsubscribe_url: res.url ?? '' };
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [careerViewerEmail, existingCampaign?.id]);

  const currentTemplateContent = useMemo(() => getTemplateContent(selectedTemplate), [selectedTemplate]);

  const mergedPreviewVariables = useMemo(() => {
    const merged = mergePreviewVariables({
      templateSampleValues,
      systemValues: getSystemValuesForEmailMerge(),
      campaignValues: campaignVariableValues,
      recipientValues: previewSampleValues,
      recipientEmail: careerViewerEmail || null,
    });
    if (!usesCareerShellPreview) return merged;

    const withFirst: Record<string, string> = usesCareerBranchPreview
      ? {
          ...merged,
          first_name:
            (careerAuthFirstName.trim()
              ? careerAuthFirstName
              : deriveFirstNameFromRecipient({ email: careerViewerEmail || null })) ||
            merged.first_name ||
            'Student',
        }
      : merged;

    const branch = buildCareerEmailShellMerge({
      slug: selectedTemplate?.slug ?? '',
      previewTextRaw: formData.preview_text || currentTemplateContent.preview_text || '',
      mergedVariables: withFirst,
      programName: withFirst.program_name ?? '',
      collegeName: withFirst.college_name ?? '',
      collegeSlug: careerPreviewCollegeSlug,
    });

    return {
      ...withFirst,
      ...branch,
      college_slug: careerPreviewCollegeSlug,
    };
  }, [
    templateSampleValues,
    campaignVariableValues,
    previewSampleValues,
    usesCareerShellPreview,
    usesCareerBranchPreview,
    careerAuthFirstName,
    careerViewerEmail,
    careerPreviewCollegeSlug,
    selectedTemplate?.slug,
    formData.preview_text,
    currentTemplateContent.preview_text,
  ]);

  const composerValidation = useMemo(() => {
    if (!isCustomComposer) return { ok: true, issues: [] as ReturnType<typeof validateComposerState>['issues'] };
    return validateComposerState(composerState, {
      subject: formData.subject,
      previewText: formData.preview_text,
      emailCategory: formData.email_category,
      requireNonEmptyBody: false,
    });
  }, [isCustomComposer, composerState, formData.subject, formData.preview_text, formData.email_category]);

  const composerWarnings = useMemo(
    () => composerValidation.issues.filter((i) => i.level === 'warning').map((i) => i.message),
    [composerValidation.issues]
  );

  const compiledCustomPreview = useMemo(() => {
    if (!isCustomComposer) return null;
    try {
      return compileCustomEmail({
        state: {
          ...composerState,
          body_text: composerState.body_text || htmlToPlainText(composerState.body_html),
        },
        subject: formData.subject,
        previewText: formData.preview_text,
        emailCategory: formData.email_category,
        sanitizedBodyHtml: composerState.body_html,
      });
    } catch {
      return null;
    }
  }, [isCustomComposer, composerState, formData.subject, formData.preview_text, formData.email_category]);

  const renderedPreview = useMemo(() => {
    const html = isCustomComposer
      ? (compiledCustomPreview?.html_body ?? formData.html_body)
      : formData.html_body;
    const text = isCustomComposer
      ? (compiledCustomPreview?.text_body ?? formData.text_body)
      : formData.text_body;
    return renderCampaignContent(
      formData.subject,
      formData.preview_text || null,
      html,
      text || '',
      {
        ...mergedPreviewVariables,
        email_header_display: buildEmailHeaderDisplay(
          mergedPreviewVariables.college_name
        ),
      }
    );
  }, [
    isCustomComposer,
    compiledCustomPreview,
    formData.subject,
    formData.preview_text,
    formData.html_body,
    formData.text_body,
    mergedPreviewVariables,
  ]);

  const renderedTextPreview = useMemo(() => {
    const textSource = isCustomComposer
      ? (compiledCustomPreview?.text_body ?? '')
      : formData.text_body;
    if (!textSource.trim()) {
      return '';
    }
    return renderedPreview.text;
  }, [isCustomComposer, compiledCustomPreview, formData.text_body, renderedPreview.text]);

  const unsupportedPreviewVars = useMemo(() => {
    if (!isCustomComposer) return [] as string[];
    return findUnsupportedVariables(composerState, formData.subject, formData.preview_text);
  }, [isCustomComposer, composerState, formData.subject, formData.preview_text]);

  const applyTemplate = useCallback((templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    setContentMode('template');
    setComposerState(createEmptyComposerState());
    setFormData((prev) => ({
      ...prev,
      template_id: templateId,
      email_category: templateCategoryToDefaultLane(template.category),
      subject: template.subject_template,
      preview_text: template.preview_text_template || '',
      html_body: template.html_template,
      text_body: template.text_template,
    }));
    submissionDispatch({ type: 'SET_FEEDBACK', payload: null });
  }, [templates, submissionDispatch]);

  const handleTemplateChange = useCallback((templateId: string) => {
    if (templateId === formData.template_id) {
      return;
    }

    if (templateId === NO_TEMPLATE_VALUE) {
      setContentMode('custom_composer');
      setComposerState(createEmptyComposerState());
      setFormData((prev) => ({
        ...prev,
        template_id: NO_TEMPLATE_VALUE,
        html_body: '',
        text_body: '',
      }));
      pendingTemplateIdRef.current = null;
      setShowTemplateOverwriteDialog(false);
      submissionDispatch({ type: 'SET_FEEDBACK', payload: null });
      return;
    }

    const template = templates.find((t) => t.id === templateId);
    if (!template) {
      return;
    }

    const currentContent = {
      subject: formData.subject,
      preview_text: formData.preview_text,
      html_body: formData.html_body,
      text_body: formData.text_body,
    };

    if (!areEmailFieldsEqual(currentContent, currentTemplateContent) || isCustomComposer) {
      pendingTemplateIdRef.current = templateId;
      setShowTemplateOverwriteDialog(true);
      return;
    }

    applyTemplate(templateId);
  }, [formData.template_id, formData.subject, formData.preview_text, formData.html_body, formData.text_body, templates, currentTemplateContent, submissionDispatch, applyTemplate, isCustomComposer]);

  const onConvertToComposer = useCallback(() => {
    setShowConvertLegacyDialog(true);
  }, []);

  const cancelConvertToComposer = useCallback(() => {
    setShowConvertLegacyDialog(false);
  }, []);

  const confirmConvertToComposer = useCallback(() => {
    // Never wrap legacy full documents into the branded shell — start empty.
    setContentMode('custom_composer');
    setComposerState(createEmptyComposerState());
    setFormData((prev) => ({
      ...prev,
      template_id: NO_TEMPLATE_VALUE,
    }));
    setShowConvertLegacyDialog(false);
    toast.message('Converted to Custom Composer. Previous compiled HTML is kept until you save.');
  }, []);

  const appendCampaignFields = useCallback((fd: FormData) => {
    fd.append('name', formData.name);
    fd.append('email_category', formData.email_category);
    fd.append('campaign_type', laneToLegacyCampaignType(formData.email_category));
    fd.append('template_id', formData.template_id === NO_TEMPLATE_VALUE ? '' : formData.template_id);
    fd.append('content_mode', contentMode);
    fd.append(
      'composer_state',
      isCustomComposer
        ? JSON.stringify({ ...composerState, sender_profile_id: senderProfileId })
        : '',
    );
    fd.append('subject', formData.subject);
    fd.append('preview_text', formData.preview_text || '');
    fd.append(
      'html_body',
      isCustomComposer ? (compiledCustomPreview?.html_body || formData.html_body || '<p></p>') : formData.html_body
    );
    fd.append(
      'text_body',
      isCustomComposer ? (compiledCustomPreview?.text_body || formData.text_body || '') : (formData.text_body || '')
    );
    fd.append('template_variable_values', JSON.stringify(campaignVariableValues));
  }, [
    formData,
    contentMode,
    isCustomComposer,
    composerState,
    senderProfileId,
    compiledCustomPreview,
    campaignVariableValues,
  ]);

  const markSaved = useCallback(() => {
    const now = new Date().toISOString();
    setLastSavedAt(now);
    setBaselineSnapshot(JSON.stringify({ form: formData, composer: composerState, senderProfileId, contentMode }));
  }, [formData, composerState, senderProfileId, contentMode]);

  const confirmTemplateOverwrite = useCallback(() => {
    if (pendingTemplateIdRef.current) {
      applyTemplate(pendingTemplateIdRef.current);
    }
    pendingTemplateIdRef.current = null;
    setShowTemplateOverwriteDialog(false);
  }, [applyTemplate]);

  const cancelTemplateOverwrite = useCallback(() => {
    pendingTemplateIdRef.current = null;
    setShowTemplateOverwriteDialog(false);
  }, []);

  const [showTestDialog, setShowTestDialog] = useState(false);
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(existingCampaign?.id ?? null);
  const saveInFlightRef = useRef(false);

  const handleSubmit = useCallback(async (e: React.FormEvent, saveAndContinue: boolean = false) => {
    e.preventDefault();
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    submissionDispatch({ type: 'SUBMIT_START' });

    try {
      if (isCustomComposer) {
        const validation = validateComposerState(composerState, {
          subject: formData.subject,
          previewText: formData.preview_text,
          emailCategory: formData.email_category,
          requireNonEmptyBody: saveAndContinue,
        });
        if (!validation.ok) {
          const firstError = validation.issues.find((i) => i.level === 'error');
          toast.error(firstError?.message ?? 'Fix Custom Email issues before continuing.');
          return;
        }
      }

      const { errors, missingRequired } = validateCampaignValues();
      if (saveAndContinue && (missingRequired.length > 0 || Object.keys(errors).length > 0)) {
        submissionDispatch({ type: 'SET_FIELD_ERRORS', payload: errors });
        toast.error('Please complete the required template fields before continuing.');
        return;
      }

      const formDataToSubmit = new FormData();
      appendCampaignFields(formDataToSubmit);

      let result: { ok: true; campaignId: string } | { ok: false; error: string };
      if (mode === 'create' && !savedCampaignId) {
        result = await createCampaignDraftAction(formDataToSubmit);
      } else {
        formDataToSubmit.append('id', savedCampaignId ?? existingCampaign!.id);
        result = await updateCampaignDraftAction(formDataToSubmit);
      }

      if (!result.ok) {
        const message = mapCampaignDraftError(result.error || 'Failed to save campaign');
        toast.error(message);
        submissionDispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', message } });
        return;
      }

      setSavedCampaignId(result.campaignId);
      markSaved();
      toast.success(saveAndContinue ? 'Draft saved. Opening audience…' : 'Draft saved successfully.');
      submissionDispatch({
        type: 'SET_FEEDBACK',
        payload: { type: 'success', message: 'Draft saved successfully.' },
      });

      if (saveAndContinue) {
        const href = resolveSaveAndContinueHref({ ok: true, campaignId: result.campaignId });
        if (href) {
          router.push(href);
        } else {
          toast.error('Saved, but campaign id was missing for navigation.');
        }
      }
    } catch (error) {
      console.error('Error saving campaign:', error);
      const message = mapCampaignDraftError(
        error instanceof Error ? error.message : 'Failed to save campaign'
      );
      toast.error(message);
      submissionDispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', message } });
    } finally {
      saveInFlightRef.current = false;
      submissionDispatch({ type: 'SUBMIT_END' });
    }
  }, [
    isCustomComposer,
    composerState,
    formData,
    validateCampaignValues,
    appendCampaignFields,
    mode,
    savedCampaignId,
    existingCampaign,
    router,
    submissionDispatch,
    markSaved,
  ]);

  const handleSaveDraftOnly = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    submissionDispatch({ type: 'SUBMIT_START' });
    try {
      if (isCustomComposer) {
        const validation = validateComposerState(composerState, {
          subject: formData.subject,
          previewText: formData.preview_text,
          emailCategory: formData.email_category,
          requireNonEmptyBody: false,
        });
        if (!validation.ok) {
          const firstError = validation.issues.find((i) => i.level === 'error');
          toast.error(firstError?.message ?? 'Fix Custom Email issues before saving.');
          return;
        }
      }

      const { errors, missingRequired } = validateCampaignValues();
      if (Object.keys(errors).length > 0) {
        submissionDispatch({ type: 'SET_FIELD_ERRORS', payload: errors });
      }
      if (missingRequired.length > 0) {
        toast.warning('Draft saved with incomplete template fields.');
      }

      const fd = new FormData();
      appendCampaignFields(fd);

      let result: { ok: true; campaignId: string } | { ok: false; error: string };
      if (mode === 'create' && !savedCampaignId) {
        result = await createCampaignDraftAction(fd);
      } else {
        fd.append('id', savedCampaignId ?? existingCampaign!.id);
        result = await updateCampaignDraftAction(fd);
      }

      if (!result.ok) {
        const msg = mapCampaignDraftError(result.error || 'Failed to save');
        toast.error(msg);
        submissionDispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', message: msg } });
        return;
      }

      setSavedCampaignId(result.campaignId);
      markSaved();
      toast.success('Draft saved.');
      submissionDispatch({ type: 'SET_FEEDBACK', payload: { type: 'success', message: 'Draft saved successfully.' } });
    } catch (error) {
      const msg = mapCampaignDraftError(
        error instanceof Error ? error.message : 'Failed to save draft'
      );
      toast.error(msg);
      submissionDispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', message: msg } });
    } finally {
      saveInFlightRef.current = false;
      submissionDispatch({ type: 'SUBMIT_END' });
    }
  }, [
    isCustomComposer,
    composerState,
    formData,
    validateCampaignValues,
    appendCampaignFields,
    mode,
    savedCampaignId,
    existingCampaign,
    submissionDispatch,
    markSaved,
  ]);

  const onSaveForTest = useCallback(async () => {
    if (saveInFlightRef.current) return;
    saveInFlightRef.current = true;
    submissionDispatch({ type: 'SUBMIT_START' });
    try {
      const fd = new FormData();
      appendCampaignFields(fd);
      let result: { ok: true; campaignId: string } | { ok: false; error: string };
      if (mode === 'create' && !savedCampaignId) {
        result = await createCampaignDraftAction(fd);
      } else {
        fd.append('id', savedCampaignId ?? existingCampaign!.id);
        result = await updateCampaignDraftAction(fd);
      }
      if (result.ok) {
        setSavedCampaignId(result.campaignId);
        markSaved();
        toast.success('Draft saved. Opening test dialog...');
        submissionDispatch({ type: 'SET_FEEDBACK', payload: { type: 'success', message: 'Draft saved.' } });
        setShowTestDialog(true);
      } else {
        const msg = mapCampaignDraftError(result.error || 'Save draft first to send test.');
        toast.error(msg);
        submissionDispatch({ type: 'SET_FEEDBACK', payload: { type: 'error', message: msg } });
      }
    } catch (error) {
      const msg = mapCampaignDraftError(
        error instanceof Error ? error.message : 'Failed to save draft'
      );
      toast.error(msg);
    } finally {
      saveInFlightRef.current = false;
      submissionDispatch({ type: 'SUBMIT_END' });
    }
  }, [
    appendCampaignFields,
    mode,
    savedCampaignId,
    existingCampaign,
    markSaved,
    submissionDispatch,
  ]);

  const updateCampaignValue = useCallback((key: string, value: string) => {
    setCampaignVariableValues((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      const next = { ...fieldErrors };
      delete next[key];
      submissionDispatch({ type: 'SET_FIELD_ERRORS', payload: next });
    }
  }, [fieldErrors, submissionDispatch]);

  const updatePreviewValue = useCallback((key: string, value: string) => {
    setPreviewSampleValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <>
      <TemplateOverwriteDialog
        open={showTemplateOverwriteDialog}
        onOpenChange={(open) => {
          if (open) setShowTemplateOverwriteDialog(true);
          else cancelTemplateOverwrite();
        }}
        onConfirm={confirmTemplateOverwrite}
        onCancel={cancelTemplateOverwrite}
      />

      <ConvertLegacyDialog
        open={showConvertLegacyDialog}
        nestedDocumentRisk={looksLikeFullEmailDocument(formData.html_body)}
        onOpenChange={(open) => {
          if (open) setShowConvertLegacyDialog(true);
          else cancelConvertToComposer();
        }}
        onConfirm={confirmConvertToComposer}
        onCancel={cancelConvertToComposer}
      />

      {savedCampaignId && (
        <TestSendDialog
          open={showTestDialog}
          onOpenChange={setShowTestDialog}
          campaignId={savedCampaignId}
          campaignName={formData.name || 'Untitled Campaign'}
          previewVariables={mergedPreviewVariables}
        />
      )}

      <form onSubmit={handleSaveDraftOnly} className="space-y-6">
        <div className="grid min-h-0 gap-6 grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
          <ComposeFormEditor
            formData={formData}
            setFormData={setFormData}
            templates={templates}
            handleTemplateChange={handleTemplateChange}
            isCustomComposer={isCustomComposer}
            isLegacyHtml={isLegacyHtml}
            composerState={composerState}
            setComposerState={setComposerState}
            senderProfileId={senderProfileId}
            setSenderProfileId={setSenderProfileId}
            onConvertToComposer={onConvertToComposer}
            insertVariableRef={insertVariableRef}
            composerWarnings={[
              ...composerWarnings,
              ...unsupportedPreviewVars.map((key) => `Unsupported variable {{${key}}}`),
            ]}
            campaignVariables={campaignVariables}
            campaignVariableValues={campaignVariableValues}
            fieldErrors={fieldErrors}
            updateCampaignValue={updateCampaignValue}
            templateSampleValues={templateSampleValues}
            displayPreviewRecipientVariables={
              isCustomComposer
                ? CUSTOM_EMAIL_INSERTABLE_VARIABLES.filter((v) =>
                    ['first_name', 'full_name', 'college_name'].includes(v.key)
                  ).map((v) => ({ key: v.key, label: v.label, inputType: 'text' }))
                : displayPreviewRecipientVariables
            }
            displayPreviewSystemVariables={displayPreviewSystemVariables}
            previewSampleValues={previewSampleValues}
            updatePreviewValue={updatePreviewValue}
            systemOverrideVariables={systemOverrideVariables}
            feedback={feedback}
            isSubmitting={isSubmitting}
            handleSaveDraftOnly={handleSaveDraftOnly}
            handleSubmit={handleSubmit}
            onSaveForTest={onSaveForTest}
            validateCampaignValues={validateCampaignValues}
            submissionDispatch={submissionDispatch}
            savedCampaignId={savedCampaignId}
            setShowTestDialog={setShowTestDialog}
            lastSavedAt={lastSavedAt}
            isDirty={isDirty}
          />

          <ComposeFormPreview
            previewTab={previewTab}
            setPreviewTab={setPreviewTab}
            renderedPreview={renderedPreview}
            renderedTextPreview={renderedTextPreview}
            textBody={isCustomComposer ? (compiledCustomPreview?.text_body ?? '') : formData.text_body}
            mergedPreviewVariables={mergedPreviewVariables}
            unresolvedVariables={unsupportedPreviewVars}
            ctaWarnings={composerWarnings}
            senderFromHeader={
              isCustomComposer
                ? formatEmailFromHeader(
                    EMAIL_SENDER_PROFILES[senderProfileId].fromName,
                    EMAIL_SENDER_PROFILES[senderProfileId].fromEmail,
                  )
                : null
            }
            senderReplyTo={isCustomComposer ? EMAIL_SENDER_PROFILES[senderProfileId].replyTo : null}
          />
        </div>
      </form>
    </>
  );
}
