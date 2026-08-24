"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { products, categories } from "@/data/products";

export default function ProductsClient() {
  const searchParams = useSearchParams();
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState(searchParams.get("search") ?? "");
  const [stockOnly, setStockOnly] = useState(false);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = category === "All" || p.category === category;
      const matchesQuery =
        query.trim() === "" ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.brand.toLowerCase().includes(query.toLowerCase());
      const matchesStock = !stockOnly || p.inStock;
      return matchesCategory && matchesQuery && matchesStock;
    });
  }, [category, query, stockOnly]);

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-xl border border-black/5 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by product name or brand…"
          className="w-full rounded-lg border border-black/10 px-4 py-2.5 text-sm focus:border-[var(--color-navy)] focus:outline-none sm:max-w-sm"
        />
        <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-[var(--color-navy-dark)]">
          <input
            type="checkbox"
            checked={stockOnly}
            onChange={(e) => setStockOnly(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-green)]"
          />
          In stock only
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {["All", ...categories].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              category === c
                ? "bg-[var(--color-navy)] text-white"
                : "bg-[var(--color-grey-light)] text-[var(--color-navy-dark)] hover:bg-black/5"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="mt-6 text-sm text-[var(--color-grey-mid)]">
        Showing {filtered.length} of {products.length} products
      </p>

      {filtered.length > 0 ? (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      ) : (
        <div className="mt-16 text-center text-[var(--color-grey-mid)]">
          <p>No products match your search.</p>
          <p className="mt-1 text-sm">
            Can&apos;t find what you need? Submit an RFQ and we&apos;ll source it for you.
          </p>
        </div>
      )}
    </div>
  );
}
