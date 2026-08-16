'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ArrowLeft, Check, ClipboardPaste, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { WEEKDAY_LABELS, TIME_SLOT_LABELS, type WeekdayValue, type TimeSlotValue } from '@/lib/constants';
import { parseClipboardAction, buildDiffAction, confirmImportAction } from '@/app/(faculty-app)/faculty/routine/actions';
import type { ParsedCell } from '@/lib/parser/routine-parser';
import type { DiffRow } from '@/lib/routine/import';

type Step = 'paste' | 'preview' | 'done';

// Mirrors real Google Sheets clipboard TSV: a multi-line cell (course +
// room, on separate lines within the cell) is copied as one double-quoted
// field containing a literal line break.
const SAMPLE = [
  ['"CSE427-03 (LAB)\nITSSC,RKBM\n09F-27L"', '"CSE427-03 (LAB)\nITSSC,RKBM\n09F-27L"', 'Consultation', 'Consultation', '"CSE110-13\n09H-35C"', '"CSE110-12\n09H-35C"', '', '', ''].join('\t'),
  Array(9).fill('').join('\t'),
  Array(9).fill('').join('\t'),
  Array(9).fill('').join('\t'),
  Array(9).fill('').join('\t'),
  Array(9).fill('').join('\t'),
  Array(9).fill('').join('\t'),
].join('\n');

export function ImportFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('paste');
  const [raw, setRaw] = useState('');
  const [cells, setCells] = useState<ParsedCell[]>([]);
  const [structuralErrors, setStructuralErrors] = useState<string[]>([]);
  const [diff, setDiff] = useState<DiffRow[]>([]);
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<ParsedCell | null>(null);

  const runParse = () => {
    startTransition(async () => {
      const res = await parseClipboardAction(raw);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.data.errors.length > 0) {
        setStructuralErrors(res.data.errors);
        return;
      }
      setStructuralErrors([]);
      setCells(res.data.cells);
      const diffRes = await buildDiffAction(res.data.cells);
      if (!diffRes.ok) {
        toast.error(diffRes.error);
        return;
      }
      setDiff(diffRes.data);
      setStep('preview');
    });
  };

  const refreshDiff = (nextCells: ParsedCell[]) => {
    startTransition(async () => {
      const diffRes = await buildDiffAction(nextCells);
      if (diffRes.ok) setDiff(diffRes.data);
    });
  };

  const applyFix = (fixed: ParsedCell) => {
    const next = cells.map((c) => (c.day === fixed.day && c.startSlot === fixed.startSlot ? fixed : c));
    setCells(next);
    setEditing(null);
    refreshDiff(next);
  };

  const ignoreCell = (cell: ParsedCell) => {
    toast.info('Left as-is — this slot will keep its current value.');
  };

  const confirm = () => {
    startTransition(async () => {
      const res = await confirmImportAction(cells);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('Routine updated from import.');
      setStep('done');
    });
  };

  const needsReviewCount = diff.filter((d) => d.status === 'NEEDS_REVIEW').length;
  const changeCount = diff.filter((d) => d.status !== 'UNCHANGED' && d.status !== 'NEEDS_REVIEW').length;

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {step === 'paste' && (
          <motion.div key="paste" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardPaste className="h-5 w-5" />
                  Step 1–2: Copy from Google Sheets, then paste here
                </CardTitle>
                <CardDescription>
                  In your department&apos;s Google Sheet, select the full Saturday–Friday × 8:00 AM–7:30 PM range, copy it
                  (Ctrl/Cmd+C), then paste it below.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder="Paste copied cells here…"
                  className="min-h-[220px] font-mono text-xs"
                />
                {structuralErrors.length > 0 && (
                  <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {structuralErrors.map((e, i) => (
                      <p key={i}>{e}</p>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={runParse} disabled={!raw.trim()} loading={pending}>
                    Preview import
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setRaw(SAMPLE)}>
                    Try a sample paste
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'preview' && (
          <motion.div key="preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>Step 3: Preview changes</CardTitle>
                    <CardDescription>Current routine vs. imported routine. Only decided rows will be applied.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{changeCount} changes</Badge>
                    {needsReviewCount > 0 && <Badge variant="warning">{needsReviewCount} need review</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {diff
                  .filter((d) => d.status !== 'UNCHANGED')
                  .sort((a, b) => (a.status === 'NEEDS_REVIEW' ? -1 : 1))
                  .map((row) => (
                    <DiffRowView
                      key={`${row.day}-${row.startSlot}`}
                      row={row}
                      onEdit={() => {
                        const cell = cells.find((c) => c.day === row.day && c.startSlot === row.startSlot);
                        if (cell) setEditing(cell);
                      }}
                      onIgnore={() => {
                        const cell = cells.find((c) => c.day === row.day && c.startSlot === row.startSlot);
                        if (cell) ignoreCell(cell);
                      }}
                    />
                  ))}
                {diff.every((d) => d.status === 'UNCHANGED') && (
                  <p className="py-6 text-center text-sm text-muted-foreground">No changes detected — everything matches your current routine.</p>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => setStep('paste')}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={confirm} loading={pending}>
                Confirm Changes
              </Button>
              {needsReviewCount > 0 && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Rows needing review will be skipped unless you edit them.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="rounded-full bg-success/10 p-3 text-success">
                  <Check className="h-6 w-6" />
                </div>
                <p className="text-lg font-medium">Routine imported</p>
                <Button onClick={() => router.push('/faculty/routine')}>View routine</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {editing && <ImportFixDialog cell={editing} onClose={() => setEditing(null)} onSave={applyFix} />}
    </div>
  );
}

function DiffRowView({ row, onEdit, onIgnore }: { row: DiffRow; onEdit: () => void; onIgnore: () => void }) {
  const styles: Record<string, string> = {
    ADDED: 'border-success/30 bg-success/5',
    CHANGED: 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20',
    REMOVED: 'border-destructive/30 bg-destructive/5',
    NEEDS_REVIEW: 'border-destructive/40 bg-destructive/5',
    UNCHANGED: 'border-border',
  };
  const labels: Record<string, string> = {
    ADDED: 'Added',
    CHANGED: 'Changed',
    REMOVED: 'Removed',
    NEEDS_REVIEW: 'Needs review',
    UNCHANGED: 'Unchanged',
  };
  const variants: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
    ADDED: 'success',
    CHANGED: 'warning',
    REMOVED: 'destructive',
    NEEDS_REVIEW: 'destructive',
    UNCHANGED: 'secondary',
  };

  return (
    <div className={`rounded-lg border p-3 ${styles[row.status]}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {WEEKDAY_LABELS[row.day as WeekdayValue]} · {TIME_SLOT_LABELS[row.startSlot as TimeSlotValue]}
          </p>
          <div className="mt-1 flex items-center gap-2 text-sm">
            {row.current && <span className="text-muted-foreground line-through">{row.current}</span>}
            {row.current && row.incoming && <span className="text-muted-foreground">→</span>}
            {row.incoming && <span className="font-medium">{row.incoming}</span>}
            {row.status === 'NEEDS_REVIEW' && <span className="text-destructive">{row.issue}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={variants[row.status]}>{labels[row.status]}</Badge>
          {row.status === 'NEEDS_REVIEW' && (
            <>
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={onIgnore}>
                <X className="h-3.5 w-3.5" />
                Ignore
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ImportFixDialog({ cell, onClose, onSave }: { cell: ParsedCell; onClose: () => void; onSave: (c: ParsedCell) => void }) {
  const [type, setType] = useState<ParsedCell['type']>(cell.type === 'NEEDS_REVIEW' ? 'THEORY' : cell.type);
  const [courseCode, setCourseCode] = useState(cell.courseCode ?? '');
  const [section, setSection] = useState(cell.section ?? '');
  const [roomNumber, setRoomNumber] = useState(cell.roomNumber ?? '');
  const [coFaculty, setCoFaculty] = useState(cell.coFaculty ?? '');

  const save = () => {
    if (type === 'EMPTY') {
      onSave({ day: cell.day, startSlot: cell.startSlot, type: 'EMPTY' });
      return;
    }
    if (type === 'THEORY') {
      onSave({ day: cell.day, startSlot: cell.startSlot, type: 'THEORY', courseCode: courseCode.toUpperCase(), section, roomNumber });
      return;
    }
    if (type === 'LAB') {
      onSave({ day: cell.day, startSlot: cell.startSlot, type: 'LAB', courseCode: courseCode.toUpperCase(), section, coFaculty, roomNumber });
      return;
    }
    onSave({ day: cell.day, startSlot: cell.startSlot, type: 'CONSULTATION' });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Fix {WEEKDAY_LABELS[cell.day]} · {TIME_SLOT_LABELS[cell.startSlot]}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {cell.rawText && <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">Original: “{cell.rawText}”</p>}
          <RadioGroup value={type} onValueChange={(v) => setType(v as ParsedCell['type'])} className="grid grid-cols-2 gap-2">
            {(['EMPTY', 'THEORY', 'LAB', 'CONSULTATION'] as const).map((t) => (
              <Label key={t} className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm ${type === t ? 'border-primary bg-accent' : 'border-input'}`}>
                <RadioGroupItem value={t} className="shrink-0" />
                <span className="truncate">{t === 'EMPTY' ? 'Clear' : t.charAt(0) + t.slice(1).toLowerCase()}</span>
              </Label>
            ))}
          </RadioGroup>

          {(type === 'THEORY' || type === 'LAB') && (
            <>
              <div className="space-y-1.5">
                <Label>Course code</Label>
                <Input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="CSE110" />
              </div>
              <div className="space-y-1.5">
                <Label>Section</Label>
                <Input value={section} onChange={(e) => setSection(e.target.value)} placeholder="13" />
              </div>
              {type === 'LAB' && (
                <div className="space-y-1.5">
                  <Label>Co-faculty initial</Label>
                  <Input value={coFaculty} onChange={(e) => setCoFaculty(e.target.value)} placeholder="ITSSC, RKBM" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Room number</Label>
                <Input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="09H-35C" />
              </div>
            </>
          )}
          {type === 'CONSULTATION' && (
            <p className="text-xs text-muted-foreground">Capacity defaults to 1 — set the real capacity from the routine editor after import.</p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={save}>Apply fix</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
