import type { Trade } from '../types'

export const rOf = (t: Trade) => (t.riskUsd > 0 ? (t.resultUsd - (t.feesUsd ?? 0)) / t.riskUsd : 0)
export const pnlOf = (t: Trade) => (t.resultUsd - (t.feesUsd ?? 0)) * Math.max(1, t.accountIds.length)

export const fmtR = (r: number, digits = 2) => `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r).toFixed(digits)}R`
export const fmtUsd = (n: number, digits = 0) =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
export const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
export const tone = (n: number) => (n > 0 ? 'text-win' : n < 0 ? 'text-loss' : 'text-soft')

export const dayKey = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

export const sessionOf = (iso: string) => {
  const h = new Date(iso).getUTCHours()
  if (h < 7) return 'Asia'
  if (h < 13) return 'London'
  if (h < 20) return 'NY'
  return 'Late NY'
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

/** Lower-case a label for use mid-sentence, keeping things like "C-grade". */
export const lc = (s: string) => (/^[A-Z]-/.test(s) ? s : s[0].toLowerCase() + s.slice(1))
