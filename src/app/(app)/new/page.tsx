"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PathSelector } from "@/components/discovery/PathSelector";
import { DiscoveryForm, type DiscoveryAnswers } from "@/components/discovery/DiscoveryForm";
import { OpportunityCard } from "@/components/discovery/OpportunityCard";
import { FastTrackWizard, type FastTrackAnswers } from "@/components/discovery/FastTrackWizard";
import { BlueprintEditor, type BlueprintDraft } from "@/components/discovery/BlueprintEditor";
import type { BusinessProfile, EntryPath, Project } from "@/types/db";
import type { ProductIdea } from "@/lib/prompts";

type Stage = "path" | "fast_track" | "discovery" | "opportunity" | "blueprint";

export default function NewProjectPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("path");
  const [discoveryMode, setDiscoveryMode] = useState<"discover" | "build">("discover");
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [discoveryAnswers, setDiscoveryAnswers] = useState<DiscoveryAnswers | null>(null);
  const [ideas, setIdeas] = useState<ProductIdea[]>([]);
  const [ideasVersion, setIdeasVersion] = useState(0);

  const [projectId, setProjectId] = useState<string | null>(null);
  const [blueprintDraft, setBlueprintDraft] = useState<BlueprintDraft | null>(null);
  const [recommendedLength, setRecommendedLength] = useState("");
  const [contentsPreview, setContentsPreview] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");

  async function selectPath(path: EntryPath) {
    setError("");
    if (path === "fast_track") {
      setStage("fast_track");
      return;
    }
    setDiscoveryMode(path);
    setStage("discovery");
    try {
      const res = await fetch("/api/business-profile");
      const data = await res.json();
      if (res.ok) setBusinessProfile(data.profile);
    } catch {
      // Pre-fill is a nicety, not required — ignore failures.
    }
  }

  async function submitDiscovery(answers: DiscoveryAnswers) {
    setSubmitting(true);
    setError("");
    setDiscoveryAnswers(answers);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          background: answers.background || answers.roughIdea,
          audienceHint: answers.audienceHint || undefined,
          interests: answers.interests || undefined,
          roughIdea: discoveryMode === "build" ? answers.roughIdea : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIdeas(data.ideas);
      setIdeasVersion((v) => v + 1);
      setStage("opportunity");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate ideas.");
    } finally {
      setSubmitting(false);
    }
  }

  async function adjustIdeas(note: string) {
    if (!discoveryAnswers) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          background: discoveryAnswers.background || discoveryAnswers.roughIdea,
          audienceHint: discoveryAnswers.audienceHint || undefined,
          interests: discoveryAnswers.interests || undefined,
          roughIdea: discoveryMode === "build" ? discoveryAnswers.roughIdea : undefined,
          adjustmentNote: note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIdeas(data.ideas);
      setIdeasVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to adjust ideas.");
    } finally {
      setSubmitting(false);
    }
  }

  async function createProjectAndBlueprint(payload: {
    productName: string;
    niche: string;
    audience: string;
    corePromise: string;
    problem?: string;
    transformation?: string;
    format?: string;
    toneReference?: string;
    chapterCountRequested?: number;
    path: EntryPath;
  }) {
    setSubmitting(true);
    setError("");
    try {
      const createRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error);
      const project: Project = createData.project;

      const blueprintRes = await fetch(`/api/projects/${project.id}/blueprint`, { method: "POST" });
      const blueprintData = await blueprintRes.json();
      if (!blueprintRes.ok) throw new Error(blueprintData.error);

      applyBlueprintResponse(project.id, blueprintData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to build the blueprint.");
    } finally {
      setSubmitting(false);
    }
  }

  function applyBlueprintResponse(
    id: string,
    data: { project: Project; recommendedLength: string; contentsPreview: string[] }
  ) {
    setProjectId(id);
    setBlueprintDraft({
      productName: data.project.product_name,
      subtitle: data.project.subtitle ?? "",
      audience: data.project.audience,
      problem: data.project.problem ?? "",
      corePromise: data.project.core_promise,
      transformation: data.project.transformation ?? "",
      format: data.project.format ?? "guide",
      toneReference: data.project.tone_reference ?? "",
      purpose: data.project.purpose ?? "",
      ctaNextStep: data.project.cta_next_step ?? "",
    });
    setRecommendedLength(data.recommendedLength);
    setContentsPreview(data.contentsPreview);
    setStage("blueprint");
  }

  async function handleImprove() {
    if (!projectId) return;
    setRegenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/blueprint`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      applyBlueprintResponse(projectId, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to improve the blueprint.");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleApprove() {
    if (!projectId || !blueprintDraft) return;
    setApproving(true);
    setError("");
    try {
      const patchRes = await fetch(`/api/projects/${projectId}/blueprint`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...blueprintDraft, blueprintApproved: true }),
      });
      if (!patchRes.ok) throw new Error((await patchRes.json()).error);

      const skeletonRes = await fetch(`/api/projects/${projectId}/skeleton`, { method: "POST" });
      if (!skeletonRes.ok) throw new Error((await skeletonRes.json()).error);

      router.push(`/project/${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to build the outline.");
      setApproving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 sm:py-12">
      <div className="w-full">
        {stage === "path" && <PathSelector onSelect={selectPath} />}

        {stage === "fast_track" && (
          <FastTrackWizard
            submitting={submitting}
            error={error}
            onBack={() => setStage("path")}
            onComplete={(answers: FastTrackAnswers) =>
              createProjectAndBlueprint({
                productName: answers.productName,
                niche: answers.niche,
                audience: answers.audience,
                corePromise: answers.corePromise,
                toneReference: answers.toneReference || undefined,
                chapterCountRequested: answers.chapterCountRequested
                  ? Number(answers.chapterCountRequested)
                  : undefined,
                path: "fast_track",
              })
            }
          />
        )}

        {stage === "discovery" && (
          <DiscoveryForm
            mode={discoveryMode}
            initialProfile={businessProfile}
            submitting={submitting}
            error={error}
            onBack={() => setStage("path")}
            onSubmit={submitDiscovery}
          />
        )}

        {stage === "opportunity" && ideas.length > 0 && (
          <OpportunityCard
            key={ideasVersion}
            ideas={ideas}
            submitting={submitting}
            error={error}
            onBack={() => setStage("discovery")}
            onAdjust={adjustIdeas}
            onBuild={(idea: ProductIdea) =>
              createProjectAndBlueprint({
                productName: idea.productName,
                niche: idea.niche,
                audience: idea.audience,
                corePromise: idea.corePromise,
                problem: idea.problem,
                transformation: idea.transformation,
                format: idea.format,
                path: discoveryMode,
              })
            }
          />
        )}

        {stage === "blueprint" && blueprintDraft && (
          <BlueprintEditor
            draft={blueprintDraft}
            recommendedLength={recommendedLength}
            contentsPreview={contentsPreview}
            regenerating={regenerating}
            approving={approving}
            error={error}
            onChange={setBlueprintDraft}
            onImprove={handleImprove}
            onApprove={handleApprove}
          />
        )}
      </div>
    </div>
  );
}
