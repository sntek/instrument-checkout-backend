import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient } from '../lib/api'
import { ReservationsByInstrument, CreateReservationRequest } from '../types'

interface UseReservationsOptions {
  pollingInterval?: number // in milliseconds, default 30000 (30 seconds)
  enablePolling?: boolean // default true
}

export function useReservations(options: UseReservationsOptions = {}) {
  const { pollingInterval = 30000, enablePolling = true } = options
  
  const [reservations, setReservations] = useState<ReservationsByInstrument>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [optimisticUpdates, setOptimisticUpdates] = useState<Set<string>>(new Set())
  const [isPolling, setIsPolling] = useState(false)
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchRef = useRef<number>(0)

  const fetchReservations = useCallback(async (isPolling = false) => {
    try {
      // Don't show loading spinner for polling requests
      if (!isPolling) {
        console.log('Fetching reservations...')
        setLoading(true)
      } else {
        console.log('Polling reservations...')
      }
      setError(null)
      const data = await apiClient.getReservations()
      console.log('Fetched reservations:', data)
      setReservations(data)
      lastFetchRef.current = Date.now()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reservations')
      console.error('Error fetching reservations:', err)
    } finally {
      if (!isPolling) {
        setLoading(false)
      }
    }
  }, [])

  // Optimistic update functions
  const optimisticCreateReservation = useCallback((reservation: CreateReservationRequest) => {
    const slotKey = `${reservation.date}-${reservation.slot}`
    const updateKey = `${reservation.instrumentName}-${slotKey}`
    
    console.log('Optimistic create reservation:', reservation)
    
    // Add to optimistic updates
    setOptimisticUpdates(prev => new Set([...prev, updateKey]))
    
    // Update local state immediately
    setReservations(prev => {
      const newReservations = { ...prev }
      if (!newReservations[reservation.instrumentName]) {
        newReservations[reservation.instrumentName] = {}
      }
      newReservations[reservation.instrumentName][slotKey] = {
        reserverName: reservation.reserverName,
        reserverUserId: reservation.reserverUserId,
        id: `temp-${Date.now()}` // Temporary ID for optimistic updates
      }
      return newReservations
    })
  }, [])

  const optimisticDeleteReservation = useCallback((instrumentName: string, slot: string, date: string) => {
    const slotKey = `${date}-${slot}`
    const updateKey = `${instrumentName}-${slotKey}`
    
    console.log('Optimistic delete reservation:', { instrumentName, slot, date })
    
    // Add to optimistic updates
    setOptimisticUpdates(prev => new Set([...prev, updateKey]))
    
    // Update local state immediately
    setReservations(prev => {
      const newReservations = { ...prev }
      if (newReservations[instrumentName]?.[slotKey]) {
        delete newReservations[instrumentName][slotKey]
        // Clean up empty instrument entries
        if (Object.keys(newReservations[instrumentName]).length === 0) {
          delete newReservations[instrumentName]
        }
      }
      return newReservations
    })
  }, [])

  const createReservation = useCallback(async (reservation: CreateReservationRequest) => {
    try {
      console.log('Creating reservation in hook:', reservation)
      setError(null)
      
      // Apply optimistic update first
      optimisticCreateReservation(reservation)
      
      // Then sync with server
      const result = await apiClient.createReservation(reservation)
      console.log('Reservation created, refreshing data...')
      
      // Remove from optimistic updates
      const slotKey = `${reservation.date}-${reservation.slot}`
      const updateKey = `${reservation.instrumentName}-${slotKey}`
      setOptimisticUpdates(prev => {
        const newSet = new Set(prev)
        newSet.delete(updateKey)
        return newSet
      })
      
      // Refresh to get the real data from server
      await fetchReservations()
      console.log('Data refreshed')
    } catch (err) {
      console.error('Error creating reservation:', err)
      
      // Revert optimistic update on error
      const slotKey = `${reservation.date}-${reservation.slot}`
      const updateKey = `${reservation.instrumentName}-${slotKey}`
      setOptimisticUpdates(prev => {
        const newSet = new Set(prev)
        newSet.delete(updateKey)
        return newSet
      })
      
      // Refresh to get correct state
      await fetchReservations()
      
      setError(err instanceof Error ? err.message : 'Failed to create reservation')
      throw err
    }
  }, [fetchReservations, optimisticCreateReservation])

  const deleteReservation = useCallback(async (id: string, reserverUserId: string, instrumentName?: string, slot?: string, date?: string) => {
    try {
      setError(null)
      
      // If we have the slot info, apply optimistic update
      if (instrumentName && slot && date) {
        optimisticDeleteReservation(instrumentName, slot, date)
      }
      
      await apiClient.deleteReservation(id, reserverUserId)
      console.log('Reservation deleted, refreshing data...')
      
      // Remove from optimistic updates if we applied one
      if (instrumentName && slot && date) {
        const slotKey = `${date}-${slot}`
        const updateKey = `${instrumentName}-${slotKey}`
        setOptimisticUpdates(prev => {
          const newSet = new Set(prev)
          newSet.delete(updateKey)
          return newSet
        })
      }
      
      // Refresh to get the real data from server
      await fetchReservations()
      console.log('Data refreshed')
    } catch (err) {
      console.error('Error deleting reservation:', err)
      
      // Revert optimistic update on error if we applied one
      if (instrumentName && slot && date) {
        const slotKey = `${date}-${slot}`
        const updateKey = `${instrumentName}-${slotKey}`
        setOptimisticUpdates(prev => {
          const newSet = new Set(prev)
          newSet.delete(updateKey)
          return newSet
        })
        
        // Refresh to get correct state
        await fetchReservations()
      }
      
      setError(err instanceof Error ? err.message : 'Failed to delete reservation')
      throw err
    }
  }, [fetchReservations, optimisticDeleteReservation])

  // Polling control functions
  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }
    
    if (enablePolling && pollingInterval > 0) {
      setIsPolling(true)
      pollingRef.current = setInterval(() => {
        fetchReservations(true)
      }, pollingInterval)
      console.log(`Started polling every ${pollingInterval}ms`)
    }
  }, [enablePolling, pollingInterval, fetchReservations])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setIsPolling(false)
    console.log('Stopped polling')
  }, [])

  const pausePolling = useCallback(() => {
    stopPolling()
  }, [stopPolling])

  const resumePolling = useCallback(() => {
    startPolling()
  }, [startPolling])

  // Initial fetch and polling setup
  useEffect(() => {
    fetchReservations()
    startPolling()
    
    // Cleanup polling on unmount
    return () => {
      stopPolling()
    }
  }, [fetchReservations, startPolling, stopPolling])

  // Pause polling when user is actively making changes
  useEffect(() => {
    if (optimisticUpdates.size > 0) {
      pausePolling()
    } else {
      resumePolling()
    }
  }, [optimisticUpdates.size, pausePolling, resumePolling])

  return {
    reservations,
    loading,
    error,
    createReservation,
    deleteReservation,
    refetch: fetchReservations,
    optimisticUpdates,
    isPolling,
    startPolling,
    stopPolling,
    pausePolling,
    resumePolling
  }
}
