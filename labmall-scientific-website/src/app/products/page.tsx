import type { Metadata } from "next";
import { Suspense } from "react";
import ProductsClient from "./ProductsClient";

export const metadata: Metadata = {
  title: "Product Catalogue",
  description:
    "Browse Labmall Scientific's laboratory chemicals, equipment, glassware, and consumables. Filter by category, search by brand, and request a quote or buy fast-moving items now.",
};

export default function ProductsPage() {
  return (
    <div className="container-page section-y">
      <div className="max-w-2xl">
        <h1 className="text-4xl">Product Catalogue</h1>
        <p className="mt-4 text-[var(--color-grey-mid)]">
          Curated laboratory chemicals, equipment, glassware, and consumables for research,
          mining, water, manufacturing, agriculture, medical, and academic laboratories.
          In-stock items ship fast — everything else is quoted within 24 hours.
        </p>
      </div>
      <div className="mt-10">
        <Suspense fallback={null}>
          <ProductsClient />
        </Suspense>
      </div>
    </div>
  );
}
