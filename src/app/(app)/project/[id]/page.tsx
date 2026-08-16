import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectWorkspace } from "@/components/ProjectWorkspace";
import type { Project, Section } from "@/types/db";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: sections }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase.from("sections").select("*").eq("project_id", id).order("order_index"),
  ]);

  if (!project) notFound();

  return (
    <ProjectWorkspace
      initialProject={project as Project}
      initialSections={(sections ?? []) as Section[]}
    />
  );
}
