
import React, { useState } from 'react'
import { Copyable } from '@/components/Copyable'
import { InstrumentSchedulingDialog } from '@/components/InstrumentSchedulingDialog'
import { Instrument, Source } from '@/types'
import { Edit2, Check, X, Loader2, Trash2, Plus } from 'lucide-react'
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

  const handleSourceChange = (index: number, field: keyof Source, value: string) => {
    setTempInstrument(prev => {
      const sources = [...(prev.sources ?? [])]
      sources[index] = { ...sources[index], [field]: value }
      return { ...prev, sources }
    })
  }

  const handleAddSource = (e: React.MouseEvent) => {
    e.stopPropagation()
    setTempInstrument(prev => ({
      ...prev,
      sources: [...(prev.sources ?? []), { name: '', channel: '' }]
    }))
  }

  const handleRemoveSource = (e: React.MouseEvent, index: number) => {
    e.stopPropagation()
    setTempInstrument(prev => ({
      ...prev,
      sources: (prev.sources ?? []).filter((_, i) => i !== index)
    }))
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
            <label className="text-xs text-slate-400 uppercase font-semibold">IP Address</label>
            <input
              name="ip"
              value={tempInstrument.ip || ''}
              onChange={handleInputChange}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:border-cyan-500 outline-none transition-colors"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-slate-400 uppercase font-semibold">Sources</label>
              <button
                onClick={handleAddSource}
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {(tempInstrument.sources ?? []).length > 0 && (
              <div className="space-y-1.5">
                <div className="grid grid-cols-[1fr_80px_20px] gap-1 text-xs text-slate-500 px-1">
                  <span>Name</span><span>Channel</span><span />
                </div>
                {(tempInstrument.sources ?? []).map((src, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_20px] gap-1 items-center">
                    <input
                      value={src.name}
                      onChange={(e) => handleSourceChange(i, 'name', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="e.g. internal AFG"
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-sm focus:border-cyan-500 outline-none transition-colors"
                    />
                    <input
                      value={src.channel}
                      onChange={(e) => handleSourceChange(i, 'channel', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="e.g. CH1"
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-sm focus:border-cyan-500 outline-none transition-colors"
                    />
                    <button
                      onClick={(e) => handleRemoveSource(e, i)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <h3 className="text-xl md:text-2xl font-semibold text-white mb-3 overflow-visible">
            <Copyable text={instrument.name} label="Copy device name" />
          </h3>
          <div className="text-base md:text-lg text-gray-400 space-y-1.5">
            <p><span className="text-gray-300">OS:</span> {instrument.os ?? '—'}</p>
            <p>
              <span className="text-gray-300">IP:</span>{' '}
              {instrument.ip ? <Copyable text={instrument.ip} os={instrument.os} label="Copy IP Address" /> : '—'}
            </p>
            {(instrument.sources ?? []).length > 0 && (
              <div className="pt-1">
                <p className="text-gray-300 mb-1">Sources:</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase">
                      <th className="text-left font-semibold pr-4 pb-0.5">Name</th>
                      <th className="text-left font-semibold pb-0.5">Channel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(instrument.sources ?? []).map((src, i) => (
                      <tr key={i} className="text-gray-400">
                        <td className="pr-4 py-0.5">{src.name || '—'}</td>
                        <td className="py-0.5">{src.channel || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
