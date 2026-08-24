import { whatsappLink } from "@/data/company";

interface WhatsAppButtonProps {
  message?: string;
  className?: string;
  floating?: boolean;
}

export default function WhatsAppButton({
  message = "Hello Labmall Scientific, I'd like to enquire about lab supplies.",
  className = "",
  floating = false,
}: WhatsAppButtonProps) {
  if (floating) {
    return (
      <a
        href={whatsappLink(message)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Labmall Scientific on WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105"
        style={{ backgroundColor: "#25D366" }}
      >
        <WhatsAppIcon className="h-7 w-7 text-white" />
      </a>
    );
  }

  return (
    <a
      href={whatsappLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 font-semibold ${className}`}
    >
      <WhatsAppIcon className="h-5 w-5" style={{ color: "#25D366" }} />
      WhatsApp Us
    </a>
  );
}

function WhatsAppIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.148.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.004 2.003c-5.514 0-9.997 4.483-9.997 9.997 0 1.762.462 3.48 1.34 4.997L2 22l5.117-1.342a9.958 9.958 0 0 0 4.887 1.243h.004c5.514 0 9.997-4.483 9.997-9.997 0-2.67-1.04-5.18-2.928-7.069a9.93 9.93 0 0 0-7.073-2.832zm0 18.174h-.003a8.16 8.16 0 0 1-4.158-1.14l-.298-.177-3.037.797.811-2.96-.194-.304a8.148 8.148 0 0 1-1.25-4.393c0-4.512 3.672-8.184 8.187-8.184a8.132 8.132 0 0 1 5.789 2.399 8.126 8.126 0 0 1 2.396 5.79c0 4.512-3.672 8.172-8.243 8.172z" />
    </svg>
  );
}
