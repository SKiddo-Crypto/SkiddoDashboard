import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowUpRight, ChevronLeft } from 'lucide-react'
import { useStore } from '../lib/store'
import { fmtR, fmtUsd, rOf, sessionOf, uid } from '../lib/format'
import { Chip, Segmented } from '../components/ui'
import type { Grade, Market, Side, Trade } from '../types'

const SYMBOLS = ['BTC', 'ETH', 'SOL', 'HYPE', 'XRP', 'DOGE']
const CHECKLIST = ['Trend / HTF bias agrees', 'Clear invalidation level', 'Stop placed before entry', 'Risk within plan', 'Not revenge or FOMO', 'Took it at my level']
const MISTAKES = ['Moved stop', 'FOMO entry', 'Oversized', 'Revenge trade', 'Early exit', 'No stop']

const toLocal = (iso: string) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }

export default function TradeForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const { trades, accounts, saveTrade } = useStore()
  const existing = trades.find(t => t.id === id)
  const prev = trades.find(t => !t.demo) ?? trades[0]
  const setups = useMemo(() => [...new Set(trades.map(t => t.setup).filter(Boolean))] as string[], [trades])

  const blank = (): Trade => ({
    id: uid(), date: new Date().toISOString(), symbol: prev?.symbol ?? 'BTC', market: 'perp', side: prev?.side ?? 'long',
    accountIds: prev?.accountIds ?? accounts.slice(0, 1).map(a => a.id), riskUsd: prev?.riskUsd ?? 250, resultUsd: 0,
    setup: prev?.setup, clean: true, mistakes: [],
  })
  const [t, setT] = useState<Trade>(existing ?? blank())
  const [checks, setChecks] = useState<string[]>(existing ? CHECKLIST : [])
  const set = <K extends keyof Trade>(k: K, v: Trade[K]) => setT(s => ({ ...s, [k]: v }))
  const num = (v: string) => (v === '' ? undefined : Number(v))

  // Fill result from prices when entry/exit/size are given.
  const calc = () => {
    if (t.entry && t.exit && t.size) {
      const res = (t.side === 'long' ? t.exit - t.entry : t.entry - t.exit) * t.size
      const risk = t.stop ? Math.abs(t.entry - t.stop) * t.size : t.riskUsd
      setT(s => ({ ...s, resultUsd: Math.round(res * 100) / 100, riskUsd: Math.round(risk * 100) / 100 }))
    }
  }

  const r = rOf(t)
  const dist = useMemo(() => {
    const bins = Array.from({ length: 12 }, (_, i) => -2 + i * 0.5)
    const rs = trades.map(rOf)
    return bins.map(b => ({ b, n: rs.filter(x => x >= b && x < b + 0.5).length }))
  }, [trades])
  const dmax = Math.max(1, ...dist.map(d => d.n))

  const save = (again: boolean) => {
    const clean = t.mistakes?.length ? false : t.clean
    saveTrade({ ...t, clean, session: sessionOf(t.date), demo: undefined })
    if (again) { setT({ ...blank(), symbol: t.symbol, side: t.side, setup: t.setup, accountIds: t.accountIds }); setChecks([]) }
    else nav(`/trades/${t.id}`)
  }

  return (
    <div className="space-y-4">
      <button onClick={() => nav(-1)} className="btn-ghost py-1.5"><ChevronLeft size={14} /> Back</button>
      <h1 className="text-2xl font-semibold tracking-tight">{existing ? 'Edit trade' : 'Log a trade'}</h1>
      <p className="-mt-3 text-sm text-muted">Strategy, symbol, side and accounts carry over from your last trade.</p>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <section className="card space-y-4 p-5">
            <div className="label">The trade</div>
            <Field label="Strategy">
              <input list="setups" value={t.setup ?? ''} onChange={e => set('setup', e.target.value)} placeholder="e.g. Range reclaim" className="input" />
              <datalist id="setups">{setups.map(s => <option key={s} value={s} />)}</datalist>
            </Field>
            <Field label="Symbol">
              <div className="flex flex-wrap items-center gap-1">
                {SYMBOLS.map(s => <Chip key={s} active={t.symbol === s} onClick={() => set('symbol', s)}>{s}</Chip>)}
                <input value={SYMBOLS.includes(t.symbol) ? '' : t.symbol} onChange={e => set('symbol', e.target.value.toUpperCase())} placeholder="Other" className="input ml-1 w-28 py-1.5 font-mono uppercase" />
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Side"><Segmented value={t.side} onChange={v => set('side', v as Side)} options={[{ value: 'long', label: 'Long' }, { value: 'short', label: 'Short' }]} /></Field>
              <Field label="Market"><Segmented value={t.market} onChange={v => set('market', v as Market)} options={[{ value: 'perp', label: 'Perp' }, { value: 'spot', label: 'Spot' }]} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Entered at (your time)"><input type="datetime-local" value={toLocal(t.date)} onChange={e => e.target.value && set('date', new Date(e.target.value).toISOString())} className="input font-mono" /></Field>
              <Field label="Leverage"><input type="number" value={t.leverage ?? ''} onChange={e => set('leverage', num(e.target.value))} placeholder="e.g. 5" className="input font-mono" /></Field>
            </div>
            <Field label="Taken on">
              <div className="flex flex-wrap gap-2">
                {accounts.map(a => {
                  const on = t.accountIds.includes(a.id)
                  return <button key={a.id} type="button" onClick={() => set('accountIds', on ? t.accountIds.filter(x => x !== a.id) : [...t.accountIds, a.id])}
                    className={`rounded-full border px-3 py-1.5 text-sm ${on ? 'border-white/70 text-white' : 'border-line text-muted'}`}>{on ? '✓ ' : ''}{a.name}</button>
                })}
              </div>
            </Field>
          </section>

          <section className="card space-y-4 p-5">
            <div className="label">The result <span className="normal-case tracking-normal">· per account</span></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(['entry', 'stop', 'exit', 'size'] as const).map(k => (
                <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
                  <input type="number" step="any" value={t[k] ?? ''} onChange={e => set(k, num(e.target.value))} onBlur={calc} className="input font-mono" />
                </Field>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Result $"><input type="number" step="any" value={t.resultUsd} onChange={e => set('resultUsd', Number(e.target.value))} className={`input font-mono font-bold ${r > 0 ? 'text-win' : r < 0 ? 'text-loss' : ''}`} /></Field>
              <Field label="Risk $"><input type="number" step="any" value={t.riskUsd} onChange={e => set('riskUsd', Number(e.target.value))} className="input font-mono" /></Field>
              <Field label="Fees $"><input type="number" step="any" value={t.feesUsd ?? ''} onChange={e => set('feesUsd', num(e.target.value))} className="input font-mono" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Worst point (R)"><input type="number" step="0.1" value={t.maeR ?? ''} onChange={e => set('maeR', num(e.target.value))} placeholder="-0.4" className="input font-mono" /></Field>
              <Field label="Best point (R)"><input type="number" step="0.1" value={t.mfeR ?? ''} onChange={e => set('mfeR', num(e.target.value))} placeholder="2.1" className="input font-mono" /></Field>
            </div>
          </section>

          <section className="card space-y-4 p-5">
            <div className="flex items-center justify-between"><div className="label">Your checklist</div><span className="text-xs text-muted">{checks.length} of {CHECKLIST.length} ticked</span></div>
            <div className="grid gap-2 sm:grid-cols-2">
              {CHECKLIST.map(c => {
                const on = checks.includes(c)
                return <button key={c} type="button" onClick={() => setChecks(on ? checks.filter(x => x !== c) : [...checks, c])}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm ${on ? 'border-win/40 bg-win/5 text-white' : 'border-line text-soft'}`}>{on ? '✓ ' : '○ '}{c}</button>
              })}
            </div>
            <Field label="Grade"><Segmented value={(t.grade ?? '') as Grade} onChange={v => set('grade', v as Grade)} options={[{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }, { value: 'C', label: 'C' }]} /></Field>
            <Field label="Mistakes (any ticked = rule broken)">
              <div className="flex flex-wrap gap-2">
                {MISTAKES.map(m => {
                  const on = t.mistakes?.includes(m)
                  return <button key={m} type="button" onClick={() => setT(s => ({ ...s, mistakes: on ? s.mistakes!.filter(x => x !== m) : [...(s.mistakes ?? []), m], clean: on ? (s.mistakes!.length <= 1) : false }))}
                    className={`rounded-full border px-3 py-1.5 text-xs ${on ? 'border-loss/60 bg-loss/10 text-loss' : 'border-line text-muted'}`}>{m}</button>
                })}
              </div>
            </Field>
            <Field label="Notes"><textarea rows={4} value={t.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="What did you see? What would you do differently?" className="input" /></Field>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section className={`card p-5 ${r ? (r > 0 ? 'glow-win' : 'glow-loss') : ''}`}>
            <div className="flex items-center justify-between"><div className="label">This trade</div><span className="font-mono text-xs text-muted">{t.symbol} · {t.side}</span></div>
            <div className={`mt-2 font-mono text-5xl font-extrabold ${r > 0 ? 'text-win' : r < 0 ? 'text-loss' : 'text-muted/40'}`}>{fmtR(r)}</div>
            <div className="mt-1 font-mono text-sm text-soft">{fmtUsd(t.resultUsd - (t.feesUsd ?? 0))} per account · {checks.length}/{CHECKLIST.length} checklist · grade {t.grade ?? '—'}</div>
            <div className="mt-5 text-[11px] text-muted">Where it lands in your record</div>
            <div className="mt-2 flex h-16 items-end gap-1">
              {dist.map(d => {
                const here = r >= d.b && r < d.b + 0.5
                return <div key={d.b} className={`flex-1 rounded-t ${here ? 'bg-white' : d.b < 0 ? 'bg-loss/50' : 'bg-win/50'}`} style={{ height: `${Math.max(4, (d.n / dmax) * 100)}%` }} />
              })}
            </div>
            <div className="mt-1 flex justify-between font-mono text-[9px] text-muted"><span>−2R</span><span>0</span><span>+4R</span></div>
          </section>
          <div className="flex items-center gap-3">
            <button onClick={() => save(false)} disabled={!t.accountIds.length || !t.riskUsd} className="btn-primary disabled:opacity-40">Save <ArrowUpRight size={14} /></button>
            {!existing && <button onClick={() => save(true)} className="text-sm text-soft hover:text-white">Save and add another</button>}
          </div>
        </aside>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="block"><span className="mb-1.5 block text-[11px] text-muted">{label}</span>{children}</div>
}
