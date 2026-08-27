import { NextResponse } from "next/server";
import { requireUser, requirePaidProject, errorResponse } from "@/lib/api-helpers";
import { buildMarkdownExport } from "@/lib/markdown";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const paidCheck = await requirePaidProject(supabase, id);
  if (!paidCheck.ok) return paidCheck.response;

  const [{ data: project, error: projectError }, { data: sections, error: sectionsError }] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("sections").select("*").eq("project_id", id).order("order_index"),
    ]);

  if (projectError || !project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (sectionsError) return errorResponse(sectionsError);

  const markdown = buildMarkdownExport(project, sections);
  const filename = `${project.product_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`;

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
