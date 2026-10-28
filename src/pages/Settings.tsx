import { useRef, useState } from 'react'
import { Plus, Trash2, Download, Upload } from 'lucide-react'
import { useStore } from '../lib/store'
import { uid } from '../lib/format'
import { Card } from '../components/ui'
import type { Account } from '../types'

const EXCHANGES = ['Bybit', 'Binance', 'Hyperliquid', 'OKX', 'Bitget', 'Coinbase', 'Kraken', 'BloFin', 'MEXC', 'Prop firm', 'Other']

export default function Settings() {
  const s = useStore()
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const backup = () => {
    const blob = new Blob([JSON.stringify({ accounts: s.accounts, trades: s.trades, rules: s.rules }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `trade-ledger-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click()
  }
  const restore = async (f: File) => {
    try {
      const data = JSON.parse(await f.text())
      if (!Array.isArray(data.trades)) throw new Error('bad file')
      s.importAll({ accounts: data.accounts ?? s.accounts, trades: data.trades, rules: data.rules ?? s.rules })
      setMsg(`Imported ${data.trades.length} trades (anything already here was kept, duplicates skipped).`)
    } catch { setMsg('That file is not a Trade Ledger backup. Pick the .json file you saved with Back up.') }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card title="Accounts" right={<button onClick={() => s.saveAccount({ id: uid(), name: 'New account', exchange: 'Bybit', startingBalance: 10000, dailyLossLimit: 300, maxTradesPerDay: 3, maxDrawdown: 1000 })} className="btn-ghost py-1.5"><Plus size={14} /> Add</button>}>
        <div className="space-y-3">
          {s.accounts.map(a => <AccountRow key={a.id} a={a} onChange={s.saveAccount} onDelete={() => s.deleteAccount(a.id)} />)}
          {!s.accounts.length && <p className="text-sm text-muted">Add the exchange accounts you trade on.</p>}
        </div>
      </Card>

      <Card title="Your rules">
        <p className="-mt-2 mb-3 text-sm text-muted">These show up on your Today page every day. One per line.</p>
        <textarea rows={4} className="input" value={s.rules.plan.join('\n')} onChange={e => s.setRules({ ...s.rules, plan: e.target.value.split('\n') })} />
      </Card>

      <Card title="Your data">
        <p className="-mt-2 mb-4 text-sm text-muted">Everything is stored on this device for now. Back it up, or move it to another device.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={backup} className="btn-ghost"><Download size={14} /> Back up</button>
          <button onClick={() => file.current?.click()} className="btn-ghost"><Upload size={14} /> Restore</button>
          <input ref={file} type="file" accept="application/json" className="hidden" onChange={e => e.target.files?.[0] && restore(e.target.files[0])} />
          {msg && <p className="w-full text-sm text-soft">{msg}</p>}
          {s.isDemo ? <button onClick={s.clearDemo} className="btn-ghost text-loss">Clear sample data</button> : <button onClick={s.loadDemo} className="btn-ghost">Load sample data</button>}
        </div>
      </Card>
    </div>
  )
}

function AccountRow({ a, onChange, onDelete }: { a: Account; onChange: (a: Account) => void; onDelete: () => void }) {
  const [armed, setArmed] = useState(false)
  const f = (k: keyof Account, label: string, type = 'number') => (
    <label className="block">
      <span className="mb-1 block text-[11px] text-muted">{label}</span>
      <input type={type} value={a[k] as string | number} onChange={e => onChange({ ...a, [k]: type === 'number' ? Number(e.target.value) : e.target.value })} className="input font-mono" />
    </label>
  )
  return (
    <div className="rounded-xl border border-line bg-panel2 p-4">
      <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_auto]">
        {f('name', 'Name', 'text')}
        <label className="block">
          <span className="mb-1 block text-[11px] text-muted">Exchange</span>
          <select value={a.exchange} onChange={e => onChange({ ...a, exchange: e.target.value })} className="input">{EXCHANGES.map(x => <option key={x}>{x}</option>)}</select>
        </label>
        <button onClick={() => (armed ? onDelete() : setArmed(true))} onBlur={() => setArmed(false)} title="Delete account" className={`self-end rounded-xl border p-2.5 text-sm ${armed ? 'border-loss/60 text-loss' : 'border-line text-muted hover:text-loss'}`}>{armed ? 'Tap again' : <Trash2 size={16} />}</button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {f('startingBalance', 'Starting balance $')}
        {f('dailyLossLimit', 'Daily loss limit $')}
        {f('maxTradesPerDay', 'Max trades a day')}
        {f('maxDrawdown', 'Max drawdown $')}
      </div>
    </div>
  )
}
