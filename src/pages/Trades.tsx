import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Download } from 'lucide-react'
import { useStore } from '../lib/store'
import { byDay, computeStats } from '../lib/stats'
import { fmtR, fmtTime, fmtUsd, pnlOf, rOf, tone } from '../lib/format'
import { Empty } from '../components/ui'
import type { Trade } from '../types'

const mondayOf = (k: string) => { const d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d }
const short = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export default function Trades() {
  const { trades, accounts } = useStore()
  const [q, setQ] = useState('')
  const [acc, setAcc] = useState('all')
  const [open, setOpen] = useState<string | null>(null)

  const filtered = useMemo(() => trades.filter(t =>
    (acc === 'all' || t.accountIds.includes(acc)) &&
    (!q || `${t.symbol} ${t.setup ?? ''} ${t.side} ${t.notes ?? ''}`.toLowerCase().includes(q.toLowerCase()))), [trades, q, acc])

  const weeks = useMemo(() => {
    const days = byDay(filtered)
    const w = new Map<string, [string, Trade[]][]>()
    for (const [k, ts] of days) { const m = mondayOf(k).toISOString().slice(0, 10); w.set(m, [...(w.get(m) ?? []), [k, ts]]) }
    return [...w.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const exportCsv = () => {
    const head = ['date', 'symbol', 'market', 'side', 'accounts', 'risk', 'result', 'fees', 'r', 'setup', 'grade', 'clean', 'mistakes', 'notes']
    const rows = filtered.map(t => [t.date, t.symbol, t.market, t.side, t.accountIds.map(id => accounts.find(a => a.id === id)?.name ?? id).join('|'), t.riskUsd, t.resultUsd, t.feesUsd ?? 0, rOf(t).toFixed(2), t.setup ?? '', t.grade ?? '', t.clean, (t.mistakes ?? []).join('|'), (t.notes ?? '').replace(/\n/g, ' ')])
    const csv = [head, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'trades.csv'; a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-semibold tracking-tight">Trades</h1>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search symbol, setup, notes" className="input w-full sm:w-64" />
        <select value={acc} onChange={e => setAcc(e.target.value)} className="input w-auto">
          <option value="all">All accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button onClick={exportCsv} className="btn-ghost"><Download size={14} /> CSV</button>
      </div>

      {!weeks.length && <Empty>No trades match.</Empty>}

      {weeks.map(([monday, days]) => {
        const all = days.flatMap(d => d[1]); const s = computeStats(all)
        const m = new Date(monday + 'T12:00:00'); const sun = new Date(m); sun.setDate(m.getDate() + 6)
        return (
          <section key={monday}>
            <div className="label mb-2">Week of {short(m)}</div>
            <div className="card divide-y divide-line overflow-hidden">
              <div className="flex items-center justify-between bg-panel2/50 px-4 py-3">
                <span className="text-sm font-semibold">The week · {short(m)} – {short(sun)}</span>
                <span className="font-mono text-xs text-soft">{s.count} trades · <span className={tone(s.netR)}>{fmtR(s.netR)}</span> · <span className={tone(s.netUsd)}>{fmtUsd(s.netUsd)}</span></span>
              </div>
              {days.sort((a, b) => b[0].localeCompare(a[0])).map(([k, ts]) => {
                const ds = computeStats(ts); const isOpen = open === k
                return (
                  <div key={k}>
                    <button onClick={() => setOpen(isOpen ? null : k)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-panel2/40">
                      <span className="w-28 text-sm">{new Date(k + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span className="hidden flex-1 gap-1 sm:flex">{ts.map(t => <span key={t.id} className={`h-2 w-2 rounded-full ${rOf(t) > 0 ? 'bg-win' : 'bg-loss'}`} />)}</span>
                      <span className="ml-auto font-mono text-xs text-soft">{ds.count} trade{ds.count > 1 ? 's' : ''} · <span className={tone(ds.netR)}>{fmtR(ds.netR)}</span></span>
                      <ChevronDown size={14} className={`text-muted transition ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="bg-bg/60 px-2 pb-2">
                        {[...ts].sort((a, b) => a.date.localeCompare(b.date)).map(t => <TradeRow key={t.id} t={t} />)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export function TradeRow({ t }: { t: Trade }) {
  const r = rOf(t)
  return (
    <Link to={`/trades/${t.id}`} className="grid grid-cols-[48px_1fr_auto] items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-panel2">
      <span className="font-mono text-xs text-muted">{fmtTime(t.date)}</span>
      <span className="min-w-0">
        <span className="font-mono text-sm font-bold">{t.symbol}</span>
        <span className={`ml-2 text-[10px] uppercase ${t.side === 'long' ? 'text-win' : 'text-loss'}`}>{t.side === 'long' ? '▲' : '▼'} {t.side}</span>
        <span className="ml-2 truncate text-xs text-muted">{t.setup}</span>
        {!t.clean && <span className="ml-2 rounded bg-loss/15 px-1.5 text-[10px] text-loss">rule broken</span>}
      </span>
      <span className="text-right">
        <span className={`block font-mono text-sm font-bold ${tone(r)}`}>{fmtR(r)}</span>
        <span className="block font-mono text-[10px] text-muted">{fmtUsd(pnlOf(t))}</span>
      </span>
    </Link>
  )
}
