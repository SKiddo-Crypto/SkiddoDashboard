import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Account, Trade } from '../types'
import { demoAccounts, makeDemoTrades } from './demo'

// Persistence lives behind this one module so it can be swapped for a hosted
// database (e.g. Supabase) without touching the screens.
const KEY = 'trade-ledger:v1'

export interface Rules {
  plan: string[]
  focus: string
}

interface State {
  accounts: Account[]
  trades: Trade[]
  rules: Rules
  committed: Record<string, string[]> // dayKey -> committed plan items
}

const defaultRules: Rules = {
  plan: ['No trade in the first 5 minutes after a candle open', 'Stop goes in before entry', 'Max 3x leverage on alts'],
  focus: 'Skip C-grade setups',
}

// Personal journal exports dropped into src/data/local/*.json (gitignored) are
// merged into the stored state on start-up: trades and accounts are matched by
// id, so re-running an import never duplicates anything, and anything logged in
// the app stays untouched. The first real import also removes the demo trades.
const localImports = import.meta.glob<Partial<State>>('../data/local/*.json', { eager: true, import: 'default' })

export function merge(s: State, p: Partial<State>): State {
  const have = new Set(s.trades.map(t => t.id))
  const incoming = (p.trades ?? []).filter(t => !have.has(t.id))
  if (!incoming.length && !(p.accounts ?? []).some(a => !s.accounts.some(x => x.id === a.id))) return s
  const trades = [...s.trades.filter(t => !t.demo), ...incoming].sort((a, b) => b.date.localeCompare(a.date))
  const kept = s.accounts.filter(a => !isDemoAccount(a, s, trades))
  const accIds = new Set(kept.map(a => a.id))
  const accounts = [...kept, ...(p.accounts ?? []).filter(a => !accIds.has(a.id))]
  const rules = p.rules && sameRules(s.rules, defaultRules) ? p.rules : s.rules
  return { ...s, trades, accounts, rules }
}

function sameRules(a: Rules, b: Rules) { return a.focus === b.focus && a.plan.join('|') === b.plan.join('|') }
// Demo accounts are only dropped while the state still holds demo trades, i.e. nobody has adopted them yet.
function isDemoAccount(a: Account, s: State, real: Trade[]) {
  return s.trades.some(t => t.demo) && demoAccounts.some(d => d.id === a.id) && !real.some(t => t.accountIds.includes(a.id) && !t.source)
}

function load(): State {
  let state: State | null = null
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) state = JSON.parse(raw)
  } catch { /* storage unavailable, fall through to demo */ }
  state ??= { accounts: demoAccounts, trades: makeDemoTrades(), rules: defaultRules, committed: {} }
  for (const p of Object.values(localImports)) state = merge(state, p)
  return state
}

interface Store extends State {
  isDemo: boolean
  saveTrade: (t: Trade) => void
  deleteTrade: (id: string) => void
  saveAccount: (a: Account) => void
  deleteAccount: (id: string) => void
  setRules: (r: Rules) => void
  toggleCommit: (day: string, item: string) => void
  clearDemo: () => void
  loadDemo: () => void
  importAll: (s: Partial<State>) => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ }
  }, [state])

  const saveTrade = useCallback((t: Trade) => setState(s => {
    const exists = s.trades.some(x => x.id === t.id)
    const trades = exists ? s.trades.map(x => (x.id === t.id ? t : x)) : [t, ...s.trades]
    return { ...s, trades: trades.sort((a, b) => b.date.localeCompare(a.date)) }
  }), [])
  const deleteTrade = useCallback((id: string) => setState(s => ({ ...s, trades: s.trades.filter(t => t.id !== id) })), [])
  const saveAccount = useCallback((a: Account) => setState(s => ({
    ...s,
    accounts: s.accounts.some(x => x.id === a.id) ? s.accounts.map(x => (x.id === a.id ? a : x)) : [...s.accounts, a],
  })), [])
  const deleteAccount = useCallback((id: string) => setState(s => ({ ...s, accounts: s.accounts.filter(a => a.id !== id) })), [])
  const setRules = useCallback((rules: Rules) => setState(s => ({ ...s, rules })), [])
  const toggleCommit = useCallback((day: string, item: string) => setState(s => {
    const cur = s.committed[day] ?? []
    return { ...s, committed: { ...s.committed, [day]: cur.includes(item) ? cur.filter(i => i !== item) : [...cur, item] } }
  }), [])
  const clearDemo = useCallback(() => setState(s => ({ ...s, trades: s.trades.filter(t => !t.demo) })), [])
  const loadDemo = useCallback(() => setState(s => ({
    ...s,
    accounts: s.accounts.length ? s.accounts : demoAccounts,
    trades: [...s.trades.filter(t => !t.demo), ...makeDemoTrades()].sort((a, b) => b.date.localeCompare(a.date)),
  })), [])
  const importAll = useCallback((p: Partial<State>) => setState(s => merge(s, p)), [])

  const value = useMemo<Store>(() => ({
    ...state,
    isDemo: state.trades.some(t => t.demo),
    saveTrade, deleteTrade, saveAccount, deleteAccount, setRules, toggleCommit, clearDemo, loadDemo, importAll,
  }), [state, saveTrade, deleteTrade, saveAccount, deleteAccount, setRules, toggleCommit, clearDemo, loadDemo, importAll])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}
