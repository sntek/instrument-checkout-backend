import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { generateTimeSlotsForDate, formatDate } from '@/lib/utils'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { Lock, LockOpen } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface Instrument {
  name: string
  os?: string
  group?: string
  ip?: string
  long_term_checkout_user_id?: string
  long_term_checkout_user_name?: string
}

interface ReservationInfo {
  reserverName: string
  reserverUserId: string
  id: string
}

interface InstrumentSchedulingDialogProps {
  instrument: Instrument
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  reservationsByInstrument: Record<string, Record<string, ReservationInfo>>
  currentDisplayName: string
  currentUserId: string
  onToggleSlot: (instrumentName: string, slot: string, date: string) => void
  onIsSlotReserved: (instrumentName: string, slot: string, date: string) => boolean
  onIsOptimisticallyUpdating: (instrumentName: string, slot: string, date: string) => boolean
  onUpdate?: () => void
}

export function InstrumentSchedulingDialog({
  instrument,
  isOpen,
  onOpenChange,
  reservationsByInstrument,
  currentDisplayName,
  currentUserId,
  onToggleSlot,
  onIsSlotReserved,
  onIsOptimisticallyUpdating,
  onUpdate,
}: InstrumentSchedulingDialogProps) {
  const [isTogglingLongTerm, setIsTogglingLongTerm] = useState(false)

  const isDraggingRef = useRef(false)
  const dragActionRef = useRef<'reserve' | 'release'>('reserve')
  const touchedSlotsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const handleMouseUp = () => {
      isDraggingRef.current = false
      touchedSlotsRef.current = new Set()
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  const isLongTermCheckedOut = Boolean(instrument.long_term_checkout_user_id)
  const isMyLongTermCheckout = instrument.long_term_checkout_user_id === currentUserId
  
  const handleToggleLongTermCheckout = async () => {
    setIsTogglingLongTerm(true)
    try {
      if (isLongTermCheckedOut) {
        await apiClient.toggleLongTermCheckout(instrument.name, null, null)
        toast.success('Long-term checkout released')
      } else {
        await apiClient.toggleLongTermCheckout(instrument.name, currentUserId, currentDisplayName)
        toast.success('Long-term checkout activated')
      }
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Failed to toggle long-term checkout:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to toggle long-term checkout')
    } finally {
      setIsTogglingLongTerm(false)
    }
  }
  const today = new Date()
  const tomorrow = new Date(today)
  
  // If today is Friday (5), set tomorrow to Monday (1)
  if (today.getDay() === 5) { // Friday
    tomorrow.setDate(tomorrow.getDate() + 3) // Skip to Monday
  } else {
    tomorrow.setDate(tomorrow.getDate() + 1) // Next day
  }
  
  const todaySlots = generateTimeSlotsForDate(today)
  const tomorrowSlots = generateTimeSlotsForDate(tomorrow)
  
  const todayDateString = today.toDateString()
  const tomorrowDateString = tomorrow.toDateString()
  return (
    <>
      <div className="absolute left-0 right-0 bottom-0 px-2 py-2 rounded-b-xl bg-gradient-to-t from-slate-900/20 to-transparent">
        {isLongTermCheckedOut && (
          <div className="absolute inset-0 bg-purple-900 rounded-b-xl flex items-center justify-center z-10">
            <span className="text-purple-200 text-xs font-semibold tracking-wide">🔒 Long-term checkout — {instrument.long_term_checkout_user_name}</span>
          </div>
        )}
        <div className="flex w-full items-end gap-1 justify-center">
          {todaySlots.map((slot) => {
            const reserved = onIsSlotReserved(instrument.name, slot, todayDateString)
            const reservationInfo = reservationsByInstrument[instrument.name]?.[`${todayDateString}-${slot}`]
            const reserver = reservationInfo?.reserverName
            const isBlockedByOther = reserved && reservationInfo?.reserverUserId !== currentUserId
            return (
              <Tooltip key={slot}>
                <TooltipTrigger asChild>
                  <div
                    className={`h-9 sm:h-10 md:h-12 flex-1 rounded-full transition-transform ${reserved ? 'bg-red-500' : 'bg-emerald-500'} ${isBlockedByOther ? 'cursor-not-allowed opacity-80' : 'hover:scale-110 cursor-pointer'}`}
                    role={isBlockedByOther ? 'img' : 'button'}
                    tabIndex={isBlockedByOther ? -1 : 0}
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      if (!isBlockedByOther && !isLongTermCheckedOut) onToggleSlot(instrument.name, slot, todayDateString)
                    }}
                    onKeyDown={(e) => {
                      if (isBlockedByOther || isLongTermCheckedOut) return
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        onToggleSlot(instrument.name, slot, todayDateString)
                      }
                    }}
                    aria-label={reserved ? `${slot} — Reserved${reserver ? ` by ${reserver}` : ''}` : `${slot} — Free`}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <span className="font-medium">{slot}</span>
                  <span className="ml-2 opacity-80">{reserved ? (reserver ? `Reserved by ${reserver}` : 'Reserved') : 'Free'}</span>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-6xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {instrument.name} — Select Time Slots
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-8">
          {/* Today Timeline */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-black">
                {formatDate(today)} (Today)
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    todaySlots.forEach(slot => {
                      const reservationInfo = reservationsByInstrument[instrument.name]?.[`${todayDateString}-${slot}`]
                      if (!reservationInfo) {
                        onToggleSlot(instrument.name, slot, todayDateString)
                      }
                    })
                  }}
                  disabled={isLongTermCheckedOut}
                  className="text-xs px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Reserve Full Day
                </button>
                <button
                  type="button"
                  disabled={isLongTermCheckedOut}
                  onClick={() => {
                    todaySlots.forEach(slot => {
                      const reservationInfo = reservationsByInstrument[instrument.name]?.[`${todayDateString}-${slot}`]
                      if (reservationInfo?.reserverUserId === currentUserId) {
                        onToggleSlot(instrument.name, slot, todayDateString)
                      }
                    })
                  }}
                  className="text-xs px-3 py-1.5 rounded-md bg-slate-500 hover:bg-slate-600 text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-700 mb-2">
              <span className="tabular-nums">8:00 AM</span>
              <span className="tabular-nums">12:00 PM</span>
              <span className="tabular-nums">5:00 PM</span>
            </div>
            <div className="relative w-full">
              {/* Track */}
              <div className="h-10 rounded-lg bg-slate-900/60 border border-slate-700 shadow-inner" />
              {/* Hour grid lines */}
              <div className="pointer-events-none absolute inset-0 flex">
                {todaySlots.map((_, idx) => (
                  <div key={idx} className="flex-1 relative">
                    {(idx % 2 === 1) && (idx < todaySlots.length - 1) && (
                      <div className="absolute inset-y-1 -right-px w-px bg-slate-700/60" />
                    )}
                  </div>
                ))}
              </div>
              {/* Interactive segments */}
              <div className="absolute inset-0 flex gap-[1px] p-1 select-none">
                {todaySlots.map((slot) => {
                  const selected = Boolean(reservationsByInstrument[instrument.name]?.[`${todayDateString}-${slot}`])
                  const reservationInfo = reservationsByInstrument[instrument.name]?.[`${todayDateString}-${slot}`]
                  const reserver = reservationInfo?.reserverName
                  const isMine = reservationInfo?.reserverUserId === currentUserId
                  const isOptimisticallyUpdating = onIsOptimisticallyUpdating(instrument.name, slot, todayDateString)
                  const isBlockedByOther = selected && !isMine
                  const canInteract = !isBlockedByOther && !isLongTermCheckedOut && !isOptimisticallyUpdating
                  return (
                    <Tooltip key={slot}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            if (!canInteract) return
                            e.preventDefault()
                            isDraggingRef.current = true
                            dragActionRef.current = selected && isMine ? 'release' : 'reserve'
                            touchedSlotsRef.current = new Set([slot])
                            onToggleSlot(instrument.name, slot, todayDateString)
                          }}
                          onMouseEnter={() => {
                            if (!isDraggingRef.current || !canInteract || touchedSlotsRef.current.has(slot)) return
                            const shouldToggle = dragActionRef.current === 'reserve' ? !selected : (selected && isMine)
                            if (shouldToggle) {
                              touchedSlotsRef.current.add(slot)
                              onToggleSlot(instrument.name, slot, todayDateString)
                            }
                          }}
                          onClick={() => { /* handled by mousedown */ }}
                          className={`flex-1 relative rounded-md outline-none transition-[transform,box-shadow] focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${isOptimisticallyUpdating ? 'animate-pulse' : ''} ${isBlockedByOther ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          aria-label={`${slot}${reserver ? ` — reserved by ${reserver}` : selected ? ' — reserved' : ' — free'}`}
                          aria-disabled={isBlockedByOther}
                          disabled={isOptimisticallyUpdating || isLongTermCheckedOut}
                        >
                          <span
                            className={`absolute inset-0 rounded-md ${selected ? (isMine ? 'bg-cyan-500/90' : 'bg-rose-500/80') : 'bg-slate-800/0 hover:bg-slate-700/40'} shadow ${selected ? 'shadow-cyan-500/10' : 'shadow-none'} ${isOptimisticallyUpdating ? 'opacity-70' : ''}`}
                          />

                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <span className="font-medium">{slot}</span>
                        <span className="ml-2 opacity-80">{selected ? (reserver ? (isMine ? 'Reserved by you' : `Reserved by ${reserver}`) : 'Reserved') : 'Free'}</span>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Tomorrow Timeline */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-black">
                {formatDate(tomorrow)} {today.getDay() === 5 ? '(Monday)' : '(Tomorrow)'}
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    tomorrowSlots.forEach(slot => {
                      const reservationInfo = reservationsByInstrument[instrument.name]?.[`${tomorrowDateString}-${slot}`]
                      if (!reservationInfo) {
                        onToggleSlot(instrument.name, slot, tomorrowDateString)
                      }
                    })
                  }}
                  disabled={isLongTermCheckedOut}
                  className="text-xs px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Reserve Full Day
                </button>
                <button
                  type="button"
                  disabled={isLongTermCheckedOut}
                  onClick={() => {
                    tomorrowSlots.forEach(slot => {
                      const reservationInfo = reservationsByInstrument[instrument.name]?.[`${tomorrowDateString}-${slot}`]
                      if (reservationInfo?.reserverUserId === currentUserId) {
                        onToggleSlot(instrument.name, slot, tomorrowDateString)
                      }
                    })
                  }}
                  className="text-xs px-3 py-1.5 rounded-md bg-slate-500 hover:bg-slate-600 text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-700 mb-2">
              <span className="tabular-nums">8:00 AM</span>
              <span className="tabular-nums">12:00 PM</span>
              <span className="tabular-nums">5:00 PM</span>
            </div>
            <div className="relative w-full">
              {/* Track */}
              <div className="h-10 rounded-lg bg-slate-900/60 border border-slate-700 shadow-inner" />
              {/* Hour grid lines */}
              <div className="pointer-events-none absolute inset-0 flex">
                {tomorrowSlots.map((_, idx) => (
                  <div key={idx} className="flex-1 relative">
                    {(idx % 2 === 1) && (idx < tomorrowSlots.length - 1) && (
                      <div className="absolute inset-y-1 -right-px w-px bg-slate-700/60" />
                    )}
                  </div>
                ))}
              </div>
              {/* Interactive segments */}
              <div className="absolute inset-0 flex gap-[1px] p-1 select-none">
                {tomorrowSlots.map((slot) => {
                  const selected = Boolean(reservationsByInstrument[instrument.name]?.[`${tomorrowDateString}-${slot}`])
                  const reservationInfo = reservationsByInstrument[instrument.name]?.[`${tomorrowDateString}-${slot}`]
                  const reserver = reservationInfo?.reserverName
                  const isMine = reservationInfo?.reserverUserId === currentUserId
                  const isOptimisticallyUpdating = onIsOptimisticallyUpdating(instrument.name, slot, tomorrowDateString)
                  const isBlockedByOther = selected && !isMine
                  const canInteract = !isBlockedByOther && !isLongTermCheckedOut && !isOptimisticallyUpdating
                  return (
                    <Tooltip key={slot}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            if (!canInteract) return
                            e.preventDefault()
                            isDraggingRef.current = true
                            dragActionRef.current = selected && isMine ? 'release' : 'reserve'
                            touchedSlotsRef.current = new Set([slot])
                            onToggleSlot(instrument.name, slot, tomorrowDateString)
                          }}
                          onMouseEnter={() => {
                            if (!isDraggingRef.current || !canInteract || touchedSlotsRef.current.has(slot)) return
                            const shouldToggle = dragActionRef.current === 'reserve' ? !selected : (selected && isMine)
                            if (shouldToggle) {
                              touchedSlotsRef.current.add(slot)
                              onToggleSlot(instrument.name, slot, tomorrowDateString)
                            }
                          }}
                          onClick={() => { /* handled by mousedown */ }}
                          className={`flex-1 relative rounded-md outline-none transition-[transform,box-shadow] focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${isOptimisticallyUpdating ? 'animate-pulse' : ''} ${isBlockedByOther ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          aria-label={`${slot}${reserver ? ` — reserved by ${reserver}` : selected ? ' — reserved' : ' — free'}`}
                          aria-disabled={isBlockedByOther}
                          disabled={isOptimisticallyUpdating || isLongTermCheckedOut}
                        >
                          <span
                            className={`absolute inset-0 rounded-md ${selected ? (isMine ? 'bg-cyan-500/90' : 'bg-rose-500/80') : 'bg-slate-800/0 hover:bg-slate-700/40'} shadow ${selected ? 'shadow-cyan-500/10' : 'shadow-none'} ${isOptimisticallyUpdating ? 'opacity-70' : ''}`}
                          />

                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <span className="font-medium">{slot}</span>
                        <span className="ml-2 opacity-80">{selected ? (reserver ? (isMine ? 'Reserved by you' : `Reserved by ${reserver}`) : 'Reserved') : 'Free'}</span>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-cyan-500/90 inline-block" />
                Yours
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-500/80 inline-block" />
                Reserved
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-slate-700/40 ring-1 ring-inset ring-slate-600/60 inline-block rounded" />
                Free
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">Click or drag to select</div>
          </div>
          
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-start gap-4">
              <button
                onClick={handleToggleLongTermCheckout}
                disabled={isTogglingLongTerm || (isLongTermCheckedOut && !isMyLongTermCheckout)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  isLongTermCheckedOut
                    ? isMyLongTermCheckout
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                } disabled:opacity-50`}
              >
                {isLongTermCheckedOut ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
                {isTogglingLongTerm ? 'Processing...' : isLongTermCheckedOut ? 'Release Long-term Checkout' : 'Long-term Checkout'}
              </button>
              <div className="flex-1 text-sm text-slate-600">
                {isLongTermCheckedOut ? (
                  <div>
                    <p className="font-medium text-slate-900">Currently checked out by {instrument.long_term_checkout_user_name}</p>
                    <p className="text-xs mt-1">This instrument will remain checked out until {isMyLongTermCheckout ? 'you release' : 'they release'} it.</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-slate-900">Enable long-term checkout</p>
                    <p className="text-xs mt-1">The instrument will remain checked out until you manually release it.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      </Dialog>
    </>
  )
}
