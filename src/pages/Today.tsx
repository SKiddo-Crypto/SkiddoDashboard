import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { ArrowUpRight, Check } from 'lucide-react'
import { useStore } from '../lib/store'
import { accountToday, byDay, computeStats, leaks } from '../lib/stats'
import { dayKey, fmtR, fmtUsd, lc, pnlOf, rOf, tone, usd } from '../lib/format'
import { Card } from '../components/ui'

const SESSIONS = [
  { name: 'Asia', from: 0, to: 7, color: 'bg-sky-400/20 text-sky-200' },
  { name: 'London', from: 7, to: 13, color: 'bg-warn/20 text-warn' },
  { name: 'NY', from: 13, to: 20, color: 'bg-win/20 text-win' },
  { name: 'Late NY', from: 20, to: 24, color: 'bg-panel2 text-soft' },
]

export default function Today() {
  const { accounts, trades, rules, committed, toggleCommit } = useStore()
  const { openLog } = useOutletContext<{ openLog: () => void }>()
  const [accId, setAccId] = useState(accounts[0]?.id)
  const acc = accounts.find(a => a.id === accId) ?? accounts[0]
  const now = new Date()
  const today = dayKey(now.toISOString())
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.'

  const g = acc ? accountToday(acc, trades) : null
  const streak = useMemo(() => { let n = 0; for (const t of trades) { if (!t.clean) break; n++ } return n }, [trades])
  const todays = trades.filter(t => dayKey(t.date) === today)
  const status = !g ? null : g.stopLeft <= 0 ? 'stop' : g.tradesLeft <= 0 ? 'done' : g.stopLeft < (acc!.dailyLossLimit * 0.35) ? 'careful' : 'clear'
  const statusText = { clear: 'Clear to trade.', careful: 'Careful. Near your stop.', stop: 'Stopped for today.', done: 'Done for today.' }
  const ring = status === 'clear' ? ['#5b8cff', '#6ee7b7'] : status === 'careful' ? ['#ffb35c', '#ff8a7a'] : ['#ff8a7a', '#c084fc']
  const suggestedRisk = acc ? Math.min(Math.round(acc.dailyLossLimit / 3), g?.stopLeft ?? 0) : 0

  // Today's lane: from the daily stop up to a lock-in target (your 80th percentile green day).
  const days = useMemo(() => {
    const m = byDay(acc ? trades.filter(t => t.accountIds.includes(acc.id)) : trades)
    return [...m.values()].map(ts => ts.reduce((a, t) => a + t.resultUsd - (t.feesUsd ?? 0), 0))
  }, [trades, acc])
  const greens = days.filter(d => d > 0).sort((a, b) => a - b)
  const target = greens.length ? Math.round(greens[Math.floor(greens.length * 0.8)]) : (acc?.dailyLossLimit ?? 500) * 2
  const lo = -(acc?.dailyLossLimit ?? 500)
  const pos = g ? Math.min(1, Math.max(0, (g.todayPnl - lo) / (target - lo))) : 0
  const zero = (0 - lo) / (target - lo)

  const week = useMemo(() => {
    const start = new Date(now); start.setDate(now.getDate() - ((now.getDay() + 6) % 7)); start.setHours(0, 0, 0, 0)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i)
      const ts = trades.filter(t => dayKey(t.date) === dayKey(d.toISOString()))
      return { label: d.toLocaleDateString('en-GB', { weekday: 'short' }), usd: ts.reduce((a, t) => a + pnlOf(t), 0), n: ts.length, future: d > now }
    })
  }, [trades]) // eslint-disable-line react-hooks/exhaustive-deps
  const weekTotal = week.reduce((a, d) => a + d.usd, 0)
  const weekMax = Math.max(1, ...week.map(d => Math.abs(d.usd)))
  const topLeak = useMemo(() => leaks(trades)[0], [trades])
  const done = committed[today] ?? []
  const planItems = [
    { k: 'rule', tag: 'Your rule', text: rules.plan[0] ?? 'Set a rule in Settings' },
    { k: 'focus', tag: 'Your focus · from your record', text: topLeak ? `Skip ${lc(topLeak.label)}` : rules.focus, sub: topLeak ? `cost you ${fmtR(topLeak.costR, 1)} over ${topLeak.count} trades` : undefined },
    { k: 'limits', tag: `Your limits · ${acc?.name ?? ''}`, text: acc ? `${acc.maxTradesPerDay} trades max · stop at −${usd(acc.dailyLossLimit)} · ${usd(suggestedRisk)} a trade` : '' },
  ]
  const last = trades.slice(0, 40).reverse()
  const stats = computeStats(trades)

  return (
    <div className="space-y-4">
      <section className="card relative overflow-hidden p-6 md:p-8">
        <div className="ray left-[60%] hidden md:block" />
        <div className="ray left-[50%] md:hidden" style={{ opacity: 0.6 }} />
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col justify-center">
            <div className="label flex items-center gap-2"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-win" /> Live · {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">{greeting}</h1>
            <div className="mt-6 label">Discipline</div>
            <p className="mt-1 text-lg">{streak} trade{streak === 1 ? '' : 's'} in a row inside your rules.</p>
            <p className="text-sm text-muted">{Math.round(stats.cleanRate * 100)}% of all your trades were clean.</p>
            <div className="mt-5"><button onClick={openLog} className="btn-primary">Log a trade <ArrowUpRight size={14} /></button></div>
          </div>
          <div className="flex flex-col items-center">
            <div className="mb-3 flex flex-wrap justify-center gap-2">
              {accounts.map(a => (
                <button key={a.id} onClick={() => setAccId(a.id)} className={`rounded-full border px-3 py-1 text-xs ${a.id === acc?.id ? 'border-white/70 text-white' : 'border-line text-muted'}`}>{a.name}</button>
              ))}
            </div>
            {g && acc && <Gauge pct={g.stopLeft / acc.dailyLossLimit} colors={ring} value={usd(g.stopLeft)} caption="stop left today" />}
            <div className="mt-3 text-lg font-medium">{status ? statusText[status] : 'Add an account in Settings'}</div>
            {g && (
              <div className="mt-4 grid w-full grid-cols-4 gap-2 text-center">
                {[['Room', usd(g.room)], ['Trades left', String(g.tradesLeft)], ['Stop left', usd(g.stopLeft)], ['Size', usd(suggestedRisk)]].map(([l, v]) => (
                  <div key={l} className="rounded-xl bg-panel2 px-2 py-2"><div className="text-[10px] text-muted">{l}</div><div className="font-mono text-sm font-bold">{v}</div></div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {g && (
        <Card title="Today's lane">
          <div className="grid gap-6 md:grid-cols-[1fr_2fr] md:items-center">
            <div>
              <p className="text-lg">Stay between <span className="text-loss">−{usd(-lo)}</span> and <span className="text-sky-300">+{usd(target)}</span> today.</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div><div className="text-[10px] text-muted">Stop left</div><div className="font-mono text-loss">{usd(g.stopLeft)}</div></div>
                <div><div className="text-[10px] text-muted">Today</div><div className={`font-mono ${tone(g.todayPnl)}`}>{fmtUsd(g.todayPnl)}</div></div>
                <div><div className="text-[10px] text-muted">Room to floor</div><div className="font-mono text-sky-300">{usd(g.room)}</div></div>
              </div>
            </div>
            <div className="relative h-16">
              <div className="absolute inset-x-0 top-8 h-[2px] bg-gradient-to-r from-loss via-line to-sky-400" />
              <div className="absolute top-5 h-8 border-l-2 border-loss" style={{ left: 0 }} />
              <div className="absolute top-5 h-8 border-r-2 border-sky-400" style={{ right: 0 }} />
              <div className="absolute top-6 h-4 border-l border-dashed border-muted" style={{ left: `${zero * 100}%` }} />
              <div className="absolute top-[26px] h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_14px_white]" style={{ left: `${pos * 100}%` }} />
              <div className="absolute -top-1 left-0 font-mono text-[10px] text-loss">Stop −{usd(-lo)}</div>
              <div className="absolute -top-1 right-0 font-mono text-[10px] text-sky-300">Lock in +{usd(target)}</div>
              <div className="absolute top-12 -translate-x-1/2 font-mono text-[10px] text-soft" style={{ left: `${pos * 100}%` }}>{fmtUsd(g.todayPnl)}</div>
            </div>
          </div>
        </Card>
      )}

      <Card title="Your day" right={<span className="font-mono text-[10px] text-muted">{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} local</span>}>
        <div className="relative h-36">
          {SESSIONS.map(s => (
            <div key={s.name} className={`absolute top-0 h-5 rounded-md px-2 text-[10px] leading-5 ${s.color}`}
              style={{ left: `${(s.from / 24) * 100}%`, width: `calc(${((s.to - s.from) / 24) * 100}% - 4px)` }}>{s.name}</div>
          ))}
          <div className="absolute inset-x-0 top-[78px] border-t border-dashed border-line" />
          {todays.map(t => {
            const d = new Date(t.date); const h = d.getUTCHours() + d.getUTCMinutes() / 60
            const r = rOf(t); const hgt = Math.min(44, Math.abs(r) * 16 + 4)
            return (
              <Link key={t.id} to={`/trades/${t.id}`} title={`${t.symbol} ${fmtR(r)}`}
                className={`absolute w-3 -translate-x-1/2 rounded-sm ${r >= 0 ? 'bg-win' : 'bg-loss'}`}
                style={{ left: `${(h / 24) * 100}%`, height: hgt, top: r >= 0 ? 78 - hgt : 78 }} />
            )
          })}
          {(() => { const h = now.getUTCHours() + now.getUTCMinutes() / 60; return (
            <div className="absolute top-6 bottom-4 w-px bg-white/70" style={{ left: `${(h / 24) * 100}%` }}>
              <div className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-white" />
            </div>) })()}
          <div className="absolute inset-x-0 bottom-0 flex justify-between font-mono text-[9px] text-muted">
            {[0, 3, 6, 9, 12, 15, 18, 21, 24].map(h => <span key={h}>{String(h).padStart(2, '0')}</span>)}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">Sessions in UTC. {todays.length ? `${todays.length} trade${todays.length > 1 ? 's' : ''} today.` : 'No trades yet today.'}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Your plan for today" right={<span className="text-[11px] text-muted">{done.length} of {planItems.length} committed</span>}>
          <p className="mb-3 text-sm text-soft">Tap each one to commit to it.</p>
          <div className="space-y-2">
            {planItems.map(p => {
              const on = done.includes(p.k)
              return (
                <button key={p.k} onClick={() => toggleCommit(today, p.k)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${on ? 'border-win/40 bg-win/5' : 'border-line hover:border-soft/30'}`}>
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${on ? 'border-win bg-win text-black' : 'border-muted'}`}>{on && <Check size={12} />}</span>
                  <span>
                    <span className="label">{p.tag}</span>
                    <span className="block text-sm font-medium">{p.text}</span>
                    {p.sub && <span className="block text-[11px] text-muted">{p.sub}</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </Card>

        <Card title="Your run · this week">
          <div className={`font-mono text-3xl font-light ${tone(weekTotal)}`}>{fmtUsd(weekTotal)}</div>
          <div className="mt-4 flex h-32 items-center gap-2">
            {week.map(d => (
              <div key={d.label} className="flex h-full flex-1 flex-col items-center">
                <div className="flex h-1/2 w-full items-end justify-center">{d.usd > 0 && <div className="w-full max-w-7 rounded-t-md bg-win/80 shadow-[0_0_20px_-4px_#6ee7b7]" style={{ height: `${(d.usd / weekMax) * 100}%` }} />}</div>
                <div className="flex h-1/2 w-full items-start justify-center border-t border-line">{d.usd < 0 && <div className="w-full max-w-7 rounded-b-md bg-loss/80" style={{ height: `${(-d.usd / weekMax) * 100}%` }} />}</div>
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-2">{week.map(d => <div key={d.label} className={`flex-1 text-center text-[10px] ${d.future ? 'text-muted/40' : 'text-muted'}`}>{d.label}</div>)}</div>
          <div className="mt-4 label">Your last trades</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {last.map(t => <Link key={t.id} to={`/trades/${t.id}`} title={fmtR(rOf(t))} className={`h-2.5 w-2.5 rounded-full ${rOf(t) > 0 ? 'bg-win' : 'bg-loss'} ${t.clean ? '' : 'opacity-40'}`} />)}
          </div>
        </Card>
      </div>
    </div>
  )
}

/** Thermostat-style ring: how much of today's loss budget is left. */
function Gauge({ pct, colors, value, caption }: { pct: number; colors: string[]; value: string; caption: string }) {
  const R = 70, C = 2 * Math.PI * R, arc = 0.75 // 270° dial
  const p = Math.max(0, Math.min(1, pct))
  const ticks = Array.from({ length: 41 }, (_, i) => i)
  return (
    <div className="relative h-48 w-48">
      <div className="glass absolute inset-5 rounded-full" />
      <svg viewBox="0 0 180 180" className="absolute inset-0 h-full w-full">
        <defs><linearGradient id="gauge" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor={colors[0]} /><stop offset="100%" stopColor={colors[1]} /></linearGradient></defs>
        {ticks.map(i => {
          const a = (135 + (i / 40) * 270) * Math.PI / 180
          const on = i / 40 <= p
          return <line key={i} x1={90 + Math.cos(a) * 84} y1={90 + Math.sin(a) * 84} x2={90 + Math.cos(a) * 88} y2={90 + Math.sin(a) * 88} stroke={on ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.12)'} strokeWidth="1.2" strokeLinecap="round" />
        })}
        <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" strokeDasharray={`${C * arc} ${C}`} strokeLinecap="round" transform="rotate(135 90 90)" />
        <circle cx="90" cy="90" r={R} fill="none" stroke="url(#gauge)" strokeWidth="7" strokeDasharray={`${C * arc * p} ${C}`} strokeLinecap="round" transform="rotate(135 90 90)" style={{ filter: `drop-shadow(0 0 8px ${colors[0]})` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-mono text-4xl font-light tracking-tight">{value}</div>
        <div className="text-[11px] text-muted">{caption}</div>
      </div>
    </div>
  )
}
