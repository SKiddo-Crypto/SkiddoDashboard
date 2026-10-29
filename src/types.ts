export type Side = 'long' | 'short'
export type Market = 'perp' | 'spot'
export type Grade = 'A' | 'B' | 'C'
export type Session = 'Asia' | 'London' | 'NY' | 'Late NY'

export interface Account {
  id: string
  name: string
  exchange: string
  startingBalance: number
  /** Max $ you allow yourself to lose in one day. */
  dailyLossLimit: number
  /** Max trades per day. */
  maxTradesPerDay: number
  /** Max total drawdown from starting balance before the account is "blown". */
  maxDrawdown: number
  /** Hyperliquid wallet address (0x…) used to pull trades automatically. */
  wallet?: string
  /** Risk assigned to synced trades until you review them. */
  defaultRiskUsd?: number
  /** ISO timestamp of the last successful sync. */
  lastSync?: string
}

export interface Trade {
  id: string
  /** ISO timestamp of entry. */
  date: string
  symbol: string
  market: Market
  side: Side
  /** Accounts the trade was taken on. Result/risk are per account. */
  accountIds: string[]
  riskUsd: number
  resultUsd: number
  feesUsd?: number
  entry?: number
  exit?: number
  stop?: number
  size?: number
  leverage?: number
  session?: Session
  setup?: string
  grade?: Grade
  /** Followed every rule. */
  clean: boolean
  mistakes?: string[]
  /** Max adverse / favourable excursion, in R. Drives the "how it went" chart. */
  maeR?: number
  mfeR?: number
  notes?: string
  demo?: boolean
  source?: string // e.g. 'notion-smc' for imported trades, 'hyperliquid' for synced ones
  /** false while a synced trade still waits for you to add risk, grade and notes. */
  reviewed?: boolean
  /** ISO timestamp of the closing fill (synced trades). */
  closedAt?: string
}
