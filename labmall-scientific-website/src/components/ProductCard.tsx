import Link from "next/link";
import PlaceholderVisual from "./PlaceholderVisual";
import type { Product } from "@/data/products";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col rounded-xl border border-black/5 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <PlaceholderVisual label={product.name} className="h-36" />
      <div className="mt-3 flex items-center gap-2">
        {product.inStock ? (
          <span className="badge-stock">In Stock</span>
        ) : (
          <span className="badge-rfq">Request a Quote</span>
        )}
        <span className="text-[0.65rem] font-medium uppercase tracking-wide text-[var(--color-grey-mid)]">
          {product.kind}
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold text-[var(--color-navy-dark)] group-hover:text-[var(--color-green)]">
        {product.name}
      </p>
      <p className="mt-1 text-xs text-[var(--color-grey-mid)]">{product.brand}</p>
      {product.priceZMW && (
        <p className="mt-2 text-sm font-bold text-[var(--color-navy)]">
          K{product.priceZMW.toLocaleString()}
        </p>
      )}
    </Link>
  );
}
