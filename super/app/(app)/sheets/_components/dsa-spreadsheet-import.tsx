'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  Check,
  Columns3,
} from 'lucide-react';
import * as actions from '../actions';
import { toast } from 'sonner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface Props {
  sheetId: string;
  onImportComplete: (result: {
    imported: number;
    duplicates: number;
    categoriesCreated: number;
    resourcesImported?: number;
    resourcesSkipped?: number;
  }) => void;
}

interface ParsedRow {
  category: string;
  name: string;
  difficulty: string;
  lc_url: string;
  yt_url: string;
  resource_url: string;
  notes: string;
  isDuplicate?: boolean;
}

const SPREADSHEET_COLUMNS = [
  { name: 'Category', required: true, example: 'Arrays', desc: 'Pattern group name' },
  { name: 'Problem Name', required: true, example: 'Two Sum', desc: 'LeetCode problem title' },
  { name: 'Difficulty', required: false, example: 'Easy / Medium / Hard', desc: 'Defaults to Medium' },
  { name: 'LeetCode URL', required: false, example: 'https://leetcode.com/problems/two-sum/', desc: 'Problem link' },
  { name: 'YouTube URL', required: false, example: 'https://youtube.com/watch?v=...', desc: 'Solution video' },
  { name: 'Resource URL', required: false, example: 'https://github.com/.../diagram.excalidraw.png', desc: 'Visual resource or diagram link' },
  { name: 'Notes', required: false, example: 'Hash map approach', desc: 'Extra context' },
];

export function DsaSpreadsheetImport({ sheetId, onImportComplete }: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseSpreadsheet = useCallback(async (file: File): Promise<ParsedRow[]> => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    let rawData: unknown[][] = [];

    try {
      if (ext === 'csv') {
        const text = await file.text();
        const result = Papa.parse<string[]>(text, {
          skipEmptyLines: 'greedy',
        });
        rawData = result.data;
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          toast.error('Excel file has no sheets');
          return [];
        }
        const worksheet = workbook.Sheets[sheetName];
        rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });
      }
    } catch (err) {
      toast.error(`Error reading spreadsheet: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }

    if (rawData.length < 2) {
      toast.error('File is empty or has no data rows');
      return [];
    }

    // Try to find header indices
    const firstRow = rawData[0] || [];
    let categoryIdx = 0;
    let nameIdx = 1;
    let difficultyIdx = 2;
    let lcUrlIdx = 3;
    let ytUrlIdx = 4;
    let resourceUrlIdx = 5;
    let notesIdx = 6;

    let hasHeader = false;
    for (let i = 0; i < firstRow.length; i++) {
      const headerVal = String(firstRow[i] || '').trim().toLowerCase();
      if (headerVal.includes('category')) {
        categoryIdx = i;
        hasHeader = true;
      } else if (headerVal.includes('problem') || headerVal.includes('name') || headerVal.includes('title')) {
        nameIdx = i;
        hasHeader = true;
      } else if (headerVal.includes('difficulty')) {
        difficultyIdx = i;
        hasHeader = true;
      } else if (headerVal.includes('leetcode') || headerVal.includes('lc')) {
        lcUrlIdx = i;
        hasHeader = true;
      } else if (headerVal.includes('youtube') || headerVal.includes('yt') || headerVal.includes('video')) {
        ytUrlIdx = i;
        hasHeader = true;
      } else if (headerVal.includes('resource') || headerVal.includes('diagram') || headerVal.includes('excalidraw')) {
        resourceUrlIdx = i;
        hasHeader = true;
      } else if (headerVal.includes('note')) {
        notesIdx = i;
        hasHeader = true;
      }
    }

    const startIndex = hasHeader ? 1 : 0;
    const rows: ParsedRow[] = [];

    const isAnyUrl = (url: string) => {
      const low = url.toLowerCase();
      return low.startsWith('http') || low.startsWith('www') || low.includes('.com');
    };

    for (let i = startIndex; i < rawData.length; i++) {
      const cols = rawData[i];
      if (!cols || cols.length < 2) continue;

      const getVal = (idx: number) => {
        if (idx < 0 || idx >= cols.length) return '';
        const v = cols[idx];
        return v !== null && v !== undefined ? String(v).trim() : '';
      };

      const category = getVal(categoryIdx);
      const name = getVal(nameIdx);
      if (!category || !name) continue;

      const rawDiff = getVal(difficultyIdx);
      let difficulty = 'Medium';
      if (rawDiff) {
        const d = rawDiff.toLowerCase();
        if (d === 'easy') difficulty = 'Easy';
        else if (d === 'hard') difficulty = 'Hard';
        else if (d === 'medium') difficulty = 'Medium';
        else difficulty = rawDiff;
      }

      const lc_url = getVal(lcUrlIdx);
      let yt_url = getVal(ytUrlIdx);
      let resource_url = getVal(resourceUrlIdx);
      let notes = getVal(notesIdx);

      // Heuristic for omitted column:
      // If yt_url contains non-URL content and notes is empty, it's likely that yt_url column was omitted
      // and the value in yt_url column is actually the notes.
      if (yt_url && !isAnyUrl(yt_url) && !notes) {
        notes = yt_url;
        yt_url = '';
      }

      if (!resource_url && notes && isAnyUrl(notes) && /github|excalidraw|\.png|\.svg|\.jpe?g|\.webp/i.test(notes)) {
        resource_url = notes;
        notes = '';
      }

      rows.push({
        category,
        name,
        difficulty,
        lc_url,
        yt_url,
        resource_url,
        notes,
      });
    }

    const seen = new Set<string>();
    for (const row of rows) {
      const key = `${row.category.toLowerCase()}|${row.name.toLowerCase()}`;
      if (seen.has(key)) {
        row.isDuplicate = true;
      }
      seen.add(key);
    }

    return rows;
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
        toast.error('Please upload a CSV or Excel file');
        return;
      }

      const rows = await parseSpreadsheet(file);
      if (rows.length > 0) {
        setParsedRows(rows);
        setShowPreview(true);
      }
    },
    [parseSpreadsheet]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleImport = useCallback(async () => {
    setImporting(true);
    try {
      const result = await actions.importFromSpreadsheet(
        sheetId,
        parsedRows.map(({ isDuplicate: _isDuplicate, ...rest }) => rest),
        parsedRows
          .filter((row) => !row.isDuplicate && row.resource_url)
          .map((row) => ({
            title: row.name,
            description: row.category,
            resource_url: row.resource_url,
            resource_type: 'auto' as const,
          }))
      );
      setShowPreview(false);
      setParsedRows([]);
      onImportComplete(result);
    } catch {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  }, [sheetId, parsedRows, onImportComplete]);

  const duplicates = parsedRows.filter((r) => r.isDuplicate).length;

  const uniqueRows = parsedRows.filter((r) => !r.isDuplicate);

  return (
    <>
      <Card
        className={`p-6 border-dashed transition-colors cursor-pointer ${
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border/50 hover:border-border'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-3">
            <FileSpreadsheet className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              Import from Spreadsheet
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload a CSV or Excel file with columns: Category, Problem Name,
              Difficulty, LeetCode URL, YouTube URL, Resource URL, Notes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowColumns(true);
              }}
              className="gap-2"
            >
              <Columns3 className="size-3.5" />
              Columns
            </Button>
            <Button size="sm" className="gap-2">
              <Upload className="size-3.5" />
              Upload File
            </Button>
          </div>
        </div>
      </Card>

      {/* Import Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-hidden flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>
              Import Preview
            </DialogTitle>
            <DialogDescription>
              {uniqueRows.length} problem{uniqueRows.length !== 1 ? 's' : ''} to import
              {uniqueRows.some((row) => row.resource_url) && (
                <span className="text-blue-600 ml-1">
                  ({uniqueRows.filter((row) => row.resource_url).length} resource link{uniqueRows.filter((row) => row.resource_url).length !== 1 ? 's' : ''})
                </span>
              )}
              {duplicates > 0 && (
                <span className="text-amber-600 ml-1">
                  ({duplicates} duplicate{duplicates !== 1 ? 's' : ''} will be skipped)
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto border-y">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Problem</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedRows.map((row, i) => (
                  <TableRow
                    key={i}
                    className={row.isDuplicate ? 'bg-amber-500/5' : ''}
                  >
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{row.category}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          row.difficulty === 'Easy'
                            ? 'bg-emerald-500/10 text-emerald-700'
                            : row.difficulty === 'Hard'
                            ? 'bg-red-500/10 text-red-700'
                            : 'bg-amber-500/10 text-amber-700'
                        }`}
                      >
                        {row.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.resource_url ? (
                        <span className="text-xs font-medium text-blue-600">Yes</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.isDuplicate ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                          <AlertTriangle className="size-3" />
                          Duplicate
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                          <Check className="size-3" />
                          New
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <>
                  <div className="size-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  Importing...
                </>
              ) : (
                `Import ${uniqueRows.length} Problem${uniqueRows.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Columns Reference Dialog */}
      <Dialog open={showColumns} onOpenChange={setShowColumns}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Columns3 className="size-5 text-muted-foreground" />
              Spreadsheet Columns
            </DialogTitle>
            <DialogDescription>
              Your CSV or Excel file must have these columns in order. The first two are required.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto border-y">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Column Name</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Example</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SPREADSHEET_COLUMNS.map((col, i) => (
                  <TableRow key={col.name}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{col.name}</span>
                        <span className="text-xs text-muted-foreground">{col.desc}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {col.required ? (
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                          Required
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Optional</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">
                      {col.example}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setShowColumns(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
