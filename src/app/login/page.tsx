import type { Metadata } from "next";
import Link from "next/link";
import { StarMark } from "@/components/ui/star-mark";
import { LoginForm } from "@/components/site/login-form";
import { getSchoolSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Staff Login",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const [settings, params] = await Promise.all([getSchoolSettings(), searchParams]);

  return (
    <div className="star-texture flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-3">
        <StarMark className="h-10 w-10" />
        <span className="font-display text-lg font-semibold text-emerald-900">{settings.name}</span>
      </Link>

      <div className="w-full max-w-sm rounded-xl border border-line bg-white/90 p-6 shadow-sm sm:p-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Staff Login</h1>
        <p className="mt-1 text-sm text-ink-soft">Sign in to access the school management dashboard.</p>

        <div className="mt-6">
          <LoginForm callbackUrl={params.callbackUrl ?? "/admin"} />
        </div>

        {params.error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Incorrect email or password, or your account is inactive.
          </p>
        )}
      </div>

      <Link href="/" className="mt-6 text-sm text-ink-soft hover:text-emerald-800">
        ← Back to the school website
      </Link>
    </div>
  );
}
