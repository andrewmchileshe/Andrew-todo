import Link from "next/link";
import Logo from "./Logo";
import { company } from "@/data/company";

const quickLinks = [
  { href: "/products", label: "Products" },
  { href: "/brands", label: "Brands" },
  { href: "/industries", label: "Industries" },
  { href: "/about", label: "About Us" },
  { href: "/rfq", label: "Request a Quote" },
];

const legalLinks = [
  { href: "/legal/terms", label: "Terms & Conditions of Sale" },
  { href: "/legal/trademark-disclaimer", label: "Trademark Disclaimer" },
  { href: "/legal/listing-disclaimer", label: "Product Listing Disclaimer" },
];

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "var(--color-navy-dark)" }} className="mt-auto text-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo variant="inverted" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            {company.positioning} Sister company to {company.sisterCompany}, founder-led and
            based in Lusaka, Zambia, with nationwide coverage and cross-border capability.
          </p>
          <div className="mt-5 flex gap-4">
            <a
              href={company.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-[var(--color-green)]"
              aria-label="Labmall Scientific on Facebook"
            >
              Facebook
            </a>
            <a
              href={company.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-[var(--color-green)]"
              aria-label="Labmall Scientific on LinkedIn"
            >
              LinkedIn
            </a>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Quick Links</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            {quickLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-[var(--color-green)]">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Contact</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li>
              <a href={`mailto:${company.email}`} className="hover:text-[var(--color-green)]">
                {company.email}
              </a>
            </li>
            <li>{company.whatsapp} (WhatsApp)</li>
            <li>{company.address}</li>
            <li>{company.businessHours}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-white/50 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {company.name}. PACRA-registered, Republic of Zambia. All
            rights reserved.
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {legalLinks.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-white">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
