import { useCallback, useEffect, useRef, useState } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
  setData: (data: T) => void
  clear: () => void
}

/**
 * Lightweight data-fetching hook. Runs `fetcher` on mount and on every
 * call of `reload()`. Keeps loading / error / data states in one place.
 */
export function useApi<T>(fetcher: () => Promise<T>): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetcherRef
      .current()
      .then((result) => {
        if (cancelled) return
        setData(result)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Something went wrong')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  const clear = useCallback(() => {
    setData(null)
    setError(null)
  }, [])

  return { data, loading, error, reload, setData, clear }
}