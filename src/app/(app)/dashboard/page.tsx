import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import type { Project } from "@/types/db";

const STATUS_LABEL: Record<Project["status"], string> = {
  draft: "Draft",
  skeleton_ready: "Outline ready",
  generating: "Writing…",
  ready: "Ready to export",
  exported: "Exported",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <EyebrowLabel>Dashboard</EyebrowLabel>
          <h1 className="font-display text-3xl font-medium text-app-ink">Your products</h1>
        </div>
        <Link
          href="/new"
          className="flex items-center gap-2 rounded-full bg-app-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-app-accent-hover"
        >
          <Plus className="h-4 w-4" /> New product
        </Link>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-app-border bg-app-surface p-16 text-center text-app-muted">
          <FileText className="mx-auto mb-3 h-8 w-8 text-app-border" />
          <p>No products yet. Create your first one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(projects as Project[]).map((p) => (
            <Link
              key={p.id}
              href={`/project/${p.id}`}
              className="rounded-2xl border border-app-border bg-app-surface p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-app-accent/40 hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-app-surface-hover px-2.5 py-1 text-xs font-medium text-app-muted">
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
              <h2 className="font-display text-lg font-medium text-app-ink">{p.product_name}</h2>
              <p className="mt-1 text-sm text-app-muted">{p.niche}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
