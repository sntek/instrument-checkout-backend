"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";

interface HeaderProps {
  teamName?: string;
}

export function Header({ teamName }: HeaderProps) {
  return (
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

      {/* Centered Logo */}
      <div className="relative max-w-7xl mx-auto flex flex-col items-center justify-center">
        <h1 className="text-6xl md:text-7xl font-bold text-white text-center">
          {teamName || 'Loading...'}
        </h1>
      </div>
    </section>
  );
}
