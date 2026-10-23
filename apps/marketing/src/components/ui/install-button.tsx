import { ArrowRight } from "lucide-react";
import { appStore } from "@/config/site";
import { cn } from "@/lib/utils";

export function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-5 shrink-0", className)}
      aria-hidden="true"
    >
      <path
        d="M3.609 1.814L13.792 12 3.61 22.186a2.023 2.023 0 0 1-.61-1.464V3.278c0-.573.226-1.09.609-1.464z"
        fill="#00E676"
      />
      <path
        d="M17.067 8.723L5.253 1.587l9.592 9.36 2.222-2.224z"
        fill="#FFD600"
      />
      <path
        d="M3.61 22.186l13.457-7.755-2.222-2.224L3.61 22.186z"
        fill="#00B0FF"
      />
      <path
        d="M19.488 10.119l-2.421-1.396-2.222 2.224 2.222 2.224 2.421-1.396c.725-.418.725-1.238 0-1.656z"
        fill="#FF3D00"
      />
    </svg>
  );
}

export function InstallButton({
  variant = "play",
  size = "md",
  className,
  showArrow = false,
}: {
  variant?: "play" | "brand" | "elevated" | "dark" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  showArrow?: boolean;
}) {
  const sizeClasses = {
    sm: "px-4 py-2.5 text-xs min-h-11",
    md: "px-5 py-3 text-sm min-h-13",
    lg: "px-5 py-3 text-base min-h-14",
  }[size];

  return (
    <a
      href={appStore.android}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group relative inline-flex items-center justify-between gap-3.5 rounded-2xl font-semibold transition-all duration-200 select-none shadow-soft hover:shadow-float active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2",
        // Official Google Play Store Green (#01875F)
        variant === "play" &&
          "bg-[#01875F] text-white shadow-lift hover:bg-[#00704E] hover:shadow-float hover:-translate-y-0.5 focus-visible:outline-[#01875F]",
        // Vibrant brand gradient
        variant === "brand" &&
          "bg-gradient-to-r from-brand via-[#FF4D6D] to-brand-ink text-white shadow-lift hover:shadow-float hover:-translate-y-0.5 focus-visible:outline-brand",
        // Crisp elevated card matching the Apple Store card
        variant === "elevated" &&
          "border border-border/80 bg-card text-ink hover:border-[#01875F]/60 hover:bg-white shadow-soft hover:shadow-lift hover:-translate-y-0.5 focus-visible:outline-[#01875F]",
        // Subtle outline
        variant === "outline" &&
          "border border-border bg-card/60 text-ink hover:bg-accent hover:border-brand/30",
        // Dark version
        variant === "dark" &&
          "bg-ink text-white hover:bg-ink/90 border border-white/10",
        sizeClasses,
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {/* White pill backing ensures Google Play colors pop */}
        <div
          className={cn(
            "grid size-9 place-items-center rounded-xl shadow-xs transition-transform duration-200 group-hover:scale-105",
            variant === "play" || variant === "brand" ? "bg-white" : "bg-[#01875F]/10",
          )}
        >
          <GooglePlayIcon className="size-5" />
        </div>

        <span
          className={cn(
            "text-sm font-bold tracking-tight sm:text-base whitespace-nowrap",
            variant === "play" || variant === "brand" ? "text-white" : "text-ink",
          )}
        >
          Google Play
        </span>
      </div>

      {showArrow && (
        <ArrowRight
          className={cn(
            "size-4 transition-transform duration-200 group-hover:translate-x-1",
            variant === "play" || variant === "brand" ? "text-white/80" : "text-ink-soft",
          )}
          aria-hidden="true"
        />
      )}
    </a>
  );
}
