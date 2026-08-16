import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { ProjectCard } from "@/components/ProjectCard";
import type { Project } from "@/types/db";

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
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
