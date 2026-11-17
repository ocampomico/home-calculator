import { useId, useState, type ReactNode } from 'react'

export const usd = (n: number, cents = false) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  })

/** Compact dollars for axes and headlines: $1.2M, $340K. */
export const usdCompact = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumSignificantDigits: 3 })

export const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' })
}

export function Card({ title, aside, children, className = '' }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-card p-5 sm:p-6 ${className}`}>
      {(title || aside) && (
        <div className="mb-4 flex items-baseline justify-between gap-3">
          {title && <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>}
          {aside && <div className="text-[13px] text-muted">{aside}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

/** The one big answer at the top of a screen. */
export function Hero({ label, children, className = '', live }: { label: string; children: ReactNode; className?: string; live?: boolean }) {
  return (
    <section className={`rounded-xl border border-line bg-card p-5 sm:p-6 ${className}`} aria-live={live ? 'polite' : undefined}>
      <p className="text-xs font-medium tracking-wider text-muted uppercase">{label}</p>
      {children}
    </section>
  )
}

const inputCls = 'num h-10 w-full min-w-0 rounded-lg border border-field bg-card px-3 text-[15px] text-ink placeholder:text-muted/60'

function FieldShell({ label, hint, id, children }: { label: string; hint?: string; id: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block truncate text-[13px] font-medium text-muted">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}

/** Numeric input that keeps the user's in-progress text while focused. */
export function Num({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
  max,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  prefix?: string
  suffix?: string
  hint?: string
  max?: number
}) {
  const id = useId()
  // While focused, show the text being typed; otherwise show the stored value.
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? (value ? String(value) : '')

  return (
    <FieldShell label={label} hint={hint} id={id}>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">{prefix}</span>}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`${inputCls} ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-8' : ''}`}
          value={text}
          onFocus={() => setDraft(value ? String(value) : '')}
          onBlur={() => setDraft(null)}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9.]/g, '')
            setDraft(raw)
            const n = Number.parseFloat(raw)
            const v = Number.isFinite(n) ? n : 0
            onChange(max !== undefined ? Math.min(v, max) : v)
          }}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">{suffix}</span>}
      </div>
    </FieldShell>
  )
}

export function Text({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (s: string) => void; placeholder?: string }) {
  const id = useId()
  return (
    <FieldShell label={label} id={id}>
      <input id={id} type="text" className={inputCls} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </FieldShell>
  )
}

export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  hint?: string
}) {
  const id = useId()
  return (
    <FieldShell label={label} hint={hint} id={id}>
      <select id={id} className={inputCls} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

export function DateField({ label, value, onChange, hint }: { label: string; value: string; onChange: (s: string) => void; hint?: string }) {
  const id = useId()
  return (
    <FieldShell label={label} hint={hint} id={id}>
      <input id={id} type="date" className={inputCls} value={value} onChange={(e) => e.target.value && onChange(e.target.value)} />
    </FieldShell>
  )
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm">
      <input type="checkbox" className="size-4 accent-(--accent)" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  label,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  /** Accessible name, for icon-only buttons. */
  label?: string
  disabled?: boolean
}) {
  const styles = {
    primary: 'bg-accent text-on-accent border-accent hover:opacity-85',
    secondary: 'bg-card text-ink border-line hover:border-field',
    ghost: 'border-transparent text-muted hover:text-ink',
    danger: 'bg-card text-warn border-warn',
  }[variant]
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition disabled:opacity-35 ${styles}`}
    >
      {children}
    </button>
  )
}

export function Progress({ value, label }: { value: number; label: string }) {
  const p = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={p}
      className="h-1.5 w-full overflow-hidden rounded-full bg-line"
    >
      <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${p}%` }} />
    </div>
  )
}

export function Disclaimer() {
  return <p className="text-xs text-muted">Results are estimates for planning, not financial, tax, or legal advice.</p>
}

export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{children}</div>
}

/** Percent input over a decimal value: shows 6.5 for 0.065. */
export function Pct({ label, value, onChange, hint, max = 100 }: { label: string; value: number; onChange: (n: number) => void; hint?: string; max?: number }) {
  return <Num label={label} value={+(value * 100).toFixed(4)} onChange={(v) => onChange(v / 100)} suffix="%" hint={hint} max={max} />
}
