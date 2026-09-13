import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '../components/icons'
import { useAuth } from '../auth/AuthContext'
import { IconButton } from '../components/ui/Button'

const NAV = [
  { to: '/', label: 'Dashboard', icon: Icon.Dashboard, end: true },
  { to: '/establishments', label: 'Establishments', icon: Icon.Building },
  { to: '/inspections', label: 'Inspections', icon: Icon.Clipboard },
  { to: '/violations', label: 'Violations', icon: Icon.Warning },
  { to: '/corrective-actions', label: 'Corrective Actions', icon: Icon.Shield },
  { to: '/risk', label: 'Risk Intelligence', icon: Icon.Scale },
  { to: '/ai', label: 'AI Intelligence', icon: Icon.Sparkles },
  { to: '/evidence', label: 'Evidence', icon: Icon.File },
]

export function AppShell() {
  const { session, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="shell">
      <header className="cmdbar">
        <div className="cmdbar-inner">
          <IconButton className="hamburger" onClick={() => setOpen((v) => !v)} title="Open menu">
            <Icon.Menu />
          </IconButton>
          <div className="cmdbar-brand">
            <div className="brand-mark">
              <Icon.Shield />
            </div>
            <div>
              <div className="brand-name">Food Safety Inspection</div>
              <div className="brand-sub">Investigation Console</div>
            </div>
          </div>

          <nav className="cmdbar-nav" aria-label="Primary">
            {NAV.map((item) => {
              const LinkIcon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
                  title={item.label}
                >
                  <LinkIcon />
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          <div className="cmdbar-right">
            <div className="cmd-status">
              <span className="dot" />
              System Online
            </div>
            <div className="cmdbar-sep" />
            <div className="topbar-user">
              <div className="user-avatar">
                {(session?.user.username || '?').slice(0, 1).toUpperCase()}
              </div>
              <div className="user-meta">
                <span className="user-name">{session?.user.username}</span>
                <span className="user-role">{session?.user.role}</span>
              </div>
              <IconButton title="Sign out" onClick={handleLogout}>
                <Icon.Logout />
              </IconButton>
            </div>
          </div>
        </div>
      </header>

      {open && (
        <nav className="cmdbar-menu" aria-label="Primary mobile">
          {NAV.map((item) => {
            const LinkIcon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
              >
                <LinkIcon />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            )
          })}
          <div className="cmdbar-menu-user">
            <span>{session?.user.username}</span>
            <button
              className="nav-link"
              onClick={() => {
                handleLogout()
              }}
            >
              <Icon.Logout />
              <span className="nav-label">Sign out</span>
            </button>
          </div>
        </nav>
      )}

      <div className="shell-content">
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}