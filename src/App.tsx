import { HashRouter, MemoryRouter, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './lib/store'
import { Layout } from './components/Layout'
import Today from './pages/Today'
import Dashboard from './pages/Dashboard'
import Trades from './pages/Trades'
import TradeDetail from './pages/TradeDetail'
import TradeForm from './pages/TradeForm'
import Calendar from './pages/Calendar'
import Simulator from './pages/Simulator'
import Settings from './pages/Settings'

// The single-file preview runs inside a sandboxed frame where the URL hash is not ours to use.
const Router = import.meta.env.MODE === 'single' ? MemoryRouter : HashRouter

export default function App() {
  return (
    <StoreProvider>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Today />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="trades" element={<Trades />} />
            <Route path="trades/:id" element={<TradeDetail />} />
            <Route path="log" element={<TradeForm />} />
            <Route path="log/:id" element={<TradeForm />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="simulator" element={<Simulator />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Router>
    </StoreProvider>
  )
}
