
import React, { useState } from 'react'
import { Copyable } from '@/components/Copyable'
import { InstrumentSchedulingDialog } from '@/components/InstrumentSchedulingDialog'
import { Instrument } from '@/types'
import { Edit2, Check, X, Loader2, Trash2 } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface ReservationInfo {
  reserverName: string
  reserverUserId: string
  id: string
}

interface InstrumentCardProps {
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

export function InstrumentCard({
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
}: InstrumentCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [tempInstrument, setTempInstrument] = useState<Instrument>(instrument)

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setTempInstrument(instrument)
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(false)
    setTempInstrument(instrument)
  }

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsSaving(true)
    try {
      await apiClient.updateInstrument(instrument.name, tempInstrument)
      toast.success('Instrument updated successfully')
      setIsEditing(false)
      if (onUpdate) onUpdate()
      else window.location.reload()
    } catch (error) {
      console.error('Failed to update instrument:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update instrument')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(`Are you sure you want to delete ${instrument.name}? This will also delete all reservations for this instrument.`)) {
      return
    }
    
    setIsSaving(true)
    try {
      await apiClient.deleteInstrument(instrument.name)
      toast.success('Instrument deleted successfully')
      setIsEditing(false)
      if (onUpdate) onUpdate()
      else window.location.reload()
    } catch (error) {
      console.error('Failed to delete instrument:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete instrument')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setTempInstrument(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div
      key={instrument.name}
      className="relative bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-7 md:p-8 pb-10 min-h-52 md:min-h-60 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 group"
      onClick={() => !isEditing && onOpenChange(true)}
    >
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {isEditing ? (
          <>
            <button
              onClick={handleDelete}
              disabled={isSaving}
              className="p-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
              title="Delete instrument"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="p-1.5 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
              title="Save changes"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="p-1.5 rounded-full bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
              title="Cancel editing"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={handleEdit}
            className="p-1.5 rounded-full bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            title="Edit instrument"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs text-slate-400 uppercase font-semibold">Name</label>
            <input
              name="name"
              value={tempInstrument.name}
              onChange={handleInputChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:border-cyan-500 outline-none transition-colors"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 uppercase font-semibold">OS</label>
              <input
                name="os"
                value={tempInstrument.os || ''}
                onChange={handleInputChange}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:border-cyan-500 outline-none transition-colors"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase font-semibold">Group</label>
              <input
                name="group"
                value={tempInstrument.group || ''}
                onChange={handleInputChange}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:border-cyan-500 outline-none transition-colors"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase font-semibold">IP Address</label>
            <input
              name="ip"
              value={tempInstrument.ip || ''}
              onChange={handleInputChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:border-cyan-500 outline-none transition-colors"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      ) : (
        <>
          <h3 className="text-xl md:text-2xl font-semibold text-white mb-3 truncate">
            {instrument.name}
          </h3>
          <div className="text-base md:text-lg text-gray-400 space-y-1.5">
            <p><span className="text-gray-300">OS:</span> {instrument.os ?? '—'}</p>
            <p><span className="text-gray-300">Group:</span> {instrument.group ?? '—'}</p>
            <p>
              <span className="text-gray-300">IP:</span>{' '}
              {instrument.ip ? <Copyable text={instrument.ip} /> : '—'}
            </p>
          </div>
        </>
      )}

      {!isEditing && (
        <InstrumentSchedulingDialog
          instrument={instrument}
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          reservationsByInstrument={reservationsByInstrument}
          currentDisplayName={currentDisplayName}
          currentUserId={currentUserId}
          onToggleSlot={onToggleSlot}
          onIsSlotReserved={onIsSlotReserved}
          onIsOptimisticallyUpdating={onIsOptimisticallyUpdating}
        />
      )}
    </div>
  )
}
