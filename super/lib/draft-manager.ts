/**
 * Draft Manager - localStorage-based draft caching for SuperAdmin
 * 
 * Stores all edits in localStorage, only calls DB on Publish.
 * Prevents unnecessary DB calls on every change.
 * 
 * Usage:
 * 1. On every edit: saveDraft('course', courseId, formData)
 * 2. On page load: const draft = loadDraft('course', courseId)
 * 3. On publish: await publishDraft('course', courseId, () => callPublishAPI())
 * 4. On discard: clearDraft('course', courseId)
 */

export interface DraftData<T = unknown> {
  data: T;
  savedAt: number;
  isDirty: boolean;
}

const DRAFT_PREFIX = 'draft';
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getDraftKey(entity: string, id: string): string {
  return `${DRAFT_PREFIX}:${entity}:${id}`;
}

function isDraftExpired(savedAt: number): boolean {
  return Date.now() - savedAt > DRAFT_TTL_MS;
}

/**
 * Save draft data to localStorage
 */
export function saveDraft<T>(entity: string, id: string, data: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getDraftKey(entity, id);
    const draft: DraftData<T> = {
      data,
      savedAt: Date.now(),
      isDirty: true,
    };
    localStorage.setItem(key, JSON.stringify(draft));
  } catch (error) {
    console.warn('[DraftManager] Failed to save draft:', error);
  }
}

/**
 * Load draft data from localStorage
 */
export function loadDraft<T>(entity: string, id: string): DraftData<T> | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = getDraftKey(entity, id);
    const raw = localStorage.getItem(key);
    
    if (!raw) return null;
    
    const draft = JSON.parse(raw) as DraftData<T>;
    
    // Check if expired
    if (isDraftExpired(draft.savedAt)) {
      localStorage.removeItem(key);
      return null;
    }
    
    return draft;
  } catch (error) {
    console.warn('[DraftManager] Failed to load draft:', error);
    return null;
  }
}

/**
 * Check if draft exists and is valid
 */
export function hasDraft(entity: string, id: string): boolean {
  const draft = loadDraft(entity, id);
  return draft !== null && draft.isDirty;
}

/**
 * Clear draft from localStorage
 */
export function clearDraft(entity: string, id: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getDraftKey(entity, id);
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('[DraftManager] Failed to clear draft:', error);
  }
}

/**
 * Mark draft as saved (not dirty) - call after successful publish
 */
export function markDraftAsSaved<T>(entity: string, id: string, data?: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = getDraftKey(entity, id);
    const existing = loadDraft<T>(entity, id);
    
    if (existing || data) {
      const draft: DraftData<T> = {
        data: (data ?? existing?.data) as T,
        savedAt: Date.now(),
        isDirty: false,
      };
      localStorage.setItem(key, JSON.stringify(draft));
    }
  } catch (error) {
    console.warn('[DraftManager] Failed to mark draft as saved:', error);
  }
}

/**
 * Publish draft - calls the provided publish function and clears draft on success
 */
export async function publishDraft<T>(
  entity: string,
  id: string,
  publishFn: () => Promise<T>
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const result = await publishFn();
    // Clear draft after successful publish
    clearDraft(entity, id);
    return { success: true, data: result };
  } catch (error) {
    console.error('[DraftManager] Publish failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get all drafts for an entity (useful for showing "You have X drafts" UI)
 */
export function getAllDrafts(entity: string): Array<{ id: string; savedAt: number; isDirty: boolean }> {
  if (typeof window === 'undefined') return [];
  
  const drafts: Array<{ id: string; savedAt: number; isDirty: boolean }> = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${DRAFT_PREFIX}:${entity}:`)) {
        const id = key.replace(`${DRAFT_PREFIX}:${entity}:`, '');
        const draft = loadDraft(entity, id);
        if (draft) {
          drafts.push({ id, savedAt: draft.savedAt, isDirty: draft.isDirty });
        }
      }
    }
  } catch (error) {
    console.warn('[DraftManager] Failed to get all drafts:', error);
  }
  
  return drafts;
}

/**
 * Clear all expired drafts (utility for cleanup)
 */
export function clearExpiredDrafts(entity: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${DRAFT_PREFIX}:${entity}:`)) {
        const id = key.replace(`${DRAFT_PREFIX}:${entity}:`, '');
        const draft = loadDraft(entity, id);
        if (draft && isDraftExpired(draft.savedAt)) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch (error) {
    console.warn('[DraftManager] Failed to clear expired drafts:', error);
  }
}