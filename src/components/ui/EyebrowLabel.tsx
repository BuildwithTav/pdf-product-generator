export function EyebrowLabel({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "accent" | "light";
}) {
  const toneClass =
    tone === "accent" ? "text-app-accent" : tone === "light" ? "text-white/70" : "text-app-muted";
  return (
    <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${toneClass}`}>
      {children}
    </span>
  );
}
