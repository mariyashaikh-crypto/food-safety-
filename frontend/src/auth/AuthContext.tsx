import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, loadSession, saveSession, clearSession, type Session } from '../api/client'

interface AuthCtx {
  session: Session | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession())

  const login = useCallback(async (username: string, password: string) => {
    const response = await api.login(username, password)
    saveSession({ token: response.access_token, user: response.user })
    setSession({ token: response.access_token, user: response.user })
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  const refresh = useCallback(async () => {
    const current = loadSession()
    if (!current) return
    try {
      const me = await api.me()
      const updated: Session = { ...current, user: { ...current.user, ...me } }
      saveSession(updated)
      setSession(updated)
    } catch {
      clearSession()
      setSession(null)
    }
  }, [])

  useEffect(() => {
    const onExpired = () => setSession(null)
    window.addEventListener('fsa:auth-expired', onExpired)
    return () => window.removeEventListener('fsa:auth-expired', onExpired)
  }, [session])

  const value = useMemo(() => ({ session, login, logout, refresh }), [session, login, logout, refresh])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}