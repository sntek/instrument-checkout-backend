import React, { useState } from 'react'
import { Copyable } from '@/components/Copyable'
import { InstrumentSchedulingDialog } from '@/components/InstrumentSchedulingDialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Instrument, Source } from '@/types'
import { Edit2, Check, X, Loader2, Trash2, Plus, Cable, MapPin } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
      <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
    </svg>
  )
}

function LinuxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="24" height="24" rx="12" fill="#1a1a2e"/>
      <ellipse cx="12" cy="16" rx="7" ry="6" fill="#f0ede0"/>
      <circle cx="8" cy="10" r="2.6" fill="white"/>
      <circle cx="16" cy="10" r="2.6" fill="white"/>
      <circle cx="8.3" cy="10.3" r="1.3" fill="#111"/>
      <circle cx="16.3" cy="10.3" r="1.3" fill="#111"/>
      <ellipse cx="12" cy="14.5" rx="3" ry="1.8" fill="#f0a030"/>
    </svg>
  )
}

function OsIcon({ os, className }: { os?: string; className?: string }) {
  if (!os) return null
  const lower = os.toLowerCase()
  if (lower.includes('linux')) return <LinuxIcon className={className} />
  if (lower.includes('windows')) return <WindowsIcon className={className} />
  return null
}

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
  const [sourcesTemp, setSourcesTemp] = useState<Source[]>(instrument.sources ?? [])

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setTempInstrument(instrument)
    setSourcesTemp(instrument.sources ?? [])
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(false)
    setTempInstrument(instrument)
    setSourcesTemp(instrument.sources ?? [])
  }

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsSaving(true)
    try {
      await apiClient.updateInstrument(instrument.name, { ...tempInstrument, sources: sourcesTemp })
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
    const confirmed = window.confirm(
      'Are you sure you want to delete ' + instrument.name + '? This will also delete all reservations for this instrument.'
    )
    if (!confirmed) return

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
    setSourcesTemp(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleAddSource = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSourcesTemp(prev => [...prev, { name: '', channel: '' }])
  }

  const handleRemoveSource = (index: number) => {
    setSourcesTemp(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div
      key={instrument.name}
      className="relative bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-7 md:p-8 pb-10 min-h-52 md:min-h-60 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 group"
      onClick={() => !isEditing && onOpenChange(true)}
    >

      {!isEditing && (
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleEdit}
                className="p-1.5 rounded-full bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                aria-label="Edit instrument"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-slate-900 border border-slate-700 text-white">
              <span className="text-xs">Edit</span>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-full bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-cyan-300 transition-colors"
                aria-label="Last known location"
              >
                <MapPin className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-slate-900 border border-slate-700 text-white">
              <span className="text-xs">
                <span className="text-slate-400">Last known location: </span>
                {instrument.location?.trim() ? instrument.location : 'Unknown'}
              </span>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {isEditing ? (
        <>
          <div className="flex justify-end gap-2 mb-3">
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
          </div>
          <div className="space-y-3 overflow-y-auto overflow-x-hidden max-h-56 pr-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-track]:bg-transparent">
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
            <select
              name="os"
              value={tempInstrument.os || ''}
              onChange={(e) => setTempInstrument(prev => ({ ...prev, os: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:border-cyan-500 outline-none transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">— None —</option>
              <option value="Windows">Windows</option>
              <option value="Linux">Linux</option>
            </select>
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
            <label className="text-xs text-slate-400 uppercase font-semibold">Last Known Location</label>
            <input
              name="location"
              value={tempInstrument.location || ''}
              onChange={handleInputChange}
              placeholder="BV-1SH8"
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:border-cyan-500 outline-none transition-colors"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Inline sources editing */}
          <div onClick={(e) => e.stopPropagation()}>
            <label className="text-xs text-slate-400 uppercase font-semibold mb-2 block">Sources</label>
            <div className="space-y-1.5">
              {sourcesTemp.length === 0 && (
                <p className="text-xs text-slate-600 py-1">No sources yet.</p>
              )}
              {sourcesTemp.length > 0 && (
                <div className="flex gap-2 text-xs text-slate-500 uppercase font-semibold pb-1">
                  <span className="w-5 shrink-0" />
                  <span className="flex-1 min-w-0">Name</span>
                  <span className="w-20 shrink-0">Channel</span>
                </div>
              )}
              {sourcesTemp.map((src, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <button
                    onClick={() => handleRemoveSource(i)}
                    className="shrink-0 p-0.5 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <input
                    value={src.name}
                    onChange={(e) => handleSourceChange(i, 'name', e.target.value)}
                    placeholder="e.g. internal AFG"
                    className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:border-cyan-500 outline-none transition-colors"
                  />
                  <input
                    value={src.channel}
                    onChange={(e) => handleSourceChange(i, 'channel', e.target.value)}
                    placeholder="CH1"
                    className="w-20 shrink-0 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:border-cyan-500 outline-none transition-colors"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleAddSource}
              className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-300 transition-colors mt-2"
            >
              <Plus className="w-3.5 h-3.5" /> Add source
            </button>
          </div>
          </div>
        </>
      ) : (
        <>
          <h3 className="text-lg lg:text-base xl:text-xl 2xl:text-2xl font-semibold text-white mb-5 overflow-visible flex items-center gap-3 break-all">
            <OsIcon os={instrument.os} className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
            <Copyable text={instrument.name} label="Copy device name" />
          </h3>
          <div className="space-y-3.5">
            <p className="text-lg text-slate-400">
              <span className="text-slate-500 mr-2">IP</span>
              {instrument.ip ? <Copyable text={instrument.ip} os={instrument.os} instrumentName={instrument.name} label="Copy IP Address" /> : <span className="text-slate-600">—</span>}
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 text-lg text-slate-400 hover:text-cyan-300 transition-colors"
                >
                  <Cable className="w-5 h-5" />
                  <span>Sources</span>
                  <span className="bg-slate-700 text-slate-300 rounded-full px-1.5 py-0.5 text-xs font-medium">
                    {(instrument.sources ?? []).length}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-slate-900 border border-slate-700 text-white p-3">
                {(instrument.sources ?? []).length === 0 ? (
                  <p className="text-slate-500 text-xs">No sources configured.</p>
                ) : (
                  <table className="text-xs">
                    <thead>
                      <tr className="text-slate-500 uppercase border-b border-slate-800">
                        <th className="text-left font-semibold pb-1 pr-4">Name</th>
                        <th className="text-left font-semibold pb-1">Channel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {instrument.sources!.map((src, i) => (
                        <tr key={i}>
                          <td className="pr-4 py-0.5 text-gray-300">{src.name || '—'}</td>
                          <td className="py-0.5 text-gray-400">{src.channel || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </TooltipContent>
            </Tooltip>
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
          onUpdate={onUpdate}
        />
      )}
    </div>
  )
}



