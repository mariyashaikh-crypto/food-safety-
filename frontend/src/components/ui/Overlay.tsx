import { useEffect, type ReactNode } from 'react'
import { IconButton } from './Button'
import { Icon } from '../icons'

function preventScrollRef(current: boolean) {
  document.body.style.overflow = current ? 'hidden' : ''
}

export function Drawer({
  open,
  onClose,
  title,
  sub,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  sub?: ReactNode
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    preventScrollRef(open)
    return () => preventScrollRef(false)
  }, [open])

  if (!open) return null

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className={`drawer ${wide ? 'drawer--wide' : ''}`} role="dialog" aria-modal="true">
        <div className="drawer-header">
          <div>
            <div className="drawer-title">{title}</div>
            {sub && <div className="drawer-sub">{sub}</div>}
          </div>
          <IconButton onClick={onClose} title="Close">
            <Icon.Close />
          </IconButton>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-footer">{footer}</div>}
      </aside>
    </>
  )
}

export function Modal({
  open,
  onClose,
  title,
  sub,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  sub?: ReactNode
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    preventScrollRef(open)
    return () => preventScrollRef(false)
  }, [open])

  if (!open) return null

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal--wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <div className="modal-title">{title}</div>
            {sub && <div className="modal-sub">{sub}</div>}
          </div>
          <IconButton onClick={onClose} title="Close">
            <Icon.Close />
          </IconButton>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}