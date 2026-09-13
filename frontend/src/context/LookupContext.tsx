import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../api/client'

interface EntityMaps {
  estName: (id: number) => string
  inspDate: (id: number) => string
  refresh: () => void
  ready: boolean
}

const Ctx = createContext<EntityMaps>({
  estName: () => '—',
  inspDate: () => '—',
  refresh: () => undefined,
  ready: false,
})

/**
 * Shared registry of establishment / inspection lists used to resolve
 * ids to names and dates across tables (inspections, violations, actions).
 * Loaded once at the shell level; wired to auth lifecycle.
 */
export function LookupProvider({ ready, children }: { ready: boolean; children: ReactNode }) {
  const [estByName, setEstByName] = useState<Map<number, string>>(new Map())
  const [inspById, setInspById] = useState<Map<number, { date: string; status: string }>>(new Map())
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    Promise.all([api.establishments(), api.inspections()])
      .then(([est, insp]) => {
        if (cancelled) return
        setEstByName(new Map(est.map((e) => [e.id, e.name])))
        setInspById(new Map(insp.map((i) => [i.id, { date: i.inspection_date, status: i.status }])))
      })
      .catch(() => {
        /* pages surface their own errors */
      })
    return () => {
      cancelled = true
    }
  }, [ready, tick])

  const estName = useCallback((id: number) => estByName.get(id) ?? `#${id}`, [estByName])
  const inspDate = useCallback(
    (id: number) =>
      inspById.get(id)?.date
        ? `${inspById.get(id)?.date} (${inspById.get(id)?.status})`
        : `#${id}`,
    [inspById],
  )
  const refresh = useCallback(() => setTick((t) => t + 1), [])

  const value = useMemo(
    () => ({ estName, inspDate, refresh, ready: ready && estByName.size > 0 }),
    [estName, inspDate, refresh, ready, estByName.size],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLookup() {
  return useContext(Ctx)
}