import { Compass, PenTool, TrendingUp, Zap } from "lucide-react";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { ChoiceCard } from "@/components/ui/ChoiceCard";
import type { EntryPath } from "@/types/db";

export function PathSelector({ onSelect }: { onSelect: (path: EntryPath) => void }) {
  return (
    <div className="mx-auto max-w-4xl">
      <EyebrowLabel tone="accent">New product</EyebrowLabel>
      <h1 className="mb-2 mt-2 font-display text-4xl font-medium leading-tight text-app-ink">
        What do you want to <em className="italic text-app-accent">create?</em>
      </h1>
      <p className="mb-8 text-sm text-app-muted">
        Pick where you&apos;re starting from. All four end up in the same place.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ChoiceCard
          icon={Compass}
          title="Find it for me"
          quote="I don't know what to make yet"
          description="Answer a few questions about yourself and we'll recommend product ideas worth building."
          color="blue"
          onClick={() => onSelect("discover")}
        />
        <ChoiceCard
          icon={PenTool}
          title="Build my idea"
          quote="I have a rough idea"
          description="Tell us what you're thinking and we'll help shape it into a real, sellable product."
          color="mint"
          onClick={() => onSelect("build")}
        />
        <ChoiceCard
          icon={Zap}
          title="Fast track"
          quote="I know exactly what I'm making"
          description="Move quickly: give us the details and go straight into planning."
          color="coral"
          onClick={() => onSelect("fast_track")}
        />
        <ChoiceCard
          icon={TrendingUp}
          title="Surprise me"
          quote="I don't need it to be about me"
          description="We'll scan what's trending right now and package the best pain point we find into a sellable product."
          color="sand"
          onClick={() => onSelect("trending")}
        />
      </div>
    </div>
  );
}
