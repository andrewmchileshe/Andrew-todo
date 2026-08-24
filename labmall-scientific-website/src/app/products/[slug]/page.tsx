import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PlaceholderVisual from "@/components/PlaceholderVisual";
import ProductCard from "@/components/ProductCard";
import { getProductBySlug, products } from "@/data/products";
import { whatsappLink } from "@/data/company";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: `${product.name} (${product.brand}) — ${product.application}. ${
      product.inStock ? "In stock, ships fast." : "Sourced on order via RFQ."
    }`,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const related = products
    .filter((p) => p.category === product.category && p.slug !== product.slug)
    .slice(0, 3);

  return (
    <div className="container-page section-y">
      <nav className="mb-8 text-sm text-[var(--color-grey-mid)]">
        <Link href="/products" className="hover:text-[var(--color-navy)]">
          Products
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--color-navy-dark)]">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <PlaceholderVisual label={product.name} className="h-80 lg:h-full" />

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-green-dark)]">
            {product.category}
          </p>
          <h1 className="mt-2 text-3xl">{product.name}</h1>
          <p className="mt-1 text-[var(--color-grey-mid)]">{product.brand}</p>

          <div className="mt-4 flex items-center gap-3">
            {product.inStock ? (
              <span className="badge-stock">In Stock</span>
            ) : (
              <span className="badge-rfq">Request a Quote</span>
            )}
            {product.priceZMW && (
              <span className="text-xl font-bold text-[var(--color-navy)]">
                K{product.priceZMW.toLocaleString()}
              </span>
            )}
          </div>

          <dl className="mt-8 space-y-4 border-t border-black/5 pt-6">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-grey-mid)]">
                Application
              </dt>
              <dd className="mt-1 text-sm text-[var(--color-navy-dark)]">{product.application}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-grey-mid)]">
                Estimated Lead Time
              </dt>
              <dd className="mt-1 text-sm text-[var(--color-navy-dark)]">{product.leadTime}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-grey-mid)]">
                Description
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-[var(--color-navy-dark)]">
                {product.description}
              </dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap gap-4">
            {product.inStock ? (
              <a
                href={whatsappLink(
                  `Hello Labmall Scientific, I'd like to buy: ${product.name} (${product.brand}).`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Buy Now via WhatsApp
              </a>
            ) : (
              <Link href={`/rfq?product=${encodeURIComponent(product.name)}`} className="btn-primary">
                Request a Quote
              </Link>
            )}
            <a href="#" className="btn-outline-navy pointer-events-none opacity-50" aria-disabled>
              Datasheet / SDS (coming soon)
            </a>
          </div>

          <p className="mt-4 text-xs text-[var(--color-grey-mid)]">
            All orders are processed on a 100% advance payment basis. Specifications subject to
            change — see our{" "}
            <Link href="/legal/listing-disclaimer" className="underline">
              product listing disclaimer
            </Link>
            .
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="text-2xl">Related Products</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
