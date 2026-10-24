import { useMemo, useState } from 'react'
import { X, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { accountToday } from '../lib/stats'
import { fmtR, fmtUsd, sessionOf, uid, usd } from '../lib/format'
import { Chip, Segmented } from './ui'
import type { Side } from '../types'

const SYMBOLS = ['BTC', 'ETH', 'SOL', 'HYPE', 'XRP', 'DOGE']

export function QuickLog({ onClose, mode = 'quick' }: { onClose: () => void; mode?: 'quick' | 'missed' }) {
  const { accounts, trades, saveTrade } = useStore()
  const last = trades.find(t => !t.demo) ?? trades[0]
  const [accountIds, setAccountIds] = useState<string[]>(last?.accountIds.filter(id => accounts.some(a => a.id === id)) ?? accounts.slice(0, 1).map(a => a.id))
  const [side, setSide] = useState<Side>(last?.side ?? 'long')
  const [outcome, setOutcome] = useState<'lost' | 'made'>(mode === 'missed' ? 'lost' : 'made')
  const [symbol, setSymbol] = useState(last?.symbol ?? 'BTC')
  const [other, setOther] = useState('')
  const [result, setResult] = useState('')
  const [risk, setRisk] = useState(last ? String(last.riskUsd) : '250')
  const [time, setTime] = useState('')

  const res = Math.abs(parseFloat(result) || 0) * (outcome === 'lost' ? -1 : 1)
  const rk = parseFloat(risk) || 0
  const r = rk > 0 ? res / rk : 0
  const primary = accounts.find(a => a.id === accountIds[0])
  const guard = useMemo(() => (primary ? accountToday(primary, trades) : null), [primary, trades])
  const win = res > 0

  const save = () => {
    if (!accountIds.length || !rk || !result) return
    const d = new Date()
    if (time) { const [h, m] = time.split(':').map(Number); d.setHours(h, m, 0, 0) }
    const iso = d.toISOString()
    saveTrade({
      id: uid(), date: iso, symbol: (symbol === 'OTHER' ? other : symbol).toUpperCase() || 'BTC', market: 'perp', side,
      accountIds, riskUsd: rk, resultUsd: res, session: sessionOf(iso), clean: true, grade: undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className={`w-full max-w-md rounded-t-3xl border border-line bg-panel p-5 sm:rounded-3xl ${res ? (win ? 'glow-win' : 'glow-loss') : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="label">{mode === 'missed' ? 'A trade you didn’t journal' : 'Quick log'}</div>
          <button onClick={onClose} className="rounded-full bg-panel2 p-1.5 text-soft hover:text-white"><X size={14} /></button>
        </div>

        {mode === 'missed' && (
          <div className="mt-3 rounded-xl border border-loss/30 bg-loss/10 p-3 text-xs text-soft">
            <b className="text-white">Unjournaled is never a good trade.</b> Win or loss, record it so the balance stays true.
          </div>
        )}

        <div className={`mt-3 font-mono text-5xl font-extrabold tracking-tight ${res ? (win ? 'text-win' : 'text-loss') : 'text-muted/50'}`}>
          {fmtR(r)}
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm">
          <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${win ? 'bg-win/15 text-win' : res ? 'bg-loss/15 text-loss' : 'bg-panel2 text-muted'}`}>
            {win ? 'WIN' : res ? 'LOSS' : '—'}
          </span>
          <span className="font-mono text-soft">{fmtUsd(res)}</span>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="label">Taken on</span>
          <span className="text-[11px] text-muted">Tick every account you took it on</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {accounts.map(a => {
            const on = accountIds.includes(a.id)
            return (
              <button key={a.id} type="button"
                onClick={() => setAccountIds(on ? accountIds.filter(x => x !== a.id) : [...accountIds, a.id])}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${on ? 'border-white/70 text-white' : 'border-line text-muted'}`}>
                <span className={`h-3.5 w-3.5 rounded border ${on ? 'border-white bg-white' : 'border-muted'}`} />
                {a.name}
              </button>
            )
          })}
          {accounts.length > 1 && (
            <button type="button" onClick={() => setAccountIds(accounts.map(a => a.id))} className="px-2 text-xs text-soft underline-offset-2 hover:underline">All accounts</button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Segmented value={side} onChange={setSide} options={[{ value: 'long', label: 'Long' }, { value: 'short', label: 'Short' }]} />
          <Segmented value={outcome} onChange={setOutcome}
            colors={{ lost: 'bg-loss text-black', made: 'bg-win text-black' }}
            options={[{ value: 'lost', label: 'Lost' }, { value: 'made', label: 'Made' }]} />
        </div>

        {mode === 'quick' && (
          <div className="mt-3 flex flex-wrap items-center gap-1">
            {[...SYMBOLS, 'OTHER'].map(s => <Chip key={s} active={symbol === s} onClick={() => setSymbol(s)}>{s}</Chip>)}
            {symbol === 'OTHER' && <input autoFocus value={other} onChange={e => setOther(e.target.value)} placeholder="Ticker" className="input ml-1 w-24 py-1.5 font-mono uppercase" />}
          </div>
        )}

        <div className="mt-4 grid grid-cols-[1.3fr_1fr] gap-2">
          <label className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 ${win ? 'border-win/60' : res ? 'border-loss/60' : 'border-line'}`}>
            <span className="text-[11px] text-muted">Result</span>
            <span className="font-mono text-xl font-bold">$</span>
            <input inputMode="decimal" autoFocus value={result} onChange={e => setResult(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="0" className="w-full bg-transparent font-mono text-xl font-bold outline-none" />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-line bg-panel2 px-3 py-2">
            <span className="text-[11px] text-muted">Risk</span>
            <span className="font-mono text-soft">$</span>
            <input inputMode="decimal" value={risk} onChange={e => setRisk(e.target.value.replace(/[^\d.]/g, ''))}
              className="w-full bg-transparent font-mono outline-none" />
          </label>
        </div>

        {mode === 'missed' && (
          <label className="mt-3 flex items-center justify-between rounded-xl border border-line bg-panel2 px-3 py-2 text-sm text-soft">
            <span>When · today</span>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-transparent font-mono text-white outline-none" />
          </label>
        )}

        {guard && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Mini label="Stop left" value={usd(Math.max(0, guard.stopLeft + Math.min(0, res)))} />
            <Mini label="Trades left" value={String(Math.max(0, guard.tradesLeft - (result ? 1 : 0)))} />
            <Mini label="Room" value={usd(guard.room + res)} />
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <Link to="/log" onClick={onClose} className="text-xs text-soft underline underline-offset-4 hover:text-white">Full form</Link>
          <button onClick={save} disabled={!result || !accountIds.length} className="btn-primary disabled:opacity-40">
            {mode === 'missed' ? 'Add it' : 'Save'} <span className="rounded-full bg-black/10 p-1"><ArrowUpRight size={12} /></span>
          </button>
        </div>
      </div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-panel2 px-3 py-2">
      <div className="text-[10px] text-muted">{label}</div>
      <div className="font-mono text-sm font-bold">{value}</div>
    </div>
  )
}
