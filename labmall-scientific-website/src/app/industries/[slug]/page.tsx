import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PlaceholderVisual from "@/components/PlaceholderVisual";
import IndustryIcon from "@/components/IndustryIcon";
import { industries } from "@/data/industries";

export function generateStaticParams() {
  return industries.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const industry = industries.find((i) => i.slug === slug);
  if (!industry) return {};
  return {
    title: industry.name,
    description: industry.short,
  };
}

export default async function IndustryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const industry = industries.find((i) => i.slug === slug);
  if (!industry) notFound();

  return (
    <div>
      <section style={{ backgroundColor: "var(--color-grey-light)" }} className="section-y">
        <div className="container-page grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <nav className="mb-4 text-sm text-[var(--color-grey-mid)]">
              <Link href="/industries" className="hover:text-[var(--color-navy)]">
                Industries
              </Link>
              <span className="mx-2">/</span>
              <span className="text-[var(--color-navy-dark)]">{industry.name}</span>
            </nav>
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg text-[var(--color-navy)]"
              style={{ backgroundColor: "white" }}
            >
              <IndustryIcon slug={industry.slug} />
            </div>
            <h1 className="mt-4 text-4xl">{industry.name}</h1>
            <p className="mt-4 leading-relaxed text-[var(--color-grey-mid)]">{industry.short}</p>
          </div>
          <PlaceholderVisual label={`${industry.name} — relevant lab equipment or field photography`} className="h-72" />
        </div>
      </section>

      <section className="section-y">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl">What Labs in This Sector Typically Need</h2>
            <ul className="mt-4 space-y-3">
              {industry.needs.map((n) => (
                <li key={n} className="flex items-start gap-3 text-sm text-[var(--color-navy-dark)]">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-green)]" />
                  {n}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl">How Labmall Scientific Serves This Sector</h2>
            <p className="mt-4 leading-relaxed text-[var(--color-grey-mid)]">
              {industry.howWeServe}
            </p>
            <Link href="/rfq" className="btn-primary mt-6 inline-flex">
              Request a Quote
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
