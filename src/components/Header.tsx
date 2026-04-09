"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit2, Trash2, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { UserMenu } from "@/components/UserMenu";
import { apiClient } from "@/lib/api";
import { Team } from "@/types";

interface HeaderProps {
  teamName?: string;
  team?: Team | null;
  onTeamUpdated?: () => void;
}

export function Header({ teamName, team, onTeamUpdated }: HeaderProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [delAdminUser, setDelAdminUser] = useState('');
  const [delAdminPass, setDelAdminPass] = useState('');
  const [deleting, setDeleting] = useState(false);

  function startEdit() {
    if (!team) return;
    setEditName(team.name);
    setEditSlug(team.slug);
    setAdminUser('');
    setAdminPass('');
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!team) return;
    setSaving(true);
    try {
      await apiClient.updateTeam(team.slug, editName, editSlug, `${adminUser}:${adminPass}`);
      toast.success('Team updated');
      setEditing(false);
      if (editSlug !== team.slug) {
        router.push(`/${editSlug}`);
      } else if (onTeamUpdated) {
        onTeamUpdated();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update team');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!team) return;
    setDeleting(true);
    try {
      await apiClient.deleteTeam(team.slug, `${delAdminUser}:${delAdminPass}`);
      toast.success('Team deleted');
      router.push('/');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete team');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <section className="relative py-16 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10"></div>

        {/* Top left — back to teams */}
        <div className="absolute top-6 left-6 z-50">
          <Link href="/" className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            All Teams
          </Link>
        </div>

        {/* Top right user info */}
        <div className="absolute top-6 right-6 z-50">
          <UserMenu />
        </div>

        {/* Centered Logo + admin controls */}
        <div className="relative max-w-7xl mx-auto flex flex-col items-center justify-center">
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-6xl md:text-7xl font-bold text-white text-center">
              {teamName || 'Loading...'}
            </h1>
            {team && (
              <div className="flex gap-1 ml-2">
                <button
                  onClick={startEdit}
                  className="p-1.5 rounded-full text-slate-500 hover:text-cyan-400 hover:bg-slate-800/50 transition-colors"
                  title="Edit team (admin)"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setShowDelete(true); setDelAdminUser(''); setDelAdminPass(''); }}
                  className="p-1.5 rounded-full text-slate-500 hover:text-red-400 hover:bg-slate-800/50 transition-colors"
                  title="Delete team (admin)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Edit team modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditing(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-white mb-4">Edit Team</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Team Name</label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Slug (URL path)</label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-slate-600">/</span>
                  <input
                    value={editSlug}
                    onChange={e => setEditSlug(e.target.value)}
                    required
                    pattern="[a-z0-9-]+"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="border-t border-slate-800 pt-4">
                <p className="text-xs text-slate-500 mb-3">Admin credentials required</p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">Username</label>
                    <input value={adminUser} onChange={e => setAdminUser(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none transition-colors" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">Password</label>
                    <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none transition-colors" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-white text-sm rounded-lg transition-all">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete team modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowDelete(false)}>
          <div className="bg-slate-900 border border-red-900/50 rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-red-400 mb-2">Delete Team</h3>
            <p className="text-sm text-slate-400 mb-4">
              This will permanently delete <span className="text-white font-semibold">{team?.name}</span> and all its instruments and reservations.
            </p>
            <form onSubmit={handleDelete} className="space-y-4">
              <div className="border-t border-slate-800 pt-4">
                <p className="text-xs text-slate-500 mb-3">Admin credentials required</p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">Username</label>
                    <input value={delAdminUser} onChange={e => setDelAdminUser(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none transition-colors" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">Password</label>
                    <input type="password" value={delAdminPass} onChange={e => setDelAdminPass(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none transition-colors" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowDelete(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={deleting} className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white text-sm rounded-lg transition-all">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleting ? 'Deleting...' : 'Delete Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
