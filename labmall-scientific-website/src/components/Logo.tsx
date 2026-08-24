interface LogoProps {
  variant?: "default" | "inverted";
  className?: string;
}

/**
 * Placeholder wordmark styled after the real Labmall Scientific logo
 * (navy "LABMALL" + green "SCIENTIFIC" + DNA helix / leaf mark).
 * Swap for the real fulllogo_transparent.png once the asset file is
 * uploaded to /public/logo/.
 */
export default function Logo({ variant = "default", className = "" }: LogoProps) {
  const navy = variant === "inverted" ? "#ffffff" : "#204080";
  const green = "#60b050";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
        <path
          d="M11 4c3 2 3 5 0 7s-3 5 0 7 3 5 0 7"
          stroke={green}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M18 4c-3 2-3 5 0 7s3 5 0 7-3 5 0 7"
          stroke={navy}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M11.5 7h7M11.5 11h7M11.5 18h7M11.5 22h7" stroke={navy} strokeWidth="1.4" opacity="0.55" />
        <circle cx="27" cy="24" r="2" fill={green} />
        <circle cx="30" cy="19" r="1.2" fill={navy} />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="font-bold tracking-wide text-[1.05rem]" style={{ color: navy }}>
          LABMALL
        </span>
        <span
          className="font-medium tracking-[0.2em] text-[0.6rem]"
          style={{ color: green }}
        >
          SCIENTIFIC
        </span>
      </span>
    </span>
  );
}
