import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { company } from "@/data/company";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(`https://${company.domain}`),
  title: {
    default: `${company.name} — ${company.tagline}`,
    template: `%s | ${company.name}`,
  },
  description:
    "Labmall Scientific is an independent laboratory supplies distributor serving Africa's research, industrial, mining, water, and educational laboratories. Genuine equipment, consumables, and chemicals — quoted within 24 hours.",
  keywords: [
    "laboratory supplies Zambia",
    "lab chemicals Lusaka",
    "laboratory equipment Zambia",
    "scientific supplies Africa",
    "mining laboratory supplies Zambia",
    "water testing chemicals Zambia",
    "RFQ laboratory Zambia",
    "lab consumables Zambia",
  ],
  openGraph: {
    title: `${company.name} — ${company.tagline}`,
    description:
      "Genuine laboratory equipment, consumables, and chemicals for Africa's research, industrial, mining, water, and educational laboratories. Get a quote within 24 hours.",
    url: `https://${company.domain}`,
    siteName: company.name,
    locale: "en_ZM",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppButton floating />
      </body>
    </html>
  );
}
