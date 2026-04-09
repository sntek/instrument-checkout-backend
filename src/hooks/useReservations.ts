import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient } from '../lib/api'
import { ReservationsByInstrument, CreateReservationRequest } from '../types'

interface UseReservationsOptions {
  teamSlug?: string
  pollingInterval?: number
  enablePolling?: boolean
}

export function useReservations(options: UseReservationsOptions = {}) {
  const { teamSlug, pollingInterval = 30000, enablePolling = true } = options

  const [reservations, setReservations] = useState<ReservationsByInstrument>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [optimisticUpdates, setOptimisticUpdates] = useState<Set<string>>(new Set())
  const [isPolling, setIsPolling] = useState(false)

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchRef = useRef<number>(0)

  const fetchReservations = useCallback(async (isPollingReq = false) => {
    try {
      if (!isPollingReq) setLoading(true)
      setError(null)
      const data = await apiClient.getReservations(teamSlug)
      setReservations(data)
      lastFetchRef.current = Date.now()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reservations')
      console.error('Error fetching reservations:', err)
    } finally {
      if (!isPollingReq) setLoading(false)
    }
  }, [teamSlug])

  const optimisticCreateReservation = useCallback((reservation: CreateReservationRequest) => {
    const slotKey = `${reservation.date}-${reservation.slot}`
    const updateKey = `${reservation.instrumentName}-${slotKey}`

    setOptimisticUpdates(prev => new Set([...prev, updateKey]))

    setReservations(prev => {
      const newReservations = { ...prev }
      if (!newReservations[reservation.instrumentName]) {
        newReservations[reservation.instrumentName] = {}
      }
      newReservations[reservation.instrumentName][slotKey] = {
        reserverName: reservation.reserverName,
        reserverUserId: reservation.reserverUserId,
        id: `temp-${Date.now()}`
      }
      return newReservations
    })
  }, [])

  const optimisticDeleteReservation = useCallback((instrumentName: string, slot: string, date: string) => {
    const slotKey = `${date}-${slot}`
    const updateKey = `${instrumentName}-${slotKey}`

    setOptimisticUpdates(prev => new Set([...prev, updateKey]))

    setReservations(prev => {
      const newReservations = { ...prev }
      if (newReservations[instrumentName]?.[slotKey]) {
        delete newReservations[instrumentName][slotKey]
        if (Object.keys(newReservations[instrumentName]).length === 0) {
          delete newReservations[instrumentName]
        }
      }
      return newReservations
    })
  }, [])

  const createReservation = useCallback(async (reservation: CreateReservationRequest) => {
    try {
      setError(null)
      optimisticCreateReservation(reservation)
      await apiClient.createReservation(reservation)

      const slotKey = `${reservation.date}-${reservation.slot}`
      const updateKey = `${reservation.instrumentName}-${slotKey}`
      setOptimisticUpdates(prev => {
        const newSet = new Set(prev)
        newSet.delete(updateKey)
        return newSet
      })

      await fetchReservations()
    } catch (err) {
      const slotKey = `${reservation.date}-${reservation.slot}`
      const updateKey = `${reservation.instrumentName}-${slotKey}`
      setOptimisticUpdates(prev => {
        const newSet = new Set(prev)
        newSet.delete(updateKey)
        return newSet
      })
      await fetchReservations()
      setError(err instanceof Error ? err.message : 'Failed to create reservation')
      throw err
    }
  }, [fetchReservations, optimisticCreateReservation])

  const deleteReservation = useCallback(async (id: string, reserverUserId: string, instrumentName?: string, slot?: string, date?: string) => {
    try {
      setError(null)
      if (instrumentName && slot && date) {
        optimisticDeleteReservation(instrumentName, slot, date)
      }

      await apiClient.deleteReservation(id, reserverUserId)

      if (instrumentName && slot && date) {
        const slotKey = `${date}-${slot}`
        const updateKey = `${instrumentName}-${slotKey}`
        setOptimisticUpdates(prev => {
          const newSet = new Set(prev)
          newSet.delete(updateKey)
          return newSet
        })
      }

      await fetchReservations()
    } catch (err) {
      if (instrumentName && slot && date) {
        const slotKey = `${date}-${slot}`
        const updateKey = `${instrumentName}-${slotKey}`
        setOptimisticUpdates(prev => {
          const newSet = new Set(prev)
          newSet.delete(updateKey)
          return newSet
        })
        await fetchReservations()
      }
      setError(err instanceof Error ? err.message : 'Failed to delete reservation')
      throw err
    }
  }, [fetchReservations, optimisticDeleteReservation])

  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (enablePolling && pollingInterval > 0) {
      setIsPolling(true)
      pollingRef.current = setInterval(() => fetchReservations(true), pollingInterval)
    }
  }, [enablePolling, pollingInterval, fetchReservations])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setIsPolling(false)
  }, [])

  const pausePolling = useCallback(() => stopPolling(), [stopPolling])
  const resumePolling = useCallback(() => startPolling(), [startPolling])

  useEffect(() => {
    fetchReservations()
    startPolling()
    return () => stopPolling()
  }, [fetchReservations, startPolling, stopPolling])

  useEffect(() => {
    if (optimisticUpdates.size > 0) pausePolling()
    else resumePolling()
  }, [optimisticUpdates.size, pausePolling, resumePolling])

  return {
    reservations, loading, error,
    createReservation, deleteReservation, refetch: fetchReservations,
    optimisticUpdates, isPolling,
    startPolling, stopPolling, pausePolling, resumePolling
  }
}
