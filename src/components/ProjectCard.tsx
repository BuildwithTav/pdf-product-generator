"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { Project } from "@/types/db";

const STATUS_LABEL: Record<Project["status"], string> = {
  idea: "Idea",
  blueprint: "Blueprint",
  writing: "Writing…",
  ready_to_design: "Ready to design",
  complete: "Complete",
};

export function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${project.product_name}"? This can't be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  return (
    <Link
      href={`/project/${project.id}`}
      className="group relative rounded-2xl border border-app-border bg-app-surface p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-app-accent/40 hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-app-surface-hover px-2.5 py-1 text-xs font-medium text-app-muted">
          {STATUS_LABEL[project.status]}
        </span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-md p-2 text-app-muted opacity-60 transition hover:bg-app-coral-soft hover:text-app-coral hover:opacity-100 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <h2 className="font-display text-lg font-medium text-app-ink">{project.product_name}</h2>
      <p className="mt-1 text-sm text-app-muted">{project.niche}</p>
    </Link>
  );
}
