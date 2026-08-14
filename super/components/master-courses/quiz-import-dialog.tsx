'use client';

import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import {
  DEFAULT_IMPORT_LIMITS,
  listQuestionTypeAliases,
  listHeaderAliases,
  downloadTemplate,
  parseRawRows,
  parseSpreadsheetFile,
  validateImport,
  validatedRowsToDraftQuestions,
  type QuizImportError,
  type ImportMode,
  type ParsedImportFile,
  type QuizImportValidatedRow,
} from '@/lib/quiz-import';

export interface QuizImportDialogResult {
  questions: ReturnType<typeof validatedRowsToDraftQuestions>['questions'];
  applied: number;
  mode: ImportMode;
}

interface QuizImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasExistingQuestions: boolean;
  existingQuestionCount: number;
  onApply: (result: QuizImportDialogResult) => void;
}

type Phase = 'idle' | 'parsing' | 'ready' | 'error';

const SUPPORTED_FORMATS = ['.xlsx', '.xls', '.csv'] as const;

export function QuizImportDialog({
  open,
  onOpenChange,
  hasExistingQuestions,
  existingQuestionCount,
  onApply,
}: QuizImportDialogProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [validation, setValidation] = useState<
    | {
        ok: boolean;
        rows: QuizImportValidatedRow[];
        errors: QuizImportError[];
        validRowCount: number;
        invalidRowCount: number;
        optionCount: number;
        totalPoints: number;
      }
    | null
  >(null);
  const [parsed, setParsed] = useState<ParsedImportFile | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<ImportMode>(
    hasExistingQuestions ? 'append' : 'replace',
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const limits = DEFAULT_IMPORT_LIMITS;

  const headerAliases = useMemo(() => listHeaderAliases(), []);
  const typeAliases = useMemo(() => listQuestionTypeAliases(), []);

  const reset = useCallback(() => {
    setPhase('idle');
    setError(null);
    setFileName(null);
    setValidation(null);
    setParsed(null);
    setDragging(false);
  }, []);

  const closeDialog = useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, reset],
  );

  const handleFile = useCallback(
    async (file: File) => {
      setPhase('parsing');
      setError(null);
      setFileName(file.name);

      if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
        setError('Unsupported file type. Use .xlsx, .xls, or .csv.');
        setPhase('error');
        return;
      }
      if (file.size > limits.maxFileBytes) {
        const maxMb = (limits.maxFileBytes / (1024 * 1024)).toFixed(0);
        setError(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum is ${maxMb} MB.`);
        setPhase('error');
        return;
      }

      try {
        const sheet = await parseSpreadsheetFile(file);
        const parsedResult = parseRawRows(sheet.rawHeaders, sheet.rawRows);
        setParsed(parsedResult);

        if (parsedResult.rows.length > limits.maxQuestionRows) {
          setError(
            `Too many question rows: ${parsedResult.rows.length}. Limit is ${limits.maxQuestionRows}.`,
          );
          setPhase('error');
          return;
        }

        const v = validateImport(parsedResult, sheet.rawHeaders, {
          maxQuestionRows: limits.maxQuestionRows,
        });
        setValidation(v);
        setPhase('ready');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to read file.');
        setPhase('error');
      }
    },
    [limits.maxFileBytes, limits.maxQuestionRows],
  );

  const applyImport = () => {
    if (!validation || !validation.ok) return;
    const converted = validatedRowsToDraftQuestions(validation.rows);
    onApply({
      questions: converted.questions,
      applied: converted.questions.length,
      mode,
    });
    closeDialog(false);
  };

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/60">
          <DialogTitle className="text-base font-semibold">
            Import Questions
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Import questions from a spreadsheet. The file is parsed in your
            browser — nothing is uploaded. The existing &ldquo;Save
            Changes&rdquo; button remains the only action that persists to
            the database.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1 min-h-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-md border border-border/50 bg-muted/30 px-4 py-3">
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground text-sm">
                Spreadsheet template
              </p>
              <p>
                Use the canonical headers and one example row to format your
                file.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void downloadTemplate();
              }}
              className="shrink-0 h-8"
            >
              <Download className="size-3.5 mr-2" />
              Download Template
            </Button>
          </div>

          <DropZone
            dragging={dragging}
            fileName={fileName}
            disabled={phase === 'parsing'}
            onPick={() => fileInputRef.current?.click()}
            onDragEnter={() => setDragging(true)}
            onDragLeave={() => setDragging(false)}
            onDrop={(file) => {
              setDragging(false);
              void handleFile(file);
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_FORMATS.join(',')}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = '';
            }}
          />

          <FormatHint
            formats={SUPPORTED_FORMATS}
            headerAliases={headerAliases}
            typeAliases={typeAliases}
          />

          {phase === 'error' && error ? (
            <div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : null}

          {phase === 'parsing' ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Parsing…
            </div>
          ) : null}

          {phase === 'ready' && validation && parsed ? (
            <Summary
              parsed={parsed}
              validation={validation}
              hasExistingQuestions={hasExistingQuestions}
              existingQuestionCount={existingQuestionCount}
              mode={mode}
              setMode={setMode}
            />
          ) : null}
        </div>

        <DialogFooter className="px-6 py-3 border-t border-border/60 bg-muted/30 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => closeDialog(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8"
            disabled={!validation?.ok || validation.rows.length === 0}
            onClick={applyImport}
          >
            <Check className="size-3.5 mr-1.5" />
            Apply to Quiz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DropZoneProps {
  dragging: boolean;
  fileName: string | null;
  disabled: boolean;
  onPick: () => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (file: File) => void;
}

function DropZone({
  dragging,
  fileName,
  disabled,
  onPick,
  onDragEnter,
  onDragLeave,
  onDrop,
}: DropZoneProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={(e) => {
        e.preventDefault();
        onDragEnter();
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        onDragLeave();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) onDrop(file);
      }}
      className={cn(
        'flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-9 text-center transition-colors',
        dragging
          ? 'border-primary/60 bg-primary/5'
          : 'border-border/60 bg-muted/20',
        disabled && 'opacity-60 cursor-not-allowed',
      )}
    >
      <div className="flex items-center justify-center size-10 rounded-full bg-background border border-border/60">
        <Upload className="size-4 text-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          {dragging
            ? 'Drop to import'
            : fileName
              ? `Selected: ${fileName}`
              : 'Drag and drop a file, or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground">
          .xlsx, .xls, or .csv — parsed in your browser.
        </p>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Click anywhere in this panel to open the file picker
      </span>
    </button>
  );
}

interface FormatHintProps {
  formats: readonly string[];
  headerAliases: ReturnType<typeof listHeaderAliases>;
  typeAliases: ReturnType<typeof listQuestionTypeAliases>;
}

function FormatHint({ formats, headerAliases, typeAliases }: FormatHintProps) {
  return (
    <details className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
      <summary className="cursor-pointer text-foreground/80 font-medium select-none">
        Supported formats and recognized headers
      </summary>
      <div className="mt-3 space-y-3">
        <p>
          <span className="font-medium text-foreground">Files:</span>{' '}
          {formats.map((f, i) => (
            <span key={f}>
              <code className="px-1 py-0.5 rounded bg-background text-foreground border border-border/60">
                {f}
              </code>
              {i < formats.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
        <p>
          Headers are case-insensitive and ignore spaces, underscores and
          hyphens. Recognized aliases:
        </p>
        <ul className="space-y-1.5">
          {headerAliases.map((entry) => (
            <li key={entry.canonical}>
              <span className="font-semibold text-foreground">
                {prettyColumn(entry.canonical)}:
              </span>{' '}
              <span className="italic">
                {entry.aliases.map((a) => `“${a}”`).join(', ')}
              </span>
            </li>
          ))}
        </ul>
        <p>
          <span className="font-semibold text-foreground">Question Type:</span>{' '}
          {typeAliases
            .flatMap((t) => t.aliases.map((a) => ({ canonical: t.canonical, alias: a })))
            .filter((x, i, arr) => arr.findIndex((y) => y.alias === x.alias) === i)
            .map((x, i, arr) => (
              <span key={`${x.canonical}-${x.alias}`}>
                “{x.alias}”
                {i < arr.length - 1 ? ', ' : ''}
              </span>
            ))}
        </p>
        <p>
          Correct Answer accepts <code>A</code>, <code>B</code>, <code>C</code>,{' '}
          <code>D</code>, <code>Option A</code>, or multi-values separated by{' '}
          <code>,</code>, <code>;</code>, or <code>|</code> like{' '}
          <code>A,C</code>.
        </p>
      </div>
    </details>
  );
}

function prettyColumn(canonical: string): string {
  switch (canonical) {
    case 'question':
      return 'Question';
    case 'option_a':
      return 'Option A';
    case 'option_b':
      return 'Option B';
    case 'option_c':
      return 'Option C';
    case 'option_d':
      return 'Option D';
    case 'correct_answer':
      return 'Correct Answer';
    case 'explanation':
      return 'Explanation';
    case 'points':
      return 'Points';
    case 'question_type':
      return 'Question Type';
    default:
      return canonical;
  }
}

interface SummaryProps {
  parsed: ParsedImportFile;
  validation: NonNullable<
    ReturnType<typeof validateImport>
  > & { ok: boolean };
  hasExistingQuestions: boolean;
  existingQuestionCount: number;
  mode: ImportMode;
  setMode: (m: ImportMode) => void;
}

function Summary({
  parsed,
  validation,
  hasExistingQuestions,
  existingQuestionCount,
  mode,
  setMode,
}: SummaryProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile
          label="Parsed rows"
          value={String(parsed.rows.length)}
          icon={<FileSpreadsheet className="size-3.5" />}
        />
        <StatTile
          label="Valid questions"
          value={String(validation.validRowCount)}
          icon={<Check className="size-3.5 text-emerald-600" />}
        />
        <StatTile
          label="Invalid rows"
          value={String(validation.invalidRowCount)}
          icon={
            validation.invalidRowCount > 0 ? (
              <AlertTriangle className="size-3.5 text-amber-600" />
            ) : (
              <X className="size-3.5 text-muted-foreground" />
            )
          }
          tone={
            validation.invalidRowCount > 0 ? 'warning' : 'muted'
          }
        />
        <StatTile
          label="Total options"
          value={String(validation.optionCount)}
          icon={<FileText className="size-3.5" />}
        />
        <StatTile
          label="Total points"
          value={String(validation.totalPoints)}
          icon={<FileText className="size-3.5" />}
        />
      </div>

      {hasExistingQuestions ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Import mode</p>
          <RadioGroup
            value={mode}
            onValueChange={(v) => setMode(v as ImportMode)}
            className="flex flex-col gap-2"
          >
            <label className="flex items-start gap-3 rounded-md border border-border/50 bg-muted/20 px-3 py-2 cursor-pointer">
              <RadioGroupItem value="append" id="import-mode-append" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  Append to current questions ({existingQuestionCount})
                </p>
                <p className="text-xs text-muted-foreground">
                  Imported questions will be added after your existing ones in
                  spreadsheet order.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-md border border-border/50 bg-muted/20 px-3 py-2 cursor-pointer">
              <RadioGroupItem value="replace" id="import-mode-replace" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  Replace current questions
                </p>
                <p className="text-xs text-muted-foreground">
                  The current {existingQuestionCount} question
                  {existingQuestionCount === 1 ? '' : 's'} will be cleared. The
                  final &ldquo;Save Changes&rdquo; click will then persist the
                  imported set.
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>
      ) : null}

      {validation.invalidRowCount > 0 ? (
        <ErrorPanel errors={validation.errors} />
      ) : null}

      {validation.validRowCount > 0 ? (
        <PreviewTable rows={validation.rows} />
      ) : null}
    </div>
  );
}

interface StatTileProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: 'default' | 'warning' | 'muted';
}

function StatTile({ label, value, icon, tone = 'default' }: StatTileProps) {
  const toneClass =
    tone === 'warning'
      ? 'border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-200'
      : tone === 'muted'
        ? 'border-border/40 bg-muted/10 text-muted-foreground'
        : 'border-border/60 bg-background';
  return (
    <div className={cn('rounded-md border px-3 py-2', toneClass)}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums mt-1 text-foreground">
        {value}
      </div>
    </div>
  );
}

interface ErrorPanelProps {
  errors: QuizImportError[];
}

function ErrorPanel({ errors }: ErrorPanelProps) {
  const sorted = [...errors].sort((a, b) => (a.row ?? 0) - (b.row ?? 0));
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="size-3.5 text-amber-600" />
        <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
          {sorted.length} {sorted.length === 1 ? 'error' : 'errors'} found
        </p>
      </div>
      <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
        {sorted.map((err, i) => (
          <li
            key={`${err.code}-${err.row ?? 'global'}-${i}`}
            className="text-[11px] text-amber-900/90 dark:text-amber-200/90 font-mono"
          >
            {err.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface PreviewTableProps {
  rows: QuizImportValidatedRow[];
}

function PreviewTable({ rows }: PreviewTableProps) {
  const preview = rows.slice(0, 25);
  return (
    <div className="rounded-md border border-border/50 overflow-hidden">
      <div className="px-3 py-2 text-xs font-medium text-foreground border-b border-border/50 bg-muted/30 flex items-center justify-between">
        <span>Preview ({preview.length} of {rows.length})</span>
        <span className="text-muted-foreground">Spreadsheet row order preserved</span>
      </div>
      <div className="max-h-72 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/40">
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 font-medium w-12">Row</th>
              <th className="px-3 py-2 font-medium">Question</th>
              <th className="px-3 py-2 font-medium w-16">Type</th>
              <th className="px-3 py-2 font-medium w-16">Options</th>
              <th className="px-3 py-2 font-medium w-16">Points</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((row) => (
              <tr key={`${row.sourceRow}-${row.text}`} className="border-t border-border/40">
                <td className="px-3 py-2 font-mono tabular-nums text-muted-foreground">{row.sourceRow}</td>
                <td className="px-3 py-2 truncate max-w-[280px]">{row.text}</td>
                <td className="px-3 py-2 text-muted-foreground">{prettyType(row.questionType)}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.options.length}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function prettyType(t: string): string {
  if (t === 'multiple_choice') return 'Multi';
  if (t === 'true_false') return 'T/F';
  return 'Single';
}
