'use client';

import type { ReactNode } from 'react';
import { useState, useCallback, useMemo, useTransition, useEffect, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Layers,
  BookOpen,
  GitBranch,
  Video,
  FileText,
  Link2,
  Loader2,
  X,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  Package,
} from 'lucide-react';
import {
  fetchPillarsForBundlePicker,
  fetchCoursesForPillar,
  fetchPaidCoursesForBundlePicker,
  fetchCourseDetailsForBundlePicker,
  fetchBundlesForBundlePicker,
  type PickerPillar,
  type PickerCourse,
  type PickerCourseVariant,
  type PickerCourseModule,
  type PickerBundle,
} from '../actions-picker';
import { addBundleItemsAction, importBundleContentsAction } from '../actions';

interface BundleContentPickerProps {
  bundleId: string;
  existingItems: Array<{ item_type: string; reference_id: string }>;
}

interface CartItem {
  item_type: 'variant' | 'master_course' | 'master_course_item' | 'bundle';
  reference_id: string;
  label: string;
  sublabel: string;
}

type LoadingState = { loadingPillars: boolean; loadingCourses: boolean; loadingDetails: boolean };
type LoadingAction =
  | { type: 'PILLARS_START' }
  | { type: 'PILLARS_END' }
  | { type: 'COURSES_START' }
  | { type: 'COURSES_END' }
  | { type: 'DETAILS_START' }
  | { type: 'DETAILS_END' };

function loadingReducer(state: LoadingState, action: LoadingAction): LoadingState {
  switch (action.type) {
    case 'PILLARS_START': return { ...state, loadingPillars: true };
    case 'PILLARS_END': return { ...state, loadingPillars: false };
    case 'COURSES_START': return { ...state, loadingCourses: true };
    case 'COURSES_END': return { ...state, loadingCourses: false };
    case 'DETAILS_START': return { ...state, loadingDetails: true };
    case 'DETAILS_END': return { ...state, loadingDetails: false };
    default: return state;
  }
}

type InitialDataAction =
  | { type: 'SET_PILLARS'; pillars: PickerPillar[] }
  | { type: 'SET_COURSES'; courses: PickerCourse[] }
  | { type: 'SET_COURSE_DETAILS'; variants: PickerCourseVariant[]; modules: PickerCourseModule[] }
  | { type: 'SET_BUNDLES'; bundles: PickerBundle[] }
  | { type: 'LOAD_INITIAL_DATA'; pillars: PickerPillar[]; bundles: PickerBundle[] }
  | { type: 'SET_CART'; cart: CartItem[] }
  | { type: 'UPDATE_CART'; updater: (prev: CartItem[]) => CartItem[] };

type PickerDataState = {
  pillars: PickerPillar[];
  courses: PickerCourse[];
  courseVariants: PickerCourseVariant[];
  courseModules: PickerCourseModule[];
  bundles: PickerBundle[];
  cart: CartItem[];
};

function pickerDataReducer(state: PickerDataState, action: InitialDataAction): PickerDataState {
  switch (action.type) {
    case 'SET_PILLARS': return { ...state, pillars: action.pillars };
    case 'SET_COURSES': return { ...state, courses: action.courses };
    case 'SET_COURSE_DETAILS': return { ...state, courseVariants: action.variants, courseModules: action.modules };
    case 'SET_BUNDLES': return { ...state, bundles: action.bundles };
    case 'LOAD_INITIAL_DATA': return { ...state, pillars: action.pillars, bundles: action.bundles };
    case 'SET_CART': return { ...state, cart: action.cart };
    case 'UPDATE_CART': return { ...state, cart: action.updater(state.cart) };
    default: return state;
  }
}

interface PillarSidebarProps {
  pillars: PickerPillar[];
  loadingPillars: boolean;
  selectedPillarId: string | null;
  courseSource: string | null;
  handleSelectPillar: (id: string) => void;
  handleSelectPaidCourses: () => void;
  bundles: PickerBundle[];
  selectedSourceBundleId: string | null;
  setSelectedSourceBundleId: (id: string | null) => void;
  handleImportBundleContents: () => void;
  isPending: boolean;
  existingRefSet: Set<string>;
  cartRefSet: Set<string>;
  addToCart: (item: CartItem) => void;
}

function PillarSidebar({
  pillars, loadingPillars, selectedPillarId, courseSource,
  handleSelectPillar, handleSelectPaidCourses,
  bundles, selectedSourceBundleId, setSelectedSourceBundleId,
  handleImportBundleContents, isPending, existingRefSet, cartRefSet, addToCart,
}: PillarSidebarProps) {
  return (
    <div className="space-y-3 md:col-span-1">
      <div className="border rounded-md">
        <div className="px-3 py-2 border-b bg-muted/30 space-y-2">
          <p className="text-xs font-medium">Course Sources</p>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={handleSelectPaidCourses}
              className={`w-full text-left px-2.5 py-1.5 rounded text-sm flex items-center justify-between ${
                courseSource === 'paid_courses' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'
              }`}
            >
              <span className="truncate">Paid Courses</span>
              <Badge variant="outline" className="text-[10px] ml-2 shrink-0">Builder</Badge>
            </button>
          </div>
          <p className="text-[10px] font-medium text-muted-foreground pt-1">Pillars</p>
        </div>
        <ScrollArea className="h-[240px]">
          {loadingPillars ? (
            <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="p-1">
              {pillars.map((p) => (
                <button type="button"
                  key={p.id}
                  onClick={() => handleSelectPillar(p.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-sm flex items-center justify-between ${
                    courseSource === 'pillar' && selectedPillarId === p.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'
                  }`}
                >
                  <span className="truncate">{p.title}</span>
                  <Badge variant="outline" className="text-[10px] ml-2 shrink-0">{p.course_count}</Badge>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between text-xs">
            <span className="flex items-center gap-2">
              <Package className="size-3" />
              Import from Bundle
            </span>
            <ChevronDown className="size-3" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border rounded-md mt-2">
          <ScrollArea className="h-[160px]">
            {bundles.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">No bundles available</div>
            ) : (
              <div className="p-1">
                {bundles.map((bundle) => {
                  const isSelected = selectedSourceBundleId === bundle.id;
                  const bundleAdded = existingRefSet.has(`bundle:${bundle.id}`) || cartRefSet.has(`bundle:${bundle.id}`);
                  return (
                    <div key={bundle.id} className="space-y-1">
                      <button type="button"
                        onClick={() => setSelectedSourceBundleId(isSelected ? null : bundle.id)}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-1 ${
                          isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                        }`}
                      >
                        <Package className="size-3 shrink-0" />
                        <span className="flex-1 truncate">{bundle.title}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">{bundle.item_count}</Badge>
                      </button>
                      {isSelected && (
                        <div className="px-2 pb-1 space-y-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full text-[10px] h-6 justify-start"
                            onClick={() => {
                              addToCart({
                                item_type: 'bundle',
                                reference_id: bundle.id,
                                label: bundle.title,
                                sublabel: 'Nested Bundle',
                              });
                              setSelectedSourceBundleId(null);
                            }}
                            disabled={bundleAdded}
                          >
                            <Plus className="size-3 mr-1" />
                            {bundleAdded ? 'Already added' : 'Add as Bundle'}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          {selectedSourceBundleId && (
            <div className="p-2 border-t">
              <p className="text-[10px] text-muted-foreground mb-2">
                This imports the selected bundle&apos;s contents. It does not create a nested bundle reference.
              </p>
              <Button
                size="sm"
                className="w-full text-xs"
                onClick={handleImportBundleContents}
                disabled={isPending}
              >
                {isPending && <Loader2 className="mr-1 size-3 animate-spin" />}
                Import contents
              </Button>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface CourseListPanelProps {
  courseSource: string | null;
  selectedPillarId: string | null;
  paidCourseSearch: string;
  setPaidCourseSearch: (v: string) => void;
  courses: PickerCourse[];
  loadingCourses: boolean;
  expandedCourseId: string | null;
  handleExpandCourse: (id: string) => void;
  loadingDetails: boolean;
  courseVariants: PickerCourseVariant[];
  courseModules: PickerCourseModule[];
  isAlreadyAdded: (type: string, id: string) => boolean;
  addToCart: (item: CartItem) => void;
}

function CourseListPanel({
  courseSource, selectedPillarId, paidCourseSearch, setPaidCourseSearch,
  courses, loadingCourses, expandedCourseId, handleExpandCourse,
  loadingDetails, courseVariants, courseModules, isAlreadyAdded, addToCart,
}: CourseListPanelProps) {
  return (
    <div className="border rounded-md md:col-span-3 min-w-0 overflow-hidden">
      <div className="px-3 py-2 border-b bg-muted/30 space-y-2">
        <p className="text-xs font-medium">
          {courseSource === 'paid_courses' ? 'Paid Course Builder' : selectedPillarId ? 'Pillar Courses' : 'Select a pillar or Paid Courses'}
        </p>
        {courseSource === 'paid_courses' ? (
          <Input value={paidCourseSearch} onChange={(e) => setPaidCourseSearch(e.target.value)} placeholder="Search paid courses..." className="h-8 text-xs" />
        ) : null}
      </div>
      <ScrollArea className="h-[min(480px,60vh)]">
        {loadingCourses ? (
          <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : courseSource === 'pillar' && !selectedPillarId ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Choose a pillar or Paid Courses to browse courses.</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {courseSource === 'paid_courses' ? 'No paid courses found.' : 'No courses in this pillar.'}
          </div>
        ) : (
          <div className="p-1 space-y-0.5 min-w-0">
            {courses.map((course) => {
              const courseAdded = isAlreadyAdded('master_course', course.id);
              const isExpanded = expandedCourseId === course.id;
              return (
                <div key={course.id} className="min-w-0">
                  <PickerActionRow
                    leading={
                      <button type="button" onClick={() => handleExpandCourse(course.id)} className="shrink-0" aria-expanded={isExpanded}>
                        {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </button>
                    }
                    icon={<BookOpen className="size-3.5 text-muted-foreground shrink-0" />}
                    title={course.title}
                    meta={
                      <>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${course.course_source === 'paid_course_builder' ? 'border-orange-500/30 text-orange-700 dark:text-orange-300' : ''}`}>
                          {course.course_source === 'paid_course_builder' ? 'Paid Course' : 'Pillar Course'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] shrink-0">{course.module_count} mod</Badge>
                      </>
                    }
                    action={
                      courseAdded ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px] border-0 whitespace-nowrap">Added</Badge>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2 whitespace-nowrap"
                          onClick={() => addToCart({ item_type: 'master_course', reference_id: course.id, label: course.title, sublabel: course.course_source === 'paid_course_builder' ? 'Paid Course' : 'Pillar Course' })}>
                          <Plus className="size-3 mr-1" /> Course
                        </Button>
                      )
                    }
                  />
                  {isExpanded && (
                    <div className="ml-6 mb-2 space-y-1">
                      {loadingDetails ? (
                        <div className="py-3 flex justify-center"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div>
                      ) : (
                        <>
                          {courseVariants.length > 0 && (
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-medium text-muted-foreground px-2 pt-1">VARIANTS</p>
                              {courseVariants.map((v) => {
                                const vAdded = isAlreadyAdded('variant', v.id);
                                return (
                                  <PickerActionRow key={v.id} className="hover:bg-muted/30"
                                    icon={<GitBranch className="size-3 text-purple-500 shrink-0" />}
                                    title={v.title}
                                    meta={<Badge variant="outline" className="text-[10px] shrink-0">{v.item_count} items</Badge>}
                                    action={
                                      vAdded ? (
                                        <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px] border-0 whitespace-nowrap">Added</Badge>
                                      ) : (
                                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2 whitespace-nowrap"
                                          onClick={() => addToCart({ item_type: 'variant', reference_id: v.id, label: v.title, sublabel: 'Variant' })}>
                                          <Plus className="size-3 mr-1" /> Variant
                                        </Button>
                                      )
                                    }
                                  />
                                );
                              })}
                              <Separator className="my-1" />
                            </div>
                          )}
                          {courseModules.map((mod) => (
                            <ModuleSection key={mod.id} mod={mod} isAlreadyAdded={isAlreadyAdded} addToCart={addToCart} courseName={courses.find((c) => c.id === expandedCourseId)?.title ?? ''} />
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export function BundleContentPicker({ bundleId, existingItems }: BundleContentPickerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [selectedPillarId, setSelectedPillarId] = useState<string | null>(null);
  const [courseSource, setCourseSource] = useState<'pillar' | 'paid_courses'>('pillar');
  const [paidCourseSearch, setPaidCourseSearch] = useState('');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [selectedSourceBundleId, setSelectedSourceBundleId] = useState<string | null>(null);

  const [{ loadingPillars, loadingCourses, loadingDetails }, loadingDispatch] = useReducer(loadingReducer, {
    loadingPillars: true,
    loadingCourses: false,
    loadingDetails: false,
  });

  const [pickerData, pickerDispatch] = useReducer(pickerDataReducer, {
    pillars: [],
    courses: [],
    courseVariants: [],
    courseModules: [],
    bundles: [],
    cart: [],
  });
  const { pillars, courses, courseVariants, courseModules, bundles, cart } = pickerData;
  const _setPillars = (p: PickerPillar[]) => pickerDispatch({ type: 'SET_PILLARS', pillars: p });
  const setCourses = (c: PickerCourse[]) => pickerDispatch({ type: 'SET_COURSES', courses: c });
  const _setBundles = (b: PickerBundle[]) => pickerDispatch({ type: 'SET_BUNDLES', bundles: b });

  const existingRefSet = useMemo(() => new Set(existingItems.map((i) => `${i.item_type}:${i.reference_id}`)), [existingItems]);
  const cartRefSet = useMemo(() => new Set(cart.map((c) => `${c.item_type}:${c.reference_id}`)), [cart]);

  const isAlreadyAdded = useCallback(
    (type: string, refId: string) => existingRefSet.has(`${type}:${refId}`) || cartRefSet.has(`${type}:${refId}`),
    [existingRefSet, cartRefSet],
  );

  useEffect(() => {
    fetchPillarsForBundlePicker().then((res) => {
      const fetchedPillars = 'pillars' in res ? res.pillars : [];
      pickerDispatch({ type: 'SET_PILLARS', pillars: fetchedPillars });
      loadingDispatch({ type: 'PILLARS_END' });
    });
    fetchBundlesForBundlePicker(bundleId).then((res) => {
      if ('bundles' in res) pickerDispatch({ type: 'SET_BUNDLES', bundles: res.bundles });
    });
  }, [bundleId]);

  const handleImportBundleContents = useCallback(() => {
    if (!selectedSourceBundleId) return;
    startTransition(async () => {
      setFeedback(null);
      const result = await importBundleContentsAction(bundleId, selectedSourceBundleId);
      if (result.success && result.data) {
        setFeedback({
          type: 'success',
          message: `Imported ${result.data.importedItemCount} items from "${result.data.sourceBundleTitle}". Skipped ${result.data.skippedDuplicateCount} duplicates.`,
        });
        setSelectedSourceBundleId(null);
        router.refresh();
      } else {
        setFeedback({ type: 'error', message: result.error ?? 'Failed to import bundle contents' });
      }
    });
  }, [bundleId, selectedSourceBundleId, router]);

  const handleSelectPillar = useCallback((pillarId: string) => {
    setCourseSource('pillar');
    setSelectedPillarId(pillarId);
    setExpandedCourseId(null);
    pickerDispatch({ type: 'SET_COURSE_DETAILS', variants: [], modules: [] });
    loadingDispatch({ type: 'COURSES_START' });
    fetchCoursesForPillar(pillarId).then((res) => {
      if ('courses' in res) setCourses(res.courses);
      loadingDispatch({ type: 'COURSES_END' });
    });
  }, []);

  const handleSelectPaidCourses = useCallback(() => {
    setCourseSource('paid_courses');
    setSelectedPillarId(null);
    setExpandedCourseId(null);
    pickerDispatch({ type: 'SET_COURSE_DETAILS', variants: [], modules: [] });
    loadingDispatch({ type: 'COURSES_START' });
    fetchPaidCoursesForBundlePicker(paidCourseSearch).then((res) => {
      if ('courses' in res) setCourses(res.courses);
      loadingDispatch({ type: 'COURSES_END' });
    });
  }, [paidCourseSearch]);

  useEffect(() => {
    if (courseSource !== 'paid_courses') return;
    const timer = setTimeout(() => {
      loadingDispatch({ type: 'COURSES_START' });
      fetchPaidCoursesForBundlePicker(paidCourseSearch).then((res) => {
        if ('courses' in res) setCourses(res.courses);
        loadingDispatch({ type: 'COURSES_END' });
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [paidCourseSearch, courseSource]);

  const handleExpandCourse = useCallback((courseId: string) => {
    if (expandedCourseId === courseId) {
      setExpandedCourseId(null);
      return;
    }
    setExpandedCourseId(courseId);
    loadingDispatch({ type: 'DETAILS_START' });
    fetchCourseDetailsForBundlePicker(courseId).then((res) => {
      if ('variants' in res) {
        pickerDispatch({ type: 'SET_COURSE_DETAILS', variants: res.variants, modules: res.modules });
      }
      loadingDispatch({ type: 'DETAILS_END' });
    });
  }, [expandedCourseId]);

  const addToCart = useCallback((item: CartItem) => {
    pickerDispatch({
      type: 'UPDATE_CART',
      updater: (prev) => {
        const key = `${item.item_type}:${item.reference_id}`;
        if (prev.some((c) => `${c.item_type}:${c.reference_id}` === key)) return prev;
        return [...prev, item];
      },
    });
  }, []);

  const removeFromCart = useCallback((index: number) => {
    pickerDispatch({
      type: 'UPDATE_CART',
      updater: (prev) => prev.filter((_, i) => i !== index),
    });
  }, []);

  const handleSubmitCart = useCallback(() => {
    if (cart.length === 0) return;
    startTransition(async () => {
      setFeedback(null);
      const result = await addBundleItemsAction({
        bundle_id: bundleId,
        items: cart.map((c, i) => ({
          item_type: c.item_type,
          reference_id: c.reference_id,
          sort_order: existingItems.length + i,
        })),
      });

      if (result.success) {
        setFeedback({ type: 'success', message: `Added ${cart.length} item(s) to bundle.` });
        pickerDispatch({ type: 'SET_CART', cart: [] });
        router.refresh();
      } else {
        setFeedback({ type: 'error', message: result.error ?? 'Failed to add items' });
      }
    });
  }, [cart, bundleId, existingItems.length, router]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Add Content</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Browse pillar courses, paid course builder products, variants, and items to compose this bundle.
          </p>
        </div>
        {cart.length > 0 && (
          <Button onClick={handleSubmitCart} disabled={isPending} size="sm">
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            <ShoppingCart className="mr-2 size-4" />
            Add {cart.length} to Bundle
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {feedback && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-destructive/10 text-destructive border border-destructive/20'
          }`}>
            {feedback.type === 'success' ? <CheckCircle className="size-3.5 shrink-0" /> : <AlertCircle className="size-3.5 shrink-0" />}
            {feedback.message}
          </div>
        )}

        {/* Cart preview */}
        {cart.length > 0 && (
          <div className="border rounded-md p-3 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Cart ({cart.length} item{cart.length !== 1 ? 's' : ''})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {cart.map((c, i) => (
                <Badge key={`${c.item_type}:${c.reference_id}`} variant="secondary" className="flex items-center gap-1 pr-1">
                  <TypeIcon type={c.item_type} />
                  <span className="max-w-[150px] truncate">{c.label}</span>
                  <button type="button"
                    onClick={() => removeFromCart(i)}
                    className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <PillarSidebar
            pillars={pillars}
            loadingPillars={loadingPillars}
            selectedPillarId={selectedPillarId}
            courseSource={courseSource}
            handleSelectPillar={handleSelectPillar}
            handleSelectPaidCourses={handleSelectPaidCourses}
            bundles={bundles}
            selectedSourceBundleId={selectedSourceBundleId}
            setSelectedSourceBundleId={setSelectedSourceBundleId}
            handleImportBundleContents={handleImportBundleContents}
            isPending={isPending}
            existingRefSet={existingRefSet}
            cartRefSet={cartRefSet}
            addToCart={addToCart}
          />

          <CourseListPanel
            courseSource={courseSource}
            selectedPillarId={selectedPillarId}
            paidCourseSearch={paidCourseSearch}
            setPaidCourseSearch={setPaidCourseSearch}
            courses={courses}
            loadingCourses={loadingCourses}
            expandedCourseId={expandedCourseId}
            handleExpandCourse={handleExpandCourse}
            loadingDetails={loadingDetails}
            courseVariants={courseVariants}
            courseModules={courseModules}
            isAlreadyAdded={isAlreadyAdded}
            addToCart={addToCart}
          />
        </div>
      </div>
    </div>
  );
}

function ModuleSection({
  mod,
  isAlreadyAdded,
  addToCart,
  courseName,
}: {
  mod: PickerCourseModule;
  isAlreadyAdded: (type: string, refId: string) => boolean;
  addToCart: (item: CartItem) => void;
  courseName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted/30 w-full text-left text-sm">
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        <Layers className="size-3 text-muted-foreground" />
        <span className="flex-1 truncate font-medium">{mod.title}</span>
        <Badge variant="secondary" className="text-[10px]">{mod.items.length}</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-6 space-y-0.5 pb-1">
          {mod.items.map((item) => {
            const added = isAlreadyAdded('master_course_item', item.id);
            return (
              <PickerActionRow
                key={item.id}
                className={added ? 'opacity-50' : 'hover:bg-muted/20'}
                icon={<ItemTypeIcon type={item.item_type} />}
                title={item.title}
                meta={
                  item.duration_seconds != null && item.duration_seconds > 0 ? (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {Math.floor(item.duration_seconds / 60)}m
                    </span>
                  ) : null
                }
                action={
                  added ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px] border-0 whitespace-nowrap">
                      Added
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2 whitespace-nowrap"
                      onClick={() => addToCart({
                        item_type: 'master_course_item',
                        reference_id: item.id,
                        label: item.title,
                        sublabel: `${courseName} / ${mod.title}`,
                      })}
                    >
                      <Plus className="size-3 mr-1" /> Add
                    </Button>
                  )
                }
              />
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function PickerActionRow({
  leading,
  icon,
  title,
  meta,
  action,
  className = '',
}: {
  leading?: ReactNode;
  icon?: ReactNode;
  title: string;
  meta?: ReactNode;
  action: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2 py-1.5 rounded min-w-0 ${className}`}
    >
      <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
        {leading}
        {icon}
        <span className="min-w-0 flex-1 truncate text-sm" title={title}>
          {title}
        </span>
        {meta}
      </div>
      <div className="shrink-0 justify-self-end">{action}</div>
    </div>
  );
}

function TypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'master_course': return <BookOpen className="size-3 text-blue-500" />;
    case 'variant': return <GitBranch className="size-3 text-purple-500" />;
    case 'bundle': return <Package className="size-3 text-green-500" />;
    default: return <FileText className="size-3 text-orange-500" />;
  }
}

function ItemTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'video': return <Video className="size-3 text-blue-400" />;
    case 'document': return <FileText className="size-3 text-orange-400" />;
    case 'pdf': return <FileText className="size-3 text-red-400" />;
    case 'markdown': return <FileText className="size-3 text-blue-400" />;
    case 'external_link': return <Link2 className="size-3 text-purple-400" />;
    case 'note': return <FileText className="size-3 text-amber-400" />;
    case 'worksheet': return <FileText className="size-3 text-orange-400" />;
    case 'resource': return <FileText className="size-3 text-orange-400" />;
    default: return <FileText className="size-3 text-muted-foreground" />;
  }
}
