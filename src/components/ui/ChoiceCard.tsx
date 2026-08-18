import type { LucideIcon } from "lucide-react";

export type ChoiceColor = "blue" | "coral" | "mint" | "sand";

const COLOR_CLASSES: Record<ChoiceColor, { bg: string; icon: string; ring: string }> = {
  blue: { bg: "bg-app-accent-soft", icon: "text-app-accent", ring: "ring-app-accent" },
  coral: { bg: "bg-app-coral-soft", icon: "text-app-coral", ring: "ring-app-coral" },
  mint: { bg: "bg-app-mint-soft", icon: "text-app-mint", ring: "ring-app-mint" },
  sand: { bg: "bg-app-sand-soft", icon: "text-app-sand", ring: "ring-app-sand" },
};

interface ChoiceCardProps {
  icon: LucideIcon;
  title: string;
  quote?: string;
  description: string;
  color: ChoiceColor;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function ChoiceCard({
  icon: Icon,
  title,
  quote,
  description,
  color,
  selected = false,
  disabled = false,
  onClick,
}: ChoiceCardProps) {
  const c = COLOR_CLASSES[color];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group relative flex flex-col gap-2 rounded-2xl border p-5 text-left transition-all duration-150 ${
        disabled
          ? "cursor-not-allowed border-app-border bg-white opacity-50"
          : selected
            ? `border-transparent bg-white ring-2 ${c.ring} shadow-md`
            : "border-app-border bg-white hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bg} transition-transform duration-150 group-hover:scale-105`}
      >
        <Icon className={`h-5 w-5 ${c.icon}`} />
      </div>
      <h3 className="font-display text-lg font-medium text-app-ink">{title}</h3>
      {quote && <p className={`text-sm italic ${c.icon}`}>&ldquo;{quote}&rdquo;</p>}
      <p className="text-sm leading-relaxed text-app-muted">{description}</p>
      <span
        className={`absolute right-4 top-4 h-4 w-4 rounded-full border-2 transition-colors ${
          selected ? `${c.ring.replace("ring-", "border-")} bg-current ${c.icon}` : "border-app-border"
        }`}
      />
    </button>
  );
}
