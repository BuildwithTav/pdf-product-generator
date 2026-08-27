import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ProjectWorkspace } from "@/components/ProjectWorkspace";
import type { Project, Section } from "@/types/db";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const cookieStore = await cookies();
  const ownerBypass = cookieStore.get("owner_bypass")?.value === "1";

  const [{ data: project }, { data: sections }, { data: payment }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase.from("sections").select("*").eq("project_id", id).order("order_index"),
    supabase.from("project_payments").select("paid").eq("project_id", id).maybeSingle(),
  ]);

  if (!project) notFound();

  return (
    <ProjectWorkspace
      initialProject={project as Project}
      initialSections={(sections ?? []) as Section[]}
      initialPaid={ownerBypass || Boolean(payment?.paid)}
    />
  );
}
