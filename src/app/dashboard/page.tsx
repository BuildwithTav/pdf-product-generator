import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <div className="min-h-screen bg-neutral-50">
      <TopNav email={user?.email} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-neutral-900">Your products</h1>
          <Link
            href="/new"
            className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" /> New product
          </Link>
        </div>

        {!projects || projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center text-neutral-500">
            <FileText className="mx-auto mb-3 h-8 w-8 text-neutral-300" />
            <p>No products yet. Create your first one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(projects as Project[]).map((p) => (
              <Link
                key={p.id}
                href={`/project/${p.id}`}
                className="rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-400"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>
                <h2 className="font-semibold text-neutral-900">{p.product_name}</h2>
                <p className="mt-1 text-sm text-neutral-500">{p.niche}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
