"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SignInRequired() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = email.trim().toLowerCase();
    const match = trimmed.match(/^([a-z]+)\.([a-z]+)@tektronix\.com$/);
    if (!match) {
      setError("Enter your email in the format first.last@tektronix.com");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/tektronix-sso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (res.ok) {
        window.location.href = "/";
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Sign in failed.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="bg-slate-800/50 rounded-xl p-10 flex flex-col items-center border border-slate-700/60 w-full max-w-sm shadow-xl shadow-black/30 backdrop-blur-sm">

        {/* Lock icon */}
        <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-5">
          <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-white mb-1">Tektronix SSO</h2>
        <p className="text-sm text-slate-400 mb-8 text-center leading-relaxed">
          Sign in with your Tektronix email to access and reserve instruments.
        </p>

        <form onSubmit={handleSignIn} className="w-full space-y-3">
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-600 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none transition-all text-center placeholder:text-center"
            placeholder="first.last@tektronix.com"
          />
          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm h-10 rounded-lg transition-colors"
          >
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}
