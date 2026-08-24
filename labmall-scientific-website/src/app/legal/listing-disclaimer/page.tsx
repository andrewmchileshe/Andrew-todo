import type { Metadata } from "next";
import { company } from "@/data/company";

export const metadata: Metadata = {
  title: "Product Listing & RFQ Disclaimer",
  description: "Product listing and RFQ disclaimer for Labmall Scientific.",
};

export default function ListingDisclaimerPage() {
  return (
    <div className="container-page section-y max-w-3xl">
      <h1 className="text-3xl">Product Listing &amp; RFQ Disclaimer</h1>
      <p className="mt-2 text-sm text-[var(--color-grey-mid)]">Last updated: August 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-[var(--color-navy-dark)]">
        <p>
          Products displayed on this website represent a curated selection of items {company.name}{" "}
          can supply. Not all items shown are held in local stock — items marked{" "}
          <strong>&ldquo;In Stock&rdquo;</strong> reflect stock levels at the time of listing and
          are subject to change without notice; all other items are supplied on a
          request-for-quotation (RFQ) basis and sourced from our supplier network upon
          confirmed order.
        </p>
        <p>
          Product specifications, images (including any AI-generated or representative
          photography used for illustrative purposes), pricing, and availability are subject
          to change without notice and should be confirmed at the time of quotation.
        </p>
        <p>
          Estimated lead times shown on product and category pages are indicative only. Final,
          binding lead times are confirmed in writing at the quotation stage.
        </p>
        <p>
          Chemicals, reagents, instruments, bulk items, and special or made-to-order products
          are supplied strictly on an RFQ basis and are not available for direct online
          purchase at this time. Displaying &ldquo;In Stock&rdquo; items does not constitute an
          offer capable of acceptance by browsing alone — all orders are subject to
          confirmation and our{" "}
          <a href="/legal/terms" className="underline">
            Terms &amp; Conditions of Sale
          </a>
          .
        </p>
        <p>
          For questions about a specific product&apos;s current availability, specification, or
          pricing, please submit a{" "}
          <a href="/rfq" className="underline">
            Request for Quotation
          </a>{" "}
          or contact us at{" "}
          <a href={`mailto:${company.email}`} className="underline">
            {company.email}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
