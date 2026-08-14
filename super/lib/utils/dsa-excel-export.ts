import * as XLSX from 'xlsx';
import type { DsaSheetWithData, DsaProblem } from '@/types/dsa';

/**
 * Exports a DSA Sheet to an Excel (.xlsx) file.
 * Groups problems strictly category-by-category in order.
 * Columns: Category | Problem Name | Difficulty | LeetCode URL | YouTube URL | Resource URL | Notes
 */
export function exportSheetToExcel(sheet: DsaSheetWithData) {
  const headers = [
    'Category',
    'Problem Name',
    'Difficulty',
    'LeetCode URL',
    'YouTube URL',
    'Resource URL',
    'Notes',
  ];

  const rows: (string | number)[][] = [headers];
  const categories = sheet.categories || [];

  for (const cat of categories) {
    const categoryName = cat.name || 'General';
    const problems: DsaProblem[] = cat.problems || [];

    if (problems.length === 0) {
      rows.push([categoryName, '', '', '', '', '', '']);
    } else {
      // Keep category's problems together ordered line-by-line
      const sortedProblems = [...problems].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      for (const p of sortedProblems) {
        rows.push([
          categoryName,
          p.name || '',
          p.difficulty || 'Medium',
          p.lc_url || '',
          p.yt_url || '',
          p.resource_url || '',
          p.notes || '',
        ]);
      }
    }
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Auto-width formatting for columns
  worksheet['!cols'] = [
    { wch: 25 }, // Category
    { wch: 38 }, // Problem Name
    { wch: 14 }, // Difficulty
    { wch: 48 }, // LeetCode URL
    { wch: 48 }, // YouTube URL
    { wch: 48 }, // Resource URL
    { wch: 40 }, // Notes
  ];

  const workbook = XLSX.utils.book_new();
  const safeSheetName = (sheet.title || 'DSA Sheet')
    .replace(/[:\\/?*\[\]]/g, '')
    .slice(0, 31);
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName || 'DSA Sheet');

  const cleanFilename = (sheet.title || 'DSA_Sheet')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');

  XLSX.writeFile(workbook, `${cleanFilename}.xlsx`);
}
