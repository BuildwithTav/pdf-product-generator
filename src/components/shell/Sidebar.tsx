"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Menu, Plus, Sparkles, BrainCircuit, X } from "lucide-react";
import { useSteps } from "@/components/shell/StepsContext";
import type { Project } from "@/types/db";

export function Sidebar() {
  const pathname = usePathname();
  const [projects, setProjects] = useState<Project[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const steps = useSteps();

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data.projects ?? []))
      .catch(() => {});
  }, [pathname]);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
  }

  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-app-border bg-app-surface px-4 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-1.5 text-app-ink hover:bg-app-surface-hover"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Sparkles className="h-4 w-4 text-app-accent" />
        <span className="font-display text-sm font-medium text-app-ink">PDF Generator</span>
      </div>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-app-border bg-app-surface transition-transform duration-200 ease-out md:static md:z-auto md:h-screen md:w-64 md:max-w-none md:translate-x-0 md:transition-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <Sparkles className="h-5 w-5 text-app-accent" />
          <span className="font-display text-base font-medium text-app-ink">PDF Generator</span>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="ml-auto rounded-lg p-1 text-app-muted hover:bg-app-surface-hover md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3">
          <Link
            href="/new"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center gap-2 rounded-full bg-app-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-app-accent-hover"
          >
            <Plus className="h-4 w-4" /> New product
          </Link>
        </div>

        <nav className="mt-6 flex-1 overflow-y-auto px-3">
          <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-widest text-app-muted">
            Your products
          </div>
          <ul className="space-y-0.5">
            {projects.map((p) => {
              const isActive = pathname === `/project/${p.id}`;
              const showSteps = isActive && steps.projectId === p.id && steps.steps.length > 0;
              return (
                <li key={p.id}>
                  <Link
                    href={`/project/${p.id}`}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${
                      isActive
                        ? "bg-app-accent-soft font-medium text-app-accent"
                        : "text-app-ink hover:bg-app-surface-hover"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{p.product_name}</span>
                  </Link>
                  {showSteps && (
                    <ul className="ml-5 mt-0.5 space-y-0.5 border-l border-app-border pl-3">
                      {steps.steps.map((s) => (
                        <li key={s.value}>
                          <button
                            onClick={() => {
                              steps.setStep(s.value);
                              setMobileOpen(false);
                            }}
                            className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition ${
                              steps.activeStep === s.value
                                ? "font-medium text-app-accent"
                                : "text-app-muted hover:text-app-ink"
                            }`}
                          >
                            {s.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            {projects.length === 0 && (
              <li className="px-2 py-2 text-xs text-app-muted">No products yet.</li>
            )}
          </ul>
        </nav>

        <div className="border-t border-app-border p-3">
          <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-app-muted opacity-60">
            <BrainCircuit className="h-3.5 w-3.5" />
            <span>Brain</span>
            <span className="ml-auto rounded-full bg-app-surface-hover px-2 py-0.5 text-[10px] font-medium">
              Soon
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
