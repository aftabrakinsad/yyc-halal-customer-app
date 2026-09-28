import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { devLoginEnabled, signIn } from "@/auth";
import { currentUser, isStaff } from "@/lib/auth-helpers";
import { Logo } from "@/components/Logo";
import { GoogleIcon, LockIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Store sign-in" };

export default async function StoreLoginPage({ searchParams }: PageProps<"/store/login">) {
  const user = await currentUser();
  if (user) redirect(isStaff(user.role) ? "/store" : "/store/not-authorized");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand-800 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl sm:p-10">
        <Logo size={96} className="mx-auto" />
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">YYC Halal Store</h1>
        <p className="mt-1 text-muted">Staff sign-in. Use your approved YYC Halal Google account.</p>
        {error && (
          <p role="alert" className="mt-5 rounded-xl bg-accent-50 p-3 font-semibold text-accent-500">
            Sign-in didn&apos;t work. Please try again.
          </p>
        )}
        <form
          className="mt-7"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/store" });
          }}
        >
          <button type="submit" className="btn btn-lg w-full border-2 border-line bg-white text-ink hover:bg-cream">
            <GoogleIcon /> Sign in with Google
          </button>
        </form>
        <p className="mt-5 flex items-center justify-center gap-2 text-sm text-balance text-muted">
          <LockIcon width={16} height={16} className="shrink-0" /> Only accounts approved by a YYC Halal admin can open the store app.
        </p>
        {devLoginEnabled && (
          <form
            className="mt-7 space-y-3 rounded-2xl border-2 border-dashed border-gold-400 bg-gold-400/10 p-4 text-left"
            action={async (formData) => {
              "use server";
              await signIn("dev", { email: formData.get("email"), name: formData.get("name"), role: formData.get("role"), redirectTo: "/store" });
            }}
          >
            <p className="text-sm font-bold">Developer sign-in (disabled in production)</p>
            <label className="block text-sm font-semibold">
              Email
              <input name="email" type="email" required defaultValue="employee@yychalal.ca" className="input mt-1" />
            </label>
            <label className="block text-sm font-semibold">
              Name
              <input name="name" defaultValue="Store Employee" className="input mt-1" />
            </label>
            <label className="block text-sm font-semibold">
              Role
              <select name="role" defaultValue="STORE_EMPLOYEE" className="input mt-1">
                <option>STORE_EMPLOYEE</option>
                <option>STORE_MANAGER</option>
                <option>ADMIN</option>
                <option>CUSTOMER</option>
              </select>
            </label>
            <button className="btn-secondary w-full">Dev sign-in</button>
          </form>
        )}
      </div>
    </main>
  );
}
