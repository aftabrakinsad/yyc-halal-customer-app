import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { devLoginEnabled, signIn } from "@/auth";
import { currentUser } from "@/lib/auth-helpers";
import { Logo } from "@/components/Logo";
import { GoogleIcon, LockIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  AccessDenied: "This account can't sign in. Please contact the store.",
  CredentialsSignin: "Please enter a valid email address.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await currentUser()) redirect("/");
  const { error } = await searchParams;
  const message = typeof error === "string" ? (ERRORS[error] ?? "Sign-in didn't work. Please try again.") : null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-brand-700 to-brand-800 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl sm:p-10">
        <Logo size={112} className="mx-auto" />
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink">YYC Halal Meat Shop</h1>
        <p className="mt-2 text-lg text-muted">Fresh halal meat, ordered from your phone and ready for pickup in Calgary.</p>

        {message && (
          <p role="alert" className="mt-6 rounded-xl bg-accent-50 p-3 font-semibold text-accent-500">
            {message}
          </p>
        )}

        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button type="submit" className="btn btn-lg w-full border-2 border-line bg-white text-ink hover:bg-cream">
            <GoogleIcon />
            Continue with Google
          </button>
        </form>

        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-balance text-muted">
          <LockIcon width={16} height={16} className="shrink-0" />
          We never see or store your Google password.
        </p>

        {devLoginEnabled && (
          <form
            className="mt-8 space-y-3 rounded-2xl border-2 border-dashed border-gold-400 bg-gold-400/10 p-4 text-left"
            action={async (formData) => {
              "use server";
              await signIn("dev", {
                email: formData.get("email"),
                name: formData.get("name"),
                role: formData.get("role"),
                redirectTo: "/",
              });
            }}
          >
            <p className="text-sm font-bold">Developer sign-in (disabled in production)</p>
            <label className="block text-sm font-semibold">
              Email
              <input name="email" type="email" required defaultValue="customer@example.com" className="input mt-1" />
            </label>
            <label className="block text-sm font-semibold">
              Name
              <input name="name" defaultValue="Test Customer" className="input mt-1" />
            </label>
            <label className="block text-sm font-semibold">
              Role
              <select name="role" defaultValue="CUSTOMER" className="input mt-1">
                <option>CUSTOMER</option>
                <option>STORE_EMPLOYEE</option>
                <option>STORE_MANAGER</option>
                <option>ADMIN</option>
              </select>
            </label>
            <button className="btn-secondary w-full">Dev sign-in</button>
          </form>
        )}
      </div>
    </main>
  );
}
