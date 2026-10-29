import type { Account, Trade } from '../types'
import { sessionOf } from './format'

// Hyperliquid's public info endpoint. Read-only: a wallet address is all it
// needs, so no API key ever touches the app.
const API = 'https://api.hyperliquid.xyz/info'

export interface Fill {
  coin: string
  px: string
  sz: string
  side: 'B' | 'A'
  time: number
  startPosition: string
  dir: string
  closedPnl: string
  fee: string
  tid: number
  hash: string
}

async function info<T>(body: Record<string, unknown>): Promise<T> {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`Hyperliquid answered ${r.status}`)
  return r.json()
}

export const isAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s.trim())

/** All perp fills for a wallet since `since` (ms), oldest first. Pages through the 2000-fill limit. */
export async function fetchFills(user: string, since = 0): Promise<Fill[]> {
  const out: Fill[] = []
  let start = since
  for (let i = 0; i < 25; i++) {
    const page = await info<Fill[]>({ type: 'userFillsByTime', user, startTime: start, aggregateByTime: false })
    if (!page.length) break
    out.push(...page)
    if (page.length < 2000) break
    start = page[page.length - 1].time + 1
  }
  const seen = new Set<number>()
  return out.filter(f => !seen.has(f.tid) && seen.add(f.tid)).sort((a, b) => a.time - b.time || a.tid - b.tid)
}

export async function fetchAccountValue(user: string): Promise<number | undefined> {
  const s = await info<{ marginSummary?: { accountValue?: string } }>({ type: 'clearinghouseState', user })
  const v = Number(s.marginSummary?.accountValue)
  return Number.isFinite(v) ? v : undefined
}

interface Open { coin: string; side: 'long' | 'short'; openTid: number; openTime: number; qty: number; cost: number; closedQty: number; proceeds: number; pnl: number; fees: number; lastTime: number }

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d
const tradeId = (o: Open) => `hl-${o.coin}-${o.openTid}`

/**
 * Turns a stream of fills into closed trades: a trade opens when the position
 * leaves zero and closes when it returns to zero. A fill that flips the
 * position closes one trade and opens the next. Spot fills (coin "@123" or
 * "PURR/USDC") are ignored.
 */
export function fillsToTrades(fills: Fill[], account: Account): Trade[] {
  const open = new Map<string, Open>()
  const done: Trade[] = []
  const risk = account.defaultRiskUsd ?? Math.max(1, round(account.startingBalance * 0.01))

  const finish = (o: Open) => {
    const entry = o.cost / o.qty
    const exit = o.closedQty ? o.proceeds / o.closedQty : entry
    done.push({
      id: tradeId(o), date: new Date(o.openTime).toISOString(), closedAt: new Date(o.lastTime).toISOString(),
      symbol: o.coin, market: 'perp', side: o.side, accountIds: [account.id],
      riskUsd: risk, resultUsd: round(o.pnl), feesUsd: round(o.fees), entry: round(entry, 6), exit: round(exit, 6), size: round(o.qty, 6),
      session: sessionOf(new Date(o.openTime).toISOString()), clean: true, mistakes: [], source: 'hyperliquid', reviewed: false,
      notes: 'Synced from Hyperliquid. Add your stop or risk, grade and notes.',
    })
  }

  for (const f of fills) {
    if (f.coin.startsWith('@') || f.coin.includes('/')) continue
    const px = Number(f.px), sz = Number(f.sz), fee = Number(f.fee) || 0, pnl = Number(f.closedPnl) || 0
    const pos0 = Number(f.startPosition)
    const delta = f.side === 'B' ? sz : -sz
    const pos1 = pos0 + delta
    const closing = pos0 !== 0 && Math.sign(pos0) !== Math.sign(delta) ? Math.min(Math.abs(pos0), sz) : 0
    const opening = sz - closing
    let o = open.get(f.coin)

    if (closing && o) {
      o.closedQty += closing; o.proceeds += closing * px; o.pnl += pnl; o.lastTime = f.time
      o.fees += fee * (closing / sz)
      if (Math.abs(pos0) - closing < 1e-9) { finish(o); open.delete(f.coin); o = undefined }
    } else if (closing && !o) {
      // Closing a position opened before the history we have: nothing to attach it to.
    }

    if (opening > 0) {
      const side = delta > 0 ? 'long' : 'short'
      if (!o || o.side !== side) {
        o = { coin: f.coin, side, openTid: f.tid, openTime: f.time, qty: 0, cost: 0, closedQty: 0, proceeds: 0, pnl: 0, fees: 0, lastTime: f.time }
        open.set(f.coin, o)
      }
      o.qty += opening; o.cost += opening * px; o.fees += fee * (opening / sz); o.lastTime = f.time
    }
    void pos1
  }
  return done
}

/** Fetches a wallet's history and returns the closed trades it contains. */
export async function syncHyperliquid(account: Account): Promise<Trade[]> {
  if (!account.wallet || !isAddress(account.wallet)) throw new Error('Add a valid wallet address first.')
  const fills = await fetchFills(account.wallet.trim())
  return fillsToTrades(fills, account)
}
