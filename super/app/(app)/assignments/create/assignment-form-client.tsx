'use client';

import { useCallback, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { createAssignmentAction } from '../actions';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';

interface AssignmentFormProps {
  colleges: Array<{ id: string; name: string; slug: string }>;
  courses: Array<{ id: string; title: string; code: string; source_label?: string | null }>;
  variants: Array<{
    id: string;
    title: string;
    code: string;
    publish_status: string;
    show_as_paid_course?: boolean;
    visibility_scope?: string | null;
    visible_college_ids?: string[];
    master_courses: { title: string };
  }>;
  bundles: Array<{
    id: string;
    title: string;
    code: string;
    publish_status: string;
    visibility_scope?: string | null;
    visible_college_ids?: string[];
  }>;
}

type FormState = {
  assignment_type: string;
  target_id: string;
  assigned_entity_type: string;
  assigned_entity_id: string;
  start_date: string;
  end_date: string;
};

type UIState = {
  isSubmitting: boolean;
  status: 'idle' | 'success' | 'error';
  statusMessage: string;
  validityOption: '6months' | '1year' | 'custom';
};

type Action =
  | { type: 'SET_FORM'; payload: Partial<FormState> }
  | { type: 'SET_UI'; payload: Partial<UIState> }
  | { type: 'RESET_FORM' };

const initialFormData: FormState = {
  assignment_type: 'college',
  target_id: '',
  assigned_entity_type: 'master_course',
  assigned_entity_id: '',
  start_date: '',
  end_date: '',
};

const initialUI: UIState = {
  isSubmitting: false,
  status: 'idle',
  statusMessage: '',
  validityOption: '6months',
};

// ── Sub-components ──────────────────────────────────────────────

function TargetSection({
  formData,
  dispatch,
  colleges,
}: {
  formData: FormState;
  dispatch: React.Dispatch<Action>;
  colleges: AssignmentFormProps['colleges'];
}) {
  return (
    <div className="space-y-4 py-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Target</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Who will receive this assignment.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Assign to</Label>
          <Select
            value={formData.assignment_type}
            onValueChange={(value) =>
              dispatch({ type: 'SET_FORM', payload: { assignment_type: value, target_id: '' } })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select target type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="college">College (all students)</SelectItem>
              <SelectItem value="student">Individual student</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>
            {formData.assignment_type === 'college' ? 'College' : 'Student'}
          </Label>
          {formData.assignment_type === 'college' ? (
            <Select
              value={formData.target_id}
              onValueChange={(value) =>
                dispatch({ type: 'SET_FORM', payload: { target_id: value } })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a college" />
              </SelectTrigger>
              <SelectContent>
                {colleges.map((college) => (
                  <SelectItem key={college.id} value={college.id}>
                    {college.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select
              value={formData.target_id}
              onValueChange={(value) =>
                dispatch({ type: 'SET_FORM', payload: { target_id: value } })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Enter student ID" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual" disabled>
                  Coming soon
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  );
}

function ContentSection({
  formData,
  dispatch,
  courses,
  filteredVariants,
  filteredBundles,
  selectedCollegeId,
}: {
  formData: FormState;
  dispatch: React.Dispatch<Action>;
  courses: AssignmentFormProps['courses'];
  filteredVariants: AssignmentFormProps['variants'];
  filteredBundles: AssignmentFormProps['bundles'];
  selectedCollegeId: string;
}) {
  return (
    <div className="space-y-4 py-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Content</h2>
        <p className="text-sm text-muted-foreground mt-0.5">What will be assigned.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Content type</Label>
          <Select
            value={formData.assigned_entity_type}
            onValueChange={(value) =>
              dispatch({ type: 'SET_FORM', payload: { assigned_entity_type: value, assigned_entity_id: '' } })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select content type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="master_course">Master course</SelectItem>
              <SelectItem value="variant">Course variant</SelectItem>
              <SelectItem value="bundle">Course bundle</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>
            {formData.assigned_entity_type === 'master_course'
              ? 'Master course'
              : formData.assigned_entity_type === 'variant'
                ? 'Course variant'
                : 'Course bundle'}
          </Label>

          {formData.assigned_entity_type === 'master_course' && (
            <Select
              value={formData.assigned_entity_id}
              onValueChange={(value) =>
                dispatch({ type: 'SET_FORM', payload: { assigned_entity_id: value } })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a master course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    <span className="flex items-center gap-2">
                      <span>{course.title} ({course.code})</span>
                      {course.source_label && (
                        <span className="text-[10px] font-medium text-primary">{course.source_label}</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {formData.assigned_entity_type === 'variant' && (
            <Select
              value={formData.assigned_entity_id}
              onValueChange={(value) =>
                dispatch({ type: 'SET_FORM', payload: { assigned_entity_id: value } })
              }
              disabled={formData.assignment_type === 'college' && !selectedCollegeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a course variant" />
              </SelectTrigger>
              <SelectContent>
                {filteredVariants.map((variant) => {
                  const scope = variant.visibility_scope ?? 'global';
                  const isSelectedCollege =
                    scope === 'selected_colleges' &&
                    selectedCollegeId &&
                    (variant.visible_college_ids ?? []).includes(selectedCollegeId);
                  return (
                    <SelectItem key={variant.id} value={variant.id}>
                      <span className="flex items-center gap-2">
                        <span>{variant.title} ({variant.code})</span>
                        {variant.show_as_paid_course && (
                          <span className="text-[10px] font-medium text-primary">Variant Paid Course</span>
                        )}
                        {scope === 'global' && (
                          <span className="text-xs text-muted-foreground">Global</span>
                        )}
                        {isSelectedCollege && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400">Matched</span>
                        )}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}

          {formData.assigned_entity_type === 'bundle' && (
            <Select
              value={formData.assigned_entity_id}
              onValueChange={(value) =>
                dispatch({ type: 'SET_FORM', payload: { assigned_entity_id: value } })
              }
              disabled={formData.assignment_type === 'college' && !selectedCollegeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a course bundle" />
              </SelectTrigger>
              <SelectContent>
                {filteredBundles.map((bundle) => {
                  const scope = bundle.visibility_scope ?? 'global';
                  const isSelectedCollege =
                    scope === 'selected_colleges' &&
                    selectedCollegeId &&
                    (bundle.visible_college_ids ?? []).includes(selectedCollegeId);
                  return (
                    <SelectItem key={bundle.id} value={bundle.id}>
                      <span className="flex items-center gap-2">
                        <span>{bundle.title} ({bundle.code})</span>
                        {scope === 'global' && (
                          <span className="text-xs text-muted-foreground">Global</span>
                        )}
                        {isSelectedCollege && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400">Matched</span>
                        )}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}

          {formData.assignment_type === 'college' && !selectedCollegeId &&
            (formData.assigned_entity_type === 'variant' || formData.assigned_entity_type === 'bundle') && (
              <p className="text-xs text-muted-foreground mt-1">
                Select a college first to see available variants and bundles.
              </p>
            )}
          {formData.assignment_type === 'college' &&
            formData.assigned_entity_type === 'bundle' &&
            selectedCollegeId &&
            filteredBundles.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                No bundles available for this college. Make a bundle global or add this college to its visibility.
              </p>
            )}
        </div>
      </div>
    </div>
  );
}

function ValiditySection({
  formData,
  dispatch,
  validityOption,
  computeEndDate,
}: {
  formData: FormState;
  dispatch: React.Dispatch<Action>;
  validityOption: UIState['validityOption'];
  computeEndDate: (startDate: string, option: '6months' | '1year') => string;
}) {
  return (
    <div className="space-y-4 py-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Validity</h2>
        <p className="text-sm text-muted-foreground mt-0.5">When this assignment starts and expires.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Duration</Label>
          <div className="flex gap-1.5 rounded-lg bg-muted/40 p-1 w-fit">
            {(['6months', '1year', 'custom'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  validityOption === option
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => {
                  dispatch({ type: 'SET_UI', payload: { validityOption: option } });
                  if (option !== 'custom') {
                    dispatch({ type: 'SET_FORM', payload: { end_date: computeEndDate(formData.start_date, option) } });
                  }
                }}
              >
                {option === '6months' ? '6 months' : option === '1year' ? '1 year' : 'Custom'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Start date</Label>
            <DatePicker
              value={formData.start_date ? new Date(formData.start_date) : undefined}
              onChange={(date) => {
                const start_date = date ? date.toISOString() : '';
                if (validityOption === 'custom') {
                  dispatch({ type: 'SET_FORM', payload: { start_date } });
                } else {
                  dispatch({
                    type: 'SET_FORM',
                    payload: {
                      start_date,
                      end_date: computeEndDate(start_date, validityOption as '6months' | '1year'),
                    },
                  });
                }
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>End date</Label>
            <DatePicker
              value={formData.end_date ? new Date(formData.end_date) : undefined}
              disabled={validityOption !== 'custom'}
              onChange={(date) =>
                dispatch({ type: 'SET_FORM', payload: { end_date: date ? date.toISOString() : '' } })
              }
            />
            {validityOption !== 'custom' && (
              <p className="text-xs text-muted-foreground">
                Auto-calculated from start date
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────

export function AssignmentForm({ colleges, courses, variants, bundles }: AssignmentFormProps) {
  const router = useRouter();

  const [state, dispatch] = useReducer(
    (prev: { form: FormState; ui: UIState }, action: Action) => {
      switch (action.type) {
        case 'SET_FORM':
          return { ...prev, form: { ...prev.form, ...action.payload } };
        case 'SET_UI':
          return { ...prev, ui: { ...prev.ui, ...action.payload } };
        case 'RESET_FORM':
          return { ...prev, form: initialFormData };
        default:
          return prev;
      }
    },
    { form: initialFormData, ui: initialUI },
  );

  const { form: formData, ui } = state;
  const { isSubmitting, status, statusMessage, validityOption } = ui;

  const computeEndDate = useCallback((startDate: string, option: '6months' | '1year') => {
    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(start);
    if (option === '6months') end.setMonth(end.getMonth() + 6);
    else end.setFullYear(end.getFullYear() + 1);
    return end.toISOString();
  }, []);

  const selectedCollegeId =
    formData.assignment_type === 'college' ? formData.target_id : '';

  const filteredVariants = variants.filter((variant) => {
    if (variant.publish_status !== 'published') return false;
    const scope = variant.visibility_scope ?? 'global';
    if (scope === 'private') return false;
    if (scope === 'selected_colleges') {
      return selectedCollegeId
        ? (variant.visible_college_ids ?? []).includes(selectedCollegeId)
        : false;
    }
    return true;
  });

  const filteredBundles = bundles.filter((bundle) => {
    if (bundle.publish_status !== 'published') return false;
    const scope = bundle.visibility_scope ?? 'global';
    if (scope === 'private') return false;
    if (scope === 'selected_colleges') {
      return selectedCollegeId
        ? (bundle.visible_college_ids ?? []).includes(selectedCollegeId)
        : false;
    }
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_UI', payload: { isSubmitting: true, status: 'idle' } });

    try {
      const result = await createAssignmentAction({
        assignment_type: formData.assignment_type as 'college' | 'student',
        target_id: formData.target_id,
        assigned_entity_type: formData.assigned_entity_type as 'variant' | 'bundle' | 'master_course',
        assigned_entity_id: formData.assigned_entity_id,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date,
      });

      if (result.success && result.data) {
        dispatch({ type: 'SET_UI', payload: { status: 'success', statusMessage: 'Assignment created. Entitlements have been generated.' } });
        setTimeout(() => router.push('/assignments'), 1500);
      } else {
        dispatch({ type: 'SET_UI', payload: { status: 'error', statusMessage: result.error || 'Failed to create assignment' } });
      }
    } catch {
      dispatch({ type: 'SET_UI', payload: { status: 'error', statusMessage: 'An unexpected error occurred' } });
    } finally {
      dispatch({ type: 'SET_UI', payload: { isSubmitting: false } });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {status !== 'idle' && (
        <div
          className={cn(
            'rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 mb-6',
            status === 'success'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-destructive/10 text-destructive border border-destructive/20'
          )}
        >
          {status === 'success' ? (
            <CheckCircle className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          {statusMessage}
        </div>
      )}

      <TargetSection formData={formData} dispatch={dispatch} colleges={colleges} />

      <div className="border-t border-border/40" />

      <ContentSection
        formData={formData}
        dispatch={dispatch}
        courses={courses}
        filteredVariants={filteredVariants}
        filteredBundles={filteredBundles}
        selectedCollegeId={selectedCollegeId}
      />

      <div className="border-t border-border/40" />

      <ValiditySection
        formData={formData}
        dispatch={dispatch}
        validityOption={validityOption}
        computeEndDate={computeEndDate}
      />

      <div className="border-t border-border/40" />

      <div className="flex items-center gap-3 pt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Create Assignment
        </Button>
      </div>
    </form>
  );
}
