import type { ReactNode } from 'react'
import { tone } from '../lib/format'

export function Card({ children, className = '', title, right }: { children: ReactNode; className?: string; title?: string; right?: ReactNode }) {
  return (
    <section className={`card p-5 ${className}`}>
      {(title || right) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h3 className="label">{title}</h3>}
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, sub, n, className = '' }: { label: string; value: ReactNode; sub?: ReactNode; n?: number; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-panel2/60 p-3.5 ${className}`}>
      <div className="text-[11px] text-muted">{label}</div>
      <div className={`mt-1 font-mono text-lg font-bold ${n === undefined ? 'text-white' : tone(n)}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange, colors }: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  colors?: Partial<Record<T, string>>
}) {
  return (
    <div className="grid gap-1 rounded-xl bg-panel2 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            value === o.value ? colors?.[o.value] ?? 'bg-win text-black' : 'text-soft hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 font-mono text-xs font-bold transition ${
        active ? 'bg-white text-black' : 'text-soft hover:bg-panel2 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

export function Bar({ value, max, positive }: { value: number; max: number; positive: boolean }) {
  const w = max > 0 ? Math.max(4, (Math.abs(value) / max) * 100) : 0
  return (
    <div className="h-2 w-full rounded-full bg-panel2">
      <div className={`h-2 rounded-full ${positive ? 'bg-win/80' : 'bg-loss/80'}`} style={{ width: `${w}%` }} />
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">{children}</div>
}
