import type { Metadata } from "next";
import Link from "next/link";
import { brands } from "@/data/brands";

export const metadata: Metadata = {
  title: "Brands We Source",
  description:
    "Labmall Scientific sources genuine laboratory products from 36+ trusted global manufacturers across analytical instrumentation, life science, water analysis, and general lab supplies.",
};

const categoryGroups = Array.from(new Set(brands.map((b) => b.category)));

export default function BrandsPage() {
  return (
    <div className="container-page section-y">
      <div className="max-w-2xl">
        <h1 className="text-4xl">Brands We Source</h1>
        <p className="mt-4 text-[var(--color-grey-mid)]">
          We source genuine laboratory products from 36+ trusted global manufacturers.
        </p>
        <p className="mt-3 rounded-lg bg-[var(--color-grey-light)] p-4 text-sm text-[var(--color-grey-mid)]">
          <strong className="text-[var(--color-navy-dark)]">Legal note:</strong> Labmall
          Scientific is an independent supplier and is not an authorized distributor of most
          brands listed. Brand names are used for identification purposes only — no
          affiliation is implied, and no manufacturer logos are displayed.
        </p>
      </div>

      <div className="mt-12 space-y-12">
        {categoryGroups.map((group) => (
          <div key={group}>
            <h2 className="text-xl text-[var(--color-navy-dark)]">{group}</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {brands
                .filter((b) => b.category === group)
                .map((b) => (
                  <Link
                    key={b.name}
                    href={`/products?search=${encodeURIComponent(b.name)}`}
                    className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[var(--color-navy-dark)] transition-colors hover:border-[var(--color-green)] hover:text-[var(--color-green-dark)]"
                  >
                    {b.name}
                  </Link>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
