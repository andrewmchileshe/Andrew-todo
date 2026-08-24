import type { Metadata } from "next";
import Link from "next/link";
import IndustryIcon from "@/components/IndustryIcon";
import { industries } from "@/data/industries";

export const metadata: Metadata = {
  title: "Industries We Serve",
  description:
    "Labmall Scientific serves mining, water treatment, academia, manufacturing, agriculture, medical, and environmental laboratories across Africa.",
};

export default function IndustriesPage() {
  return (
    <div className="container-page section-y">
      <div className="max-w-2xl">
        <h1 className="text-4xl">Industries We Serve</h1>
        <p className="mt-4 text-[var(--color-grey-mid)]">
          From mining assay labs to university teaching labs, we supply the sectors that keep
          Africa&apos;s science and industry moving.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {industries.map((ind) => (
          <Link
            key={ind.slug}
            href={`/industries/${ind.slug}`}
            className="group rounded-xl border border-black/5 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg text-[var(--color-navy)] transition-colors group-hover:text-white group-hover:bg-[var(--color-green)]"
              style={{ backgroundColor: "var(--color-grey-light)" }}
            >
              <IndustryIcon slug={ind.slug} />
            </div>
            <h2 className="mt-4 text-lg">{ind.name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-grey-mid)]">
              {ind.short}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
