import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Plus, AlertCircle, Home, LayoutDashboard, List, CalendarDays, Sparkles, Settings } from 'lucide-react'
import { useStore } from '../lib/store'
import { QuickLog } from './QuickLog'

const NAV = [
  { to: '/', label: 'Today', icon: Home },
  { to: '/dashboard', label: 'Stats', icon: LayoutDashboard },
  { to: '/trades', label: 'Trades', icon: List },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/simulator', label: 'Replay', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function Logo() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-win shadow-[0_8px_24px_-6px_rgba(91,140,255,0.7)]">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#0b0f17" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16l5-5 4 3 7-8" /></svg>
    </div>
  )
}

export function Layout() {
  const { isDemo, clearDemo } = useStore()
  const [modal, setModal] = useState<null | 'quick' | 'missed'>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return
      if (e.key === 'l' || e.key === 'L') { e.preventDefault(); setModal('quick') }
      if (e.key === 'Escape') setModal(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-screen pb-28 md:pb-10 md:pl-[104px]">
      {/* Desktop: floating glass rail */}
      <aside className="glass fixed bottom-4 left-4 top-4 z-40 hidden w-[76px] flex-col items-center gap-2 rounded-[28px] py-4 md:flex">
        <Logo />
        <nav className="mt-6 flex flex-1 flex-col gap-1.5">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} title={n.label}
              className={({ isActive }) => `group flex w-14 flex-col items-center gap-1 rounded-2xl py-2.5 text-[10px] transition ${isActive ? 'bg-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]' : 'text-muted hover:bg-white/[0.06] hover:text-white'}`}>
              <n.icon size={18} strokeWidth={1.8} />{n.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => setModal('quick')} title="Log a trade (L)" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#0b0f17] shadow-[0_8px_30px_-6px_rgba(255,255,255,0.6)]"><Plus size={20} /></button>
      </aside>

      <header className="sticky top-0 z-30 px-4 pt-3 md:pt-4">
        <div className="glass mx-auto flex max-w-6xl items-center gap-3 rounded-full py-2 pl-2 pr-2 md:pl-5">
          <div className="md:hidden"><Logo /></div>
          <div className="text-[15px] font-semibold tracking-tight">Trade Ledger</div>
          {isDemo && (
            <span className="hidden items-center gap-2 rounded-full bg-white/[0.07] px-3 py-1 text-[11px] text-soft sm:flex">
              Sample data <button onClick={clearDemo} className="text-white underline-offset-2 hover:underline">Clear</button>
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setModal('missed')} className="btn-ghost px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm"><AlertCircle size={14} className="text-loss" /> Unjournaled</button>
            <button onClick={() => setModal('quick')} className="btn-primary hidden md:inline-flex"><Plus size={14} /> Log a trade <kbd className="rounded-md bg-black/10 px-1.5 text-[10px]">L</kbd></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        <Outlet context={{ openLog: () => setModal('quick') }} />
      </main>

      {/* Phone: floating glass tab bar + log button */}
      <button onClick={() => setModal('quick')} aria-label="Log a trade"
        className="fixed bottom-[92px] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#0b0f17] shadow-[0_10px_40px_-5px_rgba(255,255,255,.55)] md:hidden">
        <Plus size={24} />
      </button>
      <nav className="glass fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 grid grid-cols-6 rounded-[26px] p-1.5 md:hidden">
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'}
            className={({ isActive }) => `flex flex-col items-center gap-1 rounded-2xl py-2 text-[10px] ${isActive ? 'bg-white/[0.14] text-white' : 'text-muted'}`}>
            <n.icon size={18} strokeWidth={1.8} />{n.label}
          </NavLink>
        ))}
      </nav>

      {modal && <QuickLog mode={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
