import { NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/api-helpers";
import { buildDocumentHtml, type RenderableProject } from "@/lib/pdf/template";
import { renderHtmlToPdf } from "@/lib/pdf/generate";

export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const [{ data: project, error: projectError }, { data: sections, error: sectionsError }] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("sections").select("*").eq("project_id", id).order("order_index"),
    ]);

  if (projectError || !project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (sectionsError) return errorResponse(sectionsError);

  if (!project.design_brief) {
    return NextResponse.json(
      { error: "Generate a design brief before exporting." },
      { status: 400 }
    );
  }

  const generatedSections = sections.filter((s) => s.content);
  if (generatedSections.length === 0) {
    return NextResponse.json(
      { error: "Generate at least one section's content before exporting." },
      { status: 400 }
    );
  }

  try {
    const html = buildDocumentHtml(project as RenderableProject, generatedSections);
    const pdfBuffer = await renderHtmlToPdf(html);

    const path = `${user.id}/${id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("generated-pdfs")
      .upload(path, pdfBuffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) return errorResponse(uploadError);

    const { data: signed, error: signError } = await supabase.storage
      .from("generated-pdfs")
      .createSignedUrl(path, 60 * 60);

    if (signError || !signed) return errorResponse(signError);

    await supabase.from("projects").update({ status: "complete" }).eq("id", id);

    return NextResponse.json({ url: signed.signedUrl });
  } catch (err) {
    return errorResponse(err, "Failed to generate PDF.");
  }
}
