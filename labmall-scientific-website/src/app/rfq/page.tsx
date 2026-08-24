import type { Metadata } from "next";
import { Suspense } from "react";
import RfqForm from "./RfqForm";

export const metadata: Metadata = {
  title: "Request a Quote",
  description:
    "Submit your laboratory supplies requirement to Labmall Scientific and receive a competitive quote within 24 hours.",
};

export default function RfqPage() {
  return (
    <div className="container-page section-y">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl">Request a Quote</h1>
        <p className="mt-4 text-[var(--color-grey-mid)]">
          Not sure what you need, or need a competitive price? Submit your requirements and
          we&apos;ll come back to you with a detailed quote within 24 hours.
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:p-10">
        <Suspense fallback={null}>
          <RfqForm />
        </Suspense>
      </div>
    </div>
  );
}
