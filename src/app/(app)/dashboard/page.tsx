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
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <EyebrowLabel>Dashboard</EyebrowLabel>
          <h1 className="font-display text-2xl font-medium text-app-ink sm:text-3xl">Your products</h1>
        </div>
        <Link
          href="/new"
          className="flex w-fit items-center gap-2 rounded-full bg-app-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-app-accent-hover"
        >
          <Plus className="h-4 w-4" /> New product
        </Link>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-app-border bg-app-surface p-10 text-center text-app-muted sm:p-16">
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
