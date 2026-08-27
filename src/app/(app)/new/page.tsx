"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PathSelector } from "@/components/discovery/PathSelector";
import { DiscoveryForm, type DiscoveryAnswers } from "@/components/discovery/DiscoveryForm";
import { ResearchProgress } from "@/components/discovery/ResearchProgress";
import { TrendingTopicPicker } from "@/components/discovery/TrendingTopicPicker";
import { OpportunityCard } from "@/components/discovery/OpportunityCard";
import { FastTrackWizard, type FastTrackAnswers } from "@/components/discovery/FastTrackWizard";
import { BlueprintEditor, type BlueprintDraft } from "@/components/discovery/BlueprintEditor";
import { streamResearch, streamTrendingTopics, type ResearchPayload } from "@/lib/research-client";
import type { BusinessProfile, EntryPath, Project } from "@/types/db";
import type { ProductIdea, ResearchResult, TrendingTopic } from "@/lib/prompts";

type Stage =
  | "path"
  | "fast_track"
  | "discovery"
  | "trend_scan"
  | "trend_pick"
  | "researching"
  | "opportunity"
  | "blueprint";

interface IdeasPayload extends ResearchPayload {
  openEnded?: boolean;
  openEndedTopic?: string;
  skipProfileSave?: boolean;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("path");
  const [discoveryMode, setDiscoveryMode] = useState<"discover" | "build">("discover");
  const [activePath, setActivePath] = useState<EntryPath>("discover");
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [researchStatuses, setResearchStatuses] = useState<string[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [lastIdeasPayload, setLastIdeasPayload] = useState<IdeasPayload | null>(null);
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
    setActivePath(path);
    if (path === "fast_track") {
      setStage("fast_track");
      return;
    }
    if (path === "trending") {
      await startTrendScan();
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

  async function runResearchAndIdeas(payload: IdeasPayload) {
    setSubmitting(true);
    setError("");
    setLastIdeasPayload(payload);
    setResearchStatuses([]);
    setStage("researching");

    let researchFindings: ResearchResult | undefined;
    try {
      researchFindings = await streamResearch(payload, (line) =>
        setResearchStatuses((prev) => [...prev, line])
      );
    } catch {
      // Research failing entirely is non-fatal — fall back to ungrounded
      // idea generation rather than blocking the user.
      setResearchStatuses((prev) => [
        ...prev,
        "Research unavailable, generating ideas from your background instead...",
      ]);
    }

    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, researchFindings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIdeas(data.ideas);
      setIdeasVersion((v) => v + 1);
      setStage("opportunity");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate ideas.");
      setStage(payload.openEnded ? "path" : "discovery");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitDiscovery(answers: DiscoveryAnswers) {
    await runResearchAndIdeas({
      background: answers.background || answers.roughIdea,
      audienceHint: answers.audienceHint || undefined,
      interests: answers.interests || undefined,
      roughIdea: discoveryMode === "build" ? answers.roughIdea : undefined,
    });
  }

  async function startTrendScan() {
    setError("");
    setResearchStatuses([]);
    setStage("trend_scan");
    try {
      const topics = await streamTrendingTopics((line) => setResearchStatuses((prev) => [...prev, line]));
      if (!topics || topics.length === 0) throw new Error("Failed to find trending topics.");
      setTrendingTopics(topics);
      setStage("trend_pick");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan trending topics.");
      setStage("path");
    }
  }

  async function generateIdeasForTopic(topic: TrendingTopic) {
    setSubmitting(true);
    setError("");
    const payload: IdeasPayload = {
      background: "N/A",
      openEnded: true,
      openEndedTopic: `${topic.title}: ${topic.description} (${topic.whyTrending})`,
      skipProfileSave: true,
    };
    setLastIdeasPayload(payload);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIdeas(data.ideas);
      setIdeasVersion((v) => v + 1);
      setStage("opportunity");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate ideas.");
      // Stay on trend_pick — the 5 topics and scroll position aren't lost.
    } finally {
      setSubmitting(false);
    }
  }

  async function adjustIdeas(note: string) {
    if (!lastIdeasPayload) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lastIdeasPayload, adjustmentNote: note }),
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

      // Outline generation now happens from the project workspace itself
      // (OutlineEditor's "Generate outline" button), behind the paywall —
      // this just hands off to that page once the blueprint is approved.
      router.push(`/project/${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to build the outline.");
      setApproving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 sm:py-12">
      <div className="w-full">
        {stage === "path" && <PathSelector onSelect={selectPath} error={error} />}

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

        {stage === "trend_scan" && <ResearchProgress statuses={researchStatuses} openEnded />}

        {stage === "trend_pick" && (
          <TrendingTopicPicker
            topics={trendingTopics}
            submitting={submitting}
            onSelect={generateIdeasForTopic}
            onBack={() => setStage("path")}
          />
        )}

        {stage === "researching" && (
          <ResearchProgress statuses={researchStatuses} openEnded={activePath === "trending"} />
        )}

        {stage === "opportunity" && ideas.length > 0 && (
          <OpportunityCard
            key={ideasVersion}
            ideas={ideas}
            submitting={submitting}
            error={error}
            onBack={() =>
              setStage(activePath === "trending" ? (trendingTopics.length ? "trend_pick" : "path") : "discovery")
            }
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
                path: activePath,
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
