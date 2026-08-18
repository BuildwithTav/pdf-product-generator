"use client";

import { ArrowLeft, TrendingUp } from "lucide-react";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { ChoiceCard } from "@/components/ui/ChoiceCard";
import type { TrendCategory, TrendingTopic } from "@/lib/prompts";

const CATEGORY_LABELS: Record<TrendCategory, string> = {
  parenting: "Parenting",
  pets: "Pets",
  finance: "Finance",
  health_fitness: "Health & Fitness",
  relationships: "Relationships",
  career_work: "Career & Work",
  hobbies: "Hobbies",
  home_lifestyle: "Home & Lifestyle",
  technology: "Technology",
};

export function TrendingTopicPicker({
  topics,
  onSelect,
  onBack,
}: {
  topics: TrendingTopic[];
  onSelect: (topic: TrendingTopic) => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <EyebrowLabel tone="accent">Trending this week</EyebrowLabel>
      <h1 className="mb-2 mt-2 font-display text-3xl font-medium leading-tight text-app-ink">
        Pick one to <em className="italic text-app-accent">build around</em>
      </h1>
      <p className="mb-6 text-sm text-app-muted">
        These are the pain points generating the most real discussion this week. Choose one and
        we&apos;ll research it further and pitch you product ideas.
      </p>

      <div className="grid grid-cols-1 gap-3">
        {topics.map((topic, i) => (
          <div key={i}>
            <div className="mb-1.5 ml-1 text-[10px] font-semibold uppercase tracking-wide text-app-muted">
              {CATEGORY_LABELS[topic.category]}
            </div>
            <ChoiceCard
              icon={TrendingUp}
              title={topic.title}
              quote={topic.whyTrending}
              description={topic.description}
              color="sand"
              onClick={() => onSelect(topic)}
            />
          </div>
        ))}
      </div>

      <button
        onClick={onBack}
        className="mt-4 flex items-center gap-1.5 text-sm text-app-muted transition hover:text-app-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
    </div>
  );
}
