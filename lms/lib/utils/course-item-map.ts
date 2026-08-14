/**
 * O(1) lookup utilities for course modules and items.
 * Replaces O(n*m) nested loops with Map-based lookups.
 */

import type { CourseForStudent, CurriculumItem } from '@/types/student-runtime';

export interface CourseItemMap {
  itemMap: Map<string, CurriculumItem>;
  moduleMap: Map<string, CourseForStudent['modules'][0]>;
  itemToModuleMap: Map<string, string>;
  visibleItems: CurriculumItem[];
  itemIndexMap: Map<string, number>;
}

export function buildCourseItemMap(course: CourseForStudent): CourseItemMap {
  const itemMap = new Map<string, CurriculumItem>();
  const moduleMap = new Map<string, CourseForStudent['modules'][0]>();
  const itemToModuleMap = new Map<string, string>();
  const visibleItems: CurriculumItem[] = [];
  const itemIndexMap = new Map<string, number>();

  for (const mod of course.modules) {
    if (mod.visible_to_students === false) continue;
    moduleMap.set(mod.id, mod);
    for (const item of mod.items) {
      itemMap.set(item.id, item);
      itemToModuleMap.set(item.id, mod.id);
      visibleItems.push(item);
      itemIndexMap.set(item.id, visibleItems.length - 1);
    }
  }

  return { itemMap, moduleMap, itemToModuleMap, visibleItems, itemIndexMap };
}

export function getAdjacentItems(map: CourseItemMap, itemId: string) {
  const index = map.itemIndexMap.get(itemId);
  if (index === undefined) return { prev: null, next: null };
  return {
    prev: index > 0 ? map.visibleItems[index - 1] : null,
    next: index < map.visibleItems.length - 1 ? map.visibleItems[index + 1] : null,
  };
}

export function getItemById(map: CourseItemMap, itemId: string): CurriculumItem | undefined {
  return map.itemMap.get(itemId);
}

export function getModuleForItem(map: CourseItemMap, itemId: string) {
  const moduleId = map.itemToModuleMap.get(itemId);
  return moduleId ? map.moduleMap.get(moduleId) : undefined;
}