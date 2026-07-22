"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { SignInRequired } from '@/components/SignInRequired';
import { UserMenu } from '@/components/UserMenu';
import { apiClient } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { Instrument, Team } from '@/types';

const POLL_INTERVAL_MS = 15000;
const LIVE_THRESHOLD_MS = 5 * 60 * 1000; // matches the ~10min default keep-alive with headroom

type Status = 'live' | 'stale' | 'never';

function getStatus(lastSeen?: string): Status {
  if (!lastSeen) return 'never';
  const age = Date.now() - new Date(lastSeen).getTime();
  return age <= LIVE_THRESHOLD_MS ? 'live' : 'stale';
}

const STATUS_STYLES: Record<Status, { dot: string; label: string }> = {
  live: { dot: 'bg-green-400 shadow-[0_0_6px_2px_rgba(74,222,128,0.5)]', label: 'Live' },
  stale: { dot: 'bg-amber-400', label: 'Stale' },
  never: { dot: 'bg-slate-600', label: 'Never checked in' },
};

export default function ScopesStatusPage() {
  const [instruments, setInstruments] = React.useState<Instrument[]>([]);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [teamFilter, setTeamFilter] = React.useState<string>('all');
  const [loading, setLoading] = React.useState(true);
  const [lastRefreshed, setLastRefreshed] = React.useState<Date | null>(null);

  const { data: session, isPending } = authClient.useSession();
  const devSession = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true'
    ? { user: { id: 'dev-user', email: 'dev@tektronix.com', name: 'Dev User' }, session: { id: 'dev-session' } }
    : session;

  const fetchData = React.useCallback(async (isPoll = false) => {
    try {
      if (!isPoll) setLoading(true);
      const [instrumentsData, teamsData] = await Promise.all([
        apiClient.getInstruments(),
        apiClient.getTeams(),
      ]);
      setInstruments(instrumentsData);
      setTeams(teamsData);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Failed to load scope status:', error);
    } finally {
      if (!isPoll) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  const teamName = React.useCallback(
    (slug?: string) => teams.find(t => t.slug === slug)?.name ?? slug ?? 'Unknown',
    [teams]
  );

  const filtered = React.useMemo(() => {
    const rows = teamFilter === 'all' ? instruments : instruments.filter(i => i.team_slug === teamFilter);
    return [...rows].sort((a, b) => {
      const aTime = a.last_seen ? new Date(a.last_seen).getTime() : 0;
      const bTime = b.last_seen ? new Date(b.last_seen).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.name.localeCompare(b.name);
    });
  }, [instruments, teamFilter]);

  const liveCount = instruments.filter(i => getStatus(i.last_seen) === 'live').length;

  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (!devSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-start justify-center pt-[20vh]">
        <SignInRequired />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <section className="relative py-16 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10" />

        <div className="absolute top-6 left-6 z-50">
          <Link href="/" className="flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            All Teams
          </Link>
        </div>

        <div className="absolute top-6 right-6 z-50">
          <UserMenu />
        </div>

        <div className="relative max-w-7xl mx-auto flex flex-col items-center justify-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white text-center">Scope Status</h1>
          <p className="text-slate-400 mt-3 text-center">
            {liveCount} of {instruments.length} instrument{instruments.length === 1 ? '' : 's'} currently beaming in
          </p>
        </div>
      </section>

      <section className="px-6 pb-16 max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <select
            value={teamFilter}
            onChange={e => setTeamFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:border-cyan-500 outline-none transition-colors"
          >
            <option value="all">All teams</option>
            {teams.map(t => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            {lastRefreshed && <span>Updated {formatDistanceToNowStrict(lastRefreshed, { addSuffix: true })}</span>}
            <button
              onClick={() => fetchData()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-slate-400 text-lg">No instruments to show</p>
          </div>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-500 uppercase text-xs">
                  <th className="text-left font-semibold px-5 py-3">Status</th>
                  <th className="text-left font-semibold px-5 py-3">Instrument</th>
                  <th className="text-left font-semibold px-5 py-3">Team</th>
                  <th className="text-left font-semibold px-5 py-3">IP Address</th>
                  <th className="text-left font-semibold px-5 py-3">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(instrument => {
                  const status = getStatus(instrument.last_seen);
                  const style = STATUS_STYLES[status];
                  return (
                    <tr key={instrument.name} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                          <span className="text-slate-400">{style.label}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-white font-medium">{instrument.name}</td>
                      <td className="px-5 py-3 text-slate-400">{teamName(instrument.team_slug)}</td>
                      <td className="px-5 py-3 text-slate-400 font-mono text-xs">{instrument.ip || '—'}</td>
                      <td className="px-5 py-3 text-slate-400">
                        {instrument.last_seen
                          ? formatDistanceToNowStrict(new Date(instrument.last_seen), { addSuffix: true })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
