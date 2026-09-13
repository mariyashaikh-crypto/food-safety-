export function Spinner({ light = false }: { light?: boolean }) {
  return <span className={`spinner ${light ? 'spinner--light' : ''}`} aria-label="Loading" />
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="center-block">
      <Spinner />
      <div className="section-hint">{label}</div>
    </div>
  )
}