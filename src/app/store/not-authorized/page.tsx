import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/auth";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { title: "Not authorized" };

export default function NotAuthorizedPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand-800 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
        <Logo size={80} className="mx-auto" />
        <h1 className="mt-4 text-2xl font-extrabold">This account can&apos;t open the store app</h1>
        <p className="mt-2 text-muted">
          The store app is only for approved YYC Halal employees. If you work here, ask an admin to add your Google account, then sign in again.
        </p>
        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/store/login" });
          }}
        >
          <button className="btn-primary btn-lg w-full">Sign in with a different account</button>
        </form>
        <Link href="/" className="btn-ghost mt-2 w-full">
          Go to the customer app
        </Link>
      </div>
    </main>
  );
}
