"use client";

import { UserButton } from "@clerk/nextjs";

export default function ClerkHeader() {
  return <UserButton afterSignOutUrl="/" />;
}

