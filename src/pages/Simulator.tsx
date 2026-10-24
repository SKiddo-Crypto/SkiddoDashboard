import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useStore } from '../lib/store'
import { accountToday, leaks, simulate } from '../lib/stats'
import { fmtR, fmtUsd, lc, tone } from '../lib/format'
import { Card, Empty, Segmented } from '../components/ui'
import type { Trade } from '../types'

const HORIZONS = [{ value: '30', label: '30 days' }, { value: '60', label: '60 days' }, { value: '120', label: '120 days' }, { value: '250', label: 'A year' }]

export default function Simulator() {
  const { trades, accounts } = useStore()
  const [days, setDays] = useState('60')
  const [seed, setSeed] = useState(0)
  const leakList = useMemo(() => leaks(trades), [trades])
  const [leakIdx, setLeakIdx] = useState(0)
  const leak = leakList[leakIdx]

  const leakFilter = (l = leak) => (t: Trade) => {
    if (!l) return false
    if (l.label.endsWith('-grade setups')) return t.grade === l.label[0]
    return !!t.mistakes?.includes(l.label)
  }
  const sim = useMemo(() => simulate(trades, { days: +days, runs: 2000 }), [trades, days, seed]) // eslint-disable-line react-hooks/exhaustive-deps
  const fixed = useMemo(() => (leak ? simulate(trades, { days: +days, runs: 2000, exclude: leakFilter() }) : null), [trades, days, leak, seed]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!sim) return <Empty>Log some trading days first. The simulator replays your own days.</Empty>

  return (
    <div className="space-y-4">
      <div>
        <div className="label flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-win" /> Your edge, replayed</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Your middle future is <span className={tone(sim.median)}>{fmtUsd(sim.median)}</span> in {days} days.</h1>
        <p className="mt-1 text-sm text-muted">
          {Math.round(sim.ahead * 100)}% of 2,000 replays of your own {sim.sampleDays} trading days end ahead.
          {leak && fixed && <> Fixing <b className="text-white">{lc(leak.label)}</b> adds <span className={tone(fixed.median - sim.median)}>{fmtUsd(fixed.median - sim.median)}</span> to the middle outcome.</>}
        </p>
      </div>

      <section className="card overflow-hidden p-4">
        <Paths paths={sim.paths} median={sim.median} />
      </section>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Tile label="Middle outcome" v={fmtUsd(sim.median)} n={sim.median} sub="half did better" />
        <Tile label="Bad case" v={fmtUsd(sim.bad)} n={sim.bad} sub="1 in 10 did worse" />
        <Tile label="Good case" v={fmtUsd(sim.good)} n={sim.good} sub="1 in 10 did better" />
        <Tile label="Ends ahead" v={`${Math.round(sim.ahead * 100)}%`} sub="of 2,000 replays" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[280px] flex-1"><Segmented value={days} onChange={setDays} options={HORIZONS} /></div>
        <button onClick={() => setSeed(s => s + 1)} className="btn-ghost"><RefreshCw size={14} /> Replay</button>
      </div>

      <Card title="Fix one leak">
        <p className="-mt-2 mb-4 text-sm text-muted">One habit costs you more than the rest. Take it out and watch the same days play again.</p>
        {leakList.length ? (
          <>
            <div className="flex flex-wrap gap-2">
              {leakList.slice(0, 5).map((l, i) => (
                <button key={l.label} onClick={() => setLeakIdx(i)} className={`rounded-full border px-3 py-1.5 text-xs ${i === leakIdx ? 'border-loss/60 bg-loss/10 text-loss' : 'border-line text-soft'}`}>
                  {l.label} <span className="font-mono">{fmtR(l.costR, 1)}</span>
                </button>
              ))}
            </div>
            {leak && fixed && (
              <div className="mt-5">
                <div className="label">Plug this one leak</div>
                <h3 className="mt-1 text-2xl font-semibold text-loss">{leak.label}</h3>
                <p className="mt-1 text-sm text-muted">{leak.count} trades so far. Without them, your middle outcome over {days} trading days moves <span className={tone(fixed.median - sim.median)}>{fmtUsd(fixed.median - sim.median)}</span>.</p>
                <div className="mt-4 flex items-center gap-4 font-mono">
                  <div><div className="text-[10px] text-muted">Ends ahead now</div><div className="text-2xl font-bold">{Math.round(sim.ahead * 100)}%</div></div>
                  <span className="text-muted">→</span>
                  <div><div className="text-[10px] text-muted">Without it</div><div className="text-2xl font-bold text-win">{Math.round(fixed.ahead * 100)}%</div></div>
                </div>
              </div>
            )}
          </>
        ) : <p className="text-sm text-muted">No leaks yet. Tag mistakes and grades when you log trades.</p>}
      </Card>

      <Card title="Edge by account">
        <div className="grid gap-3 md:grid-cols-2">
          {accounts.map(a => {
            const ts = trades.filter(t => t.accountIds.includes(a.id))
            const s = simulate(ts.map(t => ({ ...t, accountIds: [a.id] })), { days: +days, runs: 1000 })
            const g = accountToday(a, trades)
            // share of replays that hit the drawdown floor at any point
            const blown = s ? s.paths.filter(p => p.some(v => g.balance + v <= g.floor)).length / s.paths.length : 0
            return (
              <div key={a.id} className="rounded-xl border border-line bg-panel2 p-4">
                <div className="text-sm font-semibold">{a.name} <span className="font-normal text-muted">· {a.exchange}</span></div>
                {s ? (
                  <div className="mt-3 grid grid-cols-3 gap-2 font-mono">
                    <div><div className="text-[10px] text-muted">Ends ahead</div><div className="font-bold">{Math.round(s.ahead * 100)}%</div></div>
                    <div><div className="text-[10px] text-muted">Hits floor</div><div className={`font-bold ${blown > 0.1 ? 'text-loss' : ''}`}>{Math.round(blown * 100)}%</div></div>
                    <div><div className="text-[10px] text-muted">Middle</div><div className={`font-bold ${tone(s.median)}`}>{fmtUsd(s.median)}</div><div className="text-[10px] text-muted">{fmtUsd(s.bad)} to {fmtUsd(s.good)}</div></div>
                  </div>
                ) : <p className="mt-2 text-sm text-muted">No trades yet.</p>}
              </div>
            )
          })}
        </div>
        <p className="mt-4 text-[11px] text-muted">Draws {days} days at random from your own trading days and plays them back 2,000 times. It shows what your record has done, not what the market will do. Not financial advice.</p>
      </Card>
    </div>
  )
}

function Tile({ label, v, sub, n }: { label: string; v: string; sub: string; n?: number }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] text-muted">{label}</div>
      <div className={`mt-1 font-mono text-xl font-medium ${n === undefined ? '' : tone(n)}`}>{v}</div>
      <div className="text-[10px] text-muted">{sub}</div>
    </div>
  )
}

function Paths({ paths, median }: { paths: number[][]; median: number }) {
  const W = 800, H = 320
  const shown = paths.slice(0, 220)
  const all = shown.flat()
  const lo = Math.min(0, ...all), hi = Math.max(0, ...all)
  const n = shown[0].length - 1
  const x = (i: number) => (i / n) * W
  const y = (v: number) => H - ((v - lo) / (hi - lo || 1)) * (H - 20) - 10
  // the replay that ends closest to the median, drawn bright
  const mid = shown.reduce((b, p) => (Math.abs(p[n] - median) < Math.abs(b[n] - median) ? p : b), shown[0])
  const d = (p: number[]) => p.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-72 w-full md:h-80" preserveAspectRatio="none">
      <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="#ffffff2e" strokeDasharray="4 4" />
      {shown.map((p, i) => <path key={i} d={d(p)} fill="none" stroke={p[n] >= 0 ? '#c9d3d8' : '#ff8a7a'} strokeOpacity={0.09} strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
      <path d={d(mid)} fill="none" stroke="#6ee7b7" strokeWidth="2.5" vectorEffect="non-scaling-stroke" style={{ filter: 'drop-shadow(0 0 6px #6ee7b7)' }} />
      <circle cx={x(n)} cy={y(mid[n])} r="5" fill="#6ee7b7" />
    </svg>
  )
}
