import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const location = useLocation()

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}

export function AlreadyAuthed({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  if (session) return <Navigate to="/" replace />
  return <>{children}</>
}