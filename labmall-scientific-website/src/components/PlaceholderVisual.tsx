interface PlaceholderVisualProps {
  label: string;
  className?: string;
  dark?: boolean;
}

/**
 * Marks a spot reserved for Higgsfield-generated photography.
 * Replace with a real <Image> once assets are generated and added to /public.
 */
export default function PlaceholderVisual({ label, className = "", dark = false }: PlaceholderVisualProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl border-2 border-dashed text-center ${
        dark ? "border-white/25 bg-white/5 text-white/60" : "border-[var(--color-navy)]/20 bg-[var(--color-grey-light)] text-[var(--color-grey-mid)]"
      } ${className}`}
    >
      <div className="p-6">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="mx-auto mb-2 opacity-60"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <p className="text-xs font-medium">{label}</p>
        <p className="mt-1 text-[0.65rem] uppercase tracking-wide opacity-70">
          Visual pending — Higgsfield generation
        </p>
      </div>
    </div>
  );
}
