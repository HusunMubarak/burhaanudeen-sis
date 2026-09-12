"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { StarMark } from "@/components/ui/star-mark";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/academics", label: "Academics" },
  { href: "/admissions", label: "Admissions" },
  { href: "/news", label: "News" },
  { href: "/events", label: "Events" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ schoolName, motto }: { schoolName: string; motto: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <StarMark className="h-9 w-9 shrink-0" />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-base font-semibold text-emerald-900 sm:text-lg">{schoolName}</span>
            <span className="font-mono-label text-[10px] uppercase text-ink-soft">{motto}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium text-ink-soft transition-colors hover:text-emerald-900",
                pathname === item.href && "text-emerald-900"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LinkButton href="/admissions" variant="secondary" size="sm">
            Apply Now
          </LinkButton>
          <LinkButton href="/login" variant="outline" size="sm">
            Staff Login
          </LinkButton>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-line bg-paper px-4 pb-4 lg:hidden" aria-label="Mobile">
          <ul className="flex flex-col gap-1 pt-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm font-medium text-ink-soft hover:bg-paper-dim",
                    pathname === item.href && "bg-emerald-100 text-emerald-900"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 flex gap-2">
              <LinkButton href="/admissions" variant="secondary" size="sm" className="flex-1">
                Apply Now
              </LinkButton>
              <LinkButton href="/login" variant="outline" size="sm" className="flex-1">
                Staff Login
              </LinkButton>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
