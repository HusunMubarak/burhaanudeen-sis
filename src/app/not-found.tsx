import Link from "next/link";
import { StarMark } from "@/components/ui/star-mark";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="star-texture flex min-h-screen flex-col items-center justify-center bg-paper px-4 text-center">
      <StarMark className="h-12 w-12" />
      <h1 className="mt-6 font-display text-4xl font-semibold text-emerald-900">Page Not Found</h1>
      <p className="mt-3 max-w-md text-ink-soft">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="mt-6 flex gap-3">
        <LinkButton href="/">Back to Home</LinkButton>
        <Link href="/contact" className="inline-flex items-center text-sm font-medium text-emerald-700">
          Contact the school
        </Link>
      </div>
    </div>
  );
}
