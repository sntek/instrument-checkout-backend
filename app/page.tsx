"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { SignInRequired } from '@/components/SignInRequired';
import { Team } from '@/types';
import { Plus, Loader2, ArrowRight, Edit2, Trash2, Check, X } from 'lucide-react';
import { UserMenu } from '@/components/UserMenu';

export default function Dashboard() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session, isPending } = authClient.useSession();

  // Create team state
  const [showCreate, setShowCreate] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamSlug, setTeamSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit team state
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete team state
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiClient.getTeams().then(setTeams).catch(console.error).finally(() => setLoading(false));
  }, []);

  function nameToSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function handleNameChange(value: string) {
    setTeamName(value);
    if (!slugEdited) setTeamSlug(nameToSlug(value));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName || !teamSlug) return;
    setCreating(true);
    try {
      await apiClient.createTeam(teamName, teamSlug);
      toast.success('Team created');
      setShowCreate(false);
      setTeamName('');
      setTeamSlug('');
      setSlugEdited(false);
      const updated = await apiClient.getTeams();
      setTeams(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create team');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(team: Team, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditingTeam(team);
    setEditName(team.name);
    setEditSlug(team.slug);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTeam) return;
    setSaving(true);
    try {
      await apiClient.updateTeam(editingTeam.slug, editName, editSlug);
      toast.success('Team updated');
      setEditingTeam(null);
      const updated = await apiClient.getTeams();
      setTeams(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update team');
    } finally {
      setSaving(false);
    }
  }

  function startDelete(team: Team, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDeletingTeam(team);
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!deletingTeam) return;
    setDeleting(true);
    try {
      await apiClient.deleteTeam(deletingTeam.slug);
      toast.success('Team deleted');
      setDeletingTeam(null);
      const updated = await apiClient.getTeams();
      setTeams(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete team');
    } finally {
      setDeleting(false);
    }
  }

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-start justify-center pt-[20vh]">
        <SignInRequired />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <section className="relative py-16 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10" />
        <div className="absolute top-6 right-6 z-50">
          <UserMenu />
        </div>
        <div className="relative max-w-7xl mx-auto flex flex-col items-center justify-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white text-center">
            Instrument Checkout
          </h1>
        </div>
      </section>

      {/* Team grid */}
      <section className="px-6 pt-4 pb-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Link
              key={team.slug}
              href={`/${team.slug}`}
              className="group relative bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 flex flex-col items-center justify-center min-h-[160px]"
            >
              {/* Edit/Delete icons on hover */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => startEdit(team, e)}
                  className="p-1.5 rounded-full bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                  title="Edit team"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => startDelete(team, e)}
                  className="p-1.5 rounded-full bg-slate-700/50 text-slate-400 hover:bg-red-500/30 hover:text-red-400 transition-colors"
                  title="Delete team"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h2 className="text-2xl font-semibold text-white group-hover:text-cyan-300 transition-colors text-center">
                {team.name}
              </h2>
              <p className="text-sm text-slate-500 mt-2 font-mono">/{team.slug}</p>
              <ArrowRight className="absolute bottom-4 right-4 w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
            </Link>
          ))}

          {/* Create team button */}
          <button
            onClick={() => setShowCreate(true)}
            className="group relative bg-slate-800/30 backdrop-blur-sm border border-dashed border-slate-700 rounded-xl p-8 hover:border-cyan-500/50 transition-all duration-300 flex flex-col items-center justify-center min-h-[160px] cursor-pointer"
          >
            <Plus className="w-8 h-8 text-slate-600 group-hover:text-cyan-400 transition-colors" />
            <p className="text-sm text-slate-500 mt-2 group-hover:text-slate-300 transition-colors">New Team</p>
          </button>
        </div>
      </section>

      {/* Create team modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-white mb-4">Create Team</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Team Name</label>
                <input
                  value={teamName}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="e.g. Rocket Lab 🚀"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-500 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Slug (URL path)</label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-slate-600">/</span>
                  <input
                    value={teamSlug}
                    onChange={e => { setTeamSlug(e.target.value); setSlugEdited(true); }}
                    placeholder="rocket-lab"
                    required
                    pattern="[a-z0-9-]+"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white font-mono placeholder-slate-600 focus:border-cyan-500 outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-white text-sm rounded-lg transition-all"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {creating ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit team modal */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditingTeam(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-white mb-4">Edit Team</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
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
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setEditingTeam(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
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
      {deletingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeletingTeam(null)}>
          <div className="bg-slate-900 border border-red-900/50 rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-red-400 mb-2">Delete Team</h3>
            <p className="text-sm text-slate-400 mb-4">
              This will permanently delete <span className="text-white font-semibold">{deletingTeam.name}</span> and all its instruments and reservations.
            </p>
            <form onSubmit={handleDelete} className="space-y-4">
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setDeletingTeam(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={deleting} className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white text-sm rounded-lg transition-all">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleting ? 'Deleting...' : 'Delete Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
