import type { Metadata } from "next";
import { company } from "@/data/company";

export const metadata: Metadata = {
  title: "Trademark Disclaimer",
  description: "Legal notice and trademark disclaimer for Labmall Scientific.",
};

export default function TrademarkDisclaimerPage() {
  return (
    <div className="container-page section-y max-w-3xl">
      <h1 className="text-3xl">Legal Notice &amp; Trademark Disclaimer</h1>
      <p className="mt-2 text-sm text-[var(--color-grey-mid)]">Last updated: August 2026</p>

      <div className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-[var(--color-navy-dark)]">
        <p>
          {company.name} is an independent laboratory supplies distributor. We are not a
          manufacturer, and — except where explicitly stated in writing — we are not an
          authorized distributor, agent, or representative of the brands referenced on this
          website.
        </p>
        <p>
          All brand names, trademarks, and manufacturer names referenced on this website
          (including but not limited to those listed on our{" "}
          <a href="/brands" className="underline">
            Brands
          </a>{" "}
          page) are the property of their respective owners and are used strictly for product
          identification purposes. Their use does not imply any affiliation, sponsorship,
          endorsement, or authorized-distributor relationship between {company.name} and the
          brand owner, unless separately and explicitly confirmed in writing.
        </p>
        <p>
          {company.name} does not use, reproduce, or display any manufacturer or brand logos
          on this website. Brand names appear as plain text only.
        </p>
        <p>
          If you are a trademark owner and have concerns regarding the reference of your brand
          on this website, please contact us at{" "}
          <a href={`mailto:${company.email}`} className="underline">
            {company.email}
          </a>{" "}
          and we will address the matter promptly.
        </p>
        <p>
          Nothing on this website constitutes legal advice. This notice is governed by the laws
          of the Republic of Zambia.
        </p>
      </div>
    </div>
  );
}
