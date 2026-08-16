import type { LucideIcon } from "lucide-react";
import { BookOpen } from "lucide-react";

export function Callout({
  icon: Icon = BookOpen,
  children,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-app-sand/30 bg-app-sand-soft p-4 text-sm text-app-ink">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-app-sand" />
      <div>{children}</div>
    </div>
  );
}
