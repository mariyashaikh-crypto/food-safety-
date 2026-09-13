import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastApi {
  push: (message: string, kind?: ToastKind) => void
}

const Ctx = createContext<ToastApi>({ push: () => undefined })

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, kind, message }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4200)
  }, [])

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.kind}`}>
            <svg className="ico toast-icon" viewBox="0 0 24 24" aria-hidden="true">
              {toast.kind === 'success' && <path d="m5 12 5 5 9-11" />}
              {toast.kind === 'error' && (
                <>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16.4v.1" />
                </>
              )}
              {toast.kind === 'info' && (
                <>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5M12 8v.1" />
                </>
              )}
            </svg>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  return useContext(Ctx)
}