import type { ReactNode } from 'react'

export function Timeline({
  items,
}: {
  items: {
    tone: 'red' | 'amber' | 'green' | 'blue' | 'neutral'
    title: ReactNode
    meta?: ReactNode
    body?: ReactNode
  }[]
}) {
  return (
    <div className="timeline">
      {items.map((item, i) => (
        <div key={i} className={`tl-item ${item.tone !== 'neutral' ? `tl-item--${item.tone}` : ''}`}>
          <div className="tl-head">
            <span className="tl-title">{item.title}</span>
            {item.meta && <span className="tl-meta">{item.meta}</span>}
          </div>
          {item.body && <div className="tl-body">{item.body}</div>}
        </div>
      ))}
    </div>
  )
}