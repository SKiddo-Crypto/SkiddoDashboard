import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Pencil, Trash2 } from 'lucide-react'
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { useStore } from '../lib/store'
import { fmtR, fmtTime, fmtUsd, pnlOf, rOf, usd } from '../lib/format'
import { Empty } from '../components/ui'

export default function TradeDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { trades, accounts, deleteTrade } = useStore()
  const t = trades.find(x => x.id === id)
  const [armed, setArmed] = useState(false)
  if (!t) return <Empty>Trade not found. <Link to="/trades" className="underline">Back to trades</Link></Empty>
  const r = rOf(t)
  const win = r > 0
  const color = win ? '#7ee2a8' : '#f2766b'
  const accNames = t.accountIds.map(a => accounts.find(x => x.id === a)?.name ?? '—').join(', ')
  // How it went: entry → worst point → best point → exit (order depends on outcome)
  const mae = t.maeR ?? Math.min(0, r), mfe = t.mfeR ?? Math.max(0, r)
  const path = win ? [0, mae, mfe, r] : [0, mfe, mae, r]
  const data = path.map((v, i) => ({ i, v, label: i === 0 ? 'Entry' : i === 3 ? 'Exit' : '' }))
  const d = new Date(t.date)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => nav(-1)} className="btn-ghost py-1.5"><ChevronLeft size={14} /> Back</button>
        <div className="flex gap-2">
          <button onClick={() => { if (armed) { deleteTrade(t.id); nav('/trades') } else setArmed(true) }} onBlur={() => setArmed(false)} className={`btn-ghost py-1.5 ${armed ? 'border-loss/60 text-loss' : ''}`}><Trash2 size={14} />{armed && ' Tap again to delete'}</button>
          <Link to={`/log/${t.id}`} className="btn-primary py-1.5"><Pencil size={14} /> Edit</Link>
        </div>
      </div>

      <section className={`card relative overflow-hidden p-6 md:p-8 ${win ? 'glow-win' : 'glow-loss'}`}
        style={{ background: `radial-gradient(120% 140% at 0% 0%, ${win ? 'rgba(126,226,168,.10)' : 'rgba(242,118,107,.12)'}, #0f1112 60%)` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${t.side === 'long' ? 'bg-win/15 text-win' : 'bg-loss/15 text-loss'}`}>{t.side === 'long' ? '▲ LONG' : '▼ SHORT'}</span>
            <span className="font-mono font-bold">{t.symbol}</span>
            <span className="text-xs uppercase text-muted">{t.market}{t.leverage ? ` · ${t.leverage}x` : ''}</span>
          </div>
          <span className="font-mono text-xs text-muted">{d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {fmtTime(t.date)}</span>
        </div>
        <div className={`label mt-4 ${win ? 'text-win' : 'text-loss'}`}>{win ? 'Win' : r < 0 ? 'Loss' : 'Breakeven'}</div>
        <div className="font-mono text-6xl font-extrabold tracking-tight md:text-7xl" style={{ color }}>{fmtR(r)}</div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div className="text-sm text-soft"><span className="font-mono font-bold">{fmtUsd(pnlOf(t))}</span> <span className="text-muted">{accNames} · {t.session}</span></div>
          <div className={`rounded-xl border px-3 py-1.5 text-center ${t.clean ? 'border-win/40 bg-win/10 text-win' : 'border-loss/40 bg-loss/10 text-loss'}`}>
            <div className="font-mono text-xs font-bold">{t.clean ? 'CLEAN' : 'RULE BROKEN'}</div>
            <div className="text-[10px] opacity-70">{t.clean ? 'every rule held' : t.mistakes?.join(', ')}</div>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <div className="label">How it went, in R</div>
        <div className="mt-3 h-56">
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
              <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.3} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="label" tick={{ fill: '#6b7479', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7479', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(+v).toFixed(1)}R`} domain={[Math.min(-1, ...path) - 0.2, Math.max(1, ...path) + 0.2]} />
              <ReferenceLine y={0} stroke="#2a3034" />
              <ReferenceLine y={-1} stroke="#f2766b" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'stop', fill: '#f2766b', fontSize: 10, position: 'insideLeft' }} />
              <Area isAnimationActive={false} type="linear" dataKey="v" stroke={color} strokeWidth={2.5} fill="url(#rg)" dot={{ r: 4, fill: '#0f1112', stroke: color, strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted">Went {fmtR(mae)} against you at worst and {fmtR(mfe)} in your favour at best.</p>
      </section>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {[
          ['Risk', usd(t.riskUsd)], ['Size', t.size ? `${t.size} ${t.symbol}` : '—'], ['Session', t.session ?? '—'],
          ['Account', accNames], ['Fees', t.feesUsd ? usd(t.feesUsd) : '—'], ['Grade', t.grade ?? '—'],
          ['Entry', t.entry ?? '—'], ['Stop', t.stop ?? '—'], ['Exit', t.exit ?? '—'],
          ['Strategy', t.setup ?? '—'],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-xl border border-line bg-panel p-3.5">
            <div className="text-[11px] text-muted">{l}</div>
            <div className="mt-0.5 truncate font-mono text-sm font-bold">{v}</div>
          </div>
        ))}
      </div>

      {t.notes && <section className="card whitespace-pre-wrap p-5 text-sm text-soft"><div className="label mb-2">Notes</div>{t.notes}</section>}
    </div>
  )
}
