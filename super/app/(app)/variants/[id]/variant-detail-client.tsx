'use client';

import { useRouter } from 'next/navigation';
import { useReducer, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Trash2, FileCheck, FileX, CheckCircle, AlertCircle, Save, Settings } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  publishVariantAction,
  unpublishVariantAction,
  deleteVariantAction,
  updateVariantAction,
} from '../actions';

/** Radix Select disallows empty string item values; use a sentinel for "no college". */
const NO_COLLEGE_SELECT_VALUE = '__none__';

interface VariantDetailClientProps {
  variant: {
    id: string;
    publish_status: string;
    pillar_id: string | null;
    title: string;
    slug: string;
    code: string;
    description: string | null;
    selling_price: number | null;
    discounted_price: number | null;
    pricing_model: string | null;
    visibility_scope: string;
    created_for_college_id: string | null;
  };
  itemCount: number;
  pillars: Array<{ id: string; title: string }>;
  colleges: Array<{ id: string; name: string }>;
  selectedCollegeIds: string[];
}

type OperationStatusState = {
  isProcessing: boolean;
  status: 'idle' | 'success' | 'error';
  statusMessage: string;
};

type OperationStatusAction =
  | { type: 'START' }
  | { type: 'SUCCESS'; message: string }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' };

const initialOperationStatusState: OperationStatusState = {
  isProcessing: false,
  status: 'idle',
  statusMessage: '',
};

function operationStatusReducer(state: OperationStatusState, action: OperationStatusAction): OperationStatusState {
  switch (action.type) {
    case 'START':
      return { ...state, isProcessing: true, status: 'idle' };
    case 'SUCCESS':
      return { isProcessing: false, status: 'success', statusMessage: action.message };
    case 'ERROR':
      return { isProcessing: false, status: 'error', statusMessage: action.message };
    case 'RESET':
      return initialOperationStatusState;
  }
}

type MetaFormState = {
  metaForm: {
    title: string;
    slug: string;
    code: string;
    description: string;
    pillar_id: string;
  };
  isSavingMeta: boolean;
  metaError: string;
};

type MetaFormAction =
  | { type: 'SET_FIELD'; field: string; value: string }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' };

function metaFormReducer(state: MetaFormState, action: MetaFormAction): MetaFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, metaForm: { ...state.metaForm, [action.field]: action.value } };
    case 'SAVE_START':
      return { ...state, isSavingMeta: true, metaError: '' };
    case 'SAVE_SUCCESS':
      return { ...state, isSavingMeta: false };
    case 'SAVE_ERROR':
      return { ...state, isSavingMeta: false, metaError: action.error };
    case 'CLEAR_ERROR':
      return { ...state, metaError: '' };
  }
}

type PricingFormState = {
  pricingForm: {
    selling_price: string;
    discounted_price: string;
    pricing_model: string;
  };
  isSavingPricing: boolean;
  pricingError: string;
};

type PricingFormAction =
  | { type: 'SET_FIELD'; field: string; value: string }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' };

function pricingFormReducer(state: PricingFormState, action: PricingFormAction): PricingFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, pricingForm: { ...state.pricingForm, [action.field]: action.value } };
    case 'SAVE_START':
      return { ...state, isSavingPricing: true, pricingError: '' };
    case 'SAVE_SUCCESS':
      return { ...state, isSavingPricing: false };
    case 'SAVE_ERROR':
      return { ...state, isSavingPricing: false, pricingError: action.error };
    case 'CLEAR_ERROR':
      return { ...state, pricingError: '' };
  }
}

type VisFormState = {
  visForm: {
    visibility_scope: string;
    created_for_college_id: string;
  };
  selectedColleges: Set<string>;
  isSavingVis: boolean;
  visError: string;
};

type VisFormAction =
  | { type: 'SET_SCOPE'; scope: string }
  | { type: 'SET_COLLEGE_ID'; id: string }
  | { type: 'TOGGLE_COLLEGE'; collegeId: string }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' };

function visFormReducer(state: VisFormState, action: VisFormAction): VisFormState {
  switch (action.type) {
    case 'SET_SCOPE':
      return { ...state, visForm: { ...state.visForm, visibility_scope: action.scope } };
    case 'SET_COLLEGE_ID':
      return { ...state, visForm: { ...state.visForm, created_for_college_id: action.id } };
    case 'TOGGLE_COLLEGE': {
      const next = new Set(state.selectedColleges);
      if (next.has(action.collegeId)) next.delete(action.collegeId);
      else next.add(action.collegeId);
      return { ...state, selectedColleges: next };
    }
    case 'SAVE_START':
      return { ...state, isSavingVis: true, visError: '' };
    case 'SAVE_SUCCESS':
      return { ...state, isSavingVis: false };
    case 'SAVE_ERROR':
      return { ...state, isSavingVis: false, visError: action.error };
    case 'CLEAR_ERROR':
      return { ...state, visError: '' };
  }
}

function VariantMetadataCard({
  metaForm,
  metaError,
  isSavingMeta,
  pillars,
  metaDispatch,
  onSave,
}: {
  metaForm: MetaFormState['metaForm'];
  metaError: string;
  isSavingMeta: boolean;
  pillars: Array<{ id: string; title: string }>;
  metaDispatch: React.Dispatch<MetaFormAction>;
  onSave: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Settings className="size-5" />Variant Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {metaError ? <div className="text-sm text-destructive font-medium p-2 bg-destructive/10 rounded">{metaError}</div> : null}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label htmlFor="variant-title">Title</Label><Input id="variant-title" value={metaForm.title} onChange={(e) => metaDispatch({ type: 'SET_FIELD', field: 'title', value: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="variant-code">Code</Label><Input id="variant-code" value={metaForm.code} onChange={(e) => metaDispatch({ type: 'SET_FIELD', field: 'code', value: e.target.value })} /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="variant-slug">Slug</Label><Input id="variant-slug" value={metaForm.slug} onChange={(e) => metaDispatch({ type: 'SET_FIELD', field: 'slug', value: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="variant-description">Description</Label><Textarea id="variant-description" value={metaForm.description} onChange={(e) => metaDispatch({ type: 'SET_FIELD', field: 'description', value: e.target.value })} rows={3} /></div>
        <div className="space-y-2">
          <Label htmlFor="variant-pillar">Display Pillar</Label>
          <Select value={metaForm.pillar_id} onValueChange={(value) => metaDispatch({ type: 'SET_FIELD', field: 'pillar_id', value })}>
            <SelectTrigger id="variant-pillar"><SelectValue placeholder="Select a pillar" /></SelectTrigger>
            <SelectContent>{pillars.map((pillar) => (<SelectItem key={pillar.id} value={pillar.id}>{pillar.title}</SelectItem>))}</SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Choose where this course variant should appear for students.</p>
        </div>
        <div className="flex justify-end"><Button onClick={onSave} disabled={isSavingMeta}>{isSavingMeta && <Loader2 className="mr-2 size-4 animate-spin" />}<Save className="mr-2 size-4" />Save Details</Button></div>
      </CardContent>
    </Card>
  );
}

function VariantPricingCard({
  pricingForm,
  pricingError,
  isSavingPricing,
  pricingDispatch,
  onSave,
}: {
  pricingForm: PricingFormState['pricingForm'];
  pricingError: string;
  isSavingPricing: boolean;
  pricingDispatch: React.Dispatch<PricingFormAction>;
  onSave: () => void;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {pricingError ? <div className="text-sm text-destructive font-medium p-2 bg-destructive/10 rounded">{pricingError}</div> : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label htmlFor="selling_price">Selling Price (₹)</Label><Input id="selling_price" type="number" min="0" step="1" value={pricingForm.selling_price} onChange={(e) => pricingDispatch({ type: 'SET_FIELD', field: 'selling_price', value: e.target.value })} placeholder="Enter price in INR" /></div>
          <div className="space-y-2"><Label htmlFor="discounted_price">Discounted Price (₹)</Label><Input id="discounted_price" type="number" min="0" step="1" value={pricingForm.discounted_price} onChange={(e) => pricingDispatch({ type: 'SET_FIELD', field: 'discounted_price', value: e.target.value })} placeholder="Enter discounted price" /></div>
        </div>
        <div className="flex justify-end"><Button onClick={onSave} disabled={isSavingPricing}>{isSavingPricing && <Loader2 className="mr-2 size-4 animate-spin" />}<Save className="mr-2 size-4" />Save Pricing</Button></div>
      </CardContent>
    </Card>
  );
}

function VariantVisibilityCard({
  visForm,
  selectedColleges,
  visError,
  isSavingVis,
  colleges,
  visDispatch,
  onSave,
}: {
  visForm: VisFormState['visForm'];
  selectedColleges: Set<string>;
  visError: string;
  isSavingVis: boolean;
  colleges: Array<{ id: string; name: string }>;
  visDispatch: React.Dispatch<VisFormAction>;
  onSave: () => void;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>Visibility</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {visError ? <div className="text-sm text-destructive font-medium p-2 bg-destructive/10 rounded">{visError}</div> : null}
        <div className="flex gap-2">
          {(['private', 'global', 'selected_colleges'] as const).map((scope) => (
            <Button key={scope} variant={visForm.visibility_scope === scope ? 'default' : 'outline'} size="sm" onClick={() => visDispatch({ type: 'SET_SCOPE', scope })}>
              {scope === 'private' ? 'Private' : scope === 'global' ? 'Global' : 'Selected Colleges'}
            </Button>
          ))}
        </div>
        {visForm.visibility_scope !== 'selected_colleges' ? (
          <div className="space-y-2">
            <Label htmlFor="created_for_college">Created For College (Lineage Only)</Label>
            <Select value={visForm.created_for_college_id || NO_COLLEGE_SELECT_VALUE} onValueChange={(value) => visDispatch({ type: 'SET_COLLEGE_ID', id: value === NO_COLLEGE_SELECT_VALUE ? '' : value })}>
              <SelectTrigger id="created_for_college"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent><SelectItem value={NO_COLLEGE_SELECT_VALUE}>None</SelectItem>{colleges.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
        ) : null}
        {visForm.visibility_scope === 'selected_colleges' && colleges.length > 0 ? (
          <div className="space-y-2">
            <Label>Allowed Colleges</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 max-h-[200px] overflow-y-auto border rounded-md p-2">
              {colleges.map((college) => (
                <label key={college.id} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-muted/50 cursor-pointer">
                  <input type="checkbox" checked={selectedColleges.has(college.id)} onChange={() => visDispatch({ type: 'TOGGLE_COLLEGE', collegeId: college.id })} className="rounded" />
                  <span className="truncate">{college.name}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <div className="flex justify-end"><Button onClick={onSave} disabled={isSavingVis}>{isSavingVis && <Loader2 className="mr-2 size-4 animate-spin" />}<Save className="mr-2 size-4" />Save Visibility</Button></div>
      </CardContent>
    </Card>
  );
}

export function VariantDetailClient({
  variant,
  itemCount,
  pillars,
  colleges,
  selectedCollegeIds,
}: VariantDetailClientProps) {
  const { push, refresh } = useRouter();
  const [opState, opDispatch] = useReducer(operationStatusReducer, initialOperationStatusState);
  const { isProcessing, status, statusMessage } = opState;

  // Metadata form
  const [metaState, metaDispatch] = useReducer(metaFormReducer, {
    metaForm: {
      title: variant.title,
      slug: variant.slug,
      code: variant.code,
      description: variant.description ?? '',
      pillar_id: variant.pillar_id ?? '',
    },
    isSavingMeta: false,
    metaError: '',
  });
  const { metaForm, isSavingMeta, metaError } = metaState;

  // Pricing form
  const [pricingState, pricingDispatch] = useReducer(pricingFormReducer, {
    pricingForm: {
      selling_price: variant.selling_price ? (variant.selling_price / 100).toString() : '',
      discounted_price: variant.discounted_price ? (variant.discounted_price / 100).toString() : '',
      pricing_model: variant.pricing_model || 'one_time',
    },
    isSavingPricing: false,
    pricingError: '',
  });
  const { pricingForm, isSavingPricing, pricingError } = pricingState;

  // Visibility form
  const [visState, visDispatch] = useReducer(visFormReducer, {
    visForm: {
      visibility_scope: variant.visibility_scope ?? 'global',
      created_for_college_id: variant.created_for_college_id ?? '',
    },
    selectedColleges: new Set(selectedCollegeIds),
    isSavingVis: false,
    visError: '',
  });
  const { visForm, selectedColleges, isSavingVis, visError } = visState;

  const handlePublish = async () => {
    if (itemCount === 0) {
      opDispatch({ type: 'ERROR', message: 'Cannot publish a variant with no selected lectures. Add items first.' });
      return;
    }

    opDispatch({ type: 'START' });
    try {
      const result = await publishVariantAction(variant.id);
      if (result.success) {
        opDispatch({ type: 'SUCCESS', message: 'Variant published successfully.' });
        refresh();
      } else {
        opDispatch({ type: 'ERROR', message: result.error || 'Failed to publish variant' });
      }
    } catch {
      opDispatch({ type: 'ERROR', message: 'An unexpected error occurred' });
    }
  };

  const handleUnpublish = async () => {
    opDispatch({ type: 'START' });
    try {
      const result = await unpublishVariantAction(variant.id);
      if (result.success) {
        opDispatch({ type: 'SUCCESS', message: 'Variant unpublished successfully.' });
        refresh();
      } else {
        opDispatch({ type: 'ERROR', message: result.error || 'Failed to unpublish variant' });
      }
    } catch {
      opDispatch({ type: 'ERROR', message: 'An unexpected error occurred' });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure? This will permanently delete the variant and all its item references. This action cannot be undone.')) return;
    
    opDispatch({ type: 'START' });
    try {
      const result = await deleteVariantAction(variant.id);
      if (result.success) {
        opDispatch({ type: 'SUCCESS', message: 'Variant deleted successfully.' });
        push('/variants');
      } else {
        opDispatch({ type: 'ERROR', message: result.error || 'Failed to delete variant' });
      }
    } catch {
      opDispatch({ type: 'ERROR', message: 'An unexpected error occurred' });
    }
  };

  const handleSaveMeta = useCallback(async () => {
    metaDispatch({ type: 'SAVE_START' });
    try {
      if (!metaForm.pillar_id) {
        metaDispatch({ type: 'SAVE_ERROR', error: 'Display Pillar is required.' });
        return;
      }

      const result = await updateVariantAction({
        id: variant.id,
        pillar_id: metaForm.pillar_id,
        title: metaForm.title,
        slug: metaForm.slug,
        code: metaForm.code,
        description: metaForm.description || undefined,
      });
      if (result.success) {
        opDispatch({ type: 'SUCCESS', message: 'Variant details updated.' });
        refresh();
      } else {
        metaDispatch({ type: 'SAVE_ERROR', error: result.error || 'Failed to update variant' });
      }
    } catch {
      metaDispatch({ type: 'SAVE_ERROR', error: 'An unexpected error occurred' });
    }
  }, [variant.id, metaForm, refresh]);

  const handleSavePricing = async () => {
    pricingDispatch({ type: 'CLEAR_ERROR' });

    const sellingPrice = pricingForm.selling_price ? parseFloat(pricingForm.selling_price) : null;
    const discountedPrice = pricingForm.discounted_price ? parseFloat(pricingForm.discounted_price) : null;

    if (sellingPrice !== null && sellingPrice < 0) {
      pricingDispatch({ type: 'SAVE_ERROR', error: 'Selling price cannot be negative' });
      return;
    }
    if (discountedPrice !== null && discountedPrice < 0) {
      pricingDispatch({ type: 'SAVE_ERROR', error: 'Discounted price cannot be negative' });
      return;
    }
    if (sellingPrice !== null && discountedPrice !== null && discountedPrice > sellingPrice) {
      pricingDispatch({ type: 'SAVE_ERROR', error: 'Discounted price cannot exceed selling price' });
      return;
    }

    pricingDispatch({ type: 'SAVE_START' });
    try {
      const result = await updateVariantAction({
        id: variant.id,
        selling_price: sellingPrice !== null ? Math.round(sellingPrice * 100) : undefined,
        discounted_price: discountedPrice !== null ? Math.round(discountedPrice * 100) : undefined,
        pricing_model: pricingForm.pricing_model || undefined,
      });

      if (result.success) {
        opDispatch({ type: 'SUCCESS', message: 'Pricing updated successfully.' });
        refresh();
      } else {
        pricingDispatch({ type: 'SAVE_ERROR', error: result.error || 'Failed to update pricing' });
      }
    } catch {
      pricingDispatch({ type: 'SAVE_ERROR', error: 'An unexpected error occurred' });
    }
  };

  const handleSaveVisibility = useCallback(async () => {
    visDispatch({ type: 'CLEAR_ERROR' });
    visDispatch({ type: 'SAVE_START' });
    try {
      const result = await updateVariantAction({
        id: variant.id,
        visibility_scope: visForm.visibility_scope as 'private' | 'global' | 'selected_colleges',
        created_for_college_id: visForm.created_for_college_id || null,
        visible_college_ids: visForm.visibility_scope === 'selected_colleges' ? Array.from(selectedColleges) : undefined,
      });
      if (result.success) {
        opDispatch({ type: 'SUCCESS', message: 'Visibility updated.' });
        refresh();
      } else {
        visDispatch({ type: 'SAVE_ERROR', error: result.error || 'Failed to update visibility' });
      }
    } catch {
      visDispatch({ type: 'SAVE_ERROR', error: 'An unexpected error occurred' });
    }
  }, [variant.id, visForm, selectedColleges, refresh]);

  return (
    <div className="space-y-4">
      {variant.publish_status === 'published' ? (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3">
          <div className="text-sm font-medium text-amber-900">Editing published content may affect assigned colleges/students.</div>
        </div>
      ) : null}
      {status !== 'idle' ? (
        <Card className={status === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-destructive/10 border-destructive/30'}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {status === 'success' ? (
                <CheckCircle className="size-5 text-emerald-600" />
              ) : (
                <AlertCircle className="size-5 text-destructive" />
              )}
              <p className={status === 'success' ? 'text-emerald-800 font-medium' : 'text-destructive font-medium'}>
                {statusMessage}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Metadata Editor */}
      <VariantMetadataCard metaForm={metaForm} metaError={metaError} isSavingMeta={isSavingMeta} pillars={pillars} metaDispatch={metaDispatch} onSave={handleSaveMeta} />

      {/* Pricing */}
      <VariantPricingCard pricingForm={pricingForm} pricingError={pricingError} isSavingPricing={isSavingPricing} pricingDispatch={pricingDispatch} onSave={handleSavePricing} />

      {/* Visibility */}
      <VariantVisibilityCard visForm={visForm} selectedColleges={selectedColleges} visError={visError} isSavingVis={isSavingVis} colleges={colleges} visDispatch={visDispatch} onSave={handleSaveVisibility} />

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          {variant.publish_status !== 'published' ? (
            <Button onClick={handlePublish} disabled={isProcessing || itemCount === 0}>
              {isProcessing && <Loader2 className="mr-2 size-4 animate-spin" />}
              <FileCheck className="mr-2 size-4" />
              Publish Variant
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleUnpublish}
              disabled={isProcessing}
            >
              {isProcessing && <Loader2 className="mr-2 size-4 animate-spin" />}
              <FileX className="mr-2 size-4" />
              Unpublish
            </Button>
          )}

          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isProcessing || variant.publish_status === 'published'}
            title={variant.publish_status === 'published' ? 'Published variants cannot be deleted.' : undefined}
          >
            {isProcessing && <Loader2 className="mr-2 size-4 animate-spin" />}
            <Trash2 className="mr-2 size-4" />
            Delete Variant
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
