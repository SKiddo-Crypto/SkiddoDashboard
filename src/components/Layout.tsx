import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Plus, AlertCircle, Home, LayoutDashboard, List, CalendarDays, Sparkles, Settings } from 'lucide-react'
import { useStore } from '../lib/store'
import { QuickLog } from './QuickLog'

const NAV = [
  { to: '/', label: 'Today', icon: Home },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/trades', label: 'Trades', icon: List },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/simulator', label: 'Simulator', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: Settings },
]

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
    <div className="min-h-screen pb-28 md:pb-10">
      {isDemo && (
        <div className="flex items-center justify-between border-b border-line bg-panel px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          <span>Demo · sample data</span>
          <button onClick={clearDemo} className="normal-case tracking-normal text-soft underline-offset-2 hover:text-white hover:underline">Clear sample data</button>
        </div>
      )}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="h-2.5 w-2.5 rounded-full bg-win shadow-[0_0_12px_#7ee2a8]" /> Trade Ledger
          </div>
          <nav className="hidden gap-1 md:flex">
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'}
                className={({ isActive }) => `rounded-full px-3 py-1.5 text-sm transition ${isActive ? 'bg-panel2 text-white' : 'text-muted hover:text-white'}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <button onClick={() => setModal('missed')} className="ml-auto flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-soft md:hidden"><AlertCircle size={13} className="text-loss" /> Unjournaled</button>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <button onClick={() => setModal('missed')} className="btn-ghost"><AlertCircle size={14} className="text-loss" /> Unjournaled</button>
            <button onClick={() => setModal('quick')} className="btn-primary"><Plus size={14} /> Log a trade <kbd className="rounded bg-black/10 px-1 font-mono text-[10px]">L</kbd></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet context={{ openLog: () => setModal('quick') }} />
      </main>

      {/* Phone: bottom tab bar + floating log button */}
      <button onClick={() => setModal('quick')} aria-label="Log a trade"
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-win text-black shadow-[0_10px_40px_-5px_rgba(126,226,168,.6)] md:hidden">
        <Plus size={24} />
      </button>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'}
            className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[10px] ${isActive ? 'text-white' : 'text-muted'}`}>
            <n.icon size={18} />{n.label}
          </NavLink>
        ))}
      </nav>

      {modal && <QuickLog mode={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
