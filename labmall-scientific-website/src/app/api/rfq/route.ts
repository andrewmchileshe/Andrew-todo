import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { company } from "@/data/company";

interface RfqPayload {
  fullName: string;
  organisation: string;
  product: string;
  quantity: string;
  application: string;
  urgency: string;
  phone: string;
  email: string;
  notes?: string;
}

const REQUIRED_FIELDS: (keyof RfqPayload)[] = [
  "fullName",
  "organisation",
  "product",
  "quantity",
  "application",
  "urgency",
  "phone",
  "email",
];

function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function POST(request: Request) {
  let body: Partial<RfqPayload>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const missing = REQUIRED_FIELDS.filter((field) => !body[field]?.toString().trim());
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const payload = body as RfqPayload;
  const toAddress = process.env.RFQ_TO_EMAIL || company.email;
  const fromAddress = process.env.SMTP_FROM || `Labmall Scientific Website <${toAddress}>`;

  if (!isEmailConfigured()) {
    console.warn(
      "[RFQ] SMTP is not configured — logging submission instead of sending email.",
      payload
    );
    return NextResponse.json({
      ok: true,
      emailSent: false,
      message:
        "Your RFQ was received and logged. Email delivery is not yet configured on this deployment — our team will still be notified once SMTP credentials are added.",
    });
  }

  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: fromAddress,
      to: toAddress,
      replyTo: payload.email,
      subject: `New RFQ: ${payload.product} — ${payload.organisation}`,
      text: [
        `Full Name: ${payload.fullName}`,
        `Organisation: ${payload.organisation}`,
        `Product / SKU: ${payload.product}`,
        `Quantity Required: ${payload.quantity}`,
        `Application: ${payload.application}`,
        `Urgency / Required Date: ${payload.urgency}`,
        `Phone: ${payload.phone}`,
        `Email: ${payload.email}`,
        `Additional Notes: ${payload.notes || "—"}`,
      ].join("\n"),
    });

    await transporter.sendMail({
      from: fromAddress,
      to: payload.email,
      subject: "We've received your RFQ — Labmall Scientific",
      text: `Hi ${payload.fullName},\n\nThank you — we've received your RFQ and will respond within 24 hours.\n\nSummary of your request:\nProduct / SKU: ${payload.product}\nQuantity: ${payload.quantity}\n\nIf anything is urgent, WhatsApp us on ${company.whatsapp}.\n\n${company.name}\n${company.tagline}`,
    });

    return NextResponse.json({ ok: true, emailSent: true });
  } catch (error) {
    console.error("[RFQ] Failed to send email:", error);
    return NextResponse.json(
      {
        error:
          "We received your request but couldn't send the confirmation email. Please also reach us via WhatsApp to confirm.",
      },
      { status: 502 }
    );
  }
}
