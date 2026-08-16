import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "coral" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-app-accent text-white hover:bg-app-accent-hover shadow-sm shadow-app-accent/20",
  secondary:
    "bg-app-surface text-app-ink border border-app-border hover:border-app-accent hover:text-app-accent",
  coral: "bg-app-coral text-white hover:brightness-95 shadow-sm shadow-app-coral/20",
  ghost: "bg-transparent text-app-muted hover:text-app-ink hover:bg-app-surface-hover",
};

export function Button({
  variant = "primary",
  icon,
  trailingIcon,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
      {trailingIcon}
    </button>
  );
}
