"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";

export function ResearchProgress({ statuses }: { statuses: string[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [statuses.length]);

  return (
    <div className="mx-auto max-w-xl">
      <EyebrowLabel tone="accent">Researching your niche</EyebrowLabel>
      <h1 className="mb-2 mt-2 font-display text-3xl font-medium leading-tight text-app-ink">
        Looking for <em className="italic text-app-accent">real pain points...</em>
      </h1>
      <p className="mb-6 text-sm text-app-muted">
        We&apos;re searching Reddit, Quora, and forums for how people actually talk about this, so
        your ideas are grounded in real language, not guesses.
      </p>

      <div className="rounded-2xl border border-app-border bg-app-surface p-8">
        <ul className="space-y-3">
          {statuses.length === 0 && (
            <li className="flex items-center gap-3 text-sm text-app-muted">
              <Search className="h-4 w-4 shrink-0 animate-pulse text-app-accent" />
              Starting research...
            </li>
          )}
          {statuses.map((line, i) => (
            <li
              key={i}
              className="research-line flex items-start gap-3 text-sm text-app-ink"
              style={{ opacity: i === statuses.length - 1 ? 1 : 0.55 }}
            >
              <Search className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <div ref={bottomRef} />
      </div>

      <style jsx global>{`
        @keyframes research-line-in {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            transform: translateY(0);
          }
        }
        .research-line {
          animation: research-line-in 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
