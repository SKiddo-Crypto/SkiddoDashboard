import type { Account, Trade } from '../types'
import { dayKey, pnlOf, rOf } from './format'

export interface Stats {
  count: number
  wins: number
  losses: number
  winRate: number
  netR: number
  netUsd: number
  expectancy: number
  profitFactor: number
  avgWin: number
  avgLoss: number
  best: number
  worst: number
  maxDrawdownR: number
  cleanRate: number
  days: number
}

export function computeStats(trades: Trade[]): Stats {
  const rs = trades.map(rOf)
  const wins = rs.filter(r => r > 0)
  const losses = rs.filter(r => r < 0)
  const gross = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
  let peak = 0, cum = 0, dd = 0
  // trades are stored newest first; walk oldest first for drawdown
  for (const r of [...rs].reverse()) { cum += r; peak = Math.max(peak, cum); dd = Math.min(dd, cum - peak) }
  return {
    count: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: trades.length ? wins.length / trades.length : 0,
    netR: gross(rs),
    netUsd: gross(trades.map(pnlOf)),
    expectancy: trades.length ? gross(rs) / trades.length : 0,
    profitFactor: losses.length ? gross(wins) / Math.abs(gross(losses)) : wins.length ? Infinity : 0,
    avgWin: wins.length ? gross(wins) / wins.length : 0,
    avgLoss: losses.length ? gross(losses) / losses.length : 0,
    best: rs.length ? Math.max(...rs) : 0,
    worst: rs.length ? Math.min(...rs) : 0,
    maxDrawdownR: dd,
    cleanRate: trades.length ? trades.filter(t => t.clean).length / trades.length : 0,
    days: new Set(trades.map(t => dayKey(t.date))).size,
  }
}

/** Cumulative R / $ curve, oldest first. */
export function equityCurve(trades: Trade[]) {
  let r = 0, usd = 0
  return [...trades].reverse().map((t, i) => {
    r += rOf(t); usd += pnlOf(t)
    return { i: i + 1, date: t.date, r: +r.toFixed(2), usd: Math.round(usd) }
  })
}

export function groupBy<K extends string>(trades: Trade[], key: (t: Trade) => K | undefined) {
  const m = new Map<K, Trade[]>()
  for (const t of trades) {
    const k = key(t)
    if (k === undefined) continue
    m.set(k, [...(m.get(k) ?? []), t])
  }
  return [...m.entries()].map(([k, ts]) => ({ key: k, trades: ts, ...computeStats(ts) }))
}

export function byDay(trades: Trade[]) {
  const m = new Map<string, Trade[]>()
  for (const t of trades) m.set(dayKey(t.date), [...(m.get(dayKey(t.date)) ?? []), t])
  return m
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Live numbers for the guard rails on an account today. */
export function accountToday(acc: Account, trades: Trade[], now = new Date()) {
  const today = dayKey(now.toISOString())
  const mine = trades.filter(t => t.accountIds.includes(acc.id))
  const todays = mine.filter(t => dayKey(t.date) === today)
  const todayPnl = todays.reduce((a, t) => a + t.resultUsd - (t.feesUsd ?? 0), 0)
  const totalPnl = mine.reduce((a, t) => a + t.resultUsd - (t.feesUsd ?? 0), 0)
  const balance = acc.startingBalance + totalPnl
  const peak = (() => {
    let b = acc.startingBalance, p = b
    for (const t of [...mine].reverse()) { b += t.resultUsd - (t.feesUsd ?? 0); p = Math.max(p, b) }
    return p
  })()
  const floor = peak - acc.maxDrawdown
  return {
    todayPnl,
    tradesToday: todays.length,
    tradesLeft: Math.max(0, acc.maxTradesPerDay - todays.length),
    stopLeft: Math.max(0, acc.dailyLossLimit + Math.min(0, todayPnl)),
    balance,
    floor,
    room: Math.max(0, balance - floor),
  }
}

/** Habits that cost the most R: compare R of tagged trades with your average clean trade. */
export function leaks(trades: Trade[]) {
  const cleanAvg = computeStats(trades.filter(t => t.clean)).expectancy
  const out: { label: string; count: number; costR: number; netR: number }[] = []
  const add = (label: string, ts: Trade[]) => {
    if (!ts.length) return
    const net = ts.reduce((a, t) => a + rOf(t), 0)
    out.push({ label, count: ts.length, netR: net, costR: net - cleanAvg * ts.length })
  }
  const tags = new Set(trades.flatMap(t => t.mistakes ?? []))
  for (const tag of tags) add(tag, trades.filter(t => t.mistakes?.includes(tag)))
  for (const g of ['B', 'C'] as const) add(`${g}-grade setups`, trades.filter(t => t.grade === g))
  return out.filter(l => l.costR < 0).sort((a, b) => a.costR - b.costR)
}

/** Monte Carlo: replay random days from your own history. */
export function simulate(trades: Trade[], opts: { days: number; runs: number; exclude?: (t: Trade) => boolean }) {
  const dayMap = byDay(trades.filter(t => !opts.exclude?.(t)))
  const dayPnls = [...dayMap.values()].map(ts => ts.reduce((a, t) => a + pnlOf(t), 0))
  if (!dayPnls.length) return null
  const paths: number[][] = []
  const finals: number[] = []
  for (let r = 0; r < opts.runs; r++) {
    let eq = 0
    const p = [0]
    for (let d = 0; d < opts.days; d++) { eq += dayPnls[Math.floor(Math.random() * dayPnls.length)]; p.push(eq) }
    paths.push(p); finals.push(eq)
  }
  const sorted = [...finals].sort((a, b) => a - b)
  const q = (x: number) => sorted[Math.floor(x * (sorted.length - 1))]
  return { paths, median: q(0.5), bad: q(0.1), good: q(0.9), ahead: finals.filter(f => f > 0).length / finals.length, sampleDays: dayPnls.length }
}
