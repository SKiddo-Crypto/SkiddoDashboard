# Trade Ledger

A crypto trading journal that measures everything in R. Web app for desktop, installable on phones as a PWA.

## Screens
- **Today**: discipline streak, "clear to trade" status per exchange account (room, trades left, stop left, size), today's lane between your daily stop and lock-in target, your day on a 24h session timeline, plan-for-today commitments, this week's run.
- **Quick Log** (press `L` or the + button): R headline, accounts taken on, long/short, made/lost, symbol chips, result and risk, live stop/trades/room left.
- **Unjournaled**: add a trade you forgot to log, so balances stay true.
- **Log a trade** (full form): strategy, symbol, side, perp/spot, time, leverage, entry/stop/exit/size (auto-calculates result and risk), fees, worst/best point in R, checklist, grade, mistakes, notes, and where the trade lands in your record.
- **Trade detail**: big ±R, clean/rule-broken badge, "how it went, in R" chart, all trade facts.
- **Trades**: grouped by week and day, search, account filter, CSV export.
- **Dashboard**: biggest leak, "do you have an edge?" confidence band, equity curve in R or $, core stats, R distribution, hours heatmap, breakdowns by weekday / session / symbol / side / strategy / grade / trade of the day, rules and size, leak list.
- **Calendar**: month grid with per-day R, intraday sparkline, weekly totals, 12-month strip, best-weekday insight.
- **Simulator**: 2,000 Monte Carlo replays of your own trading days, middle/bad/good case, "ends ahead" %, fix-one-leak comparison, per-account odds of hitting the drawdown floor.
- **Settings**: exchange accounts and limits, rules, backup / restore, sample data.

## Run it
```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # static site in dist/ (deploy to Vercel, Netlify, Cloudflare Pages...)
npm run build:single # one self-contained HTML file in dist-single/
```

## Stack
Vite + React + TypeScript + Tailwind CSS + Recharts. Data is stored in the browser (localStorage) behind `src/lib/store.tsx`, which is the one place to swap in a hosted database and accounts (planned: Supabase) for the paid SaaS version.
