"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function UserMenu() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  if (!session) return null;

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.refresh();
        },
      },
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-700 bg-slate-800 hover:bg-slate-700 transition-colors overflow-hidden">
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 bg-slate-900 border-slate-700 text-white p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold truncate">{session.user.name}</p>
            <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
          </div>
          <div className="h-px bg-slate-800 w-full" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full text-left justify-start text-slate-300 hover:text-white hover:bg-slate-800 h-8 px-2"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
