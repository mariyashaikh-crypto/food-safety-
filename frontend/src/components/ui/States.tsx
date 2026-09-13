import type { ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  sub,
  action,
}: {
  icon?: ReactNode
  title: string
  sub?: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <div className="empty-title">{title}</div>
      {sub && <div className="empty-sub">{sub}</div>}
      {action}
    </div>
  )
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-banner">
      <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16.4v.1" />
      </svg>
      <div style={{ flex: 1 }}>
        {message}
        {onRetry && (
          <button className="link-btn" style={{ marginLeft: 8 }} onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    </div>
  )
}