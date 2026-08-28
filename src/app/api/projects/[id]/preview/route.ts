import { NextResponse } from "next/server";
import { requireUser, requirePaidProject, errorResponse } from "@/lib/api-helpers";
import { buildDocumentHtml, type RenderableProject } from "@/lib/pdf/template";

// Renders the exact same HTML the PDF export uses (buildDocumentHtml),
// straight to the browser instead of through Puppeteer — a full-size,
// full-page preview that's guaranteed to match the real export pixel for
// pixel, since it's the same function, not a second hand-maintained
// rendering of the content.
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

  if (!project.design_brief) {
    return NextResponse.json({ error: "Generate a design brief before previewing." }, { status: 400 });
  }

  const generatedSections = sections.filter((s) => s.content);
  if (generatedSections.length === 0) {
    return NextResponse.json(
      { error: "Generate at least one section's content before previewing." },
      { status: 400 }
    );
  }

  const html = buildDocumentHtml(project as RenderableProject, generatedSections);
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
