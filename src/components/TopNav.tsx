"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function TopNav({ email }: { email?: string }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
      <Link href="/dashboard" className="flex items-center gap-2 text-neutral-900">
        <Sparkles className="h-5 w-5" />
        <span className="font-semibold">PDF Product Generator</span>
      </Link>
      <div className="flex items-center gap-4 text-sm text-neutral-500">
        {email && <span>{email}</span>}
        <button onClick={signOut} className="flex items-center gap-1 hover:text-neutral-900">
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </header>
  );
}
