const paths: Record<string, string> = {
  "mining-mineral-processing": "M3 20h18M5 20V10l4-4 4 4v10M13 20v-6l4-3 4 3v6",
  "water-treatment": "M12 3c3 4 6 7.5 6 11a6 6 0 1 1-12 0c0-3.5 3-7 6-11z",
  academia: "M12 3l10 5-10 5L2 8l10-5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5",
  manufacturing: "M3 21V10l5 3V10l5 3V10l5 3v8H3zM3 21h18",
  agriculture: "M12 21c4-1 7-4.5 7-9a7 7 0 0 0-14 0c0 4.5 3 8 7 9zM12 12v9",
  "medical-clinical": "M9 3h6v4h4v6h-4v4H9v-4H5V7h4V3z",
  environmental: "M12 2a7 7 0 0 1 7 7c0 4-3 6-7 13-4-7-7-9-7-13a7 7 0 0 1 7-7zM12 6v6",
};

export default function IndustryIcon({ slug, className = "h-6 w-6" }: { slug: string; className?: string }) {
  const d = paths[slug] ?? paths["academia"];
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} aria-hidden="true">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
