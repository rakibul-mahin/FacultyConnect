'use client';

import { Check, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  DEFAULT_POSTER_STYLE,
  POSTER_EMOJIS,
  POSTER_THEMES,
  type PosterStyle,
  type PosterThemeKey,
} from '@/lib/qr/poster-style';

const HEADLINES = ['Book a consultation', 'Office hours', "Let's talk", 'Need help? Book a slot'];
const HEADERS: { value: PosterStyle['header']; label: string }[] = [
  { value: 'gradient', label: 'Gradient' },
  { value: 'solid', label: 'Solid' },
  { value: 'dots', label: 'Dots' },
];

export function PosterCustomiser({
  style,
  onChange,
  dirty,
  saving,
  onSave,
}: {
  style: PosterStyle;
  onChange: (next: PosterStyle) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const set = <K extends keyof PosterStyle>(key: K, value: PosterStyle[K]) => onChange({ ...style, [key]: value });

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-semibold">
        <Sparkles className="h-4 w-4 text-violet-500" />
        Customise poster
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">Changes show on the poster as you make them.</p>

      <div className="mt-5 space-y-5">
        <Field label="Colour">
          <div className="grid grid-cols-8 gap-2">
            {(Object.entries(POSTER_THEMES) as [PosterThemeKey, (typeof POSTER_THEMES)[PosterThemeKey]][]).map(([key, t]) => (
              <button
                key={key}
                type="button"
                title={t.label}
                aria-label={`${t.label} theme`}
                aria-pressed={style.theme === key}
                onClick={() => set('theme', key)}
                className={cn(
                  'relative flex aspect-square items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  style.theme === key && 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                )}
                style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
              >
                {style.theme === key && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Header style">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            {HEADERS.map((h) => (
              <button
                key={h.value}
                type="button"
                aria-pressed={style.header === h.value}
                onClick={() => set('header', h.value)}
                className={cn(
                  'rounded-lg py-1.5 text-sm font-medium transition-all',
                  style.header === h.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {h.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Badge">
          <div className="flex flex-wrap gap-1.5">
            {(['none', ...POSTER_EMOJIS] as const).map((e) => (
              <button
                key={e}
                type="button"
                aria-label={e === 'none' ? 'No badge' : `Badge ${e}`}
                aria-pressed={style.emoji === e}
                onClick={() => set('emoji', e)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl border text-lg transition-all hover:-translate-y-0.5',
                  style.emoji === e ? 'border-primary bg-accent shadow-sm' : 'border-border hover:border-primary/40'
                )}
              >
                {e === 'none' ? <span className="text-xs font-medium text-muted-foreground">None</span> : e}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Headline" counter={`${style.headline.length}/40`}>
          <Input value={style.headline} maxLength={40} onChange={(e) => set('headline', e.target.value)} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {HEADLINES.filter((h) => h !== style.headline).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => set('headline', h)}
                className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {h}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Message" counter={`${style.message.length}/90`}>
          <Textarea rows={2} value={style.message} maxLength={90} onChange={(e) => set('message', e.target.value)} placeholder="Optional line under the headline" />
        </Field>

        <div className="space-y-3 rounded-xl bg-muted/50 p-3.5">
          <Toggle label="Show consultation hours" checked={style.showHours} onChange={(v) => set('showHours', v)} />
          <Toggle label="Show seat" checked={style.showSeat} onChange={(v) => set('showSeat', v)} />
          <Toggle label="Show initial" checked={style.showInitial} onChange={(v) => set('showInitial', v)} />
          <Toggle label="Colour the QR code" checked={style.tintQr} onChange={(v) => set('tintQr', v)} />
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_POSTER_STYLE)} className="text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
        <Button className="flex-1" onClick={onSave} disabled={!dirty || !style.headline.trim()} loading={saving}>
          {dirty ? 'Save design' : 'Saved'}
        </Button>
      </div>
    </section>
  );
}

function Field({ label, counter, children }: { label: string; counter?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <Label>{label}</Label>
        {counter && <span className="text-[11px] tabular-nums text-muted-foreground">{counter}</span>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      {label}
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
