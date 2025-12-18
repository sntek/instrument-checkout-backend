import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { generateTimeSlotsForDate, formatDate } from '@/lib/utils'

interface Instrument {
  name: string
  os?: string
  group?: string
  ip?: string
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
}: InstrumentSchedulingDialogProps) {
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
        <div className="flex w-full items-end gap-1 justify-center">
          {todaySlots.map((slot) => {
            const reserved = onIsSlotReserved(instrument.name, slot, todayDateString)
            const reservationInfo = reservationsByInstrument[instrument.name]?.[`${todayDateString}-${slot}`]
            const reserver = reservationInfo?.reserverName
            return (
              <Tooltip key={slot}>
                <TooltipTrigger asChild>
                  <div
                    className={`h-9 sm:h-10 md:h-12 flex-1 rounded-full transition-transform ${reserved ? 'bg-red-500' : 'bg-emerald-500'} hover:scale-110`}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      onToggleSlot(instrument.name, slot, todayDateString)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        onToggleSlot(instrument.name, slot, todayDateString)
                      }
                    }}
                    aria-label={reserved ? `${slot} — Reserved${reserver ? ` by ${reserver}` : ''}` : `${slot} — Free`}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <span className="font-medium">{slot}</span>
                  <span className="ml-2 opacity-80">{reserved ? (reserver ? `Reserved by ${reserver}` : 'Reserved') : 'Free'}</span>
                </TooltipContent>
              </Tooltip>
            )
          })}
          <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
              <button
                className="h-9 sm:h-10 md:h-12 w-9 sm:w-10 md:w-8 rounded-full bg-slate-700/60 hover:bg-slate-600/80 border border-slate-600/60 hover:border-slate-500/80 transition-all duration-200 flex items-center justify-center group"
                aria-label="Open scheduling dialog"
                title="Open scheduling dialog"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 group-hover:text-white transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            </DialogTrigger>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            {instrument.name} — Select Time Slots
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-8">
          {/* Today Timeline */}
          <div>
            <h3 className="text-lg font-semibold text-black mb-3">
              {formatDate(today)} (Today)
            </h3>
            <div className="flex items-center justify-between text-xs text-gray-300 mb-2">
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
              <div className="absolute inset-0 flex gap-[1px] p-1">
                {todaySlots.map((slot) => {
                  const selected = Boolean(reservationsByInstrument[instrument.name]?.[`${todayDateString}-${slot}`])
                  const reservationInfo = reservationsByInstrument[instrument.name]?.[`${todayDateString}-${slot}`]
                  const reserver = reservationInfo?.reserverName
                  const isMine = reservationInfo?.reserverUserId === currentUserId
                  const isOptimisticallyUpdating = onIsOptimisticallyUpdating(instrument.name, slot, todayDateString)
                  return (
                    <Tooltip key={slot}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onToggleSlot(instrument.name, slot, todayDateString)}
                          className={`flex-1 relative rounded-md outline-none transition-[transform,box-shadow] focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${isOptimisticallyUpdating ? 'animate-pulse' : ''}`}
                          aria-label={`Toggle ${slot}${reserver ? ` (reserved by ${reserver})` : ''}`}
                          disabled={isOptimisticallyUpdating}
                        >
                          <span
                            className={`absolute inset-0 rounded-md ${selected ? (isMine ? 'bg-cyan-500/90' : 'bg-rose-500/80') : 'bg-slate-800/0 hover:bg-slate-700/40'} shadow ${selected ? 'shadow-cyan-500/10' : 'shadow-none'} ${isOptimisticallyUpdating ? 'opacity-70' : ''}`}
                          />
                          {isOptimisticallyUpdating && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
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
             <h3 className="text-lg font-semibold text-black mb-3">
               {formatDate(tomorrow)} {today.getDay() === 5 ? '(Monday)' : '(Tomorrow)'}
             </h3>
            <div className="flex items-center justify-between text-xs text-gray-300 mb-2">
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
              <div className="absolute inset-0 flex gap-[1px] p-1">
                {tomorrowSlots.map((slot) => {
                  const selected = Boolean(reservationsByInstrument[instrument.name]?.[`${tomorrowDateString}-${slot}`])
                  const reservationInfo = reservationsByInstrument[instrument.name]?.[`${tomorrowDateString}-${slot}`]
                  const reserver = reservationInfo?.reserverName
                  const isMine = reservationInfo?.reserverUserId === currentUserId
                  const isOptimisticallyUpdating = onIsOptimisticallyUpdating(instrument.name, slot, tomorrowDateString)
                  return (
                    <Tooltip key={slot}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onToggleSlot(instrument.name, slot, tomorrowDateString)}
                          className={`flex-1 relative rounded-md outline-none transition-[transform,box-shadow] focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${isOptimisticallyUpdating ? 'animate-pulse' : ''}`}
                          aria-label={`Toggle ${slot}${reserver ? ` (reserved by ${reserver})` : ''}`}
                          disabled={isOptimisticallyUpdating}
                        >
                          <span
                            className={`absolute inset-0 rounded-md ${selected ? (isMine ? 'bg-cyan-500/90' : 'bg-rose-500/80') : 'bg-slate-800/0 hover:bg-slate-700/40'} shadow ${selected ? 'shadow-cyan-500/10' : 'shadow-none'} ${isOptimisticallyUpdating ? 'opacity-70' : ''}`}
                          />
                          {isOptimisticallyUpdating && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
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
            <div className="text-[11px] text-muted-foreground">Click segments to toggle</div>
          </div>
        </div>
      </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  )
}
