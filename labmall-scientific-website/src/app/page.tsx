import Link from "next/link";
import PlaceholderVisual from "@/components/PlaceholderVisual";
import IndustryIcon from "@/components/IndustryIcon";
import { industries } from "@/data/industries";
import { brands } from "@/data/brands";
import { products } from "@/data/products";
import { company, whatsappLink } from "@/data/company";

const steps = [
  {
    n: "01",
    title: "Submit your RFQ",
    body: "Tell us what you need — product, quantity, and application. Takes under two minutes.",
  },
  {
    n: "02",
    title: "Receive a quote within 24 hours",
    body: "Our team sources competitive pricing from trusted manufacturers and gets back to you fast.",
  },
  {
    n: "03",
    title: "Pay & receive",
    body: "Confirm with 100% advance payment and we handle procurement and delivery, transparently.",
  },
];

const trustSignals = [
  { label: "PACRA Registered", detail: "Certificate of Incorporation on file" },
  { label: "ZRA Tax Clearance 2026", detail: "Fully tax compliant" },
  { label: "100% Genuine Products", detail: "Sourced through lawful commercial channels" },
  { label: "Secure Advance Payment", detail: "Simple, transparent supply chain" },
];

export default function Home() {
  const featuredProducts = products.filter((p) => p.inStock).slice(0, 4);

  return (
    <>
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "radial-gradient(circle at 15% 20%, rgba(96,176,80,0.18), transparent 45%), linear-gradient(135deg, #0c1b3a 0%, #142a5c 55%, #204080 100%)",
        }}
      >
        <div className="container-page grid gap-10 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <p className="mb-4 inline-block rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-green)]">
              {company.tagline}
            </p>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
              An independent laboratory supplies distributor serving Africa&apos;s
              scientific laboratories.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              Genuine equipment, consumables, and chemicals for research, mining, water,
              manufacturing, agriculture, medical, and academic labs — sourced with speed,
              transparency, and commercial discipline.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/rfq" className="btn-primary">
                Request a Quote
              </Link>
              <Link href="/products" className="btn-secondary">
                Browse Fast-Moving Items
              </Link>
            </div>
          </div>

          <PlaceholderVisual
            label="Hero: modern lab equipment photography (analytical balance, pipettes, glassware, microscope) on deep navy background — matching the Facebook cover composition"
            dark
            className="h-72 lg:h-96"
          />
        </div>
      </section>

      {/* Trust signals */}
      <section className="border-b border-black/5 bg-[var(--color-grey-light)]">
        <div className="container-page grid grid-cols-2 gap-6 py-8 sm:grid-cols-4">
          {trustSignals.map((t) => (
            <div key={t.label}>
              <p className="text-sm font-bold text-[var(--color-navy)]">{t.label}</p>
              <p className="mt-1 text-xs text-[var(--color-grey-mid)]">{t.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Industries served */}
      <section className="section-y">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl">Industries We Serve</h2>
            <p className="mt-3 text-[var(--color-grey-mid)]">
              From mining assay labs to university teaching labs, we supply the sectors that
              keep Africa&apos;s science and industry moving.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {industries.map((ind) => (
              <Link
                key={ind.slug}
                href={`/industries/${ind.slug}`}
                className="group rounded-xl border border-black/5 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--color-navy)] transition-colors group-hover:text-white group-hover:bg-[var(--color-green)]"
                  style={{ backgroundColor: "var(--color-grey-light)" }}
                >
                  <IndustryIcon slug={ind.slug} />
                </div>
                <p className="mt-4 text-sm font-semibold text-[var(--color-navy-dark)]">
                  {ind.name}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section-y" style={{ backgroundColor: "var(--color-grey-light)" }}>
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl">How It Works</h2>
            <p className="mt-3 text-[var(--color-grey-mid)]">
              A simple, RFQ-led process built for speed and reliability.
            </p>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="relative rounded-xl bg-white p-6 shadow-sm">
                <span className="text-3xl font-extrabold text-[var(--color-green)]/30">
                  {s.n}
                </span>
                <h3 className="mt-2 text-lg">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-grey-mid)]">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured fast-moving items */}
      <section className="section-y">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl">Fast-Moving Items</h2>
              <p className="mt-2 text-[var(--color-grey-mid)]">
                In-stock consumables and chemicals ready to ship now.
              </p>
            </div>
            <Link href="/products" className="btn-outline-navy">
              View Full Catalogue
            </Link>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((p) => (
              <Link
                key={p.slug}
                href={`/products/${p.slug}`}
                className="group rounded-xl border border-black/5 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <PlaceholderVisual label={p.name} className="h-32" />
                <span className="badge-stock mt-3">In Stock</span>
                <p className="mt-2 text-sm font-semibold text-[var(--color-navy-dark)] group-hover:text-[var(--color-green)]">
                  {p.name}
                </p>
                <p className="mt-1 text-xs text-[var(--color-grey-mid)]">{p.brand}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured brands - text only */}
      <section className="section-y" style={{ backgroundColor: "var(--color-grey-light)" }}>
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl">Brands We Source</h2>
            <p className="mt-3 text-[var(--color-grey-mid)]">
              We source genuine products from 36+ trusted global manufacturers. Brand names
              shown for identification only — no affiliation or authorized-distributor status
              implied.
            </p>
          </div>
          <div className="mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-x-3 gap-y-3">
            {brands.slice(0, 18).map((b) => (
              <span
                key={b.name}
                className="rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm font-medium text-[var(--color-navy-dark)]"
              >
                {b.name}
              </span>
            ))}
            <Link
              href="/brands"
              className="rounded-full px-4 py-1.5 text-sm font-semibold text-[var(--color-green-dark)] underline underline-offset-4"
            >
              + 18 more brands
            </Link>
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section style={{ backgroundColor: "var(--color-navy-dark)" }}>
        <div className="container-page flex flex-col items-center gap-6 py-16 text-center">
          <h2 className="text-3xl text-white sm:text-4xl">
            Need lab supplies fast? Get a quote in 24 hours.
          </h2>
          <p className="max-w-xl text-white/70">
            {company.name} does not sell counterfeit, altered, or misrepresented products —
            every order is processed on a transparent, 100% advance-payment basis.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/rfq" className="btn-primary">
              Request a Quote
            </Link>
            <a
              href={whatsappLink("Hello Labmall Scientific, I'd like to enquire about lab supplies.")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
