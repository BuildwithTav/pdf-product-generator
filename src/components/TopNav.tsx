import Link from "next/link";
import { Sparkles } from "lucide-react";

export function TopNav() {
  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
      <Link href="/dashboard" className="flex items-center gap-2 text-neutral-900">
        <Sparkles className="h-5 w-5" />
        <span className="font-semibold">PDF Product Generator</span>
      </Link>
    </header>
  );
}
