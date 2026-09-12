import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import { StarMark } from "@/components/ui/star-mark";

type FooterProps = {
  schoolName: string;
  address: string;
  phone: string;
  email: string;
};

const LINKS = [
  { href: "/about", label: "About the School" },
  { href: "/academics", label: "Academics" },
  { href: "/admissions", label: "Admissions" },
  { href: "/news", label: "News" },
  { href: "/events", label: "Events" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
];

export function SiteFooter({ schoolName, address, phone, email }: FooterProps) {
  return (
    <footer className="border-t border-line bg-night text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <StarMark className="h-8 w-8" tone="gold" />
            <span className="font-display text-lg font-semibold">{schoolName}</span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-paper/70">
            Nurturing knowledge, faith and character for the Creche, Primary and JHS learners of Sang, Mion
            District.
          </p>
        </div>

        <div>
          <h4 className="font-mono-label text-xs uppercase text-gold-500">Explore</h4>
          <ul className="mt-4 space-y-2">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-paper/80 hover:text-gold-500">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-mono-label text-xs uppercase text-gold-500">Contact</h4>
          <ul className="mt-4 space-y-3 text-sm text-paper/80">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
              <span>{address}</span>
            </li>
            {phone && (
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-gold-500" />
                <span>{phone}</span>
              </li>
            )}
            {email && (
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-gold-500" />
                <span>{email}</span>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-paper/50 sm:px-6">
        © {new Date().getFullYear()} {schoolName}. All rights reserved.
      </div>
    </footer>
  );
}
