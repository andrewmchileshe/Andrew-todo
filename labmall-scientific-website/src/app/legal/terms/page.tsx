import type { Metadata } from "next";
import { company } from "@/data/company";

export const metadata: Metadata = {
  title: "Terms & Conditions of Sale",
  description: "Terms and Conditions of Sale for Labmall Scientific.",
};

const sections = [
  {
    title: "1. Scope",
    body: `These Terms & Conditions of Sale ("Terms") govern all quotations, orders, and sales made by ${company.name} ("Labmall Scientific", "we", "us") to any customer ("you", "the Customer"). By submitting a Request for Quotation (RFQ), placing an order, or purchasing any product listed on this website, you agree to be bound by these Terms.`,
  },
  {
    title: "2. Quotations & Pricing",
    body: "Quotations issued by Labmall Scientific are valid for the period stated on the quotation, or 14 days from issue if no period is stated. Prices are subject to change without notice prior to acceptance and may vary based on exchange rates, supplier pricing, freight, and duties. A quotation is not a confirmed order until accepted in writing and accompanied by payment as set out below.",
  },
  {
    title: "3. Payment",
    body: "Unless otherwise agreed in writing, all orders are processed on a 100% advance payment basis. Labmall Scientific does not offer credit trading. No procurement, dispatch, or delivery will commence until full payment has been received and confirmed.",
  },
  {
    title: "4. Delivery & Lead Times",
    body: "Estimated lead times are provided in good faith based on information available from our suppliers at the time of quotation. Lead times are estimates only and are not guaranteed delivery dates. Labmall Scientific is not liable for delays caused by manufacturers, freight carriers, customs authorities, or other circumstances beyond our reasonable control.",
  },
  {
    title: "5. Returns",
    body: "Requests for return must be raised within 48 hours of delivery, accompanied by the original invoice, and are subject to inspection. Products must be unused, undamaged, and in original packaging. Chemicals, reagents, and custom or special-order items are non-returnable except in cases of confirmed manufacturing defect or shipping damage. Approved returns are subject to a restocking assessment and may not be eligible for a full refund.",
  },
  {
    title: "6. Warranty",
    body: "Where a manufacturer's warranty applies to a product, Labmall Scientific will pass through that warranty to the Customer to the extent permitted by the manufacturer. Labmall Scientific makes no additional warranties beyond those provided by the original manufacturer, except as required by Zambian law.",
  },
  {
    title: "7. Limitation of Liability",
    body: "To the maximum extent permitted by law, Labmall Scientific's total liability arising from any order shall not exceed the value of that order. Labmall Scientific is not liable for indirect, incidental, or consequential loss, including loss of research time, business interruption, or loss of profit.",
  },
  {
    title: "8. Genuine Products",
    body: "Labmall Scientific supplies only genuine products sourced through lawful commercial channels. We do not sell counterfeit, altered, or misrepresented products.",
  },
  {
    title: "9. Governing Law",
    body: "These Terms are governed by, and construed in accordance with, the laws of the Republic of Zambia. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Zambia.",
  },
];

export default function TermsPage() {
  return (
    <div className="container-page section-y max-w-3xl">
      <h1 className="text-3xl">Terms &amp; Conditions of Sale</h1>
      <p className="mt-2 text-sm text-[var(--color-grey-mid)]">Last updated: August 2026</p>

      <div className="mt-8 space-y-8">
        {sections.map((s) => (
          <div key={s.title}>
            <h2 className="text-lg text-[var(--color-navy-dark)]">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-grey-mid)]">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
