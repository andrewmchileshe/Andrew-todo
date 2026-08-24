import type { Metadata } from "next";
import Link from "next/link";
import WhatsAppButton from "@/components/WhatsAppButton";
import { company } from "@/data/company";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Labmall Scientific — email, WhatsApp, or visit us in Lusaka, Zambia. Request a quote and we'll respond within 24 hours.",
};

const channels = [
  {
    title: "Email",
    value: company.email,
    href: `mailto:${company.email}`,
  },
  {
    title: "WhatsApp",
    value: company.whatsapp,
    href: null,
  },
  {
    title: "Address",
    value: company.address,
    href: null,
  },
  {
    title: "Business Hours",
    value: company.businessHours,
    href: null,
  },
];

export default function ContactPage() {
  return (
    <div className="container-page section-y">
      <div className="max-w-2xl">
        <h1 className="text-4xl">Contact Us</h1>
        <p className="mt-4 text-[var(--color-grey-mid)]">
          Have a question or need a quote fast? Reach us directly, or use the RFQ form for a
          full quote within 24 hours.
        </p>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          {channels.map((c) => (
            <div key={c.title} className="rounded-xl border border-black/5 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-grey-mid)]">
                {c.title}
              </p>
              {c.href ? (
                <a href={c.href} className="mt-1 block text-base font-semibold text-[var(--color-navy)] hover:text-[var(--color-green)]">
                  {c.value}
                </a>
              ) : (
                <p className="mt-1 text-base font-semibold text-[var(--color-navy-dark)]">{c.value}</p>
              )}
            </div>
          ))}

          <div className="flex flex-wrap gap-4 pt-2">
            <WhatsAppButton className="btn-primary" />
            <Link href="/rfq" className="btn-outline-navy">
              Go to RFQ Form
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-black/5 shadow-sm">
          <iframe
            title="Labmall Scientific location — Ibex Hill, Lusaka"
            src="https://www.google.com/maps?q=3536+Main+Street,+Ibex+Hill,+Lusaka,+Zambia&output=embed"
            className="h-96 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </div>
  );
}
