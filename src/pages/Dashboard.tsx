import { useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../lib/store'
import { computeStats, equityCurve, groupBy, leaks, WEEKDAYS } from '../lib/stats'
import { dayKey, fmtR, fmtUsd, lc, rOf, tone } from '../lib/format'
import { Bar as HBar, Card, Empty, Stat } from '../components/ui'
import type { Trade } from '../types'

const tip = { contentStyle: { background: '#15181a', border: '1px solid #1f2427', borderRadius: 12, fontSize: 12 }, labelStyle: { color: '#9aa3a8' } }

export default function Dashboard() {
  const { trades: all, accounts } = useStore()
  const [acc, setAcc] = useState<string>('all')
  const [unit, setUnit] = useState<'r' | 'usd'>('r')
  const trades = useMemo(() => (acc === 'all' ? all : all.filter(t => t.accountIds.includes(acc))), [all, acc])
  const s = computeStats(trades)
  const curve = useMemo(() => equityCurve(trades), [trades])
  const leakList = useMemo(() => leaks(trades), [trades])

  // 95% interval on expectancy: is the edge real or luck?
  const rs = trades.map(rOf)
  const sd = Math.sqrt(rs.reduce((a, r) => a + (r - s.expectancy) ** 2, 0) / Math.max(1, rs.length - 1))
  const ci = 1.96 * sd / Math.sqrt(Math.max(1, rs.length))
  const lo = s.expectancy - ci, hi = s.expectancy + ci
  const verdict = lo > 0 ? 'Yes. You have an edge.' : hi < 0 ? 'Not yet. Your edge is negative.' : 'Too early to tell.'

  const dist = useMemo(() => {
    const bins = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3]
    return bins.map((b, i) => ({
      label: i === bins.length - 1 ? `${b}+` : `${b}`,
      from: b,
      n: rs.filter(r => r >= b && (i === bins.length - 1 || r < bins[i + 1]) || (i === 0 && r < b)).length,
    }))
  }, [trades]) // eslint-disable-line react-hooks/exhaustive-deps

  const hours = useMemo(() => {
    const h = Array.from({ length: 24 }, (_, i) => ({ h: i, r: 0, n: 0 }))
    for (const t of trades) { const x = new Date(t.date).getUTCHours(); h[x].r += rOf(t); h[x].n++ }
    return h
  }, [trades])
  const hMax = Math.max(0.01, ...hours.map(h => Math.abs(h.r)))
  const bestHour = [...hours].sort((a, b) => b.r - a.r)[0]

  if (!all.length) return <Empty>No trades yet. Press <b>L</b> or tap the + button to log your first trade.</Empty>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-xl bg-panel p-1">
        {[{ id: 'all', name: 'All accounts' }, ...accounts].map(a => (
          <button key={a.id} onClick={() => setAcc(a.id)} className={`flex-1 rounded-lg px-3 py-2 text-sm ${acc === a.id ? 'bg-panel2 text-white' : 'text-muted'}`}>{a.name}</button>
        ))}
      </div>

      {leakList[0] && (
        <div>
          <div className="label flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-loss" /> Where your R leaks</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Your biggest leak is {lc(leakList[0].label)}: <span className="text-loss">{fmtR(leakList[0].costR, 1)}</span>.</h1>
          <p className="mt-1 text-sm text-muted">Over {s.count} trades. Clean trades average {fmtR(computeStats(trades.filter(t => t.clean)).expectancy)}, broken ones {fmtR(computeStats(trades.filter(t => !t.clean)).expectancy)}.</p>
        </div>
      )}

      <Card title="Do you have an edge?">
        <h2 className={`text-2xl font-semibold ${lo > 0 ? 'text-win' : hi < 0 ? 'text-loss' : 'text-warn'}`}>{verdict}</h2>
        <p className="mt-1 text-sm text-muted">{fmtR(s.expectancy)} a trade over {s.count} trades. The range it most likely sits in is {fmtR(lo)} to {fmtR(hi)}.</p>
        <EdgeBand lo={lo} hi={hi} mid={s.expectancy} />
      </Card>

      <Card title="Equity curve" right={
        <div className="flex rounded-full bg-panel2 p-0.5 text-xs">
          {(['r', 'usd'] as const).map(u => <button key={u} onClick={() => setUnit(u)} className={`rounded-full px-3 py-1 ${unit === u ? 'bg-white text-black' : 'text-soft'}`}>{u === 'r' ? 'R' : '$'}</button>)}
        </div>}>
        <div className={`font-mono text-4xl font-bold ${tone(s.netR)}`}>{unit === 'r' ? fmtR(s.netR, 1) : fmtUsd(s.netUsd)}</div>
        <div className="text-xs text-muted">{s.count} closed trades across {acc === 'all' ? accounts.length : 1} account{acc === 'all' && accounts.length !== 1 ? 's' : ''} · {s.days} trading days</div>
        <div className="mt-4 h-64">
          <ResponsiveContainer>
            <AreaChart data={curve} margin={{ left: -10, right: 0, top: 5, bottom: 0 }}>
              <defs><linearGradient id="eq" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7ee2a8" stopOpacity={0.35} /><stop offset="100%" stopColor="#7ee2a8" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="i" tick={{ fill: '#6b7479', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7479', fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
              <Tooltip {...tip} labelFormatter={(i, p) => (p?.[0] ? new Date(p[0].payload.date).toLocaleDateString('en-GB') : i)} formatter={(v: number) => (unit === 'r' ? fmtR(v) : fmtUsd(v))} />
              <Area isAnimationActive={false} type="monotone" dataKey={unit} stroke="#7ee2a8" strokeWidth={2} fill="url(#eq)" name={unit === 'r' ? 'Net R' : 'Net $'} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Net P&L" value={fmtUsd(s.netUsd)} n={s.netUsd} sub={`${s.wins}W · ${s.losses}L`} />
        <Stat label="Win rate" value={`${Math.round(s.winRate * 100)}%`} sub={`of ${s.count}`} />
        <Stat label="Expectancy" value={fmtR(s.expectancy)} n={s.expectancy} sub="per trade" />
        <Stat label="Profit factor" value={Number.isFinite(s.profitFactor) ? s.profitFactor.toFixed(2) : '∞'} />
        <Stat label="Average win" value={fmtR(s.avgWin)} n={1} />
        <Stat label="Average loss" value={fmtR(s.avgLoss)} n={-1} />
        <Stat label="Best / worst" value={<span><span className="text-win">{fmtR(s.best, 1)}</span> <span className="text-muted">/</span> <span className="text-loss">{fmtR(s.worst, 1)}</span></span>} />
        <Stat label="Max drawdown" value={fmtR(s.maxDrawdownR, 1)} n={s.maxDrawdownR} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="How your trades end, in R">
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={dist} margin={{ left: -25, right: 0, top: 10, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fill: '#6b7479', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7479', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...tip} cursor={{ fill: '#ffffff08' }} />
                <Bar isAnimationActive={false} dataKey="n" name="Trades" radius={[4, 4, 0, 0]}>{dist.map(d => <Cell key={d.label} fill={d.from < 0 ? '#f2766b' : '#7ee2a8'} fillOpacity={0.85} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Your hours (UTC)">
          <div className="grid grid-cols-12 gap-1">
            {hours.map(h => (
              <div key={h.h} title={`${h.h}:00 · ${h.n} trades · ${fmtR(h.r, 1)}`}
                className="flex aspect-square items-end justify-center rounded-md font-mono text-[9px] text-black/70"
                style={{ background: h.n ? (h.r >= 0 ? `rgba(126,226,168,${0.15 + 0.85 * h.r / hMax})` : `rgba(242,118,107,${0.15 + 0.85 * -h.r / hMax})`) : '#15181a' }}>
                <span className={h.n ? '' : 'text-muted'}>{h.h}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">Your best hour is {String(bestHour.h).padStart(2, '0')}:00 UTC ({fmtR(bestHour.r, 1)}).</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Breakdown title="By day of the week" trades={trades} keyFn={t => WEEKDAYS[new Date(t.date).getDay()]} order={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} />
        <Breakdown title="By session" trades={trades} keyFn={t => t.session} order={['Asia', 'London', 'NY', 'Late NY']} />
        <Breakdown title="By symbol" trades={trades} keyFn={t => t.symbol} />
        <Breakdown title="Long or short" trades={trades} keyFn={t => (t.side === 'long' ? 'Long' : 'Short')} />
        <Breakdown title="By strategy" trades={trades} keyFn={t => t.setup} />
        <Breakdown title="By grade" trades={trades} keyFn={t => t.grade} order={['A', 'B', 'C']} />
        <Breakdown title="Trade of the day" trades={trades} keyFn={tradeOfDay(trades)} order={['1st', '2nd', '3rd', '4th+']} />
        <RulesDonut trades={trades} />
        <Card title="Your R leaks">
          {leakList.length ? (
            <div className="space-y-3">
              {leakList.slice(0, 5).map(l => (
                <div key={l.label}>
                  <div className="flex justify-between text-sm"><span>{l.label}</span><span className="font-mono text-loss">{fmtR(l.costR, 1)}</span></div>
                  <div className="text-[11px] text-muted">{l.count} trades vs your clean average</div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted">No leaks found. Keep tagging mistakes.</p>}
        </Card>
      </div>
    </div>
  )
}

function tradeOfDay(trades: Trade[]) {
  const idx = new Map<string, string>()
  const days = new Map<string, Trade[]>()
  for (const t of trades) days.set(dayKey(t.date), [...(days.get(dayKey(t.date)) ?? []), t])
  for (const ts of days.values()) [...ts].sort((a, b) => a.date.localeCompare(b.date)).forEach((t, i) => idx.set(t.id, ['1st', '2nd', '3rd'][i] ?? '4th+'))
  return (t: Trade) => idx.get(t.id)
}

function Breakdown({ title, trades, keyFn, order }: { title: string; trades: Trade[]; keyFn: (t: Trade) => string | undefined; order?: string[] }) {
  let rows = groupBy(trades, keyFn)
  rows = order ? order.map(o => rows.find(r => r.key === o)).filter(Boolean) as typeof rows : rows.sort((a, b) => b.netR - a.netR).slice(0, 6)
  const max = Math.max(0.01, ...rows.map(r => Math.abs(r.netR)))
  return (
    <Card title={title}>
      {rows.length ? (
        <div className="space-y-3">
          {rows.map(r => (
            <div key={r.key} className="grid grid-cols-[90px_1fr_64px] items-center gap-3">
              <div><div className="truncate text-sm">{r.key}</div><div className="text-[10px] text-muted">{r.count} · {Math.round(r.winRate * 100)}% won</div></div>
              <HBar value={r.netR} max={max} positive={r.netR >= 0} />
              <div className={`text-right font-mono text-xs ${tone(r.netR)}`}>{fmtR(r.netR, 1)}</div>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-muted">Nothing tagged yet.</p>}
    </Card>
  )
}

function RulesDonut({ trades }: { trades: Trade[] }) {
  const clean = trades.filter(t => t.clean).length
  const pct = trades.length ? clean / trades.length : 0
  const avgRisk = trades.length ? trades.reduce((a, t) => a + t.riskUsd, 0) / trades.length : 0
  const C = 2 * Math.PI * 34
  return (
    <Card title="Rules and size">
      <div className="flex items-center gap-5">
        <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
          <circle cx="44" cy="44" r="34" stroke="#15181a" strokeWidth="8" fill="none" />
          <circle cx="44" cy="44" r="34" stroke="#e8c56b" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={`${C * pct} ${C}`} transform="rotate(-90 44 44)" />
          <text x="44" y="49" textAnchor="middle" className="fill-white font-mono text-[15px] font-bold">{Math.round(pct * 100)}%</text>
        </svg>
        <div className="space-y-1.5 text-sm">
          <div><span className="mr-2 inline-block h-2 w-2 rounded-full bg-win" />{clean} clean trades</div>
          <div><span className="mr-2 inline-block h-2 w-2 rounded-full bg-loss" />{trades.length - clean} broke a rule</div>
          <div><span className="mr-2 inline-block h-2 w-2 rounded-full bg-sky-400" />${Math.round(avgRisk)} risked a trade</div>
        </div>
      </div>
    </Card>
  )
}

function EdgeBand({ lo, hi, mid }: { lo: number; hi: number; mid: number }) {
  const min = Math.min(-1, lo - 0.2), max = Math.max(1, hi + 0.2)
  const x = (v: number) => `${((v - min) / (max - min)) * 100}%`
  return (
    <div className="relative mt-6 h-14">
      <div className="absolute inset-x-0 top-5 h-4 rounded-full bg-gradient-to-r from-loss/30 via-panel2 to-win/20" />
      <div className="absolute top-5 h-4 w-px bg-white/40" style={{ left: x(0) }} />
      <div className="absolute top-4 h-6 rounded-full bg-win/40 blur-[1px]" style={{ left: x(lo), width: `calc(${x(hi)} - ${x(lo)})` }} />
      <div className="absolute top-[18px] h-5 w-5 -translate-x-1/2 rounded-full bg-win shadow-[0_0_18px_#7ee2a8]" style={{ left: x(mid) }} />
      <div className="absolute top-11 -translate-x-1/2 font-mono text-[10px] text-muted" style={{ left: x(0) }}>0R</div>
      <div className="absolute top-0 -translate-x-1/2 font-mono text-[10px] text-win" style={{ left: x(mid) }}>{fmtR(mid)}</div>
    </div>
  )
}
