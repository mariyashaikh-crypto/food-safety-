import type { ReactNode } from 'react'

export interface TabItem {
  key: string
  label: string
  count?: number
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabItem[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div className="tabs-list">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`tab ${active === tab.key ? 'tab--active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && <span className="tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="seg">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={value === opt.value ? 'seg--active' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'red' | 'amber' | 'green' | 'blue'
}) {
  const style =
    tone === 'neutral'
      ? undefined
      : {
          borderColor: `var(--${tone}-line)`,
          color: `var(--${tone}-ink)`,
          background: `var(--${tone}-bg)`,
        }
  return (
    <span className="chip" style={style}>
      {children}
    </span>
  )
}