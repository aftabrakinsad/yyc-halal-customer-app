import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo size={80} />
      <h1 className="text-2xl font-extrabold">We couldn&apos;t find that page</h1>
      <p className="text-muted">The link may be wrong, or the order doesn&apos;t belong to your account.</p>
      <Link href="/" className="btn-primary btn-lg">
        Go to home
      </Link>
    </main>
  );
}
