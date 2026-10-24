import type { Account, Grade, Trade } from '../types'
import { sessionOf } from './format'

export const demoAccounts: Account[] = [
  { id: 'acc-bybit', name: 'Bybit Main', exchange: 'Bybit', startingBalance: 25000, dailyLossLimit: 750, maxTradesPerDay: 4, maxDrawdown: 5000 },
  { id: 'acc-hl', name: 'Hyperliquid', exchange: 'Hyperliquid', startingBalance: 10000, dailyLossLimit: 400, maxTradesPerDay: 3, maxDrawdown: 3000 },
]

const SETUPS = ['Range reclaim', 'Breakout retest', 'Liquidity sweep', 'Trend pullback', 'Funding fade']
const MISTAKES = ['Moved stop', 'FOMO entry', 'Oversized', 'Revenge trade', 'Early exit']
const SYMBOLS: [string, number][] = [['BTC', 0.45], ['ETH', 0.25], ['SOL', 0.18], ['HYPE', 0.12]]
const PRICE: Record<string, number> = { BTC: 108000, ETH: 3900, SOL: 190, HYPE: 42 }

// Small deterministic PRNG so the demo looks the same every load.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

export function makeDemoTrades(now = new Date()): Trade[] {
  const rand = rng(42)
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)]
  const trades: Trade[] = []
  const start = new Date(now)
  start.setDate(start.getDate() - 120)
  for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
    if (rand() < 0.38) continue
    const n = 1 + Math.floor(rand() * 3)
    for (let i = 0; i < n; i++) {
      const r0 = rand()
      let sym = 'BTC'
      let acc = 0
      for (const [s, w] of SYMBOLS) { acc += w; if (r0 <= acc) { sym = s; break } }
      const grade: Grade = rand() < 0.45 ? 'A' : rand() < 0.7 ? 'B' : 'C'
      const clean = grade === 'C' ? rand() < 0.4 : rand() < 0.85
      const edge = grade === 'A' ? 0.58 : grade === 'B' ? 0.42 : 0.33
      const win = rand() < edge
      const r = win ? 0.6 + rand() * (grade === 'A' ? 2.8 : 1.6) : rand() < 0.15 ? -(1.2 + rand() * 0.8) : -(0.4 + rand() * 0.6)
      const risk = pick([200, 250, 250, 300, 400])
      const when = new Date(d)
      when.setUTCHours(Math.floor(rand() * 22), Math.floor(rand() * 60))
      if (when > now) continue
      const side = rand() < 0.6 ? 'long' : 'short'
      const entry = PRICE[sym] * (0.9 + rand() * 0.2)
      const stopDist = entry * (0.004 + rand() * 0.01)
      const stop = side === 'long' ? entry - stopDist : entry + stopDist
      const exit = side === 'long' ? entry + stopDist * r : entry - stopDist * r
      const accountIds = rand() < 0.25 ? ['acc-bybit', 'acc-hl'] : [rand() < 0.65 ? 'acc-bybit' : 'acc-hl']
      trades.push({
        id: `demo-${trades.length}`,
        date: when.toISOString(),
        symbol: sym,
        market: rand() < 0.88 ? 'perp' : 'spot',
        side,
        accountIds,
        riskUsd: risk,
        resultUsd: Math.round(risk * r),
        feesUsd: Math.round(risk * 0.03),
        entry: +entry.toFixed(2), stop: +stop.toFixed(2), exit: +exit.toFixed(2),
        size: +(risk / stopDist).toFixed(4),
        leverage: pick([3, 5, 5, 10]),
        session: sessionOf(when.toISOString()),
        setup: pick(SETUPS),
        grade,
        clean,
        mistakes: clean ? [] : [pick(MISTAKES)],
        maeR: -Math.min(1, +(rand() * (win ? 0.7 : 1)).toFixed(2)),
        mfeR: +(Math.max(r, 0) + rand() * 0.8).toFixed(2),
        notes: '',
        demo: true,
      })
    }
  }
  return trades.sort((a, b) => b.date.localeCompare(a.date))
}
