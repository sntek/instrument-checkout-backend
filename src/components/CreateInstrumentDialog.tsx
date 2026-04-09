"use client"

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Loader2 } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { Instrument } from '@/types'

interface CreateInstrumentDialogProps {
  teamSlug: string
  onInstrumentCreated?: () => void
}

export function CreateInstrumentDialog({ teamSlug, onInstrumentCreated }: CreateInstrumentDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<Instrument>({
    name: '',
    os: '',
    group: '',
    ip: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      toast.error('Instrument name is required')
      return
    }

    setIsSaving(true)
    try {
      await apiClient.createInstrument({ ...formData, team_slug: teamSlug })
      toast.success('Instrument created successfully')
      setIsOpen(false)
      setFormData({ name: '', os: '', group: '', ip: '' })
      if (onInstrumentCreated) onInstrumentCreated()
    } catch (error) {
      console.error('Failed to create instrument:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create instrument')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button 
          className="p-3 bg-slate-800/40 hover:bg-slate-700/60 text-slate-400 hover:text-cyan-400 rounded-full transition-all duration-300 backdrop-blur-sm border border-slate-700/50 hover:border-cyan-500/50 shadow-lg group"
          title="Add new instrument"
        >
          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Add New Instrument</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Instrument Name *</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g. MSO58B-PQ010001"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Operating System</label>
              <input
                name="os"
                value={formData.os}
                onChange={handleInputChange}
                placeholder="e.g. Windows, Linux"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Group</label>
              <input
                name="group"
                value={formData.group}
                onChange={handleInputChange}
                placeholder="e.g. G8"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">IP Address</label>
            <input
              name="ip"
              value={formData.ip}
              onChange={handleInputChange}
              placeholder="e.g. 10.233.65.193"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
            />
          </div>
          <DialogFooter className="pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-white rounded-lg transition-all shadow-lg shadow-cyan-500/20"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Create Instrument</span>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
