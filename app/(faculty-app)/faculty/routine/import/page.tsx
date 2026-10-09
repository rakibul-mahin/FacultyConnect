import { requireFacultyPage } from '@/lib/auth/session';
import { ImportFlow } from '@/components/routine/import-flow';

export default async function ImportRoutinePage() {
  await requireFacultyPage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import routine</h1>
        <p className="text-sm text-muted-foreground">
          Paste your routine from Google Sheets or upload it as an Excel file. You&apos;ll review every change before it&apos;s saved.
        </p>
      </div>
      <ImportFlow />
    </div>
  );
}
