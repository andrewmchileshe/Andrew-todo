"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { company, whatsappLink } from "@/data/company";

type Status = "idle" | "submitting" | "success" | "error";

export default function RfqForm() {
  const searchParams = useSearchParams();
  const prefilledProduct = searchParams.get("product") ?? "";
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [resultMessage, setResultMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());

    try {
      const res = await fetch("/api/rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Something went wrong. Please try again.");
      }

      setResultMessage(
        json.message ||
          "Thank you — we've received your RFQ and will respond within 24 hours."
      );
      setStatus("success");
      form.reset();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-[var(--color-green)]/30 bg-[var(--color-green)]/5 p-8 text-center">
        <h2 className="text-2xl text-[var(--color-navy-dark)]">Request Received</h2>
        <p className="mt-3 text-[var(--color-grey-mid)]">{resultMessage}</p>
        <a
          href={whatsappLink("Hello Labmall Scientific, I just submitted an RFQ on your website.")}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-6 inline-flex"
        >
          Confirm via WhatsApp too
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
      <Field label="Full Name" name="fullName" required autoComplete="name" />
      <Field label="Organisation / Company" name="organisation" required autoComplete="organization" />
      <Field
        label="Product Name or SKU"
        name="product"
        required
        defaultValue={prefilledProduct}
        className="sm:col-span-2"
      />
      <Field label="Quantity Required" name="quantity" required />
      <Field label="Urgency / Required Date" name="urgency" required placeholder="e.g. Within 2 weeks" />
      <Field
        label="Application (what you're using it for)"
        name="application"
        required
        className="sm:col-span-2"
      />
      <Field label="Phone Number" name="phone" required autoComplete="tel" />
      <Field label="Email Address" name="email" type="email" required autoComplete="email" />

      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
        <span className="font-medium text-[var(--color-navy-dark)]">Additional Notes</span>
        <textarea
          name="notes"
          rows={4}
          className="rounded-lg border border-black/10 px-4 py-2.5 text-sm focus:border-[var(--color-navy)] focus:outline-none"
        />
      </label>

      {status === "error" && (
        <p className="sm:col-span-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <div className="sm:col-span-2">
        <button type="submit" disabled={status === "submitting"} className="btn-primary w-full sm:w-auto disabled:opacity-60">
          {status === "submitting" ? "Submitting…" : "Submit RFQ"}
        </button>
        <p className="mt-3 text-xs text-[var(--color-grey-mid)]">
          By submitting, you agree to be contacted regarding this request. We&apos;ll respond
          within 24 hours. Prefer to talk now? WhatsApp us on {company.whatsapp}.
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  autoComplete,
  placeholder,
  defaultValue,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <span className="font-medium text-[var(--color-navy-dark)]">
        {label} {required && <span className="text-[var(--color-green-dark)]">*</span>}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="rounded-lg border border-black/10 px-4 py-2.5 text-sm focus:border-[var(--color-navy)] focus:outline-none"
      />
    </label>
  );
}
