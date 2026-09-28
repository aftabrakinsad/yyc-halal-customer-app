import type { Metadata } from "next";
import { signOut } from "@/auth";
import { requireStaff } from "@/lib/auth-helpers";
import { can, ROLE_LABEL } from "@/lib/permissions";
import { ToastProvider } from "@/components/shell/Toaster";
import { StoreRealtime } from "@/components/store/StoreRealtime";
import { StoreHeader } from "@/components/store/StoreHeader";
import { STORE_NAV } from "@/components/store/nav";

export const metadata: Metadata = { title: { default: "YYC Halal Store", template: "%s · YYC Halal Store" } };

// Every store page requires an approved, active employee account.
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff("viewOrders");
  const nav = STORE_NAV.filter((i) => can(user.role, i.permission)).map(({ href, label }) => ({ href, label }));

  return (
    <ToastProvider>
      <StoreRealtime>
        <div className="min-h-dvh bg-[#eef0ec]">
          <StoreHeader
            nav={nav}
            name={user.name}
            roleLabel={ROLE_LABEL[user.role]}
            logout={async () => {
              "use server";
              await signOut({ redirectTo: "/store/login" });
            }}
          />
          <main id="main" className="mx-auto w-full max-w-[1800px] px-4 py-5">
            {children}
          </main>
        </div>
      </StoreRealtime>
    </ToastProvider>
  );
}
