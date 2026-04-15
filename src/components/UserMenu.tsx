"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function UserMenu() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

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

  const startEditingName = () => {
    // Pre-fill with the current first name
    const current = session.user.name ?? "";
    const firstName = current.split(" ")[0] ?? "";
    setNameInput(firstName);
    setNameError("");
    setEditingName(true);
  };

  const cancelEditingName = () => {
    setEditingName(false);
    setNameError("");
  };

  const handleSaveName = async () => {
    const preferred = nameInput.trim();
    if (!preferred) {
      setNameError("Name cannot be empty.");
      return;
    }
    setSavingName(true);
    setNameError("");
    try {
      // Rebuild full name as "<preferred> <existingLastName>"
      const current = session.user.name ?? "";
      const parts = current.split(" ");
      const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
      const newName = lastName ? `${preferred} ${lastName}` : preferred;

      await authClient.updateUser({ name: newName });
      router.refresh();
      setEditingName(false);
    } catch {
      setNameError("Failed to save. Please try again.");
    } finally {
      setSavingName(false);
    }
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
      <PopoverContent align="end" className="w-64 bg-slate-900 border-slate-700 text-white p-4">
        <div className="flex flex-col gap-3">
          {editingName ? (
            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400 font-medium">Preferred first name</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") cancelEditingName();
                }}
                className="w-full rounded-md bg-slate-800 border border-slate-600 text-white text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                autoFocus
              />
              {nameError && <p className="text-xs text-red-400">{nameError}</p>}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="flex-1 h-7 text-xs bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  {savingName ? "Saving…" : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancelEditingName}
                  className="flex-1 h-7 text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-sm font-semibold truncate">{session.user.name}</p>
                <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
              </div>
              <button
                onClick={startEditingName}
                title="Edit preferred name"
                className="shrink-0 mt-0.5 text-slate-500 hover:text-slate-200 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                </svg>
              </button>
            </div>
          )}

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
