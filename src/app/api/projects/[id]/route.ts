import { NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/api-helpers";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const [{ data: project, error: projectError }, { data: sections, error: sectionsError }] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("sections").select("*").eq("project_id", id).order("order_index"),
    ]);

  if (projectError) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (sectionsError) return errorResponse(sectionsError);

  return NextResponse.json({ project, sections });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const allowed = ["product_name", "subtitle", "author_name", "status", "design_brief"] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const { data, error } = await supabase
    .from("projects")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return errorResponse(error);
  return NextResponse.json({ project: data });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return errorResponse(error);
  return NextResponse.json({ ok: true });
}
