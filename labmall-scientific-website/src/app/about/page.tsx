import type { Metadata } from "next";
import Link from "next/link";
import PlaceholderVisual from "@/components/PlaceholderVisual";
import { company } from "@/data/company";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Labmall Scientific is a founder-led, Zambia-based independent laboratory supplies distributor, sister company to Chemsol Scientific Ltd, serving laboratories across Africa.",
};

const pillars = [
  {
    title: "Genuine products, always",
    body: "We supply only genuine products sourced through lawful commercial channels. We do not sell counterfeit, altered, or misrepresented products.",
  },
  {
    title: "Speed without shortcuts",
    body: "RFQs are quoted within 24 hours. We hold fast-moving consumables in stock and source higher-value equipment on confirmed order.",
  },
  {
    title: "Commercial discipline",
    body: "100% advance payment, no credit trading, no speculative importing. A simple, transparent supply chain with no surprises.",
  },
];

export default function AboutPage() {
  return (
    <div>
      <section style={{ backgroundColor: "var(--color-grey-light)" }} className="section-y">
        <div className="container-page grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="text-4xl">About {company.name}</h1>
            <p className="mt-5 leading-relaxed text-[var(--color-grey-mid)]">
              {company.name} is an independent laboratory supplies distributor serving
              Africa&apos;s research, industrial, mining &amp; mineral processing, water,
              manufacturing, agriculture, and academia laboratories. We specialise in sourcing
              genuine laboratory equipment, consumables, and chemicals from trusted global
              manufacturers and delivering them with speed, transparency, and commercial
              discipline.
            </p>
            <p className="mt-4 leading-relaxed text-[var(--color-grey-mid)]">
              We operate on a request-for-quotation–led model, allowing us to offer
              flexibility, competitive pricing, and tailored solutions while protecting supply
              reliability and cash flow.
            </p>
            <p className="mt-4 leading-relaxed text-[var(--color-grey-mid)]">
              We are not a manufacturer. We are a problem-solving distribution partner focused
              on long-term relationships, fast response times, and dependable delivery.
            </p>
          </div>
          <PlaceholderVisual label="Founder / team in a modern lab setting, or company facility exterior" className="h-80" />
        </div>
      </section>

      <section className="section-y">
        <div className="container-page">
          <div className="grid gap-6 sm:grid-cols-3">
            {pillars.map((p) => (
              <div key={p.title} className="rounded-xl border border-black/5 p-6 shadow-sm">
                <h3 className="text-lg">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-grey-mid)]">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ backgroundColor: "var(--color-navy-dark)" }} className="py-16">
        <div className="container-page grid gap-8 sm:grid-cols-2">
          <div>
            <h2 className="text-2xl text-white">What We Are</h2>
            <ul className="mt-4 space-y-2 text-sm text-white/75">
              <li>An independent laboratory supplies distributor</li>
              <li>A problem-solver for African labs</li>
              <li>RFQ-led, cash-first, speed-driven</li>
              <li>A compliance-first scientific distributor</li>
            </ul>
          </div>
          <div>
            <h2 className="text-2xl text-white">What We Are Not</h2>
            <ul className="mt-4 space-y-2 text-sm text-white/75">
              <li>A passive online catalogue</li>
              <li>A price-only e-commerce shop</li>
              <li>A manufacturer</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section-y">
        <div className="container-page grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl">Sister Company: {company.sisterCompany}</h2>
            <p className="mt-4 leading-relaxed text-[var(--color-grey-mid)]">
              {company.name} shares a founder and startup-phase resources with{" "}
              {company.sisterCompany}. Together, this gives our customers a deeper base of
              scientific and commercial expertise while {company.name} operates as a focused,
              independent distribution business.
            </p>
            <p className="mt-4 leading-relaxed text-[var(--color-grey-mid)]">
              We&apos;re founder-led, based in Lusaka, Zambia, and serve customers nationwide —
              with cross-border capability across the region.
            </p>
            <Link href="/rfq" className="btn-primary mt-6 inline-flex">
              Request a Quote
            </Link>
          </div>
          <PlaceholderVisual label="Zambia / regional map graphic, or logistics & delivery imagery" className="h-72" />
        </div>
      </section>
    </div>
  );
}
