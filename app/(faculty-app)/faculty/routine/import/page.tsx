import { requireFacultyPage } from '@/lib/auth/session';
import { ImportFlow } from '@/components/routine/import-flow';

export default async function ImportRoutinePage() {
  await requireFacultyPage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import routine from Google Sheets</h1>
        <p className="text-sm text-muted-foreground">
          No screenshots, no OCR — just copy the cell values from your department&apos;s official sheet and paste them here.
        </p>
      </div>
      <ImportFlow />
    </div>
  );
}
