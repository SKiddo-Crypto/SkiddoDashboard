import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../lib/store'
import { byDay, computeStats, WEEKDAYS } from '../lib/stats'
import { dayKey, fmtR, fmtUsd, rOf, tone } from '../lib/format'
import { TradeRow } from './Trades'
import type { Trade } from '../types'

const MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FULL: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }

export default function Calendar() {
  const { trades } = useStore()
  const now = new Date()
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [selected, setSelected] = useState<string | null>(dayKey(now.toISOString()))
  const days = useMemo(() => byDay(trades), [trades])

  const insight = useMemo(() => {
    const rows = MON_FIRST.map(w => {
      const ds = [...days.entries()].filter(([k]) => WEEKDAYS[new Date(k + 'T12:00:00').getDay()] === w)
      const total = ds.reduce((a, [, ts]) => a + ts.reduce((b, t) => b + rOf(t), 0), 0)
      return { w, n: ds.length, avg: ds.length ? total / ds.length : 0 }
    }).filter(r => r.n >= 3)
    const best = [...rows].sort((a, b) => b.avg - a.avg)[0]
    const worst = [...rows].sort((a, b) => a.avg - b.avg)[0]
    return { best, worst }
  }, [days])

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const m = new Date(cursor.getFullYear(), cursor.getMonth() - 11 + i, 1)
    const ts = trades.filter(t => { const d = new Date(t.date); return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth() })
    return { m, r: ts.reduce((a, t) => a + rOf(t), 0), n: ts.length }
  }), [trades, cursor])
  const mMax = Math.max(1, ...months.map(m => Math.abs(m.r)))

  const first = new Date(cursor)
  const lead = (first.getDay() + 6) % 7
  const daysIn = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1))]
  while (cells.length % 7) cells.push(null)
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
  const monthTrades = trades.filter(t => { const d = new Date(t.date); return d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth() })
  const ms = computeStats(monthTrades)
  const allDayR = [...days.values()].map(ts => Math.abs(ts.reduce((a, t) => a + rOf(t), 0)))
  const dMax = Math.max(1, ...allDayR)
  const selTrades = selected ? days.get(selected) ?? [] : []

  return (
    <div className="space-y-4">
      <div>
        <div className="label flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-win" /> Today, on your calendar</div>
        {insight.best ? (
          <>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Your {FULL[insight.best.w]}s average <span className={tone(insight.best.avg)}>{fmtR(insight.best.avg)}</span>.</h1>
            <p className="mt-1 text-sm text-muted">Over {insight.best.n} of them. Your weakest day is {FULL[insight.worst.w]} at {fmtR(insight.worst.avg)}.</p>
          </>
        ) : <h1 className="mt-2 text-2xl font-semibold">Log a few weeks of trades to see your best days.</h1>}
      </div>

      <div className="card grid grid-cols-12 gap-1 p-3">
        {months.map(({ m, r, n }) => {
          const active = m.getMonth() === cursor.getMonth() && m.getFullYear() === cursor.getFullYear()
          return (
            <button key={m.toISOString()} onClick={() => setCursor(m)} className={`flex flex-col items-center gap-1 rounded-lg py-2 ${active ? 'bg-panel2' : 'hover:bg-panel2'}`}>
              <div className="flex h-8 items-end">{n > 0 && <div className={`w-3 rounded-sm ${r >= 0 ? 'bg-win/80' : 'bg-loss/80'}`} style={{ height: `${Math.max(3, (Math.abs(r) / mMax) * 32)}px` }} />}</div>
              <span className={`text-[10px] ${active ? 'text-white' : 'text-muted'}`}>{m.toLocaleDateString('en-GB', { month: 'short' })}</span>
            </button>
          )
        })}
      </div>

      <section className="card p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h2>
            <div className="font-mono text-[10px] text-muted">{ms.days} trading days · {ms.count} trades</div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`mr-2 font-mono text-sm font-bold ${tone(ms.netR)}`}>{fmtR(ms.netR)}</span>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded-full border border-line p-1.5 text-soft hover:text-white"><ChevronLeft size={14} /></button>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded-full border border-line p-1.5 text-soft hover:text-white"><ChevronRight size={14} /></button>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(0,0.9fr)] gap-1 md:gap-1.5">
          {[...MON_FIRST, 'Week'].map(w => <div key={w} className="pb-1 text-center font-mono text-[10px] text-muted">{w}</div>)}
          {weeks.map((wk, wi) => {
            const wt = wk.flatMap(d => (d ? days.get(dayKey(d.toISOString())) ?? [] : []))
            const wr = wt.reduce((a, t) => a + rOf(t), 0)
            return [
              ...wk.map((d, i) => d ? <DayCell key={i} d={d} ts={days.get(dayKey(d.toISOString())) ?? []} max={dMax} selected={selected === dayKey(d.toISOString())} today={dayKey(d.toISOString()) === dayKey(now.toISOString())} onClick={() => setSelected(dayKey(d.toISOString()))} /> : <div key={i} />),
              <div key={`w${wi}`} className="flex flex-col items-center justify-center rounded-lg bg-panel2 p-1">
                <span className={`font-mono text-[11px] font-bold ${tone(wr)}`}>{wt.length ? fmtR(wr, 1) : '—'}</span>
                <span className="text-[9px] text-muted">{wt.length ? `${wt.length} tr` : ''}</span>
              </div>,
            ]
          })}
        </div>
      </section>

      {selected && (
        <section className="card p-4">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-sm font-semibold">{new Date(selected + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            {selTrades.length > 0 && <span className="font-mono text-xs">{fmtUsd(computeStats(selTrades).netUsd)}</span>}
          </div>
          {selTrades.length ? [...selTrades].sort((a, b) => a.date.localeCompare(b.date)).map(t => <TradeRow key={t.id} t={t} />) : <p className="px-2 pb-2 text-sm text-muted">No trades. <Link to="/log" className="underline">Log one</Link>.</p>}
        </section>
      )}
    </div>
  )
}

function DayCell({ d, ts, max, selected, today, onClick }: { d: Date; ts: Trade[]; max: number; selected: boolean; today: boolean; onClick: () => void }) {
  const r = ts.reduce((a, t) => a + rOf(t), 0)
  const a = ts.length ? 0.08 + 0.4 * Math.min(1, Math.abs(r) / max) : 0
  const bg = ts.length ? (r >= 0 ? `rgba(110,231,183,${a})` : `rgba(255,138,122,${a})`) : 'transparent'
  // intraday sparkline of cumulative R
  let c = 0
  const pts = [0, ...[...ts].sort((x, y) => x.date.localeCompare(y.date)).map(t => (c += rOf(t)))]
  const lo = Math.min(...pts), hi = Math.max(...pts), span = hi - lo || 1
  const path = pts.map((p, i) => `${(i / Math.max(1, pts.length - 1)) * 40},${14 - ((p - lo) / span) * 12}`).join(' ')
  return (
    <button onClick={onClick} style={{ background: bg }}
      className={`relative flex aspect-[1/1.1] flex-col justify-between rounded-lg border p-1.5 text-left md:aspect-[1.4/1] md:p-2 ${selected ? 'border-white/80' : today ? 'border-win/50' : 'border-line'}`}>
      <div className="flex items-start justify-between">
        <span className="font-mono text-[10px] text-muted">{d.getDate()}</span>
        {ts.length > 1 && <svg viewBox="0 0 40 16" className="hidden h-4 w-10 md:block"><polyline points={path} fill="none" stroke={r >= 0 ? '#6ee7b7' : '#ff8a7a'} strokeWidth="1.2" opacity=".8" /></svg>}
      </div>
      {ts.length > 0 && <span className={`font-mono text-[10px] font-bold md:text-xs ${tone(r)}`}>{fmtR(r)}</span>}
    </button>
  )
}
