"use client";

import Link from "next/link";
import { useState } from "react";
import Logo from "./Logo";

const navLinks = [
  { href: "/products", label: "Products" },
  { href: "/brands", label: "Brands" },
  { href: "/industries", label: "Industries" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 backdrop-blur">
      <div className="container-page flex h-18 items-center justify-between py-3">
        <Link href="/" className="shrink-0" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[var(--color-navy-dark)] transition-colors hover:text-[var(--color-green)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block">
          <Link href="/rfq" className="btn-primary">
            Request a Quote
          </Link>
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-md text-[var(--color-navy-dark)] lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation menu"
          aria-expanded={open}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-black/5 bg-white lg:hidden">
          <nav className="container-page flex flex-col gap-1 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2 py-2.5 text-sm font-medium text-[var(--color-navy-dark)] hover:bg-[var(--color-grey-light)]"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/rfq"
              className="btn-primary mt-2 justify-center"
              onClick={() => setOpen(false)}
            >
              Request a Quote
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
