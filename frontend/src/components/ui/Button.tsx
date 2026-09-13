import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'default' | 'primary' | 'ghost' | 'danger' | 'danger-solid' | 'success'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  block?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'default',
  size = 'md',
  loading = false,
  block = false,
  icon,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  const sizeCls = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : ''
  return (
    <button
      className={`btn ${sizeCls} ${block ? 'btn-block' : ''} ${variant !== 'default' ? `btn-${variant}` : ''} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="spinner" /> : icon}
      {children}
    </button>
  )
}

export function IconButton({
  children,
  className = '',
  title,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`icon-btn ${className}`} title={title} {...rest}>
      {children}
    </button>
  )
}