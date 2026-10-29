import { useRef, useState } from 'react'
import { Plus, Trash2, Download, Upload, RefreshCw } from 'lucide-react'
import { isAddress } from '../lib/hyperliquid'
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
  const { syncAccount, syncing, syncError } = useStore()
  const [syncMsg, setSyncMsg] = useState('')
  const sync = async () => {
    setSyncMsg('')
    try {
      const r = await syncAccount(a.id)
      setSyncMsg(r.added ? `${r.added} new trade${r.added === 1 ? '' : 's'} pulled in${r.matched ? `, ${r.matched} skipped because you had already logged them` : ''}. Review them on the Trades page.` : `Up to date${r.matched ? ` (${r.matched} skipped, already logged)` : ''}.`)
    } catch { /* syncError is shown */ }
  }
  const hl = a.exchange === 'Hyperliquid'
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
      {hl && (
        <div className="mt-3 rounded-xl border border-line bg-black/20 p-3">
          <div className="mb-2 text-[11px] text-muted">Connect Hyperliquid · trades are pulled in automatically from your wallet's public history. Read-only, no keys needed.</div>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
            <label className="block">
              <span className="mb-1 block text-[11px] text-muted">Wallet address</span>
              <input type="text" placeholder="0x…" value={a.wallet ?? ''} onChange={e => onChange({ ...a, wallet: e.target.value.trim() })} className={`input font-mono ${a.wallet && !isAddress(a.wallet) ? 'border-loss/60' : ''}`} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-muted">Risk per trade $ (until reviewed)</span>
              <input type="number" value={a.defaultRiskUsd ?? Math.round(a.startingBalance * 0.01)} onChange={e => onChange({ ...a, defaultRiskUsd: Number(e.target.value) })} className="input font-mono" />
            </label>
            <button onClick={sync} disabled={!isAddress(a.wallet ?? '') || syncing === a.id} className="btn-ghost self-end disabled:opacity-50"><RefreshCw size={14} className={syncing === a.id ? 'animate-spin' : ''} /> {syncing === a.id ? 'Syncing…' : 'Sync now'}</button>
          </div>
          {(syncMsg || (syncError && syncing !== a.id)) && <p className={`mt-2 text-sm ${syncMsg ? 'text-soft' : 'text-loss'}`}>{syncMsg || syncError}</p>}
          {a.lastSync && !syncMsg && <p className="mt-2 text-[11px] text-muted">Last synced {new Date(a.lastSync).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}. Also runs each time you open the app.</p>}
        </div>
      )}
    </div>
  )
}
